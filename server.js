require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const sql = require('mssql');
const { COLUMNS, LIST_COLUMNS, WRITABLE } = require('./columns');

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

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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
  } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

app.post('/api/auth/check', requireApiKey, (_req, res) => res.json({ ok: true }));

// Schema for the frontend
app.get('/api/schema', requireApiKey, (_req, res) => {
  res.json({ columns: COLUMNS });
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
    let where = '';
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
      where = `WHERE ${orParts.join(' OR ')}`;
    }
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
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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

function salesDateRange(range) {
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
    default: return { from: tod, to: tom }; // today
  }
}

// Summary stats for a date range + previous period comparison
app.get('/api/sales/summary', requireApiKey, async (req, res) => {
  const { from, to } = salesDateRange(req.query.range || 'today');
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Hourly (today/yesterday) or daily (week/month) revenue trend
app.get('/api/sales/trend', requireApiKey, async (req, res) => {
  const range = req.query.range || 'today';
  const { from, to } = salesDateRange(range);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Top-selling items by quantity for a given range, with pagination
app.get('/api/sales/trending', requireApiKey, async (req, res) => {
  const range  = req.query.range === 'monthly' ? 'month' : (req.query.range || 'today');
  const { from, to } = salesDateRange(range);
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
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    case 'DateTime': { const dt = new Date(raw); return isNaN(dt) ? { error: `${col} invalid date` } : { value: dt }; }
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
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Full row for the edit form
app.get('/api/specials/:id', requireApiKey, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id, 10))
      .query(`SELECT * FROM AKPOS.dbo.Specials WHERE ID = @id`);
    if (!r.recordset.length) return res.status(404).json({ error: 'Special not found' });
    res.json(r.recordset[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update special (PATCH semantics)
app.put('/api/specials/:id', requireApiKey, async (req, res) => {
  const { values, errors } = validateSpBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });
  const cols = Object.keys(values);
  if (!cols.length) return res.status(400).json({ error: 'No fields provided' });
  try {
    const pool = await getPool();
    const req2 = pool.request().input('id', sql.Int, parseInt(req.params.id, 10));
    for (const [c, v] of Object.entries(values)) req2.input(c, spSqlType(c), v);
    const set = [...cols.map(c => `${c} = @${c}`), 'Updated = GETDATE()'];
    const r = await req2.query(`UPDATE AKPOS.dbo.Specials SET ${set.join(', ')} WHERE ID = @id`);
    if (!r.rowsAffected[0]) return res.status(404).json({ error: 'Special not found' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    res.json(r.recordset);
  } catch (err) { res.status(500).json({ error: err.message }); }
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

const HTTP_PORT = parseInt(process.env.PORT, 10) || 3000;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT, 10) || 3443;

http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP  : http://0.0.0.0:${HTTP_PORT}  (camera scanner will NOT work over HTTP on phones)`);
});

try {
  const creds = loadOrCreateCert();
  https.createServer(creds, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS : https://0.0.0.0:${HTTPS_PORT}  (use this from your phone for the scanner)`);
  });
} catch (err) {
  console.error('Failed to start HTTPS server:', err.message);
}
