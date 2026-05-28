require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const sql = require('mssql');
const { COLUMNS, LIST_COLUMNS, WRITABLE } = require('./columns');
const rateLimit = require('express-rate-limit');
const { google } = require('googleapis');

const SHEETS_SPREADSHEET_ID = '13tQwFGWRwWKWIqu8cuo7PqSWLb6PMMDAlS4FE2c3vQc';
const SHEETS_CREDS_PATH = path.join(__dirname, 'google-credentials.json');

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: SHEETS_CREDS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Try common barcode variations: original, with-leading-zero, without-leading-zero.
// Handles UPC-A (12 digits) <-> EAN-13 (13 digits) mismatches that confuse the scanner.
function barcodeVariants(code) {
  const variants = new Set();
  const trimmed = String(code).trim();
  if (!trimmed) return [];
  variants.add(trimmed);
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.startsWith('0')) variants.add(trimmed.replace(/^0+/, ''));
    variants.add('0' + trimmed);
  }
  return [...variants];
}

const HTTP_PORT  = parseInt(process.env.PORT, 10) || 3000;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 3443;
let httpsRunning = false;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 300,
  standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  if (!req.secure && httpsRunning) {
    return res.redirect(301, `https://${req.hostname}:${HTTPS_PORT}${req.url}`);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  server: process.env.SQL_SERVER,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERT === 'true',
  },
};

let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig).catch((err) => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

function requireApiKey(req, res, next) {
  if (!process.env.API_KEY) return res.status(500).json({ error: 'Server API_KEY not configured' });
  if (req.header('X-API-Key') !== process.env.API_KEY) return res.status(401).json({ error: 'Invalid or missing API key' });
  next();
}

// Map our column metadata to an mssql type instance
function sqlType(col) {
  const def = COLUMNS[col];
  if (!def) throw new Error(`Unknown column ${col}`);
  switch (def.sql) {
    case 'VarChar':       return sql.VarChar(def.len);
    case 'Char':          return sql.Char(def.len);
    case 'Int':           return sql.Int;
    case 'SmallInt':      return sql.SmallInt;
    case 'TinyInt':       return sql.TinyInt;
    case 'Money':         return sql.Money;
    case 'SmallMoney':    return sql.SmallMoney;
    case 'Real':          return sql.Real;
    case 'Bit':           return sql.Bit;
    case 'SmallDateTime': return sql.SmallDateTime;
    case 'DateTime':      return sql.DateTime;
    default: throw new Error(`Unsupported SQL type ${def.sql} for ${col}`);
  }
}

// Coerce + validate one incoming body field. Returns { value } or { error }.
function coerceField(col, raw) {
  const def = COLUMNS[col];
  if (!def) return { error: `Unknown field ${col}` };
  if (def.readonly) return { error: `${col} is read-only` };
  if (raw === null || raw === '' || raw === undefined) {
    if (def.required) return { error: `${col} is required` };
    return { value: null };
  }
  switch (def.type) {
    case 'string': {
      const v = String(raw);
      if (def.len && v.length > def.len) return { error: `${col} must be at most ${def.len} characters` };
      return { value: v };
    }
    case 'int': {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return { error: `${col} must be a whole number` };
      return { value: n };
    }
    case 'decimal': {
      const n = Number(raw);
      if (Number.isNaN(n)) return { error: `${col} must be a number` };
      return { value: n };
    }
    case 'bool': {
      if (raw === true || raw === 1 || raw === '1' || raw === 'true') return { value: true };
      if (raw === false || raw === 0 || raw === '0' || raw === 'false') return { value: false };
      return { error: `${col} must be boolean` };
    }
    case 'datetime': {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return { error: `${col} is not a valid date/time` };
      return { value: d };
    }
    default: return { error: `Unsupported type for ${col}` };
  }
}

// Validate a body for INSERT (UPC must be present + every NOT-NULL required field)
// or for UPDATE (any subset). Returns { values, errors } where values keys are the
// columns the caller actually provided (so PATCH semantics work).
function validateBody(body, { isInsert }) {
  const values = {};
  const errors = [];
  if (isInsert) {
    for (const col of WRITABLE) {
      if (!COLUMNS[col].required) continue;
      if (body[col] === undefined && col !== 'UPC') {
        // Skip required bits/booleans that have a server-side default
        // We still send them so the column gets a deterministic value.
        if (COLUMNS[col].type === 'bool') { values[col] = false; continue; }
      }
    }
  }
  for (const col of Object.keys(body)) {
    if (!Object.prototype.hasOwnProperty.call(COLUMNS, col)) continue;
    if (COLUMNS[col].readonly) continue;
    const { value, error } = coerceField(col, body[col]);
    if (error) errors.push(error); else values[col] = value;
  }
  if (isInsert) {
    for (const col of WRITABLE) {
      if (COLUMNS[col].required && (values[col] === undefined || values[col] === null)) {
        errors.push(`${col} is required`);
      }
    }
  }
  return { values, errors };
}

// ---- Routes ----

app.get('/api/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) { console.error(err); res.status(500).json({ status: 'error', db: 'unreachable' }); }
});

app.post('/api/auth/check', requireApiKey, (_req, res) => res.json({ ok: true }));

// Schema for the frontend
app.get('/api/schema', requireApiKey, (_req, res) => {
  res.json({ columns: COLUMNS });
});

// Distinct units actually in use
app.get('/api/units', requireApiKey, async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT DISTINCT RTRIM(Unit) AS unit
      FROM AKPOS.dbo.Items
      WHERE Unit IS NOT NULL AND RTRIM(Unit) <> ''
      ORDER BY unit
    `);
    res.json(r.recordset.map(row => row.unit));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Distinct departments that have items, with names from Departments table
app.get('/api/departments', requireApiKey, async (_req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT DISTINCT I.Department AS id,
             ISNULL(RTRIM(D.Description), CAST(I.Department AS VARCHAR(10))) AS name
      FROM AKPOS.dbo.Items I
      LEFT JOIN AKPOS.dbo.Departments D ON D.ID = I.Department
      WHERE I.Department IS NOT NULL
      ORDER BY I.Department
    `);
    res.json(r.recordset);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// List recent weekly tab names (last 12 weeks, newest first)
app.get('/api/banking/tabs', requireApiKey, async (_req, res) => {
  try {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_SPREADSHEET_ID });
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 84);
    const ceiling = new Date(); ceiling.setDate(ceiling.getDate() + 7);
    const tabs = meta.data.sheets
      .map(s => s.properties.title)
      .filter(t => {
        const m = t.match(/^W_(\d{4}-\d{2}-\d{2})$/);
        if (!m) return false;
        const [y,mn,d] = m[1].split('-').map(Number);
        const dt = new Date(y, mn-1, d);
        return dt >= cutoff && dt <= ceiling;
      })
      .reverse();
    res.json(tabs);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Return rows for a specific weekly tab
app.get('/api/banking/tab/:name', requireApiKey, async (req, res) => {
  const name = req.params.name;
  if (!/^W_\d{4}-\d{2}-\d{2}$/.test(name)) return res.status(400).json({ error: 'Invalid tab name' });
  try {
    const sheets = getSheetsClient();
    const r = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_SPREADSHEET_ID,
      range: `'${name}'!A1:I20`,
    });
    res.json(r.data.values || []);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Update a single cell in a weekly tab
app.post('/api/banking/update', requireApiKey, async (req, res) => {
  const { tab, cell, value } = req.body || {};
  if (!tab || !/^W_\d{4}-\d{2}-\d{2}$/.test(tab)) return res.status(400).json({ error: 'Invalid tab' });
  if (!cell || !/^[A-Z]+\d+$/.test(cell)) return res.status(400).json({ error: 'Invalid cell ref' });
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEETS_SPREADSHEET_ID,
      range: `'${tab}'!${cell}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Sync cash + distinct transaction count into weekly tabs matching the requested range.
// Each tab is named W_YYYY-MM-DD. Writes cash to col C, trans count to col H.
app.post('/api/sheets/sync', requireApiKey, async (req, res) => {
  try {
    const sheets = getSheetsClient();
    const parseDateLocal = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };

    // Determine date range from the request body (mirrors the sales dashboard selection)
    const { range = 'week', from: qFrom, to: qTo } = req.body || {};
    const { from: rangeFrom, to: rangeTo } = salesDateRange(range, qFrom, qTo);

    // Find tabs named W_YYYY-MM-DD whose week-ending date falls within or after rangeFrom
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_SPREADSHEET_ID });
    // A tab covers Mon–Sun ending on the tab date.
    // Include it if the week overlaps the selected range: tabStart < rangeTo AND tabEnd >= rangeFrom
    const recentTabs = meta.data.sheets
      .map(s => s.properties.title)
      .filter(title => {
        const m = title.match(/^W_(\d{4}-\d{2}-\d{2})$/);
        if (!m) return false;
        const tabEnd = parseDateLocal(m[1]);
        const tabStart = new Date(tabEnd); tabStart.setDate(tabStart.getDate() - 6);
        return tabStart < rangeTo && tabEnd >= rangeFrom;
      });

    if (!recentTabs.length) return res.json({ updated: 0, message: 'No recent week tabs found' });

    // Batch-read column B from all recent tabs in one call
    const batchRead = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEETS_SPREADSHEET_ID,
      ranges: recentTabs.map(t => `'${t}'!B:B`),
    });

    // Collect date rows that fall within the selected range
    const tabDateRows = [];
    for (let t = 0; t < recentTabs.length; t++) {
      const colB = batchRead.data.valueRanges[t].values || [];
      for (let i = 0; i < colB.length; i++) {
        const cell = ((colB[i] || [])[0] || '').toString().trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cell)) {
          const d = parseDateLocal(cell);
          if (d >= rangeFrom && d < rangeTo) {
            tabDateRows.push({ tab: recentTabs[t], rowNum: i + 1, dateStr: cell });
          }
        }
      }
    }
    if (!tabDateRows.length) return res.json({ updated: 0, message: 'No date rows found in selected range' });

    // Query AKPOS once for the whole date range.
    // CAST(Logged AS date) groups by local NZ date, avoiding UTC drift.
    // Value - Change = net cash received (excludes change given back to customer).
    // ROUND(..., -1) rounds to nearest 10.
    const allDates = [...new Set(tabDateRows.map(r => r.dateStr))].sort();
    const minDate = parseDateLocal(allDates[0]);
    const maxDate = parseDateLocal(allDates[allDates.length - 1]);
    maxDate.setDate(maxDate.getDate() + 1);

    const pool = await getPool();
    const result = await pool.request()
      .input('from', sql.DateTime, toSqlDate(minDate))
      .input('to',   sql.DateTime, toSqlDate(maxDate))
      .query(`
        SELECT
          CAST(TH.Logged AS date)                                                              AS day,
          COUNT(DISTINCT TH.TransNo)                                                           AS TransCount,
          ISNULL(ROUND(SUM(CASE WHEN TP.MediaName = 'CASH' THEN TP.Value - TP.[Change] ELSE 0 END), -1), 0) AS CashTotal
        FROM AKPOS.dbo.TransHeaders TH
        INNER JOIN AKPOS.dbo.TransPayments TP ON TP.TransNo = TH.TransNo
        WHERE TH.TransStatus = 'C'
          AND TH.Logged >= @from AND TH.Logged < @to
        GROUP BY CAST(TH.Logged AS date)
      `);

    // mssql returns SQL date type as a UTC-midnight JS Date — extract using UTC methods
    const pad2 = n => String(n).padStart(2, '0');
    const salesByDate = {};
    for (const row of result.recordset) {
      const d = row.day;
      const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth()+1)}-${pad2(d.getUTCDate())}`;
      salesByDate[key] = row;
    }

    // Batch-write to the correct tab + row for each date
    const writeData = [];
    for (const { tab, rowNum, dateStr } of tabDateRows) {
      const s = salesByDate[dateStr] || { CashTotal: 0, TransCount: 0 };
      writeData.push({ range: `'${tab}'!C${rowNum}`, values: [[Math.round(s.CashTotal)]] });
      writeData.push({ range: `'${tab}'!H${rowNum}`, values: [[s.TransCount]] });
    }
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEETS_SPREADSHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: writeData },
    });

    const tabsUpdated = [...new Set(tabDateRows.map(r => r.tab))];
    res.json({ updated: tabDateRows.length, tabs: tabsUpdated });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// List / search — barcode-tolerant.
// For digit-only queries we also try ±leading-zero variants on UPC and SKU
// so scanned EAN-13s find UPC-A items in the DB (and vice versa).
app.get('/api/items', requireApiKey, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit,  10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0);
    const pool = await getPool();
    const request = pool.request();
    const conditions = [];
    if (search) {
      const variants = barcodeVariants(search);
      const orParts = [];
      variants.forEach((v, i) => {
        const p = `search${i}`;
        request.input(p, sql.VarChar, `%${v}%`);
        orParts.push(`UPC LIKE @${p}`, `SKU LIKE @${p}`);
      });
      request.input('descSearch', sql.VarChar, `%${search}%`);
      orParts.push('Description LIKE @descSearch');
      conditions.push(`(${orParts.join(' OR ')})`);
    }
    const dept = (req.query.dept || '').trim();
    if (dept) {
      const deptNum = parseInt(dept, 10);
      if (!isNaN(deptNum)) { request.input('deptFilter', sql.SmallInt, deptNum); conditions.push('Department = @deptFilter'); }
    }
    if (req.query.inactive === '0') conditions.push('InActive = 0');
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const cols    = LIST_COLUMNS.join(', ');
    const rowFrom = offset + 1;
    const rowTo   = offset + limit;
    const result  = await request.query(`
      WITH Paged AS (
        SELECT ${cols},
               ROW_NUMBER() OVER (ORDER BY ISNULL(Updated,'1900-01-01') DESC, UPC ASC) AS _rn
        FROM AKPOS.dbo.Items ${where}
      )
      SELECT ${cols} FROM Paged WHERE _rn BETWEEN ${rowFrom} AND ${rowTo}
    `);
    res.json(result.recordset.map(fixDates));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Full row (all columns)
app.get('/api/items/:upc', requireApiKey, async (req, res) => {
  try {
    const pool = await getPool();
    const cols = Object.keys(COLUMNS).join(', ');
    const result = await pool.request()
      .input('upc', sql.VarChar, req.params.upc)
      .query(`SELECT ${cols} FROM AKPOS.dbo.Items WHERE UPC = @upc`);
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(fixDates(result.recordset[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Fast lookup for the scanner — barcode-tolerant.
// Tries exact, ±leading-zero on both UPC and SKU. Returns the matched item's
// real stored UPC so the caller opens the correct row.
app.get('/api/items/:upc/lookup', requireApiKey, async (req, res) => {
  try {
    const pool = await getPool();
    const variants = barcodeVariants(req.params.upc);
    const request = pool.request();
    const cols = [];
    variants.forEach((v, i) => {
      const p = `code${i}`;
      request.input(p, sql.VarChar, v);
      cols.push(`UPC = @${p}`, `SKU = @${p}`);
    });
    const result = await request.query(`
      SELECT TOP 1 UPC, Description, Price1
      FROM AKPOS.dbo.Items
      WHERE ${cols.join(' OR ')}
    `);
    if (result.recordset.length === 0) return res.json({ exists: false });
    res.json({ exists: true, item: result.recordset[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Insert
app.post('/api/items', requireApiKey, async (req, res) => {
  const { values, errors } = validateBody(req.body, { isInsert: true });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const pool = await getPool();
    const dup = await pool.request()
      .input('upc', sql.VarChar, values.UPC)
      .query('SELECT 1 FROM AKPOS.dbo.Items WHERE UPC = @upc');
    if (dup.recordset.length > 0) return res.status(409).json({ error: 'An item with this UPC already exists' });

    const cols = Object.keys(values);
    // IsChanged + Updated are managed by us, not the client
    const allCols = [...cols, 'IsChanged', 'Updated'];
    const placeholders = [...cols.map((c) => '@' + c), '1', 'GETDATE()'];

    const request = pool.request();
    for (const c of cols) request.input(c, sqlType(c), values[c]);

    await request.query(`
      INSERT INTO AKPOS.dbo.Items (${allCols.join(', ')})
      VALUES (${placeholders.join(', ')})
    `);
    res.status(201).json({ ok: true, UPC: values.UPC });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Update (PATCH semantics — any subset of writable cols; UPC change supported)
app.put('/api/items/:upc', requireApiKey, async (req, res) => {
  const body = { ...req.body };
  const newUPC = body.UPC && body.UPC !== req.params.upc ? String(body.UPC).trim() : null;
  delete body.UPC; // handled separately below if changing

  const { values, errors } = validateBody(body, { isInsert: false });
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const cols = Object.keys(values);
  if (cols.length === 0 && !newUPC) return res.status(400).json({ error: 'No editable fields provided' });

  try {
    const pool = await getPool();

    if (newUPC) {
      const dup = await pool.request()
        .input('upc', sql.VarChar(20), newUPC)
        .query('SELECT 1 FROM AKPOS.dbo.Items WHERE UPC = @upc');
      if (dup.recordset.length > 0) return res.status(409).json({ error: 'UPC already exists' });
    }

    const request = pool.request().input('upc', sql.VarChar(20), req.params.upc);
    for (const c of cols) request.input(c, sqlType(c), values[c]);

    const set = [...cols.map((c) => `${c} = @${c}`), 'IsChanged = 1', 'Updated = GETDATE()'];
    if (newUPC) { request.input('newUPC', sql.VarChar(20), newUPC); set.unshift('UPC = @newUPC'); }

    const result = await request.query(`UPDATE AKPOS.dbo.Items SET ${set.join(', ')} WHERE UPC = @upc`);
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Item not found' });
    res.json({ ok: true, UPC: newUPC || req.params.upc });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ---- Sales routes ----

// mssql sends DateTime params as their UTC value, but AKPOS stores Logged in
// local time (no timezone). This converts a local-time Date to a UTC Date whose
// byte value matches the local time, so SQL Server receives the correct value.
function toSqlDate(d) {
  return new Date(Date.UTC(
    d.getFullYear(), d.getMonth(), d.getDate(),
    d.getHours(), d.getMinutes(), d.getSeconds()
  ));
}

// mssql reads AKPOS local-time columns as UTC-labeled JS Dates.
// Return a naive ISO string (no Z) so the browser parses it as local time.
const _pad = n => String(n).padStart(2, '0');
function toLocalStr(d) {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${_pad(d.getUTCMonth()+1)}-${_pad(d.getUTCDate())}` +
         `T${_pad(d.getUTCHours())}:${_pad(d.getUTCMinutes())}:${_pad(d.getUTCSeconds())}`;
}
function fixDates(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? toLocalStr(v) : v;
  return out;
}

function salesDateRange(range, qFrom, qTo) {
  if (range === 'custom' && qFrom) {
    const [fy, fm, fd] = qFrom.split('-').map(Number);
    const from = new Date(fy, fm - 1, fd);
    if (qTo) {
      const [ty, tm, td] = qTo.split('-').map(Number);
      return { from, to: new Date(ty, tm - 1, td + 1) };
    }
    return { from, to: new Date(fy, fm - 1, fd + 1) };
  }
  const now = new Date();
  const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tom = new Date(tod.getTime() + 86400000);
  switch (range) {
    case 'yesterday': return { from: new Date(tod.getTime() - 86400000), to: tod };
    case 'week': {
      const dow = tod.getDay();
      const mon = new Date(tod.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000);
      return { from: mon, to: tom };
    }
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tom };
    default: return { from: tod, to: tom };
  }
}

// Payment media breakdown for a date range
app.get('/api/sales/media', requireApiKey, async (req, res) => {
  const { from, to } = salesDateRange(req.query.range || 'today', req.query.from, req.query.to);
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('from', sql.DateTime, toSqlDate(from))
      .input('to',   sql.DateTime, toSqlDate(to))
      .query(`
        SELECT
          TP.MediaName                           AS media,
          SUM(TP.Value - TP.[Change])            AS amount,
          COUNT(DISTINCT TH.TransNo)             AS transCount
        FROM AKPOS.dbo.TransHeaders TH
        INNER JOIN AKPOS.dbo.TransPayments TP ON TP.TransNo = TH.TransNo
        WHERE TH.TransStatus = 'C'
          AND TH.Logged >= @from AND TH.Logged < @to
        GROUP BY TP.MediaName
        ORDER BY amount DESC
      `);
    res.json(r.recordset);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Summary stats for a date range + previous period comparison
app.get('/api/sales/summary', requireApiKey, async (req, res) => {
  const { from, to } = salesDateRange(req.query.range || 'today', req.query.from, req.query.to);
  const span     = to - from;
  const prevFrom = new Date(from.getTime() - span);
  try {
    const pool = await getPool();
    const [r, rSold] = await Promise.all([
      pool.request()
        .input('from',     sql.DateTime, toSqlDate(from))
        .input('to',       sql.DateTime, toSqlDate(to))
        .input('prevFrom', sql.DateTime, toSqlDate(prevFrom))
        .query(`
          SELECT
            ISNULL(SUM(CASE WHEN Logged >= @from     AND Logged < @to   THEN TotalAfterTax ELSE 0 END), 0) AS Revenue,
            COUNT(      CASE WHEN Logged >= @from     AND Logged < @to   THEN 1             END)           AS TransCount,
            ISNULL(SUM(CASE WHEN Logged >= @prevFrom AND Logged < @from  THEN TotalAfterTax ELSE 0 END), 0) AS PrevRevenue,
            COUNT(      CASE WHEN Logged >= @prevFrom AND Logged < @from  THEN 1             END)           AS PrevTransCount
          FROM AKPOS.dbo.TransHeaders
          WHERE TransStatus = 'C'
            AND Logged >= @prevFrom AND Logged < @to
        `),
      pool.request()
        .input('from',     sql.DateTime, toSqlDate(from))
        .input('to',       sql.DateTime, toSqlDate(to))
        .input('prevFrom', sql.DateTime, toSqlDate(prevFrom))
        .query(`
          SELECT
            ISNULL(SUM(CASE WHEN TH.Logged >= @from     AND TH.Logged < @to   THEN TL.Quantity ELSE 0 END), 0) AS ItemsSold,
            ISNULL(SUM(CASE WHEN TH.Logged >= @prevFrom AND TH.Logged < @from  THEN TL.Quantity ELSE 0 END), 0) AS PrevItemsSold
          FROM AKPOS.dbo.TransHeaders TH
          INNER JOIN AKPOS.dbo.TransLines TL ON TL.TransNo = TH.TransNo
          WHERE TH.TransStatus = 'C'
            AND TL.LineType = 'S'
            AND TL.IsVoided = 0
            AND TH.Logged >= @prevFrom AND TH.Logged < @to
        `),
    ]);
    const row  = r.recordset[0];
    const sold = rSold.recordset[0];
    const rev  = Number(row.Revenue)         || 0;
    const cnt  = Number(row.TransCount)      || 0;
    const pRev = Number(row.PrevRevenue)     || 0;
    const pCnt = Number(row.PrevTransCount)  || 0;
    const itm  = Number(sold.ItemsSold)      || 0;
    const pItm = Number(sold.PrevItemsSold)  || 0;
    res.json({ revenue: rev, transCount: cnt, avgPerTrans: cnt > 0 ? rev / cnt : 0,
               prevRevenue: pRev, prevTransCount: pCnt,
               itemsSold: itm, prevItemsSold: pItm });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Last 6 months aggregated by month
app.get('/api/sales/monthly', requireApiKey, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        YEAR(Logged)  AS yr,
        MONTH(Logged) AS mo,
        COUNT(*)                       AS TransCount,
        ISNULL(SUM(TotalAfterTax), 0)  AS Revenue
      FROM AKPOS.dbo.TransHeaders
      WHERE TransStatus = 'C'
        AND Logged >= DATEADD(month, -5, DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0))
      GROUP BY YEAR(Logged), MONTH(Logged)
      ORDER BY yr ASC, mo ASC
    `);
    res.json(r.recordset);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Hourly (today/yesterday) or daily (week/month) revenue trend
app.get('/api/sales/trend', requireApiKey, async (req, res) => {
  const range = req.query.range || 'today';
  const { from, to } = salesDateRange(range, req.query.from, req.query.to);
  const isHourly = range === 'today' || range === 'yesterday';
  try {
    const pool = await getPool();
    const [r, rSold] = await Promise.all([
      pool.request()
        .input('from', sql.DateTime, toSqlDate(from))
        .input('to',   sql.DateTime, toSqlDate(to))
        .query(isHourly ? `
          SELECT DATEPART(hour, Logged) AS period,
                 ISNULL(SUM(TotalAfterTax), 0) AS Revenue, COUNT(*) AS TransCount
          FROM AKPOS.dbo.TransHeaders
          WHERE TransStatus = 'C' AND Logged >= @from AND Logged < @to
          GROUP BY DATEPART(hour, Logged) ORDER BY period ASC
        ` : `
          SELECT CONVERT(varchar(10), Logged, 120) AS period,
                 ISNULL(SUM(TotalAfterTax), 0) AS Revenue, COUNT(*) AS TransCount
          FROM AKPOS.dbo.TransHeaders
          WHERE TransStatus = 'C' AND Logged >= @from AND Logged < @to
          GROUP BY CONVERT(varchar(10), Logged, 120) ORDER BY period ASC
        `),
      pool.request()
        .input('from', sql.DateTime, toSqlDate(from))
        .input('to',   sql.DateTime, toSqlDate(to))
        .query(isHourly ? `
          SELECT DATEPART(hour, TH.Logged) AS period,
                 ISNULL(SUM(TL.Quantity), 0) AS ItemsSold
          FROM AKPOS.dbo.TransHeaders TH
          INNER JOIN AKPOS.dbo.TransLines TL ON TL.TransNo = TH.TransNo
          WHERE TH.TransStatus = 'C' AND TL.LineType = 'S' AND TL.IsVoided = 0
            AND TH.Logged >= @from AND TH.Logged < @to
          GROUP BY DATEPART(hour, TH.Logged) ORDER BY period ASC
        ` : `
          SELECT CONVERT(varchar(10), TH.Logged, 120) AS period,
                 ISNULL(SUM(TL.Quantity), 0) AS ItemsSold
          FROM AKPOS.dbo.TransHeaders TH
          INNER JOIN AKPOS.dbo.TransLines TL ON TL.TransNo = TH.TransNo
          WHERE TH.TransStatus = 'C' AND TL.LineType = 'S' AND TL.IsVoided = 0
            AND TH.Logged >= @from AND TH.Logged < @to
          GROUP BY CONVERT(varchar(10), TH.Logged, 120) ORDER BY period ASC
        `),
    ]);
    const soldMap = {};
    for (const row of rSold.recordset) soldMap[row.period] = Number(row.ItemsSold) || 0;
    const rows = r.recordset.map(row => ({ ...row, ItemsSold: soldMap[row.period] || 0 }));
    res.json({ mode: isHourly ? 'hourly' : 'daily', rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Top-selling items by quantity for a given range, with pagination
app.get('/api/sales/trending', requireApiKey, async (req, res) => {
  const range  = req.query.range === 'monthly' ? 'month' : (req.query.range || 'today');
  const { from, to } = salesDateRange(range, req.query.from, req.query.to);
  const limit  = Math.min(parseInt(req.query.limit,  10) || 5,  100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0);
  const rowFrom = offset + 1;
  const rowTo   = offset + limit;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('from', sql.DateTime, toSqlDate(from))
      .input('to',   sql.DateTime, toSqlDate(to))
      .query(`
        WITH Ranked AS (
          SELECT
            TL.UPC,
            ISNULL(I.Description, TL.UPC)  AS Description,
            ISNULL(SUM(TL.Quantity), 0)     AS TotalQty,
            ISNULL(SUM(TL.SubAfterTax), 0)  AS TotalRevenue,
            ROW_NUMBER() OVER (ORDER BY SUM(TL.Quantity) DESC) AS _rn
          FROM AKPOS.dbo.TransHeaders TH
          INNER JOIN AKPOS.dbo.TransLines TL ON TL.TransNo = TH.TransNo
          LEFT  JOIN AKPOS.dbo.Items I       ON I.UPC = TL.UPC
          WHERE TH.TransStatus = 'C'
            AND TL.LineType = 'S'
            AND TL.IsVoided = 0
            AND TH.Logged >= @from AND TH.Logged < @to
          GROUP BY TL.UPC, I.Description
        )
        SELECT UPC, Description, TotalQty, TotalRevenue
        FROM Ranked
        WHERE _rn BETWEEN ${rowFrom} AND ${rowTo}
      `);
    res.json(r.recordset);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ---- Specials routes ----

const SPECIAL_COLS = {
  Description:  { sql: 'VarChar',  len: 30 },
  FromDate:     { sql: 'DateTime'           },
  ToDate:       { sql: 'DateTime'           },
  Product:      { sql: 'VarChar',  len: 20 },
  ProductField: { sql: 'Char',     len: 1  },
  PriceType:    { sql: 'Char',     len: 1  },
  Value:        { sql: 'Money'              },
  CombQty:      { sql: 'Money'              },
  CombType:     { sql: 'Char',     len: 1  },
  DayOfWeek:    { sql: 'TinyInt'            },
  InActive:     { sql: 'Bit'                },
};

function spSqlType(col) {
  const d = SPECIAL_COLS[col]; if (!d) throw new Error(`Unknown special col ${col}`);
  switch (d.sql) {
    case 'VarChar':  return sql.VarChar(d.len);
    case 'Char':     return sql.Char(d.len);
    case 'Money':    return sql.Money;
    case 'TinyInt':  return sql.TinyInt;
    case 'Bit':      return sql.Bit;
    case 'DateTime': return sql.DateTime;
    default: throw new Error(`No SQL type for ${col}`);
  }
}

function coerceSp(col, raw) {
  const d = SPECIAL_COLS[col]; if (!d) return { error: `Unknown field ${col}` };
  if (raw === null || raw === '' || raw === undefined) return { value: null };
  switch (d.sql) {
    case 'VarChar': case 'Char': {
      const v = String(raw);
      return d.len && v.length > d.len ? { error: `${col} too long (max ${d.len})` } : { value: v };
    }
    case 'Money': { const n = Number(raw); return isNaN(n) ? { error: `${col} must be a number` } : { value: n }; }
    case 'TinyInt': { const n = parseInt(raw, 10); return isNaN(n) ? { error: `${col} must be integer` } : { value: n }; }
    case 'Bit': return { value: raw === true || raw === 1 || raw === '1' || raw === 'true' };
    case 'DateTime': { const dt = new Date(raw); return isNaN(dt) ? { error: `${col} invalid date` } : { value: toSqlDate(dt) }; }
    default: return { error: `Unsupported type for ${col}` };
  }
}

function validateSpBody(body) {
  const values = {}, errors = [];
  for (const col of Object.keys(body)) {
    if (!SPECIAL_COLS[col]) continue;
    const { value, error } = coerceSp(col, body[col]);
    if (error) errors.push(error); else values[col] = value;
  }
  return { values, errors };
}

// List specials (paginated, active-first)
app.get('/api/specials', requireApiKey, async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const limit  = Math.min(parseInt(req.query.limit,  10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0);
    const pool   = await getPool();
    const request = pool.request();
    let where = '';
    if (search) {
      request.input('s', sql.VarChar, `%${search}%`);
      where = `WHERE Description LIKE @s OR Product LIKE @s`;
    }
    const rowFrom = offset + 1, rowTo = offset + limit;
    const r = await request.query(`
      WITH P AS (
        SELECT s.ID, s.Description, s.FromDate, s.ToDate, s.Product, s.ProductField,
               s.PriceType, s.Value, s.CombQty, s.DayOfWeek, s.InActive,
               CASE WHEN s.ProductField = 'U' THEN iu.Price1
                    WHEN s.ProductField = 'S' THEN isk.Price1
                    ELSE NULL END AS ItemPrice,
               ROW_NUMBER() OVER (ORDER BY s.InActive ASC, ISNULL(s.FromDate,'1900-01-01') ASC, s.ID ASC) AS _rn
        FROM AKPOS.dbo.Specials s
        LEFT JOIN AKPOS.dbo.Items iu  ON s.ProductField = 'U' AND iu.UPC = s.Product
        LEFT JOIN AKPOS.dbo.Items isk ON s.ProductField = 'S' AND isk.SKU = s.Product
        ${where ? where.replace('Description', 's.Description').replace('Product', 's.Product') : ''}
      )
      SELECT ID, Description, FromDate, ToDate, Product, ProductField,
             PriceType, Value, CombQty, DayOfWeek, InActive, ItemPrice
      FROM P WHERE _rn BETWEEN ${rowFrom} AND ${rowTo}
    `);
    res.json(r.recordset.map(fixDates));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Full row for the edit form
app.get('/api/specials/:id', requireApiKey, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid special ID' });
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT * FROM AKPOS.dbo.Specials WHERE ID = @id`);
    if (!r.recordset.length) return res.status(404).json({ error: 'Special not found' });
    res.json(fixDates(r.recordset[0]));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Create special (auto-incrementing ID)
app.post('/api/specials', requireApiKey, async (req, res) => {
  const { values, errors } = validateSpBody(req.body);
  if (!values.Description) errors.push('Description is required');
  if (values.Value === undefined || values.Value === null) errors.push('Value is required');
  if (!values.PriceType) errors.push('PriceType is required');
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  try {
    const pool  = await getPool();
    const idRes = await pool.request().query(`SELECT ISNULL(MAX(ID),0)+1 AS NextID FROM AKPOS.dbo.Specials`);
    const newId = idRes.recordset[0].NextID;
    const cols  = ['ID', ...Object.keys(values), 'Updated'];
    const req2  = pool.request().input('id', sql.Int, newId);
    for (const [c, v] of Object.entries(values)) req2.input(c, spSqlType(c), v);
    const ph = ['@id', ...Object.keys(values).map(c => `@${c}`), 'GETDATE()'];
    await req2.query(`INSERT INTO AKPOS.dbo.Specials (${cols.join(',')}) VALUES (${ph.join(',')})`);
    res.status(201).json({ ok: true, id: newId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Update special (PATCH semantics)
app.put('/api/specials/:id', requireApiKey, async (req, res) => {
  const spId = parseInt(req.params.id, 10);
  if (isNaN(spId)) return res.status(400).json({ error: 'Invalid special ID' });
  const { values, errors } = validateSpBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  const cols = Object.keys(values);
  if (!cols.length) return res.status(400).json({ error: 'No fields provided' });
  try {
    const pool = await getPool();
    const req2 = pool.request().input('id', sql.Int, spId);
    for (const [c, v] of Object.entries(values)) req2.input(c, spSqlType(c), v);
    const set = [...cols.map(c => `${c} = @${c}`), 'Updated = GETDATE()'];
    const r = await req2.query(`UPDATE AKPOS.dbo.Specials SET ${set.join(', ')} WHERE ID = @id`);
    if (!r.rowsAffected[0]) return res.status(404).json({ error: 'Special not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Option B — active specials matching a specific item UPC
app.get('/api/items/:upc/specials', requireApiKey, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('upc', sql.VarChar(20), req.params.upc)
      .query(`
        SELECT ID, Description, PriceType, Value, CombQty, CombType, FromDate, ToDate, DayOfWeek
        FROM AKPOS.dbo.Specials
        WHERE ProductField = 'U' AND Product = @upc
          AND InActive = 0
          AND (FromDate IS NULL OR FromDate <= GETDATE())
          AND (ToDate   IS NULL OR ToDate   >= GETDATE())
        ORDER BY Value DESC
      `);
    res.json(r.recordset.map(fixDates));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ---- Transaction routes ----

app.get('/api/transactions', requireApiKey, async (req, res) => {
  const range  = req.query.range || 'today';
  const search = (req.query.search || '').trim();
  const limit  = Math.min(parseInt(req.query.limit,  10) || 30, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0,  0);
  const rowFrom = offset + 1, rowTo = offset + limit;
  try {
    const pool    = await getPool();
    const request = pool.request();
    let dateWhere = '';
    if (range !== 'all') {
      const { from, to } = salesDateRange(range, req.query.from, req.query.to);
      request.input('from', sql.DateTime, toSqlDate(from));
      request.input('to',   sql.DateTime, toSqlDate(to));
      dateWhere = 'AND TH.Logged >= @from AND TH.Logged < @to';
    }
    let searchWhere = '';
    if (search) {
      request.input('srch', sql.VarChar, `%${search}%`);
      searchWhere = `AND CAST(TH.TransNo AS VARCHAR) LIKE @srch`;
    }
    const r = await request.query(`
      WITH P AS (
        SELECT TH.TransNo, TH.Logged, TH.TotalAfterTax,
               COUNT(TL.UPC) AS ItemCount,
               ROW_NUMBER() OVER (ORDER BY TH.Logged DESC) AS _rn
        FROM AKPOS.dbo.TransHeaders TH
        LEFT JOIN AKPOS.dbo.TransLines TL
          ON TL.TransNo = TH.TransNo AND TL.IsVoided = 0 AND TL.SubAfterTax > 0
        WHERE TH.TransStatus = 'C'
          ${dateWhere} ${searchWhere}
        GROUP BY TH.TransNo, TH.Logged, TH.TotalAfterTax
      )
      SELECT TransNo, Logged, TotalAfterTax, ItemCount
      FROM P WHERE _rn BETWEEN ${rowFrom} AND ${rowTo}
    `);
    res.json(r.recordset.map(fixDates));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});


app.get('/api/transactions/:transNo', requireApiKey, async (req, res) => {
  if (!/^\d+$/.test(req.params.transNo)) return res.status(400).json({ error: 'Invalid transaction number' });
  try {
    const pool    = await getPool();
    const t       = req.params.transNo;
    const [hRes, lRes] = await Promise.all([
      pool.request()
        .input('t', sql.VarChar(20), t)
        .query(`SELECT TransNo, Logged, TotalAfterTax FROM AKPOS.dbo.TransHeaders WHERE TransNo = @t`),
      pool.request()
        .input('t', sql.VarChar(20), t)
        .query(`
          SELECT TL.UPC, ISNULL(I.Description, TL.UPC) AS Description,
                 TL.Quantity, TL.SubAfterTax
          FROM AKPOS.dbo.TransLines TL
          LEFT JOIN AKPOS.dbo.Items I ON I.UPC = TL.UPC
          WHERE TL.TransNo = @t AND TL.IsVoided = 0 AND TL.SubAfterTax > 0
        `),
    ]);
    if (!hRes.recordset.length) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ ...fixDates(hRes.recordset[0]), lines: lRes.recordset.map(fixDates) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// ---- HTTPS bootstrap (camera needs a secure context) ----
function loadOrCreateCert() {
  const dir = path.join(__dirname, 'certs');
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }
  const selfsigned = require('selfsigned');
  const pems = selfsigned.generate([{ name: 'commonName', value: 'akpos-item-manager.local' }], {
    days: 825, keySize: 2048, algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      { name: 'extKeyUsage', serverAuth: true },
      { name: 'subjectAltName', altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '0.0.0.0' },
      ]},
    ],
  });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  console.log(`Generated self-signed cert in ${dir}`);
  return { key: pems.private, cert: pems.cert };
}

http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP  : http://0.0.0.0:${HTTP_PORT}  (camera scanner will NOT work over HTTP on phones)`);
});

try {
  const creds = loadOrCreateCert();
  https.createServer(creds, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    httpsRunning = true;
    console.log(`HTTPS : https://0.0.0.0:${HTTPS_PORT}  (use this from your phone for the scanner)`);
  });
} catch (err) {
  console.error('Failed to start HTTPS server:', err.message);
}

getPool().catch(err => {
  console.warn('DB: could not connect at startup —', err.message, '(will retry on first request)');
});
