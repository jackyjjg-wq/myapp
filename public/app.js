(() => {
  'use strict';

  const STORAGE_KEY = 'akpos.apiKey';
  const LANG_KEY    = 'akpos.lang';
  const $ = id => document.getElementById(id);

  /* ── i18n ─────────────────────────────────────── */
  let lang = localStorage.getItem(LANG_KEY) || 'en';

  const STRINGS = {
    en: {
      appName:             'AKPOS Items',
      appSub:              'Inventory Manager',
      apiKeyLabel:         'API Key',
      apiKeyPlaceholder:   'Paste or type your key',
      rememberMe:          'Keep me signed in',
      signIn:              'Sign In',
      signingIn:           'Signing in…',
      inventoryTitle:      'Inventory',
      searchPlaceholder:   'Search name, UPC or SKU…',
      scanBtn:             'Scan',
      newItem:             'New Item',
      noResults:           'no results',
      items:               n => n === 1 ? '1 item' : `${n} items`,
      itemsPlus:           n => `${n}+ items`,
      noItemsFound:        'No items found',
      noItemsSub:          'Try a different search or scan a barcode',
      editTitle:           'Edit Item',
      newTitle:            'New Item',
      saveChanges:         'Save Changes',
      createItem:          'Create Item',
      cancel:              'Cancel',
      saving:              'Saving…',
      sectionIdentification: 'Identification',
      sectionPricing:      'Pricing & Inventory',
      sectionStatus:       'Status',
      upcPlaceholder:      'Scan or type barcode',
      scannerStart:        'Starting camera…',
      scannerReady:        'Point at a barcode',
      typeBarcodeManually: 'Enter barcode manually',
      typeManually:        label => `Type ${label} manually`,
      enterBarcode:        'Enter barcode number:',
      enterApiKey:         'Please enter your API key',
      signInFailed:        'Sign-in failed',
      itemCreated:         'Item created',
      noChanges:           'No changes',
      savedN:              n => `Saved — ${n} field${n > 1 ? 's' : ''} updated`,
      found:               desc => `Found: ${desc}`,
      newBarcode:          'New barcode — fill in details',
      lookupFailed:        'Lookup failed',
      httpsRequired:       'Camera requires HTTPS — use https://…:3443',
      barcodeLibNotLoaded: 'Barcode library not loaded',
      cameraPermDenied:    'Camera permission denied',
      couldNotStartCamera: 'Could not start camera',
      torchUnavailable:    'Torch unavailable',
      fieldFilled:         (label, code) => `${label} filled: ${code}`,
      discardChanges:      'Discard unsaved changes?',
      langToggle:          '中文',
    },
    zh: {
      appName:             'AKPOS 商品',
      appSub:              '库存管理',
      apiKeyLabel:         'API 密钥',
      apiKeyPlaceholder:   '粘贴或输入密钥',
      rememberMe:          '保持登录',
      signIn:              '登录',
      signingIn:           '登录中…',
      inventoryTitle:      '库存',
      searchPlaceholder:   '搜索名称、条码或SKU…',
      scanBtn:             '扫码',
      newItem:             '新商品',
      noResults:           '无结果',
      items:               n => `${n} 件商品`,
      itemsPlus:           n => `${n}+ 件商品`,
      noItemsFound:        '未找到商品',
      noItemsSub:          '尝试其他搜索或扫描条码',
      editTitle:           '编辑商品',
      newTitle:            '新建商品',
      saveChanges:         '保存更改',
      createItem:          '创建商品',
      cancel:              '取消',
      saving:              '保存中…',
      sectionIdentification: '基本信息',
      sectionPricing:      '价格与库存',
      sectionStatus:       '状态',
      upcPlaceholder:      '扫描或输入条码',
      scannerStart:        '启动相机中…',
      scannerReady:        '对准条码',
      typeBarcodeManually: '手动输入条码',
      typeManually:        label => `手动输入${label}`,
      enterBarcode:        '请输入条码：',
      enterApiKey:         '请输入API密钥',
      signInFailed:        '登录失败',
      itemCreated:         '商品已创建',
      noChanges:           '无变更',
      savedN:              n => `已保存 — 更新了 ${n} 个字段`,
      found:               desc => `找到：${desc}`,
      newBarcode:          '新条码 — 请填写详情',
      lookupFailed:        '查询失败',
      httpsRequired:       '相机需要HTTPS — 请使用 https://…:3443',
      barcodeLibNotLoaded: '条码库未加载',
      cameraPermDenied:    '相机权限被拒绝',
      couldNotStartCamera: '无法启动相机',
      torchUnavailable:    '手电筒不可用',
      fieldFilled:         (label, code) => `${label} 已填入：${code}`,
      discardChanges:      '放弃未保存的更改？',
      langToggle:          'EN',
    },
  };

  const FIELD_LABELS_ZH = {
    UPC: '条码', SKU: 'SKU', Description: '描述',
    Department: '部门', Unit: '单位', Price1: '价格', InActive: '停用',
  };

  function t(key, ...args) {
    const s = STRINGS[lang]?.[key] ?? STRINGS.en[key];
    return typeof s === 'function' ? s(...args) : (s ?? key);
  }

  function colLabel(name) {
    if (lang === 'zh' && FIELD_LABELS_ZH[name]) return FIELD_LABELS_ZH[name];
    return schema?.columns[name]?.label || name;
  }

  /* ── DOM refs ─────────────────────────────────── */
  const els = {
    loginView:        $('loginView'),
    listView:         $('listView'),
    editView:         $('editView'),
    apiKeyInput:      $('apiKeyInput'),
    rememberMe:       $('rememberMe'),
    loginBtn:         $('loginBtn'),
    logoutBtn:        $('logoutBtn'),
    searchInput:      $('searchInput'),
    searchClearBtn:   $('searchClearBtn'),
    searchScanBtn:    $('searchScanBtn'),
    newBtn:           $('newBtn'),
    itemsList:        $('itemsList'),
    skeleton:         $('skeleton'),
    listEmpty:        $('listEmpty'),
    itemCount:        $('itemCount'),
    loadMoreSpinner:  $('loadMoreSpinner'),
    listSentinel:     $('listSentinel'),
    backBtn:          $('backBtn'),
    editTitle:        $('editTitle'),
    editSub:          $('editSub'),
    editForm:         $('editForm'),
    formFields:       $('formFields'),
    saveBtn:          $('saveBtn'),
    cancelBtn:        $('cancelBtn'),
    toasts:           $('toasts'),
    scannerOverlay:   $('scannerOverlay'),
    scannerVideo:     $('scannerVideo'),
    scannerStatus:    $('scannerStatus'),
    scannerCloseBtn:  $('scannerCloseBtn'),
    scannerTorchBtn:  $('scannerTorchBtn'),
    scannerAltBtn:    $('scannerAltBtn'),
    langBtn:          $('langBtn'),
    langBtnLogin:     $('langBtnLogin'),
  };

  /* ── State ────────────────────────────────────── */
  let apiKey         = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '';
  let mode           = 'edit';    // 'edit' | 'new'
  let schema         = null;
  let curItem        = null;
  let scanMode       = 'lookup';  // 'lookup' | 'fill-field'
  let scanFillField  = 'UPC';
  let formDirty      = false;
  let nativeDetector = null;

  /* ── Form sections ────────────────────────────── */
  const FORM_SECTIONS = [
    { titleKey: 'sectionIdentification', cols: ['UPC', 'SKU', 'Description'] },
    { titleKey: 'sectionPricing',        cols: ['Department', 'Unit', 'Price1'] },
    { titleKey: 'sectionStatus',         cols: ['InActive'] },
  ];

  /* ── applyLang ────────────────────────────────── */
  function applyLang() {
    const toggleText = t('langToggle');
    if (els.langBtn)      els.langBtn.textContent      = toggleText;
    if (els.langBtnLogin) els.langBtnLogin.textContent = toggleText;

    $('loginTitle').textContent    = t('appName');
    $('loginSub').textContent      = t('appSub');
    $('apiKeyLabel').textContent   = t('apiKeyLabel');
    els.apiKeyInput.placeholder    = t('apiKeyPlaceholder');
    $('rememberText').textContent  = t('rememberMe');
    if (!els.loginBtn.disabled) els.loginBtn.textContent = t('signIn');

    $('topbarName').textContent      = t('inventoryTitle');
    els.searchInput.placeholder      = t('searchPlaceholder');
    $('scanBtnText').textContent     = t('scanBtn');
    $('newBtnText').textContent      = t('newItem');
    $('listEmptyTitle').textContent  = t('noItemsFound');
    $('listEmptySub').textContent    = t('noItemsSub');

    els.cancelBtn.textContent = t('cancel');
    if (!els.editView.hidden) {
      if (mode === 'new') {
        els.editTitle.textContent = t('newTitle');
        if (!els.saveBtn.disabled) els.saveBtn.textContent = t('createItem');
      } else {
        els.editTitle.textContent = t('editTitle');
        if (!els.saveBtn.disabled) els.saveBtn.textContent = t('saveChanges');
      }
    }

    if (!els.scannerOverlay.hidden) {
      els.scannerAltBtn.textContent = scanMode === 'fill-field'
        ? t('typeManually', colLabel(scanFillField))
        : t('typeBarcodeManually');
    }

    updateCountBadge();

    if (schema) {
      const wasDirty    = formDirty;
      const savedValues = !els.editView.hidden ? readFields() : null;
      buildForm();
      if (savedValues) {
        for (const [col, val] of Object.entries(savedValues)) setField(col, val);
      }
      formDirty = wasDirty;
    }
  }

  function toggleLang() {
    lang = lang === 'en' ? 'zh' : 'en';
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
  }
  els.langBtn.addEventListener('click', toggleLang);
  els.langBtnLogin.addEventListener('click', toggleLang);

  /* ── View switching ───────────────────────────── */
  function showView(name) {
    els.loginView.hidden = (name !== 'login');
    els.listView.hidden  = (name !== 'list');
    els.editView.hidden  = (name !== 'edit');
  }

  /* ── Toast ────────────────────────────────────── */
  function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`.trim();
    const dot = document.createElement('span'); dot.className = 'toast-dot';
    const txt = document.createElement('span'); txt.textContent = msg;
    el.append(dot, txt);
    els.toasts.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms, transform 200ms';
      el.style.opacity = '0'; el.style.transform = 'translateY(-8px)';
    }, 2800);
    setTimeout(() => el.remove(), 3100);
  }

  /* ── Money format ─────────────────────────────── */
  function fmt$(v) {
    if (v == null) return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }

  /* ── API ──────────────────────────────────────── */
  async function api(path, opts = {}) {
    const hdrs = { 'X-API-Key': apiKey, ...(opts.headers || {}) };
    if (opts.body && !hdrs['Content-Type']) hdrs['Content-Type'] = 'application/json';
    const r = await fetch(path, { ...opts, headers: hdrs });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    if (!r.ok) {
      const e = new Error(data.error || `HTTP ${r.status}`);
      e.status = r.status; throw e;
    }
    return data;
  }

  function vibrate(ms) { try { navigator.vibrate?.(ms); } catch {} }

  /* ── Login ────────────────────────────────────── */
  async function doLogin() {
    const key = els.apiKeyInput.value.trim();
    if (!key) { toast(t('enterApiKey'), 'error'); return; }
    apiKey = key;
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = t('signingIn');
    try {
      await api('/api/auth/check', { method: 'POST', body: '{}' });
      if (els.rememberMe.checked) localStorage.setItem(STORAGE_KEY, key);
      else sessionStorage.setItem(STORAGE_KEY, key);
      els.apiKeyInput.value = '';
      await ensureSchema();
      showView('list');
      loadItems('');
    } catch (err) {
      apiKey = '';
      toast(err.message || t('signInFailed'), 'error');
    } finally {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = t('signIn');
    }
  }
  els.loginBtn.addEventListener('click', doLogin);
  els.apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  els.logoutBtn.addEventListener('click', () => {
    apiKey = '';
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    showView('login');
  });

  /* ── Schema ───────────────────────────────────── */
  async function ensureSchema() {
    if (schema) return;
    schema = await api('/api/schema');
    buildForm();
  }

  /* ── Pagination state ────────────────────────── */
  const PAGE_SIZE     = 50;
  let   listSearch    = '';
  let   listOffset    = 0;
  let   listAllLoaded = false;
  let   listLoading   = false;

  /* ── Search ───────────────────────────────────── */
  let searchTimer = null;
  els.searchInput.addEventListener('input', () => {
    const v = els.searchInput.value;
    els.searchClearBtn.hidden = !v.length;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadItems(v.trim()), 260);
  });
  els.searchClearBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    els.searchClearBtn.hidden = true;
    loadItems('');
    els.searchInput.focus();
  });
  els.searchScanBtn.addEventListener('click', () => {
    scanMode = 'lookup';
    startScanner();
  });

  /* ── Item list ────────────────────────────────── */
  function buildItemCard(item) {
    const li = document.createElement('li');
    li.className = 'item-card' + (item.InActive ? ' inactive' : '');
    li.setAttribute('role', 'button'); li.tabIndex = 0;
    const desc = item.Description || '(no description)';
    const initials = desc.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
    const meta = [];
    if (item.UPC) meta.push(item.UPC);
    if (item.SKU) meta.push(`SKU ${item.SKU}`);
    if (item.Department) meta.push(`Dept ${item.Department}`);
    li.innerHTML = `
      <div class="item-avatar">${initials}</div>
      <div class="item-body">
        <div class="item-name"></div>
        <div class="item-meta"></div>
      </div>
      <div class="item-right">
        <div class="item-price"></div>
        ${item.Unit ? `<span class="item-unit"></span>` : ''}
      </div>`;
    li.querySelector('.item-name').textContent = desc;
    li.querySelector('.item-meta').textContent = meta.join(' · ');
    li.querySelector('.item-price').textContent = fmt$(item.Price1);
    if (item.Unit) li.querySelector('.item-unit').textContent = item.Unit;
    li.addEventListener('click', () => openEdit(item.UPC));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEdit(item.UPC); });
    return li;
  }

  function updateCountBadge() {
    const n = els.itemsList.children.length;
    if (n === 0) {
      els.itemCount.textContent = listSearch ? t('noResults') : t('items', 0);
    } else {
      els.itemCount.textContent = listAllLoaded ? t('items', n) : t('itemsPlus', n);
    }
  }

  async function loadItems(search) {
    listSearch    = search;
    listOffset    = 0;
    listAllLoaded = false;
    listLoading   = false;
    els.listEmpty.hidden        = true;
    els.loadMoreSpinner.hidden  = true;
    els.itemsList.innerHTML     = '';
    els.skeleton.hidden         = false;
    await fetchNextPage();
  }

  async function fetchNextPage() {
    if (listLoading || listAllLoaded) return;
    listLoading = true;
    const isFirst = listOffset === 0;
    if (!isFirst) els.loadMoreSpinner.hidden = false;
    try {
      const items = await api(
        `/api/items?search=${encodeURIComponent(listSearch)}&offset=${listOffset}&limit=${PAGE_SIZE}`
      );
      if (isFirst) els.skeleton.hidden = true;
      els.loadMoreSpinner.hidden = true;

      if (items.length < PAGE_SIZE) listAllLoaded = true;
      listOffset += items.length;

      if (isFirst && items.length === 0) {
        updateCountBadge();
        els.listEmpty.hidden = false;
        listLoading = false;
        return;
      }

      const frag = document.createDocumentFragment();
      for (const item of items) frag.appendChild(buildItemCard(item));
      els.itemsList.appendChild(frag);
      updateCountBadge();
    } catch (err) {
      if (isFirst) els.skeleton.hidden = true;
      els.loadMoreSpinner.hidden = true;
      if (err.status === 401) { els.logoutBtn.click(); listLoading = false; return; }
      toast(err.message, 'error');
    }
    listLoading = false;
  }

  /* ── Infinite scroll via IntersectionObserver ── */
  const sentinelObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) fetchNextPage();
  }, { rootMargin: '120px' });
  sentinelObserver.observe(els.listSentinel);

  /* ── Form build ───────────────────────────────── */
  function buildForm() {
    els.formFields.innerHTML = '';
    const rendered = new Set();

    for (const { titleKey, cols } of FORM_SECTIONS) {
      const sectionCols = cols.filter(c => schema.columns[c] && !schema.columns[c].readonly);
      if (!sectionCols.length) continue;

      const hdr = document.createElement('div');
      hdr.className = 'form-section-title';
      hdr.textContent = t(titleKey);
      els.formFields.appendChild(hdr);

      const group = document.createElement('div');
      group.className = 'form-group';
      els.formFields.appendChild(group);

      for (const name of sectionCols) {
        group.appendChild(buildRow(name, schema.columns[name]));
        rendered.add(name);
      }
    }

    for (const [name, def] of Object.entries(schema.columns)) {
      if (def.readonly || rendered.has(name)) continue;
      els.formFields.appendChild(buildRow(name, def));
    }
  }

  function buildRow(name, def) {
    const row = document.createElement('div');
    row.className = 'form-row';

    if (def.type === 'bool') {
      row.innerHTML = `
        <label class="toggle-row">
          <span class="toggle-label"></span>
          <input type="checkbox" />
          <span class="toggle-track"></span>
        </label>`;
      row.querySelector('.toggle-label').textContent = colLabel(name);
      const input = row.querySelector('input');
      input.name = name; input.dataset.col = name;
      input.addEventListener('change', () => { formDirty = true; });
      return row;
    }

    const lbl = document.createElement('span');
    lbl.className = 'field-label';
    lbl.textContent = colLabel(name) + (def.required ? ' *' : '');
    row.appendChild(lbl);

    let input;

    if (def.type === 'decimal' && (def.sql === 'Money' || def.sql === 'SmallMoney')) {
      const wrap = document.createElement('div');
      wrap.className = 'prefix-wrap';
      const sym = document.createElement('span');
      sym.className = 'prefix-sym'; sym.textContent = '$';
      input = document.createElement('input');
      input.type = 'number'; input.step = '0.01'; input.min = '0';
      if (def.required) input.required = true;
      input.placeholder = '0.00';
      wrap.append(sym, input);
      row.appendChild(wrap);
    } else if (def.type === 'int') {
      input = document.createElement('input');
      input.type = 'number'; input.step = '1'; input.placeholder = '0';
    } else if (def.type === 'datetime') {
      input = document.createElement('input');
      input.type = 'datetime-local';
    } else {
      // string
      input = document.createElement('input');
      input.type = 'text';
      if (def.len) input.maxLength = def.len;

      if (name === 'UPC') {
        input.inputMode = 'numeric';
        input.placeholder = t('upcPlaceholder');
      }

      if (name === 'UPC' || name === 'SKU') {
        const wrap = document.createElement('div');
        wrap.className = 'input-with-btn';
        const camBtn = document.createElement('button');
        camBtn.type = 'button';
        camBtn.className = 'cam-btn';
        camBtn.setAttribute('aria-label', `Scan into ${colLabel(name)}`);
        camBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
          <line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/>
          <line x1="15" y1="8" x2="15" y2="16"/>
        </svg>`;
        camBtn.addEventListener('click', () => { scanMode = 'fill-field'; scanFillField = name; startScanner(); });
        wrap.append(input, camBtn);
        row.appendChild(wrap);
      } else if (def.datalist) {
        const dlId = `dl-${name}`;
        input.setAttribute('list', dlId);
        const dl = document.createElement('datalist');
        dl.id = dlId;
        def.datalist.forEach(v => { const o = document.createElement('option'); o.value = v; dl.appendChild(o); });
        row.appendChild(dl);
      }
    }

    if (input) {
      input.name = name; input.dataset.col = name;
      if (def.required && input.type !== 'number') input.required = true;
      if (!row.querySelector('input[data-col]')) row.appendChild(input);
      input.addEventListener('input',  () => { formDirty = true; });
      input.addEventListener('change', () => { formDirty = true; });
    }

    return row;
  }

  /* ── Form read/write ──────────────────────────── */
  function fieldInput(name) {
    return els.formFields.querySelector(`[data-col="${name}"]`);
  }

  function setField(name, value) {
    const input = fieldInput(name);
    if (!input) return;
    const def = schema.columns[name];
    if (!def) return;

    if (def.type === 'bool') {
      input.checked = def.boolInvert ? !value : !!value;
    } else if (def.type === 'datetime') {
      if (value) {
        const d = new Date(value);
        if (!isNaN(d)) {
          const p = n => String(n).padStart(2, '0');
          input.value = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        } else input.value = '';
      } else input.value = '';
    } else {
      input.value = (value == null) ? '' : String(value);
    }
  }

  function clearFields() {
    formDirty = false;
    els.formFields.querySelectorAll('[data-col]').forEach(input => {
      const def = schema.columns[input.dataset.col];
      if (!def) return;
      if (def.type === 'bool') input.checked = !!def.boolInvert;
      else input.value = '';
    });
  }

  function readFields() {
    const out = {};
    els.formFields.querySelectorAll('[data-col]').forEach(input => {
      const col = input.dataset.col;
      const def = schema.columns[col];
      if (!def || def.readonly) return;
      if (def.type === 'bool') out[col] = def.boolInvert ? !input.checked : !!input.checked;
      else out[col] = input.value === '' ? null : input.value;
    });
    return out;
  }

  function diffFields(original) {
    const all = readFields();
    const out = {};
    for (const [col, val] of Object.entries(all)) {
      const def = schema.columns[col];
      const prev = original?.[col] ?? null;
      if (def.type === 'bool' && !!prev === !!val) continue;
      if (def.type === 'string') { if ((val ?? '') === (prev ?? '')) continue; }
      if (def.type === 'decimal' || def.type === 'int') {
        if (val === null && prev === null) continue;
        if (val !== null && prev !== null && Number(val) === Number(prev)) continue;
      }
      if (def.type === 'datetime') {
        const a = val ? new Date(val).getTime() : null;
        const b = prev ? new Date(prev).getTime() : null;
        if (a === b) continue;
      }
      out[col] = val;
    }
    return out;
  }

  /* ── Open edit / new ──────────────────────────── */
  els.newBtn.addEventListener('click', () => openNew());

  function goBackToList() {
    formDirty = false;
    showView('list');
    loadItems(els.searchInput.value.trim());
  }

  els.backBtn.addEventListener('click', () => {
    if (formDirty && !confirm(t('discardChanges'))) return;
    goBackToList();
  });

  els.cancelBtn.addEventListener('click', () => {
    if (formDirty && !confirm(t('discardChanges'))) return;
    goBackToList();
  });

  function openNew(prefillUPC = '') {
    mode = 'new';
    curItem = null;
    clearFields();
    els.editTitle.textContent = t('newTitle');
    els.editSub.textContent = '';
    els.saveBtn.textContent = t('createItem');
    if (prefillUPC) setField('UPC', prefillUPC);
    showView('edit');
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      const focus = prefillUPC ? fieldInput('Description') : fieldInput('UPC');
      focus?.focus();
    }, 80);
  }

  async function openEdit(upc) {
    mode = 'edit';
    curItem = null;
    clearFields();
    els.editTitle.textContent = t('editTitle');
    els.editSub.textContent = upc;
    els.saveBtn.textContent = t('saveChanges');
    showView('edit');
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const item = await api(`/api/items/${encodeURIComponent(upc)}`);
      curItem = item;
      for (const col of Object.keys(schema.columns)) setField(col, item[col]);
      formDirty = false; // setField triggers input events; clear dirty after population
      if (item.Updated) {
        const d = new Date(item.Updated);
        if (!isNaN(d)) els.editSub.textContent = `${upc}  ·  ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ── Save ─────────────────────────────────────── */
  els.editForm.addEventListener('submit', async e => {
    e.preventDefault();
    const orig = els.saveBtn.textContent;
    els.saveBtn.disabled = true;
    els.saveBtn.textContent = t('saving');
    try {
      if (mode === 'new') {
        const payload = readFields();
        for (const k of Object.keys(payload)) if (payload[k] === null) delete payload[k];
        await api('/api/items', { method: 'POST', body: JSON.stringify(payload) });
        formDirty = false;
        toast(t('itemCreated'), 'success');
        showView('list');
        loadItems('');
      } else {
        const diff = diffFields(curItem);
        if (!Object.keys(diff).length) { toast(t('noChanges'), ''); return; }
        await api(`/api/items/${encodeURIComponent(curItem.UPC)}`, { method: 'PUT', body: JSON.stringify(diff) });
        formDirty = false;
        curItem = { ...curItem, ...diff };
        if (diff.UPC) els.editSub.textContent = diff.UPC;
        const n = Object.keys(diff).length;
        toast(t('savedN', n), 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = orig;
    }
  });

  /* ── Scanner state ────────────────────────────── */
  let scanStream  = null;
  let scanTrack   = null;
  let scanReader  = null;
  let scanActive  = false;

  function secureCtx() {
    return window.isSecureContext
        || location.hostname === 'localhost'
        || location.hostname === '127.0.0.1';
  }

  els.scannerCloseBtn.addEventListener('click', stopScanner);

  els.scannerAltBtn.addEventListener('click', async () => {
    stopScanner();
    if (scanMode === 'fill-field') return; // user types directly in the field
    const code = window.prompt(t('enterBarcode'));
    if (code?.trim()) await lookupCode(code.trim());
  });

  /* ── Keyboard ─────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!els.scannerOverlay.hidden) { stopScanner(); return; }
      if (!els.editView.hidden) { els.backBtn.click(); }
    }
  });

  /* ── startScanner ─────────────────────────────── */
  async function startScanner() {
    if (!secureCtx()) {
      toast(t('httpsRequired'), 'error');
      return;
    }
    if (typeof ZXing === 'undefined') {
      toast(t('barcodeLibNotLoaded'), 'error');
      return;
    }

    els.scannerOverlay.hidden = false;
    els.scannerStatus.textContent = t('scannerStart');
    els.scannerAltBtn.textContent = scanMode === 'fill-field'
      ? t('typeManually', colLabel(scanFillField))
      : t('typeBarcodeManually');

    // Init native BarcodeDetector if available (Chrome 83+, Android)
    nativeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
      } catch { nativeDetector = null; }
    }

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      scanTrack = scanStream.getVideoTracks()[0] ?? null;
      els.scannerVideo.srcObject = scanStream;

      await new Promise((resolve, reject) => {
        els.scannerVideo.onloadeddata = resolve;
        els.scannerVideo.onerror = reject;
        setTimeout(resolve, 3000);
      });
      await els.scannerVideo.play().catch(() => {});

      setupTorch();

      // Use core MultiFormatReader — more reliable than BrowserMultiFormatReader for canvas decode
      try {
        const hints = new Map([
          [ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,  ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.ITF,
          ]],
          [ZXing.DecodeHintType.TRY_HARDER, true],
        ]);
        scanReader = new ZXing.MultiFormatReader();
        scanReader.setHints(hints);
      } catch (e) {
        console.warn('ZXing MultiFormatReader unavailable, falling back', e);
        scanReader = null;
      }

      scanActive = true;
      els.scannerStatus.textContent = t('scannerReady');
      runScanLoop();
    } catch (err) {
      stopScanner();
      const msg = err?.name === 'NotAllowedError'
        ? t('cameraPermDenied')
        : (err?.message || t('couldNotStartCamera'));
      toast(msg, 'error');
    }
  }

  /* ── runScanLoop — dual engine: BarcodeDetector + ZXing ── */
  function runScanLoop() {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });

    const tick = async () => {
      if (!scanActive) return;

      const video = els.scannerVideo;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Crop center 80% × 60% — matches the viewfinder area, speeds up ZXing
        const vw = video.videoWidth, vh = video.videoHeight;
        const cropW = Math.round(vw * 0.80);
        const cropH = Math.round(vh * 0.60);
        const cropX = Math.round((vw - cropW) / 2);
        const cropY = Math.round((vh - cropH) / 2);
        canvas.width  = cropW;
        canvas.height = cropH;
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        let code = null;

        // Primary: native BarcodeDetector (hardware-accelerated, Chrome/Android)
        if (nativeDetector) {
          try {
            const results = await nativeDetector.detect(canvas);
            if (results.length > 0) code = results[0].rawValue;
          } catch (_) {}
        }

        // Fallback: ZXing decode via HTMLCanvasElementLuminanceSource
        // (RGBLuminanceSource requires Uint32Array; imageData.data is Uint8ClampedArray — wrong type)
        if (!code && scanReader) {
          try {
            const lum = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
            const bmp = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum));
            const r = scanReader.decode(bmp);
            if (r) code = r.getText();
          } catch (e) {
            if (e?.name && e.name !== 'NotFoundException') console.debug('ZXing:', e.name);
          }
        }

        if (code && scanActive) {
          scanActive = false;
          vibrate(60);
          flashScanSuccess();
          onScanResult(code);
          return;
        }
      }

      setTimeout(() => { if (scanActive) requestAnimationFrame(tick); }, 100);
    };
    requestAnimationFrame(tick);
  }

  /* ── Flash animation on successful scan ───────── */
  function flashScanSuccess() {
    const box = document.getElementById('scanBox');
    if (box) {
      box.classList.add('detected');
      setTimeout(() => box.classList.remove('detected'), 500);
    }
    const flash = document.createElement('div');
    flash.className = 'scan-flash';
    els.scannerOverlay.appendChild(flash);
    setTimeout(() => flash.remove(), 450);
  }

  /* ── stopScanner ──────────────────────────────── */
  function stopScanner() {
    scanActive = false;
    scanReader = null;
    nativeDetector = null;
    if (scanStream) { scanStream.getTracks().forEach(tr => tr.stop()); scanStream = null; }
    scanTrack = null;
    els.scannerVideo.srcObject = null;
    els.scannerTorchBtn.hidden = true;
    els.scannerOverlay.hidden = true;
  }

  /* ── setupTorch ───────────────────────────────── */
  function setupTorch() {
    if (!scanTrack?.getCapabilities) return;
    const caps = scanTrack.getCapabilities();
    if (!caps?.torch) return;
    els.scannerTorchBtn.hidden = false;
    let torchOn = false;
    els.scannerTorchBtn.onclick = async () => {
      torchOn = !torchOn;
      try { await scanTrack.applyConstraints({ advanced: [{ torch: torchOn }] }); }
      catch { toast(t('torchUnavailable'), 'error'); }
    };
  }

  /* ── lookupCode — shared by scanner + manual entry ── */
  async function lookupCode(code) {
    try {
      const r = await api(`/api/items/${encodeURIComponent(code)}/lookup`);
      if (r.exists) {
        toast(t('found', r.item.Description || code), 'success');
        openEdit(r.item.UPC);
      } else {
        toast(t('newBarcode'), '');
        openNew(code);
      }
    } catch (err) {
      toast(err.message || t('lookupFailed'), 'error');
    }
  }

  /* ── onScanResult ─────────────────────────────── */
  async function onScanResult(code) {
    if (scanMode === 'fill-field') {
      stopScanner();
      setField(scanFillField, code);
      formDirty = true;
      toast(t('fieldFilled', colLabel(scanFillField), code), 'success');
      setTimeout(() => {
        const next = scanFillField === 'UPC' ? fieldInput('Description') : fieldInput('Price1');
        (next || fieldInput('Description'))?.focus();
      }, 80);
      return;
    }

    // lookup mode: find item or create new
    els.scannerStatus.textContent = `${code}…`;
    try {
      const r = await api(`/api/items/${encodeURIComponent(code)}/lookup`);
      stopScanner();
      if (r.exists) {
        toast(t('found', r.item.Description || code), 'success');
        openEdit(r.item.UPC);
      } else {
        toast(t('newBarcode'), '');
        openNew(code);
      }
    } catch (err) {
      els.scannerStatus.textContent = err.message || t('lookupFailed');
      setTimeout(() => {
        if (!scanActive) { scanActive = true; runScanLoop(); }
        els.scannerStatus.textContent = t('scannerReady');
      }, 1500);
    }
  }

  /* ── Init ─────────────────────────────────────── */
  (async function init() {
    applyLang();
    if (!apiKey) { showView('login'); return; }
    try {
      await api('/api/auth/check', { method: 'POST', body: '{}' });
      await ensureSchema();
      showView('list');
      loadItems('');
    } catch {
      apiKey = '';
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      showView('login');
    }
  })();
})();
