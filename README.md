# AKPOS Item Manager

A small, mobile-friendly web app to insert/update products and change prices in your
`AKPOS.dbo.Items` SQL Server table. Runs on your PC; you access it from your phone over the same Wi-Fi.

Stack: Node.js + Express + the `mssql` driver. Frontend is plain HTML/CSS/JS — no build step.

Editable fields: `UPC`, `SKU`, `Description`, `Department`, `Unit`, `Price1`, `Cost`. The app also stamps `IsChanged = 1` and `Updated = GETDATE()` on every write.

---

## 1. Install Node.js

If you don't have it: download the LTS installer from <https://nodejs.org> and install. Verify in PowerShell:

```powershell
node --version
npm --version
```

## 2. Install dependencies

In PowerShell, from this folder:

```powershell
cd "c:\Users\jacky\OneDrive\桌面\MYAPP"
npm install
```

## 3. Configure SQL connection + API key

Copy `.env.example` to `.env` and fill in your values:

```powershell
Copy-Item .env.example .env
notepad .env
```

Typical local SQL Server settings:

```
SQL_SERVER=localhost\SQLEXPRESS   # or just localhost, or your PC name
SQL_DATABASE=AKPOS
SQL_USER=sa
SQL_PASSWORD=<your password>
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERT=true
API_KEY=<pick a long random string>
PORT=3000
```

> **SQL auth required.** This app uses SQL authentication (username/password). If your server only accepts Windows authentication, enable Mixed Mode in SQL Server, or create a SQL login with permissions to `SELECT`/`INSERT`/`UPDATE` on `AKPOS.dbo.Items`.

> **TCP/IP must be enabled.** In SQL Server Configuration Manager: SQL Server Network Configuration → Protocols for your instance → enable TCP/IP, then restart the SQL Server service.

## 4. Start the server

```powershell
npm start
```

You should see:

```
AKPOS Item Manager listening on http://0.0.0.0:3000
```

Quick check: in a browser on the same PC, open <http://localhost:3000> — you should see the sign-in page.
You can also hit <http://localhost:3000/api/health> to confirm the DB connection works.

## 5. Open it on your phone

1. Find your PC's LAN IP. In PowerShell:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   Look for something like `192.168.1.x`.
2. On your phone (same Wi-Fi), open `http://192.168.1.x:3000`.
3. Allow the firewall prompt the first time you start the server, or run once:
   ```powershell
   New-NetFirewallRule -DisplayName "AKPOS Item Manager" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
4. Sign in with the `API_KEY` you set in `.env`. Tick "Remember on this device" and your phone will stay signed in.
5. On iPhone Safari, tap Share → "Add to Home Screen" to get an app-like icon.

## Using the app

- **Search**: type any part of a UPC, SKU, or description. Empty search shows the 50 most-recently-updated items.
- **Edit**: tap a row, change `Price1`/`Cost`/etc., tap **Save**.
- **Add**: tap **+ New**, fill UPC + Price (required) and any other fields, tap **Save**.

## API reference

All routes except `/api/health` require header `X-API-Key: <your key>`.

| Method | Path                    | Body / Query                                                                                            |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`           | —                                                                                                       |
| POST   | `/api/auth/check`       | —                                                                                                       |
| GET    | `/api/items?search=&limit=` | Up to `limit` (max 200) items, newest first                                                         |
| GET    | `/api/items/:upc`       | Single item                                                                                             |
| POST   | `/api/items`            | `{ UPC, Price1, Description?, SKU?, Department?, Unit?, Cost? }`                                        |
| PUT    | `/api/items/:upc`       | Any subset of `{ Price1, Description, SKU, Department, Unit, Cost }`                                    |

## Security notes (LAN deployment)

- The API key is the only thing protecting your DB from anyone on your Wi-Fi. **Make it long and random.**
- The traffic is HTTP (not HTTPS). Fine on a trusted home/store Wi-Fi; not appropriate for public networks.
- Do **not** open port 3000 to the internet without adding TLS and stronger auth. If you later want remote access from outside the LAN, the cleanest upgrade is to put a Cloudflare Tunnel in front of this server — happy to help wire that up.

## Extending to more fields

The editable column list is in two places:

1. `server.js` — `EDITABLE_COLUMNS` array, `parseItemBody()`, and the `INSERT` / `UPDATE` queries.
2. `public/index.html` + `public/app.js` — the form inputs.

To add a field (say, `Price2`): add it to `parseItemBody`, add to the `INSERT` and the `typeMap` for `UPDATE`, add an input to the form, and wire it into `openEdit()` and the submit handler.
