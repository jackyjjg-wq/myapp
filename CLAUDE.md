# MYAPP — AKPOS Item & POS Manager

## What this is
A mobile-first PWA running on Node.js/Express that connects to an AKPOS SQL Server POS database over LAN. Used from phone/iPad/desktop to manage inventory, view sales, and manage specials/discounts.

## Stack
- **Backend**: Node.js + Express + `mssql` driver → SQL Server (AKPOS)
- **Frontend**: Vanilla JS, no frameworks, iOS-style design
- **Auth**: Single API key (`API_KEY` in `.env`)
- **HTTPS**: Self-signed TLS cert on port 3443 (needed for camera/barcode)
- **HTTP**: Port 3000

## CRITICAL — never modify `.env`
Contains live credentials: `SQL_SERVER`, `SQL_USER`, `SQL_PASSWORD`, `API_KEY`. Do not touch.

## Database — AKPOS SQL Server (pre-2012)
- Use `ROW_NUMBER() OVER (ORDER BY ...) AS _rn` + `WHERE _rn BETWEEN x AND y` for pagination. **Never** use `OFFSET/FETCH` — not supported.
- Key tables: `AKPOS.dbo.Items` (UPC, SKU, Description, Department, Unit, Price1, InActive), `AKPOS.dbo.TransHeaders` (TransStatus='C' for completed), `AKPOS.dbo.TransLines` (LineType='S', IsVoided=0, Quantity, SubAfterTax), `AKPOS.dbo.Specials` (ProductField, Product, PriceType, Value, CombQty, InActive, FromDate, ToDate, DayOfWeek)
- `Specials.ID` is INT NOT NULL, no IDENTITY — use `SELECT ISNULL(MAX(ID),0)+1` for inserts

## Currency
NZD throughout. `fmt$()` uses `currency: 'NZD'`.

## Frontend architecture
- Single `public/app.js` IIFE, vanilla JS
- 7 views: `login`, `home`, `list`, `edit`, `sales`, `specials`, `specialEdit`
- `showView(name)` switches between them
- i18n: `STRINGS` object with `en`/`zh`, `t(key)` helper, `applyLang()` updates all DOM text
- `els` object holds all DOM refs
- `api(path, opts)` handles all fetch calls with `X-API-Key` header

## Features built
- **Inventory list**: paginated infinite scroll, search, barcode scan (BarcodeDetector + ZXing fallback)
- **Item edit/create**: form with all AKPOS fields, dirty tracking, camera scan into UPC/SKU
- **Sales dashboard**: Today/Yesterday/Week/Month/Monthly tabs, revenue trend chart, stats (Revenue, Transactions, Items Sold, Avg/Sale) with vs-prior comparison, top trending items with pagination
- **Specials manager**: list with search + infinite scroll, edit/create form, status pills (Active/Upcoming/Inactive/Expired), price breakdown ($orig → $final), item-level specials shown on edit form with "Add Special" shortcut
- **Responsive**: mobile (< 600px), tablet (≥ 600px, side-by-side form layout), desktop (≥ 1024px, 3-col home, 4-col stats, wider content)

## Running the app
```bash
cd "C:\Users\jacky\OneDrive\桌面\MYAPP"
node server.js        # HTTP :3000 + HTTPS :3443
# OR with PM2:
pm2 start server.js --name akpos
```

## Deployment
PM2 on Windows. `pm2 save` + `pm2-windows-startup install` for auto-start on boot.

## Next planned work
Building a full replacement POS system:
- Cart / transaction builder
- Windcave PX Fusion EFTPOS integration (existing merchant account)
- Write sales to existing TransHeaders/TransLines schema
- Thermal receipt printing
- Cash handling
