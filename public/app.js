(() => {
  'use strict';

  const STORAGE_KEY = 'akpos.apiKey';
  const LANG_KEY    = 'akpos.lang';
  const $ = id => document.getElementById(id);

  /* ── i18n ─────────────────────────────────────── */
  let lang = localStorage.getItem(LANG_KEY) || 'en';

  const STRINGS = {
    en: {
      appName: 'AKPOS Items', appSub: 'Inventory Manager',
      apiKeyLabel: 'API Key', apiKeyPlaceholder: 'Paste or type your key',
      rememberMe: 'Keep me signed in', signIn: 'Sign In', signingIn: 'Signing in…',
      // Home
      homeInventory: 'Inventory', homeInventorySub: 'Manage items & prices',
      homeSales: 'Sales', homeSalesSub: 'View sales reports', homeSignOut: 'Sign Out',
      // List
      inventoryTitle: 'Inventory', searchPlaceholder: 'Search name, UPC or SKU…',
      scanBtn: 'Scan', newItem: 'New Item', noResults: 'no results',
      items: n => n === 1 ? '1 item' : `${n} items`, itemsPlus: n => `${n}+ items`,
      noItemsFound: 'No items found', noItemsSub: 'Try a different search or scan a barcode',
      // Edit
      editTitle: 'Edit Item', newTitle: 'New Item',
      saveChanges: 'Save Changes', createItem: 'Create Item', cancel: 'Cancel', saving: 'Saving…',
      sectionIdentification: 'Identification', sectionPricing: 'Pricing & Inventory', sectionStatus: 'Status',
      upcPlaceholder: 'Scan or type barcode',
      // Sales
      salesTitle: 'Sales Dashboard',
      rangeToday: 'Today', rangeYesterday: 'Yesterday', rangeWeek: 'This Week',
      rangeMonth: 'This Month', rangeMonthly: 'Monthly',
      statRevenue: 'Revenue', statTransactions: 'Transactions', statItemsSold: 'Items Sold', statAvgSale: 'Avg / Sale',
      monthlySalesTitle: 'Monthly Sales', trendTitle: 'Revenue Trend',
      trendingTitle: 'Top Items', soldUnits: n => `${n} sold`, showMore: 'Show more',
      salesNoData: 'No sales data for this period',
      vsChange: pct => pct >= 0 ? `+${pct}% vs prior` : `${pct}% vs prior`,
      // Scanner
      scannerStart: 'Starting camera…', scannerReady: 'Point at a barcode',
      typeBarcodeManually: 'Enter barcode manually', typeManually: label => `Type ${label} manually`,
      enterBarcode: 'Enter barcode number:',
      // Specials
      homeSpecials: 'Specials', homeSpecialsSub: 'Manage discounts & offers',
      specialsTitle: 'Specials', newSpecial: 'New Special', specialsNoData: 'No specials found',
      spEditTitle: 'Edit Special', spNewTitle: 'New Special',
      spSaveChanges: 'Save Changes', spCreateSpecial: 'Create Special',
      spSecDetails: 'Details', spSecTarget: 'Target', spSecDiscount: 'Discount', spSecValidity: 'Validity',
      spDescription: 'Description', spInActive: 'Inactive',
      spProductField: 'Target Type', spProduct: 'Code',
      spPriceType: 'Discount Type', spValue: 'Value', spCombQty: 'Buy Qty',
      spFromDate: 'From', spToDate: 'Until', spDayOfWeek: 'Day',
      spItemSpecials: 'Active Specials',
      spStatusActive: 'Active', spStatusInactive: 'Inactive',
      spStatusUpcoming: 'Upcoming', spStatusExpired: 'Expired',
      // Toasts & dialogs
      enterApiKey: 'Please enter your API key', signInFailed: 'Sign-in failed',
      itemCreated: 'Item created', noChanges: 'No changes',
      savedN: n => `Saved — ${n} field${n > 1 ? 's' : ''} updated`,
      found: desc => `Found: ${desc}`, newBarcode: 'New barcode — fill in details',
      lookupFailed: 'Lookup failed', httpsRequired: 'Camera requires HTTPS — use https://…:3443',
      barcodeLibNotLoaded: 'Barcode library not loaded', cameraPermDenied: 'Camera permission denied',
      couldNotStartCamera: 'Could not start camera', torchUnavailable: 'Torch unavailable',
      fieldFilled: (label, code) => `${label} filled: ${code}`,
      discardChanges: 'Discard unsaved changes?', langToggle: '中文',
    },
    zh: {
      appName: 'AKPOS 商品', appSub: '库存管理',
      apiKeyLabel: 'API 密钥', apiKeyPlaceholder: '粘贴或输入密钥',
      rememberMe: '保持登录', signIn: '登录', signingIn: '登录中…',
      // Home
      homeInventory: '商品管理', homeInventorySub: '管理商品与价格',
      homeSales: '销售数据', homeSalesSub: '查看销售报表', homeSignOut: '退出登录',
      // List
      inventoryTitle: '库存', searchPlaceholder: '搜索名称、条码或SKU…',
      scanBtn: '扫码', newItem: '新商品', noResults: '无结果',
      items: n => `${n} 件商品`, itemsPlus: n => `${n}+ 件商品`,
      noItemsFound: '未找到商品', noItemsSub: '尝试其他搜索或扫描条码',
      // Edit
      editTitle: '编辑商品', newTitle: '新建商品',
      saveChanges: '保存更改', createItem: '创建商品', cancel: '取消', saving: '保存中…',
      sectionIdentification: '基本信息', sectionPricing: '价格与库存', sectionStatus: '状态',
      upcPlaceholder: '扫描或输入条码',
      // Sales
      salesTitle: '销售报表',
      rangeToday: '今日', rangeYesterday: '昨日', rangeWeek: '本周',
      rangeMonth: '本月', rangeMonthly: '月度',
      statRevenue: '营业额', statTransactions: '交易数', statItemsSold: '销售件数', statAvgSale: '均单价',
      monthlySalesTitle: '月度销售', trendTitle: '营业额趋势',
      trendingTitle: '热销商品', soldUnits: n => `${n} 件`, showMore: '查看更多',
      salesNoData: '本时段暂无销售数据',
      vsChange: pct => pct >= 0 ? `+${pct}% 较上期` : `${pct}% 较上期`,
      // Scanner
      scannerStart: '启动相机中…', scannerReady: '对准条码',
      typeBarcodeManually: '手动输入条码', typeManually: label => `手动输入${label}`,
      enterBarcode: '请输入条码：',
      // Specials
      homeSpecials: '促销', homeSpecialsSub: '管理折扣与优惠',
      specialsTitle: '促销管理', newSpecial: '新促销', specialsNoData: '暂无促销',
      spEditTitle: '编辑促销', spNewTitle: '新建促销',
      spSaveChanges: '保存更改', spCreateSpecial: '创建促销',
      spSecDetails: '基本信息', spSecTarget: '适用目标', spSecDiscount: '折扣设置', spSecValidity: '有效期',
      spDescription: '描述', spInActive: '停用',
      spProductField: '目标类型', spProduct: '商品代码',
      spPriceType: '折扣类型', spValue: '折扣值', spCombQty: '购买数量',
      spFromDate: '开始', spToDate: '截止', spDayOfWeek: '适用日',
      spItemSpecials: '当前促销',
      spStatusActive: '有效', spStatusInactive: '已停用',
      spStatusUpcoming: '未开始', spStatusExpired: '已过期',
      // Toasts & dialogs
      enterApiKey: '请输入API密钥', signInFailed: '登录失败',
      itemCreated: '商品已创建', noChanges: '无变更',
      savedN: n => `已保存 — 更新了 ${n} 个字段`,
      found: desc => `找到：${desc}`, newBarcode: '新条码 — 请填写详情',
      lookupFailed: '查询失败', httpsRequired: '相机需要HTTPS — 请使用 https://…:3443',
      barcodeLibNotLoaded: '条码库未加载', cameraPermDenied: '相机权限被拒绝',
      couldNotStartCamera: '无法启动相机', torchUnavailable: '手电筒不可用',
      fieldFilled: (label, code) => `${label} 已填入：${code}`,
      discardChanges: '放弃未保存的更改？', langToggle: 'EN',
    },
  };

  const FIELD_LABELS_ZH = {
    UPC: '条码', SKU: 'SKU', Description: '描述',
    Department: '部门', Unit: '单位', Price1: '价格', InActive: '停用',
  };

  const MONTH_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

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
    loginView: $('loginView'), homeView: $('homeView'),
    listView:  $('listView'),  editView: $('editView'), salesView: $('salesView'),
    specialsView: $('specialsView'), specialEditView: $('specialEditView'),
    apiKeyInput: $('apiKeyInput'), rememberMe: $('rememberMe'),
    loginBtn: $('loginBtn'),
    homeInventoryBtn: $('homeInventoryBtn'), homeSalesBtn: $('homeSalesBtn'),
    homeSpecialsBtn: $('homeSpecialsBtn'), homeLogoutBtn: $('homeLogoutBtn'),
    listHomeBtn: $('listHomeBtn'), logoutBtn: $('logoutBtn'),
    searchInput: $('searchInput'), searchClearBtn: $('searchClearBtn'), searchScanBtn: $('searchScanBtn'),
    newBtn: $('newBtn'), itemsList: $('itemsList'), skeleton: $('skeleton'),
    listEmpty: $('listEmpty'), itemCount: $('itemCount'),
    loadMoreSpinner: $('loadMoreSpinner'), listSentinel: $('listSentinel'),
    backBtn: $('backBtn'), editTitle: $('editTitle'), editSub: $('editSub'),
    editForm: $('editForm'), formFields: $('formFields'), saveBtn: $('saveBtn'), cancelBtn: $('cancelBtn'),
    salesBackBtn: $('salesBackBtn'), salesRangeTabs: $('salesRangeTabs'),
    salesLoading: $('salesLoading'), salesStats: $('salesStats'), salesMonthly: $('salesMonthly'),
    salesEmpty: $('salesEmpty'),
    toasts: $('toasts'),
    scannerOverlay: $('scannerOverlay'), scannerVideo: $('scannerVideo'),
    scannerStatus: $('scannerStatus'), scannerCloseBtn: $('scannerCloseBtn'),
    scannerTorchBtn: $('scannerTorchBtn'), scannerAltBtn: $('scannerAltBtn'),
    // Specials list
    specialsBackBtn: $('specialsBackBtn'), specialsList: $('specialsList'),
    specialsSkeleton: $('specialsSkeleton'), specialsEmpty: $('specialsEmpty'),
    specialsSentinel: $('specialsSentinel'), newSpecialBtn: $('newSpecialBtn'),
    spSearchInput: $('spSearchInput'), spSearchClearBtn: $('spSearchClearBtn'),
    // Special edit form
    spBackBtn: $('spBackBtn'), spEditTitle: $('spEditTitle'), spEditSub: $('spEditSub'),
    spSaveBtn: $('spSaveBtn'), spCancelBtn: $('spCancelBtn'), spEditForm: $('specialEditForm'),
    spDescription: $('spDescription'), spInActive: $('spInActive'),
    spProductField: $('spProductField'), spProduct: $('spProduct'),
    spPriceType: $('spPriceType'), spValue: $('spValue'), spCombQty: $('spCombQty'),
    spFromDate: $('spFromDate'), spToDate: $('spToDate'), spDayOfWeek: $('spDayOfWeek'),
    // Item specials (Option B)
    itemSpecialsSection: $('itemSpecialsSection'), itemSpecialsList: $('itemSpecialsList'),
    itemAddSpecialBtn: $('itemAddSpecialBtn'),
  };

  /* ── State ────────────────────────────────────── */
  let apiKey         = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || '';
  let mode           = 'edit';
  let schema         = null;
  let curItem        = null;
  let scanMode       = 'lookup';
  let scanFillField  = 'UPC';
  let formDirty      = false;
  let nativeDetector = null;
  let currentSalesRange  = 'today';
  let trendingOffset     = 0;
  let trendingCurRange   = 'today';
  const TRENDING_PAGE    = 5;
  function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  let salesCustomFrom = todayStr();
  let salesCustomTo   = todayStr();

  // Specials state
  let curSpecial      = null;
  let specialMode     = 'edit';
  let specialNavSrc   = 'list';
  let spOffset        = 0;
  let spAllLoaded     = false;
  let spLoading       = false;
  let spSearch        = '';
  const SP_PAGE       = 20;

  const FORM_SECTIONS = [
    { titleKey: 'sectionIdentification', cols: ['UPC', 'SKU', 'Description'] },
    { titleKey: 'sectionPricing',        cols: ['Department', 'Unit', 'Price1'] },
    { titleKey: 'sectionStatus',         cols: ['InActive'] },
  ];

  /* ── applyLang ────────────────────────────────── */
  function applyLang() {
    const toggle = t('langToggle');
    document.querySelectorAll('.lang-btn, .lang-btn-login').forEach(b => b.textContent = toggle);

    // Login
    $('loginTitle').textContent   = t('appName');
    $('loginSub').textContent     = t('appSub');
    $('apiKeyLabel').textContent  = t('apiKeyLabel');
    els.apiKeyInput.placeholder   = t('apiKeyPlaceholder');
    $('rememberText').textContent = t('rememberMe');
    if (!els.loginBtn.disabled) els.loginBtn.textContent = t('signIn');

    // Home
    $('homeBrandName').textContent    = t('appName');
    $('homeInvTitle').textContent     = t('homeInventory');
    $('homeInvSub').textContent       = t('homeInventorySub');
    $('homeSalesBtnTitle').textContent= t('homeSales');
    $('homeSalesSub').textContent     = t('homeSalesSub');
    $('homeLogoutText').textContent   = t('homeSignOut');

    // List
    $('topbarName').textContent      = t('inventoryTitle');
    els.searchInput.placeholder      = t('searchPlaceholder');
    $('scanBtnText').textContent     = t('scanBtn');
    $('newBtnText').textContent      = t('newItem');
    $('listEmptyTitle').textContent  = t('noItemsFound');
    $('listEmptySub').textContent    = t('noItemsSub');
    els.cancelBtn.textContent        = t('cancel');

    if (!els.editView.hidden) {
      if (mode === 'new') { els.editTitle.textContent = t('newTitle'); if (!els.saveBtn.disabled) els.saveBtn.textContent = t('createItem'); }
      else                { els.editTitle.textContent = t('editTitle'); if (!els.saveBtn.disabled) els.saveBtn.textContent = t('saveChanges'); }
    }

    // Sales
    $('salesViewTitle').textContent    = t('salesTitle');
    $('statRevenueLabel').textContent    = t('statRevenue');
    $('statTransLabel').textContent      = t('statTransactions');
    $('statItemsSoldLabel').textContent  = t('statItemsSold');
    $('statAvgLabel').textContent        = t('statAvgSale');
    $('salesMonthlyTitle').textContent = t('monthlySalesTitle');
    $('salesTrendTitle').textContent    = t('trendTitle');
    $('salesTrendingTitle').textContent = t('trendingTitle');
    $('salesEmptyTitle').textContent    = t('salesNoData');
    document.querySelectorAll('.range-tab').forEach(btn => {
      const key = 'range' + btn.dataset.range.charAt(0).toUpperCase() + btn.dataset.range.slice(1);
      btn.textContent = t(key);
    });

    if (!els.scannerOverlay.hidden) {
      els.scannerAltBtn.textContent = scanMode === 'fill-field'
        ? t('typeManually', colLabel(scanFillField)) : t('typeBarcodeManually');
    }

    updateCountBadge();

    if (schema) {
      const wasDirty    = formDirty;
      const savedValues = !els.editView.hidden ? readFields() : null;
      buildForm();
      if (savedValues) for (const [col, val] of Object.entries(savedValues)) setField(col, val);
      formDirty = wasDirty;
    }

    // Specials
    $('homeSpecialsBtnTitle').textContent = t('homeSpecials');
    $('homeSpecialsSub').textContent      = t('homeSpecialsSub');
    $('specialsTopbarName').textContent   = t('specialsTitle');
    $('specialsEmptyTitle').textContent   = t('specialsNoData');
    $('newSpecialBtnText').textContent    = t('newSpecial');
    $('spSecDetails').textContent         = t('spSecDetails');
    $('spSecTarget').textContent          = t('spSecTarget');
    $('spSecDiscount').textContent        = t('spSecDiscount');
    $('spSecValidity').textContent        = t('spSecValidity');
    $('spDescLabel').textContent          = t('spDescription');
    $('spInActiveLabel').textContent      = t('spInActive');
    $('spProductFieldLabel').textContent  = t('spProductField');
    $('spProductLabel').textContent       = t('spProduct');
    $('spPriceTypeLabel').textContent     = t('spPriceType');
    $('spValueLabel').textContent         = t('spValue');
    $('spCombQtyLabel').textContent       = t('spCombQty');
    $('spFromDateLabel').textContent      = t('spFromDate');
    $('spToDateLabel').textContent        = t('spToDate');
    $('spDayLabel').textContent           = t('spDayOfWeek');
    $('itemSpecialsSectionTitle').textContent = t('spItemSpecials');
    if (!els.specialEditView.hidden) {
      if (specialMode === 'new') {
        els.spEditTitle.textContent = t('spNewTitle');
        if (!els.spSaveBtn.disabled) els.spSaveBtn.textContent = t('spCreateSpecial');
      } else {
        els.spEditTitle.textContent = t('spEditTitle');
        if (!els.spSaveBtn.disabled) els.spSaveBtn.textContent = t('spSaveChanges');
      }
    }
    els.spCancelBtn.textContent = t('cancel');

    if (!els.salesView.hidden) loadSales(currentSalesRange);
  }

  document.querySelectorAll('.lang-btn, .lang-btn-login').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = lang === 'en' ? 'zh' : 'en';
      localStorage.setItem(LANG_KEY, lang);
      applyLang();
    });
  });

  /* ── View switching ───────────────────────────── */
  function showView(name) {
    els.loginView.hidden      = name !== 'login';
    els.homeView.hidden       = name !== 'home';
    els.listView.hidden       = name !== 'list';
    els.editView.hidden       = name !== 'edit';
    els.salesView.hidden      = name !== 'sales';
    els.specialsView.hidden   = name !== 'specials';
    els.specialEditView.hidden = name !== 'specialEdit';
  }

  /* ── Toast ────────────────────────────────────── */
  function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`.trim();
    const dot = document.createElement('span'); dot.className = 'toast-dot';
    const txt = document.createElement('span'); txt.textContent = msg;
    el.append(dot, txt);
    els.toasts.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity 200ms, transform 200ms'; el.style.opacity = '0'; el.style.transform = 'translateY(-8px)'; }, 2800);
    setTimeout(() => el.remove(), 3100);
  }

  function fmt$(v) {
    if (v == null) return '';
    const n = Number(v);
    return Number.isNaN(n) ? String(v) : n.toLocaleString(undefined, { style: 'currency', currency: 'NZD' });
  }

  /* ── API ──────────────────────────────────────── */
  async function api(path, opts = {}) {
    const hdrs = { 'X-API-Key': apiKey, ...(opts.headers || {}) };
    if (opts.body && !hdrs['Content-Type']) hdrs['Content-Type'] = 'application/json';
    const r = await fetch(path, { ...opts, headers: hdrs });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    if (!r.ok) { const e = new Error(data.error || `HTTP ${r.status}`); e.status = r.status; throw e; }
    return data;
  }
  function vibrate(ms) { try { navigator.vibrate?.(ms); } catch {} }

  /* ── Login ────────────────────────────────────── */
  async function doLogin() {
    const key = els.apiKeyInput.value.trim();
    if (!key) { toast(t('enterApiKey'), 'error'); return; }
    apiKey = key;
    els.loginBtn.disabled = true; els.loginBtn.textContent = t('signingIn');
    try {
      await api('/api/auth/check', { method: 'POST', body: '{}' });
      if (els.rememberMe.checked) localStorage.setItem(STORAGE_KEY, key);
      else sessionStorage.setItem(STORAGE_KEY, key);
      els.apiKeyInput.value = '';
      await ensureSchema();
      showView('home');
    } catch (err) {
      apiKey = ''; toast(err.message || t('signInFailed'), 'error');
    } finally {
      els.loginBtn.disabled = false; els.loginBtn.textContent = t('signIn');
    }
  }
  els.loginBtn.addEventListener('click', doLogin);
  els.apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  function doLogout() {
    apiKey = '';
    localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STORAGE_KEY);
    showView('login');
  }
  els.logoutBtn.addEventListener('click', doLogout);
  els.homeLogoutBtn.addEventListener('click', doLogout);

  /* ── Schema ───────────────────────────────────── */
  async function ensureSchema() {
    if (schema) return;
    schema = await api('/api/schema');
    buildForm();
  }

  /* ── Home navigation ─────────────────────────── */
  els.homeInventoryBtn.addEventListener('click', () => {
    showView('list'); loadItems('');
  });
  els.homeSalesBtn.addEventListener('click', () => {
    showView('sales'); loadSales('today');
  });
  els.homeSpecialsBtn.addEventListener('click', () => {
    spSearch = ''; els.spSearchInput.value = ''; els.spSearchClearBtn.hidden = true;
    showView('specials'); loadSpecials(true);
  });
  els.listHomeBtn.addEventListener('click', () => showView('home'));
  els.salesBackBtn.addEventListener('click', () => showView('home'));
  els.specialsBackBtn.addEventListener('click', () => { showView('home'); });
  els.newSpecialBtn.addEventListener('click', () => openSpecialNew());
  els.spBackBtn.addEventListener('click', () => {
    showView(specialNavSrc === 'edit' ? 'edit' : 'specials');
  });
  els.spCancelBtn.addEventListener('click', () => {
    showView(specialNavSrc === 'edit' ? 'edit' : 'specials');
  });

  // Specials search
  let spSearchTimer = null;
  els.spSearchInput.addEventListener('input', () => {
    const v = els.spSearchInput.value;
    els.spSearchClearBtn.hidden = !v.length;
    clearTimeout(spSearchTimer);
    spSearchTimer = setTimeout(() => { spSearch = v.trim(); loadSpecials(true); }, 260);
  });
  els.spSearchClearBtn.addEventListener('click', () => {
    els.spSearchInput.value = ''; els.spSearchClearBtn.hidden = true;
    spSearch = ''; loadSpecials(true); els.spSearchInput.focus();
  });

  /* ── Pagination state ────────────────────────── */
  const PAGE_SIZE = 50;
  let listSearch = '', listOffset = 0, listAllLoaded = false, listLoading = false;

  /* ── Search ───────────────────────────────────── */
  let searchTimer = null;
  els.searchInput.addEventListener('input', () => {
    const v = els.searchInput.value;
    els.searchClearBtn.hidden = !v.length;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadItems(v.trim()), 260);
  });
  els.searchClearBtn.addEventListener('click', () => {
    els.searchInput.value = ''; els.searchClearBtn.hidden = true;
    loadItems(''); els.searchInput.focus();
  });
  els.searchScanBtn.addEventListener('click', () => { scanMode = 'lookup'; startScanner(); });

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
      <div class="item-body"><div class="item-name"></div><div class="item-meta"></div></div>
      <div class="item-right"><div class="item-price"></div>${item.Unit ? `<span class="item-unit"></span>` : ''}</div>`;
    li.querySelector('.item-name').textContent  = desc;
    li.querySelector('.item-meta').textContent  = meta.join(' · ');
    li.querySelector('.item-price').textContent = fmt$(item.Price1);
    if (item.Unit) li.querySelector('.item-unit').textContent = item.Unit;
    li.addEventListener('click', () => openEdit(item.UPC));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEdit(item.UPC); });
    return li;
  }

  function updateCountBadge() {
    const n = els.itemsList.children.length;
    if (n === 0) { els.itemCount.textContent = listSearch ? t('noResults') : t('items', 0); }
    else { els.itemCount.textContent = listAllLoaded ? t('items', n) : t('itemsPlus', n); }
  }

  async function loadItems(search) {
    listSearch = search; listOffset = 0; listAllLoaded = false; listLoading = false;
    els.listEmpty.hidden = true; els.loadMoreSpinner.hidden = true;
    els.itemsList.innerHTML = ''; els.skeleton.hidden = false;
    await fetchNextPage();
  }

  async function fetchNextPage() {
    if (listLoading || listAllLoaded) return;
    listLoading = true;
    const isFirst = listOffset === 0;
    if (!isFirst) els.loadMoreSpinner.hidden = false;
    try {
      const items = await api(`/api/items?search=${encodeURIComponent(listSearch)}&offset=${listOffset}&limit=${PAGE_SIZE}`);
      if (isFirst) els.skeleton.hidden = true;
      els.loadMoreSpinner.hidden = true;
      if (items.length < PAGE_SIZE) listAllLoaded = true;
      listOffset += items.length;
      if (isFirst && items.length === 0) { updateCountBadge(); els.listEmpty.hidden = false; listLoading = false; return; }
      const frag = document.createDocumentFragment();
      for (const item of items) frag.appendChild(buildItemCard(item));
      els.itemsList.appendChild(frag);
      updateCountBadge();
    } catch (err) {
      if (isFirst) els.skeleton.hidden = true;
      els.loadMoreSpinner.hidden = true;
      if (err.status === 401) { doLogout(); listLoading = false; return; }
      toast(err.message, 'error');
    }
    listLoading = false;
  }

  const sentinelObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) fetchNextPage();
  }, { rootMargin: '120px' });
  sentinelObserver.observe(els.listSentinel);

  /* ── Sales dashboard ──────────────────────────── */
  function salesRangeQS(range) {
    if (range === 'custom') return `range=custom&from=${salesCustomFrom}&to=${salesCustomTo}`;
    return `range=${range}`;
  }

  async function loadSales(range) {
    currentSalesRange = range;
    document.querySelectorAll('.range-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.range === range);
    });
    const customRow = $('salesCustomRow');
    if (customRow) customRow.hidden = (range !== 'custom');

    $('salesStats').hidden     = true;
    $('salesMonthly').hidden   = true;
    $('salesTrend').hidden     = true;
    $('salesTrending').hidden  = true;
    $('salesEmpty').hidden     = true;
    els.salesLoading.hidden    = false;

    trendingOffset   = 0;
    trendingCurRange = range;
    try {
      if (range === 'monthly') {
        const monthly = await api('/api/sales/monthly');
        els.salesLoading.hidden = true;
        if (!monthly.length) { $('salesEmpty').hidden = false; }
        else { renderMonthly(monthly); $('salesMonthly').hidden = false; }
      } else {
        const qs = salesRangeQS(range);
        const [summary, trend, trending] = await Promise.all([
          api(`/api/sales/summary?${qs}`),
          api(`/api/sales/trend?${qs}`),
          api(`/api/sales/trending?${qs}&limit=${TRENDING_PAGE}&offset=0`),
        ]);
        els.salesLoading.hidden = true;
        if (summary.transCount === 0) { $('salesEmpty').hidden = false; }
        else {
          renderStats(summary);
          $('salesStats').hidden = false;
          renderTrend(trend, range);
        }
        renderTrending(trending, false);
      }
    } catch (err) {
      els.salesLoading.hidden = true;
      toast(err.message, 'error');
    }
  }

  function renderStats(data) {
    $('statRevenue').textContent    = fmt$(data.revenue);
    $('statTransCount').textContent = String(data.transCount);
    $('statItemsSold').textContent  = String(data.itemsSold || 0);
    $('statAvg').textContent        = fmt$(data.avgPerTrans);

    function applyChange(el, cur, prev) {
      if (prev > 0) {
        const pct = Math.round((cur - prev) / prev * 100);
        el.textContent = t('vsChange', pct);
        el.className = 'stat-change ' + (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat');
      } else { el.textContent = ''; el.className = 'stat-change'; }
    }
    applyChange($('statRevenueChange'),    data.revenue,    data.prevRevenue);
    applyChange($('statTransChange'),      data.transCount, data.prevTransCount);
    applyChange($('statItemsSoldChange'),  data.itemsSold,  data.prevItemsSold);
  }

  function renderMonthly(data) {
    const names  = lang === 'zh' ? MONTH_ZH : MONTH_EN;
    const maxRev = Math.max(...data.map(d => Number(d.Revenue) || 0), 0.01);
    const bars   = $('monthlyBars');
    bars.innerHTML = '';
    for (const row of data) {
      const rev = Number(row.Revenue) || 0;
      const pct = Math.max(Math.round(rev / maxRev * 100), rev > 0 ? 3 : 0);
      const div = document.createElement('div');
      div.className = 'monthly-bar-row';
      div.innerHTML = `
        <span class="monthly-bar-month"></span>
        <div class="monthly-bar-track"><div class="monthly-bar-fill" style="width:${pct}%"></div></div>
        <span class="monthly-bar-value"></span>`;
      div.querySelector('.monthly-bar-month').textContent = names[row.mo - 1];
      div.querySelector('.monthly-bar-value').textContent = fmt$(rev);
      bars.appendChild(div);
    }
  }

  const DAY_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAY_ZH = ['周日','周一','周二','周三','周四','周五','周六'];

  function toDateStr(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  function formatHour(h) {
    if (lang === 'zh') return h + '时';
    if (h === 0) return '12a';
    if (h < 12) return h + 'a';
    if (h === 12) return '12p';
    return (h - 12) + 'p';
  }

  function clientDateRange(range) {
    const now = new Date();
    const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tom = new Date(tod.getTime() + 86400000);
    switch (range) {
      case 'yesterday': return { from: new Date(tod.getTime() - 86400000), to: tod };
      case 'week': {
        const dow = tod.getDay();
        return { from: new Date(tod.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000), to: tom };
      }
      case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tom };
      default: return { from: tod, to: tom };
    }
  }

  function buildSlots(range, revMap, soldMap) {
    if (range === 'today' || range === 'yesterday') {
      return Array.from({ length: 24 }, (_, h) => ({
        revenue:   Number(revMap[h])  || 0,
        itemsSold: Number(soldMap[h]) || 0,
        label: formatHour(h),
        showLabel: h % 6 === 0,
      }));
    }
    const { from, to } = clientDateRange(range);
    const slots = [];
    const cur = new Date(from.getTime());
    while (cur < to) {
      const ds = toDateStr(cur);
      const dayNum = cur.getDate();
      const label = range === 'week'
        ? (lang === 'zh' ? DAY_ZH[cur.getDay()] : DAY_EN[cur.getDay()])
        : String(dayNum);
      slots.push({
        revenue:   Number(revMap[ds])  || 0,
        itemsSold: Number(soldMap[ds]) || 0,
        label,
        showLabel: range === 'week' || dayNum === 1 || dayNum % 5 === 0,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return slots;
  }

  function fmtShort(v) {
    const n = Number(v);
    if (!v || Number.isNaN(n) || n === 0) return '';
    if (n >= 10000) return '$' + Math.round(n / 1000) + 'k';
    if (n >= 1000)  return '$' + (n / 1000).toFixed(1) + 'k';
    return '$' + Math.round(n);
  }

  function renderTrend(trendData, range) {
    const revMap = {}, soldMap = {};
    for (const row of (trendData.rows || [])) {
      revMap[row.period]  = Number(row.Revenue)   || 0;
      soldMap[row.period] = Number(row.ItemsSold) || 0;
    }
    const slots  = buildSlots(range, revMap, soldMap);
    const maxRev = Math.max(...slots.map(s => s.revenue), 0.01);
    const MAX_PX = window.innerWidth >= 1024 ? 120 : 80;

    const barsEl   = $('trendBars');
    const labelsEl = $('trendLabels');
    barsEl.innerHTML   = '';
    labelsEl.innerHTML = '';

    for (const slot of slots) {
      const barPx = slot.revenue > 0
        ? Math.max(Math.round(slot.revenue / maxRev * MAX_PX), 4)
        : 3;

      const item = document.createElement('div');
      item.className = 'trend-item';

      const val = document.createElement('span');
      val.className   = 'trend-val';
      val.textContent = slot.revenue > 0 ? fmtShort(slot.revenue) : '';

      const bar = document.createElement('div');
      bar.className  = 'trend-bar' + (slot.revenue === 0 ? ' zero' : '');
      bar.style.height = barPx + 'px';
      bar.title = `${fmt$(slot.revenue)} · ${slot.itemsSold} items`;

      item.append(val, bar);
      barsEl.appendChild(item);

      const lbl = document.createElement('div');
      lbl.className   = 'trend-label';
      lbl.textContent = slot.showLabel ? slot.label : '';
      labelsEl.appendChild(lbl);
    }

    $('salesTrend').hidden = false;
  }

  function renderTrending(data, append) {
    const list = $('trendingList');
    const btn  = $('trendingMoreBtn');
    if (!append) list.innerHTML = '';
    if (!data || !data.length) {
      if (!append) $('salesTrending').hidden = true;
      btn.hidden = true;
      return;
    }
    const startRank = list.children.length + 1;
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const row  = document.createElement('div');
      row.className = 'trending-row';

      const rankEl = document.createElement('span');
      rankEl.className = 'trending-rank';
      rankEl.textContent = `#${startRank + i}`;

      const body = document.createElement('div');
      body.className = 'trending-body';
      const name = document.createElement('div');
      name.className = 'trending-name';
      name.textContent = item.Description || item.UPC;
      const upc = document.createElement('div');
      upc.className = 'trending-upc';
      upc.textContent = item.UPC;
      body.append(name, upc);

      const stats = document.createElement('div');
      stats.className = 'trending-stats';
      const qty = document.createElement('div');
      qty.className = 'trending-qty';
      qty.textContent = t('soldUnits', Number(item.TotalQty));
      const rev = document.createElement('div');
      rev.className = 'trending-rev';
      rev.textContent = fmt$(item.TotalRevenue);
      stats.append(qty, rev);

      row.append(rankEl, body, stats);
      list.appendChild(row);
    }
    btn.textContent = t('showMore');
    btn.hidden = data.length < TRENDING_PAGE;
    $('salesTrending').hidden = false;
  }

  $('trendingMoreBtn').addEventListener('click', async () => {
    const btn = $('trendingMoreBtn');
    btn.disabled = true;
    trendingOffset += TRENDING_PAGE;
    try {
      const data = await api(`/api/sales/trending?${salesRangeQS(trendingCurRange)}&limit=${TRENDING_PAGE}&offset=${trendingOffset}`);
      renderTrending(data, true);
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });

  els.salesRangeTabs.addEventListener('click', e => {
    const btn = e.target.closest('.range-tab');
    if (!btn) return;
    if (btn.dataset.range === 'custom') {
      const fd = $('salesFromDate'), td = $('salesToDate');
      if (fd && !fd.value) fd.value = todayStr();
      if (td && !td.value) td.value = todayStr();
      salesCustomFrom = $('salesFromDate')?.value || todayStr();
      salesCustomTo   = $('salesToDate')?.value   || todayStr();
    }
    loadSales(btn.dataset.range);
  });

  let customDateTimer = null;
  function onCustomDateChange() {
    salesCustomFrom = $('salesFromDate')?.value || todayStr();
    salesCustomTo   = $('salesToDate')?.value   || todayStr();
    if (!salesCustomFrom || !salesCustomTo) return;
    if (salesCustomTo < salesCustomFrom) { $('salesToDate').value = salesCustomFrom; salesCustomTo = salesCustomFrom; }
    clearTimeout(customDateTimer);
    customDateTimer = setTimeout(() => loadSales('custom'), 400);
  }
  $('salesFromDate')?.addEventListener('change', onCustomDateChange);
  $('salesToDate')?.addEventListener('change', onCustomDateChange);

  /* ── Form build ───────────────────────────────── */
  function buildForm() {
    els.formFields.innerHTML = '';
    const rendered = new Set();
    for (const { titleKey, cols } of FORM_SECTIONS) {
      const sectionCols = cols.filter(c => schema.columns[c] && !schema.columns[c].readonly);
      if (!sectionCols.length) continue;
      const hdr = document.createElement('div'); hdr.className = 'form-section-title'; hdr.textContent = t(titleKey);
      els.formFields.appendChild(hdr);
      const group = document.createElement('div'); group.className = 'form-group'; els.formFields.appendChild(group);
      for (const name of sectionCols) { group.appendChild(buildRow(name, schema.columns[name])); rendered.add(name); }
    }
    for (const [name, def] of Object.entries(schema.columns)) {
      if (def.readonly || rendered.has(name)) continue;
      els.formFields.appendChild(buildRow(name, def));
    }
  }

  function buildRow(name, def) {
    const row = document.createElement('div'); row.className = 'form-row';
    if (def.type === 'bool') {
      row.innerHTML = `<label class="toggle-row"><span class="toggle-label"></span><input type="checkbox" /><span class="toggle-track"></span></label>`;
      row.querySelector('.toggle-label').textContent = colLabel(name);
      const input = row.querySelector('input'); input.name = name; input.dataset.col = name;
      input.addEventListener('change', () => { formDirty = true; }); return row;
    }
    const lbl = document.createElement('span'); lbl.className = 'field-label';
    lbl.textContent = colLabel(name) + (def.required ? ' *' : ''); row.appendChild(lbl);
    let input;
    if (def.type === 'decimal' && (def.sql === 'Money' || def.sql === 'SmallMoney')) {
      const wrap = document.createElement('div'); wrap.className = 'prefix-wrap';
      const sym = document.createElement('span'); sym.className = 'prefix-sym'; sym.textContent = '$';
      input = document.createElement('input'); input.type = 'number'; input.step = '0.01'; input.min = '0';
      if (def.required) input.required = true; input.placeholder = '0.00';
      wrap.append(sym, input); row.appendChild(wrap);
    } else if (def.type === 'int') {
      input = document.createElement('input'); input.type = 'number'; input.step = '1'; input.placeholder = '0';
    } else if (def.type === 'datetime') {
      input = document.createElement('input'); input.type = 'datetime-local';
    } else {
      input = document.createElement('input'); input.type = 'text';
      if (def.len) input.maxLength = def.len;
      if (name === 'UPC') { input.inputMode = 'numeric'; input.placeholder = t('upcPlaceholder'); }
      if (name === 'UPC' || name === 'SKU') {
        const wrap = document.createElement('div'); wrap.className = 'input-with-btn';
        const camBtn = document.createElement('button'); camBtn.type = 'button'; camBtn.className = 'cam-btn';
        camBtn.setAttribute('aria-label', `Scan into ${colLabel(name)}`);
        camBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="8" x2="7" y2="16"/><line x1="11" y1="8" x2="11" y2="16"/><line x1="15" y1="8" x2="15" y2="16"/></svg>`;
        camBtn.addEventListener('click', () => { scanMode = 'fill-field'; scanFillField = name; startScanner(); });
        wrap.append(input, camBtn); row.appendChild(wrap);
      } else if (def.datalist) {
        const dlId = `dl-${name}`; input.setAttribute('list', dlId);
        const dl = document.createElement('datalist'); dl.id = dlId;
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
  function fieldInput(name) { return els.formFields.querySelector(`[data-col="${name}"]`); }

  function setField(name, value) {
    const input = fieldInput(name); if (!input) return;
    const def = schema.columns[name]; if (!def) return;
    if (def.type === 'bool') { input.checked = def.boolInvert ? !value : !!value; }
    else if (def.type === 'datetime') {
      if (value) { const d = new Date(value); if (!isNaN(d)) { const p = n => String(n).padStart(2,'0'); input.value = `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; } else input.value = ''; }
      else input.value = '';
    } else { input.value = (value == null) ? '' : String(value); }
  }

  function clearFields() {
    formDirty = false;
    els.formFields.querySelectorAll('[data-col]').forEach(input => {
      const def = schema.columns[input.dataset.col]; if (!def) return;
      if (def.type === 'bool') input.checked = !!def.boolInvert; else input.value = '';
    });
  }

  function readFields() {
    const out = {};
    els.formFields.querySelectorAll('[data-col]').forEach(input => {
      const col = input.dataset.col; const def = schema.columns[col];
      if (!def || def.readonly) return;
      if (def.type === 'bool') out[col] = def.boolInvert ? !input.checked : !!input.checked;
      else out[col] = input.value === '' ? null : input.value;
    });
    return out;
  }

  function diffFields(original) {
    const all = readFields(); const out = {};
    for (const [col, val] of Object.entries(all)) {
      const def = schema.columns[col]; const prev = original?.[col] ?? null;
      if (def.type === 'bool' && !!prev === !!val) continue;
      if (def.type === 'string') { if ((val ?? '') === (prev ?? '')) continue; }
      if (def.type === 'decimal' || def.type === 'int') { if (val === null && prev === null) continue; if (val !== null && prev !== null && Number(val) === Number(prev)) continue; }
      if (def.type === 'datetime') { const a = val ? new Date(val).getTime() : null; const b = prev ? new Date(prev).getTime() : null; if (a === b) continue; }
      out[col] = val;
    }
    return out;
  }

  /* ── Open edit / new ──────────────────────────── */
  els.newBtn.addEventListener('click', () => openNew());

  function goBackToList() {
    formDirty = false; showView('list'); loadItems(els.searchInput.value.trim());
  }
  els.backBtn.addEventListener('click', () => { if (formDirty && !confirm(t('discardChanges'))) return; goBackToList(); });
  els.cancelBtn.addEventListener('click', () => { if (formDirty && !confirm(t('discardChanges'))) return; goBackToList(); });

  function openNew(prefillUPC = '') {
    mode = 'new'; curItem = null; clearFields();
    els.editTitle.textContent = t('newTitle'); els.editSub.textContent = ''; els.saveBtn.textContent = t('createItem');
    if (prefillUPC) setField('UPC', prefillUPC);
    showView('edit'); window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => { (prefillUPC ? fieldInput('Description') : fieldInput('UPC'))?.focus(); }, 80);
  }

  async function openEdit(upc) {
    mode = 'edit'; curItem = null; clearFields();
    els.editTitle.textContent = t('editTitle'); els.editSub.textContent = upc; els.saveBtn.textContent = t('saveChanges');
    els.itemSpecialsSection.hidden = true; els.itemSpecialsList.innerHTML = '';
    showView('edit'); window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const item = await api(`/api/items/${encodeURIComponent(upc)}`);
      curItem = item;
      for (const col of Object.keys(schema.columns)) setField(col, item[col]);
      formDirty = false;
      if (item.Updated) { const d = new Date(item.Updated); if (!isNaN(d)) els.editSub.textContent = `${upc}  ·  ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; }
    } catch (err) { toast(err.message, 'error'); }
    loadItemSpecials(upc);
  }

  /* ── Save ─────────────────────────────────────── */
  els.editForm.addEventListener('submit', async e => {
    e.preventDefault();
    const orig = els.saveBtn.textContent;
    els.saveBtn.disabled = true; els.saveBtn.textContent = t('saving');
    try {
      if (mode === 'new') {
        const payload = readFields();
        for (const k of Object.keys(payload)) if (payload[k] === null) delete payload[k];
        await api('/api/items', { method: 'POST', body: JSON.stringify(payload) });
        formDirty = false; toast(t('itemCreated'), 'success'); showView('list'); loadItems('');
      } else {
        const diff = diffFields(curItem);
        if (!Object.keys(diff).length) { toast(t('noChanges'), ''); return; }
        await api(`/api/items/${encodeURIComponent(curItem.UPC)}`, { method: 'PUT', body: JSON.stringify(diff) });
        formDirty = false; curItem = { ...curItem, ...diff };
        if (diff.UPC) els.editSub.textContent = diff.UPC;
        const n = Object.keys(diff).length; toast(t('savedN', n), 'success');
      }
    } catch (err) { toast(err.message, 'error'); }
    finally { els.saveBtn.disabled = false; els.saveBtn.textContent = orig; }
  });

  /* ── Scanner ──────────────────────────────────── */
  let scanStream = null, scanTrack = null, scanReader = null, scanActive = false;

  function secureCtx() { return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1'; }

  els.scannerCloseBtn.addEventListener('click', stopScanner);
  els.scannerAltBtn.addEventListener('click', async () => {
    stopScanner();
    if (scanMode === 'fill-field') return;
    const code = window.prompt(t('enterBarcode'));
    if (code?.trim()) await lookupCode(code.trim());
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!els.scannerOverlay.hidden) { stopScanner(); return; }
      if (!els.editView.hidden) els.backBtn.click();
    }
  });

  async function startScanner() {
    if (!secureCtx()) { toast(t('httpsRequired'), 'error'); return; }
    if (typeof ZXing === 'undefined') { toast(t('barcodeLibNotLoaded'), 'error'); return; }
    els.scannerOverlay.hidden = false;
    els.scannerStatus.textContent = t('scannerStart');
    els.scannerAltBtn.textContent = scanMode === 'fill-field' ? t('typeManually', colLabel(scanFillField)) : t('typeBarcodeManually');
    nativeDetector = null;
    if ('BarcodeDetector' in window) { try { nativeDetector = new BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf','qr_code'] }); } catch { nativeDetector = null; } }
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      scanTrack = scanStream.getVideoTracks()[0] ?? null;
      els.scannerVideo.srcObject = scanStream;
      await new Promise((resolve, reject) => { els.scannerVideo.onloadeddata = resolve; els.scannerVideo.onerror = reject; setTimeout(resolve, 3000); });
      await els.scannerVideo.play().catch(() => {});
      setupTorch();
      try {
        const hints = new Map([[ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39, ZXing.BarcodeFormat.ITF]], [ZXing.DecodeHintType.TRY_HARDER, true]]);
        scanReader = new ZXing.MultiFormatReader(); scanReader.setHints(hints);
      } catch (e) { console.warn('ZXing fallback', e); scanReader = null; }
      scanActive = true; els.scannerStatus.textContent = t('scannerReady'); runScanLoop();
    } catch (err) {
      stopScanner();
      toast(err?.name === 'NotAllowedError' ? t('cameraPermDenied') : (err?.message || t('couldNotStartCamera')), 'error');
    }
  }

  function runScanLoop() {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });
    const tick   = async () => {
      if (!scanActive) return;
      const video = els.scannerVideo;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const vw = video.videoWidth, vh = video.videoHeight;
        const cropW = Math.round(vw * 0.80), cropH = Math.round(vh * 0.60);
        canvas.width = cropW; canvas.height = cropH;
        ctx.drawImage(video, Math.round((vw-cropW)/2), Math.round((vh-cropH)/2), cropW, cropH, 0, 0, cropW, cropH);
        let code = null;
        if (nativeDetector) { try { const r = await nativeDetector.detect(canvas); if (r.length) code = r[0].rawValue; } catch {} }
        if (!code && scanReader) {
          try { const lum = new ZXing.HTMLCanvasElementLuminanceSource(canvas); const r = scanReader.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(lum))); if (r) code = r.getText(); }
          catch (e) { if (e?.name && e.name !== 'NotFoundException') console.debug('ZXing:', e.name); }
        }
        if (code && scanActive) { scanActive = false; vibrate(60); flashScanSuccess(); onScanResult(code); return; }
      }
      setTimeout(() => { if (scanActive) requestAnimationFrame(tick); }, 100);
    };
    requestAnimationFrame(tick);
  }

  function flashScanSuccess() {
    const box = $('scanBox');
    if (box) { box.classList.add('detected'); setTimeout(() => box.classList.remove('detected'), 500); }
    const flash = document.createElement('div'); flash.className = 'scan-flash';
    els.scannerOverlay.appendChild(flash); setTimeout(() => flash.remove(), 450);
  }

  function stopScanner() {
    scanActive = false; scanReader = null; nativeDetector = null;
    if (scanStream) { scanStream.getTracks().forEach(tr => tr.stop()); scanStream = null; }
    scanTrack = null; els.scannerVideo.srcObject = null;
    els.scannerTorchBtn.hidden = true; els.scannerOverlay.hidden = true;
  }

  function setupTorch() {
    if (!scanTrack?.getCapabilities) return;
    const caps = scanTrack.getCapabilities(); if (!caps?.torch) return;
    els.scannerTorchBtn.hidden = false;
    let torchOn = false;
    els.scannerTorchBtn.onclick = async () => {
      torchOn = !torchOn;
      try { await scanTrack.applyConstraints({ advanced: [{ torch: torchOn }] }); }
      catch { toast(t('torchUnavailable'), 'error'); }
    };
  }

  async function lookupCode(code) {
    try {
      const r = await api(`/api/items/${encodeURIComponent(code)}/lookup`);
      if (r.exists) { toast(t('found', r.item.Description || code), 'success'); openEdit(r.item.UPC); }
      else { toast(t('newBarcode'), ''); openNew(code); }
    } catch (err) { toast(err.message || t('lookupFailed'), 'error'); }
  }

  async function onScanResult(code) {
    if (scanMode === 'fill-field') {
      stopScanner(); setField(scanFillField, code); formDirty = true;
      toast(t('fieldFilled', colLabel(scanFillField), code), 'success');
      setTimeout(() => { ((scanFillField === 'UPC' ? fieldInput('Description') : fieldInput('Price1')) || fieldInput('Description'))?.focus(); }, 80);
      return;
    }
    els.scannerStatus.textContent = `${code}…`;
    try {
      const r = await api(`/api/items/${encodeURIComponent(code)}/lookup`);
      stopScanner();
      if (r.exists) { toast(t('found', r.item.Description || code), 'success'); openEdit(r.item.UPC); }
      else { toast(t('newBarcode'), ''); openNew(code); }
    } catch (err) {
      els.scannerStatus.textContent = err.message || t('lookupFailed');
      setTimeout(() => { if (!scanActive) { scanActive = true; runScanLoop(); } els.scannerStatus.textContent = t('scannerReady'); }, 1500);
    }
  }

  /* ── Specials helpers ─────────────────────────── */
  function specialStatus(sp) {
    if (sp.InActive) return 'inactive';
    const now  = new Date();
    const from = sp.FromDate ? new Date(sp.FromDate) : null;
    const to   = sp.ToDate   ? new Date(sp.ToDate)   : null;
    if (from && from > now) return 'upcoming';
    if (to   && to   < now) return 'expired';
    return 'active';
  }

  function fmtDiscount(sp) {
    const v = Number(sp.Value);
    if (sp.PriceType === 'P') return `${v}% off`;
    if (sp.PriceType === 'N') return fmt$(v);
    return `${fmt$(v)} off`;
  }

  function fmtTarget(sp) {
    if (!sp.ProductField || !sp.Product) return '';
    const labels = { U: 'UPC', S: 'SKU', D: 'Dept' };
    return `${labels[sp.ProductField] || sp.ProductField}: ${sp.Product}`;
  }

  function spDateFmt(val) {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }

  /* ── Specials list ─────────────────────────────── */
  function calcFinalPrice(sp) {
    const itemPrice = Number(sp.ItemPrice);
    const val       = Number(sp.Value);
    if (!sp.ItemPrice || isNaN(itemPrice) || isNaN(val)) return null;
    if (sp.PriceType === 'P') return Math.max(0, itemPrice * (1 - val / 100));
    if (sp.PriceType === 'D') return Math.max(0, itemPrice - val);
    if (sp.PriceType === 'N') return val;
    return null;
  }

  function buildSpecialCard(sp) {
    const li = document.createElement('li');
    const status = specialStatus(sp);
    li.className = `sp-card sp-card--${status}`;
    li.setAttribute('role', 'button'); li.tabIndex = 0;

    // Left accent bar
    const accent = document.createElement('div'); accent.className = 'sp-card-accent';

    // Body
    const body = document.createElement('div'); body.className = 'sp-card-body';

    // Row 1: name + status pill
    const row1 = document.createElement('div'); row1.className = 'sp-card-row1';
    const name = document.createElement('div'); name.className = 'sp-card-name';
    name.textContent = sp.Description || `Special #${sp.ID}`;
    const pill = document.createElement('span');
    pill.className = `sp-status-pill sp-status--${status}`;
    pill.textContent = t(`spStatus${status.charAt(0).toUpperCase() + status.slice(1)}`);
    row1.append(name, pill);

    // Row 2: price breakdown (orig → final · discount label)
    const finalPrice = calcFinalPrice(sp);
    const priceRow = document.createElement('div');
    priceRow.className = 'sp-card-price-row';
    if (sp.PriceType === 'N') priceRow.classList.add('sp-card-new-price');

    if (finalPrice !== null && sp.ItemPrice != null && sp.PriceType !== 'N') {
      const orig  = document.createElement('span'); orig.className = 'sp-card-orig';
      orig.textContent = fmt$(sp.ItemPrice);
      const arr   = document.createElement('span'); arr.className = 'sp-card-arrow';
      arr.textContent = '→';
      const final = document.createElement('span'); final.className = 'sp-card-final';
      final.textContent = fmt$(finalPrice);
      const lbl   = document.createElement('span'); lbl.className = 'sp-card-discount';
      lbl.textContent = `(${fmtDiscount(sp)})`;
      priceRow.append(orig, arr, final, lbl);
    } else if (finalPrice !== null && sp.PriceType === 'N') {
      const orig  = document.createElement('span'); orig.className = 'sp-card-orig';
      orig.textContent = fmt$(sp.ItemPrice);
      const arr   = document.createElement('span'); arr.className = 'sp-card-arrow';
      arr.textContent = '→';
      const final = document.createElement('span'); final.className = 'sp-card-final';
      final.textContent = fmt$(finalPrice);
      priceRow.append(orig, arr, final);
    } else {
      // No item price available — show discount label only
      const disc = document.createElement('span'); disc.className = 'sp-card-final';
      disc.textContent = fmtDiscount(sp);
      priceRow.appendChild(disc);
    }

    // Row 3: target + buy qty
    const row3 = document.createElement('div'); row3.className = 'sp-card-row2';
    const target = document.createElement('div'); target.className = 'sp-card-target';
    const targetParts = [];
    if (sp.CombQty && Number(sp.CombQty) > 1) targetParts.push(`Buy ${sp.CombQty}`);
    const fmtTgt = fmtTarget(sp);
    if (fmtTgt) targetParts.push(fmtTgt);
    target.textContent = targetParts.join('  ·  ') || '—';
    row3.appendChild(target);

    body.append(row1, priceRow, row3);

    // Date range (only if set)
    if (sp.FromDate || sp.ToDate) {
      const dates = document.createElement('div'); dates.className = 'sp-card-dates';
      const from = sp.FromDate ? spDateFmt(sp.FromDate) : '…';
      const to   = sp.ToDate   ? spDateFmt(sp.ToDate)   : '…';
      dates.textContent = sp.FromDate && sp.ToDate ? `${from} → ${to}` : sp.FromDate ? `From ${from}` : `Until ${to}`;
      body.appendChild(dates);
    }

    li.append(accent, body);
    li.addEventListener('click', () => openSpecialEdit(sp.ID, 'list'));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openSpecialEdit(sp.ID, 'list'); });
    return li;
  }

  async function loadSpecials(reset = true) {
    if (reset) {
      spOffset = 0; spAllLoaded = false; spLoading = false;
      els.specialsList.innerHTML = '';
      els.specialsEmpty.hidden  = true;
      els.specialsSkeleton.hidden = false;
    }
    if (spLoading || spAllLoaded) return;
    spLoading = true;
    try {
      const q = spSearch ? `&search=${encodeURIComponent(spSearch)}` : '';
      const data = await api(`/api/specials?limit=${SP_PAGE}&offset=${spOffset}${q}`);
      els.specialsSkeleton.hidden = true;
      if (data.length < SP_PAGE) spAllLoaded = true;
      spOffset += data.length;
      if (spOffset === 0) {
        els.specialsEmpty.hidden = false;
      } else {
        const frag = document.createDocumentFragment();
        for (const sp of data) frag.appendChild(buildSpecialCard(sp));
        els.specialsList.appendChild(frag);
      }
      $('specialCount').textContent = spAllLoaded ? String(spOffset) : `${spOffset}+`;
    } catch (err) {
      els.specialsSkeleton.hidden = true;
      toast(err.message, 'error');
    }
    spLoading = false;
  }

  const spSentinelObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !els.specialsView.hidden) loadSpecials(false);
  }, { rootMargin: '120px' });
  spSentinelObserver.observe(els.specialsSentinel);

  /* ── Special edit form ────────────────────────── */
  function fillSpecialForm(sp) {
    const p = n => String(n).padStart(2, '0');
    function toLocalInput(val) {
      if (!val) return '';
      const d = new Date(val);
      if (isNaN(d)) return '';
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    els.spDescription.value  = sp.Description  || '';
    els.spInActive.checked   = !!sp.InActive;
    els.spProductField.value = sp.ProductField  || 'U';
    els.spProduct.value      = sp.Product       || '';
    els.spPriceType.value    = sp.PriceType     || 'D';
    els.spValue.value        = sp.Value != null  ? String(sp.Value) : '';
    els.spCombQty.value      = sp.CombQty != null ? String(sp.CombQty) : '';
    els.spFromDate.value     = toLocalInput(sp.FromDate);
    els.spToDate.value       = toLocalInput(sp.ToDate);
    els.spDayOfWeek.value    = sp.DayOfWeek != null ? String(sp.DayOfWeek) : '0';
  }

  function readSpecialForm() {
    function localToISO(val) {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d) ? null : d.toISOString();
    }
    return {
      Description:  els.spDescription.value.trim() || null,
      InActive:     els.spInActive.checked ? 1 : 0,
      ProductField: els.spProductField.value || 'U',
      Product:      els.spProduct.value.trim() || null,
      PriceType:    els.spPriceType.value || 'D',
      Value:        els.spValue.value !== '' ? Number(els.spValue.value) : null,
      CombQty:      els.spCombQty.value !== '' ? Number(els.spCombQty.value) : null,
      FromDate:     localToISO(els.spFromDate.value),
      ToDate:       localToISO(els.spToDate.value),
      DayOfWeek:    Number(els.spDayOfWeek.value) || 0,
    };
  }

  async function openSpecialEdit(id, source = 'list') {
    specialMode = 'edit'; specialNavSrc = source; curSpecial = null;
    els.spEditTitle.textContent = t('spEditTitle'); els.spEditSub.textContent = '';
    els.spSaveBtn.textContent   = t('spSaveChanges');
    showView('specialEdit'); window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const sp = await api(`/api/specials/${id}`);
      curSpecial = sp;
      fillSpecialForm(sp);
      els.spEditSub.textContent = sp.Description || `#${sp.ID}`;
    } catch (err) { toast(err.message, 'error'); }
  }

  function openSpecialNew(prefillUPC = '') {
    specialMode = 'new'; specialNavSrc = 'list'; curSpecial = null;
    els.spEditTitle.textContent = t('spNewTitle'); els.spEditSub.textContent = '';
    els.spSaveBtn.textContent   = t('spCreateSpecial');
    fillSpecialForm({ ProductField: 'U', PriceType: 'D', InActive: 0, DayOfWeek: 0, Product: prefillUPC });
    showView('specialEdit'); window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => els.spDescription.focus(), 80);
  }

  els.spEditForm.addEventListener('submit', async e => {
    e.preventDefault();
    const orig = els.spSaveBtn.textContent;
    els.spSaveBtn.disabled = true; els.spSaveBtn.textContent = t('saving');
    try {
      const payload = readSpecialForm();
      if (specialMode === 'new') {
        await api('/api/specials', { method: 'POST', body: JSON.stringify(payload) });
        toast(t('itemCreated'), 'success');
        showView('specials');
        loadSpecials(true);
      } else {
        await api(`/api/specials/${curSpecial.ID}`, { method: 'PUT', body: JSON.stringify(payload) });
        curSpecial = { ...curSpecial, ...payload };
        toast(t('savedN', 1), 'success');
        showView(specialNavSrc === 'edit' ? 'edit' : 'specials');
        if (specialNavSrc !== 'edit') loadSpecials(true);
      }
    } catch (err) { toast(err.message, 'error'); }
    finally { els.spSaveBtn.disabled = false; els.spSaveBtn.textContent = orig; }
  });

  /* ── Item specials (Option B) ─────────────────── */
  async function loadItemSpecials(upc) {
    els.itemSpecialsList.innerHTML = '';
    els.itemSpecialsSection.hidden = false;

    // wire "+ Add" button in section header
    els.itemAddSpecialBtn.onclick = () => openSpecialNew(upc);

    try {
      const data = await api(`/api/items/${encodeURIComponent(upc)}/specials`);
      if (!data || !data.length) {
        // Empty state — show inline add prompt
        const empty = document.createElement('div'); empty.className = 'sp-item-empty';
        const txt = document.createElement('span'); txt.className = 'sp-item-empty-text';
        txt.textContent = 'No active specials for this item';
        const addBtn = document.createElement('button'); addBtn.type = 'button'; addBtn.className = 'sp-item-add-btn';
        addBtn.textContent = '+ Add Special';
        addBtn.addEventListener('click', () => openSpecialNew(upc));
        empty.append(txt, addBtn);
        els.itemSpecialsList.appendChild(empty);
        return;
      }
      for (const sp of data) {
        const card = document.createElement('div'); card.className = 'item-special-card';
        const row  = document.createElement('div'); row.className = 'item-special-row';
        const info = document.createElement('div'); info.className = 'item-special-info';
        const nm   = document.createElement('div'); nm.className = 'item-special-name';
        nm.textContent = sp.Description || `Special #${sp.ID}`;
        const det  = document.createElement('div'); det.className = 'item-special-detail';
        const fp = calcFinalPrice(sp);
        det.textContent = fp != null
          ? `${fmt$(sp.Price1 ?? sp.ItemPrice)} → ${fmt$(fp)}`
          : fmtDiscount(sp);
        if (sp.ToDate) det.textContent += `  ·  until ${spDateFmt(sp.ToDate)}`;
        info.append(nm, det);
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'item-special-edit-btn';
        btn.textContent = 'Edit';
        btn.addEventListener('click', () => openSpecialEdit(sp.ID, 'edit'));
        row.append(info, btn); card.appendChild(row);
        els.itemSpecialsList.appendChild(card);
      }
    } catch { els.itemSpecialsSection.hidden = true; }
  }

  /* ── Init ─────────────────────────────────────── */
  (async function init() {
    applyLang();
    if (!apiKey) { showView('login'); return; }
    try {
      await api('/api/auth/check', { method: 'POST', body: '{}' });
      await ensureSchema();
      showView('home');
    } catch {
      apiKey = ''; localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STORAGE_KEY);
      showView('login');
    }
  })();
})();
