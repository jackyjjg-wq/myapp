const COLUMNS = {
  UPC:         { type: 'string',  sql: 'VarChar', len: 20,  required: true, primaryKey: true, label: 'UPC / Barcode' },
  SKU:         { type: 'string',  sql: 'VarChar', len: 20,  label: 'SKU' },
  Description: { type: 'string',  sql: 'VarChar', len: 100, label: 'Description' },
  Department:  { type: 'int',     sql: 'SmallInt',           label: 'Department', optionsApi: '/api/departments' },
  Unit:        {
    type: 'string', sql: 'VarChar', len: 6, label: 'Unit (UOM)',
    valuesApi: '/api/units',
  },
  Price1:      { type: 'decimal', sql: 'Money', required: true, label: 'Price' },
  InActive:    { type: 'bool',    sql: 'Bit',   boolInvert: true, label: 'Active' },
  Updated:     { type: 'datetime', sql: 'DateTime', readonly: true, label: 'Last updated' },
};

const LIST_COLUMNS = ['UPC', 'SKU', 'Description', 'Department', 'Unit', 'Price1', 'InActive', 'Updated'];

const WRITABLE = Object.entries(COLUMNS).filter(([, def]) => !def.readonly).map(([k]) => k);

module.exports = { COLUMNS, LIST_COLUMNS, WRITABLE };
