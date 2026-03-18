# ⚡ StockPulse

> **The portfolio tracker Zerodha Kite never gave you.**
> Track NSE · BSE · US stocks with **1D / 1W / 1M / 3M / 6M / 1Y %** plus P&L, dividend yield, heatmap analytics — right from your browser. No login. No install. No server.

<p align="center">
  <img src="icon-512.png" width="96" alt="StockPulse icon" />
</p>

<p align="center">
  <a href="https://ashi100sh.github.io/StockPulse/"><strong>👉 Live App → ashi100sh.github.io/StockPulse</strong></a>
</p>

---

## Table of Contents

1. [Why StockPulse?](#why-stockpulse)
2. [Feature Overview](#feature-overview)
3. [Architecture](#architecture)
4. [Data Flow](#data-flow)
5. [File Structure](#file-structure)
6. [Usage Guide](#usage-guide)
   - [Adding Stocks](#adding-stocks)
   - [Editing a Holding](#editing-a-holding)
   - [Import from Zerodha / Excel](#import-from-zerodha--excel)
   - [Export](#export)
   - [Refresh Prices](#refresh-prices)
   - [Analytics Page](#analytics-page)
   - [Watchlist](#watchlist)
7. [Install as a Native App (PWA)](#install-as-a-native-app-pwa)
8. [Supported Brokers & File Formats](#supported-brokers--file-formats)
9. [Symbol Resolution & Exchange Handling](#symbol-resolution--exchange-handling)
10. [CORS Proxy System](#cors-proxy-system)
11. [Offline Support & Caching](#offline-support--caching)
12. [Privacy](#privacy)
13. [Optional: Local Python Server](#optional-local-python-server)
14. [Development](#development)
15. [Build History](#build-history)

---

## Why StockPulse?

| Feature | Zerodha Kite | StockPulse |
|---|---|---|
| Buy price & current price | ✅ | ✅ |
| P&L in ₹ | ✅ | ✅ |
| 1-day % change | ✅ | ✅ |
| 1-week % change | ❌ | ✅ |
| 1-month % change | ❌ | ✅ |
| 3-month % change | ❌ | ✅ |
| 6-month % change | ❌ | ✅ |
| 1-year % change | ❌ | ✅ |
| Dividend yield | ❌ | ✅ |
| Portfolio heatmap | ❌ | ✅ |
| Watchlist alongside portfolio | ❌ | ✅ |
| CSV / Excel export with all % | ❌ | ✅ |
| Edit any holding | ❌ | ✅ |
| Works offline | ❌ | ✅ (cached prices) |
| Private — no server, no login | ❌ | ✅ |

---

## Feature Overview

### Portfolio Management
- **Add holdings** — search by company name or ticker; select exchange (NSE / BSE / US)
- **Edit holdings** — change symbol, buy price, quantity, or date at any time
- **Delete** individual holdings with swipe-left gesture or confirmation dialog
- **Clear All** — wipe entire portfolio in one tap (confirmation required)
- **Watchlist** — track stocks without buy price/qty alongside portfolio
- **Duplicate protection** — adding or importing a symbol already in portfolio is blocked

### Live Prices & Performance
- **Live prices** from Yahoo Finance via multi-proxy CORS system
- Performance pills on every card: **1D · 1W · 1M · 3M · 6M · 1Y %**
- **Dividend yield** badge (trailing annual %)
- **Per-card refresh** button — refresh a single stock without disturbing others
- **Refresh modes** (long-press on mobile):
  - *Smart Refresh* — skips symbols updated within the last 15 minutes
  - *Force Refresh All* — re-fetches every symbol regardless of age
- **Exchange auto-fallback** — if `SYMBOL.NS` fails, automatically tries `SYMBOL.BO` and saves the correct exchange (handles BSE-only stocks like NSDL, Embassy REIT, etc.)

### Import / Export
- **Import** from XLS, XLSX, CSV, TSV — including Zerodha Kite CSV and Zerodha Holdings Statement XLS
- **Import mode dialog** — choose *Append to existing* or *Delete all & replace*
- **Zerodha suffix stripping** — automatically cleans `-BL` (blocked), `-BE` (book entry), `-RR` (REIT), `-IV` (InvIT) and other suffixes
- **Duplicate detection** during import — skips rows already in portfolio
- **Source tracking** — imported holdings show a 📄 badge; editing changes them to *manual*
- **Export to CSV** — full data including live prices, all % columns, P&L, dividend yield

### Analytics Page
- Sortable performance table with columns: Price · Value · 1D% · 1W% · 1M% · 3M% · 6M% · 1Y% · Div% · P&L% · Wt% · P&L ₹
- **Heat-map cells** — background intensity scales with return magnitude
- **Sticky first column** — stock name stays visible while scrolling right on mobile
- **Portfolio / Watchlist filter tabs**
- **Summary strip** — aggregate stats: invested, P&L%, today's move, best/worst stock
- **Portfolio Allocation accordion** — collapsible bar + legend showing weight % per holding

### UI / UX
- Dark and Light themes (tap moon/sun icon)
- Holdings sort bar: by Value · P&L% · Today · Name · Invested
- Swipe-left to delete cards (mobile)
- Cache age banner — shows how old prices are, with smart refresh prompt
- Toast notifications for all actions
- PWA: installs on iOS and Android home screen, works fullscreen

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser / PWA                 │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │            index.html (single file)       │  │
│  │                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  │  │
│  │  │  CSS     │  │  HTML    │  │  JS    │  │  │
│  │  │ (inline) │  │ (inline) │  │(inline)│  │  │
│  │  └──────────┘  └──────────┘  └────┬───┘  │  │
│  │                                   │       │  │
│  │         ┌─────────────────────────┤       │  │
│  │         │        State            │       │  │
│  │         │  portfolio[] (array)    │       │  │
│  │         │  liveData{}  (cache)    │       │  │
│  │         └──────────┬──────────────┘       │  │
│  │                    │                      │  │
│  │         ┌──────────▼──────────────┐       │  │
│  │         │     localStorage        │       │  │
│  │         │  ptf_v1   — holdings    │       │  │
│  │         │  sp_live_v1 — prices    │       │  │
│  │         │  sp_theme  — dark/light │       │  │
│  │         │  sp_proxy_idx — proxy   │       │  │
│  │         │  sp_alloc_open — alloc  │       │  │
│  │         └─────────────────────────┘       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │              Service Worker (sw.js)      │   │
│  │  Cache: manifest.json (static assets)   │   │
│  │  HTML: always network-first              │   │
│  │  API: network-only                       │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────┘
                               │ HTTPS
                ┌──────────────▼──────────────┐
                │    CORS Proxy Race (16+)     │
                │  corsproxy.io               │
                │  allorigins.win             │
                │  proxy.cors.sh              │
                │  codetabs.com               │
                │  thingproxy.freeboard.io    │
                │  cors.eu.org                │
                │  + query2 mirrors of above  │
                │  + direct fetch (Phase 0)   │
                └──────────────┬──────────────┘
                               │
                ┌──────────────▼──────────────┐
                │       Yahoo Finance API      │
                │  v8/chart  — OHLC + all %   │
                │  v7/quote  — price fallback  │
                │  v1/search — symbol search   │
                └─────────────────────────────┘
```

**No backend required.** The app is a single HTML file that runs entirely in the browser. The optional `app.py` Flask server is only needed if you want a persistent SQLite database on a local machine.

---

## Data Flow

### Adding a holding
```
User types name/ticker
  → debounced Yahoo Finance /v1/finance/search (via proxy)
  → user selects result → selectSym() stores { symbol, yf_symbol, name, exchange }
  → addHolding() pushes entry to portfolio[] with source:'manual'
  → savePortfolio() → localStorage
  → fetchLive(yf_symbol) in background
     → if .NS fails → retry .BO (exchange auto-fallback)
     → liveData[sym] = { price, pct_1d … pct_1y, div_yield }
  → updateCard() → updateSummary() → saveLiveCache()
```

### Refreshing prices
```
refreshAll('all' | 'force' | 'pending')
  → Phase 0: direct Yahoo fetch (no proxy, ~2.5 s timeout)
    → if direct works, remember sp_direct='1' for next session
  → Phase 1: last-known-good proxy (sp_proxy_idx, ~2.5 s)
  → Phase 2: race ALL 16+ proxies in parallel (10 s timeout)
     → first response wins; its index saved to sp_proxy_idx
  → for each symbol: fetchLive() → v8/chart (full year OHLC)
     → fallback: v7/quote (price only, no %)
     → exchange fallback: .NS → .BO (or vice versa) on null
  → 3 retry rounds (8 s / 20 s / 40 s) for failed symbols
  → batch-fetch dividend yields via v7/quote (optional)
  → saveLiveCache() → updateCacheBanner()
```

### Import flow
```
User taps Import → picks file
  → if portfolio non-empty: ImportDialog (Append / Replace)
  → doImport(mode)
     → if Replace: clear portfolio[], liveData[], localStorage cache
     → SheetJS (for .xls/.xlsx) → sheet_to_csv → processImportText()
     → OR FileReader.readAsText() for .csv/.tsv
  → processImportText():
     → auto-detect delimiter (tab vs comma)
     → scan whole file for header row (handles Zerodha metadata rows)
     → detect broker profile (Zerodha Kite / Zerodha Holdings Statement / generic)
     → strip Zerodha suffixes: -BL -BE -SM -IL -RR -IV etc.
     → skip duplicates (same yf_symbol already in portfolio)
     → push entries with source:'file'
  → savePortfolio() → refreshAll('pending')
```

---

## File Structure

```
StockPulse/
├── index.html          # Entire PWA — HTML + CSS + JS in one file (~3000 lines)
├── sw.js               # Service Worker — offline + PWA install support
├── manifest.json       # Web App Manifest — icons, theme, display mode
├── icon-192.png        # App icon 192×192
├── icon-512.png        # App icon 512×512
├── app.py              # Optional Flask backend (SQLite, yfinance)
├── requirements.txt    # Python deps: flask, yfinance
├── test.js             # Unit tests (CSV parsing, symbol normalisation, etc.)
├── generate-icons.html # Helper to regenerate icons
├── static/
│   ├── app.js          # Legacy JS (not used by main app)
│   └── style.css       # Legacy CSS (not used by main app)
└── templates/
    └── index.html      # Legacy Jinja template (used only by app.py)
```

> **Everything lives in `index.html`.** The `static/` and `templates/` folders are only used if you run the optional Flask server.

---

## Usage Guide

### Adding Stocks

1. Tap the **＋** button (bottom-right)
2. Type a company name (e.g. *"Infosys"*) or ticker (*"INFY"*)
3. Select from search results — exchange (NSE / BSE) is shown
4. Enter **Buy Price** and **Quantity** (and optional Buy Date)
5. Tap **Add to Portfolio**

**Offline fallback:** if the search proxy is unavailable, the app offers NSE and BSE direct-entry options using its built-in name→ticker map (150+ companies).

| What you type | What it finds |
|---|---|
| `Reliance` | RELIANCE.NS (NSE) |
| `infosys` | INFY.NS |
| `HDFC Bank` | HDFCBANK.NS |
| `Apple` | AAPL (NASDAQ) |
| `Embassy REIT` | EMBASSY.BO (BSE) |
| `PowerGrid InvIT` | PGINVIT.BO (BSE) |

### Editing a Holding

1. Tap any holding card to open the **Detail Sheet**
2. Tap **Edit Holding**
3. Change the symbol (via search), price, quantity, or date
4. Tap **Save Changes**

> Editing a holding imported from file changes its source from *📄 Imported* to *Manual*.

### Import from Zerodha / Excel

1. Export your holdings from Zerodha Kite:
   - **Kite web** → Portfolio → ⋮ menu → *Download Holdings* (CSV)
   - **Console** → Reports → Holdings Statement (XLS)
2. Tap **Import** in StockPulse
3. Choose **Append to existing** or **Delete all & replace**
4. Select your file — accepted formats: `.csv` `.tsv` `.xls` `.xlsx`

The importer auto-detects:
- **Delimiter** (comma vs tab)
- **Header row** (skips Zerodha metadata rows at the top)
- **Broker profile** (Zerodha Kite CSV · Zerodha Holdings Statement · Generic)
- **Zerodha suffixes** — automatically stripped:

| Suffix | Meaning | Example |
|---|---|---|
| `-BL` | Blocked / delisted | `URBANCO-BL` → `URBANCO` |
| `-BE` | Book entry / trade-for-trade | `SUZLON-BE` → `SUZLON` |
| `-SM` | SME platform | `ABCD-SM` → `ABCD` |
| `-IL` | Illiquid | `XYZ-IL` → `XYZ` |
| `-RR` | REIT units (NSE) | `EMBASSY-RR` → `EMBASSY` |
| `-IV` | InvIT units (NSE) | `PGINVIT-IV` → `PGINVIT` |

**Generic CSV format** (also accepted):
```csv
symbol,exchange,buy_price,quantity,buy_date
RELIANCE,NSE,2500.00,10,2023-01-15
INFY,NSE,1400.00,25,2023-03-20
HDFCBANK,NSE,1620.00,15,2023-06-10
AAPL,US,150.00,5,2022-11-01
EMBASSY,BSE,380.00,50,2023-08-01
```

### Export

Tap **Export** to download a CSV with all columns:

```
Type, Symbol, YF Symbol, Name, Exchange, Buy Price, Quantity, Buy Date,
Current Price, Current Value, P&L, P&L %, 1D %, 1W %, 1M %, 3M %, 6M %, 1Y %, Div %
```

### Refresh Prices

| Action | Result |
|---|---|
| **Tap Refresh** | Smart Refresh — skips symbols updated < 15 min ago |
| **Long-press Refresh** (mobile) | Options sheet: Smart Refresh / Force Refresh All |
| **Right-click Refresh** (desktop) | Same options sheet |
| **Tap individual card ↻** | Refresh only that one stock |
| **Tap cache banner** | Refresh all stale |

**Force Refresh All** re-fetches every symbol regardless of cache age. A start-of-refresh toast shows how many symbols are being fetched.

Auto-refresh also runs on app open and PWA foreground-resume if prices are older than **24 hours**.

### Analytics Page

Tap **Analytics** in the bottom nav.

- **Filter tabs** — switch between Portfolio view and Watchlist view
- **Summary strip** — scrollable chips: stock count · invested · P&L · today's move · best/worst
- **Portfolio Allocation** — tap the header row to expand/collapse the stacked bar chart
- **Performance table** — all stocks with sortable columns; tap any column header to sort
  - First column (Stock name) **stays frozen** while scrolling right
  - Heat-map cell backgrounds intensity-scale with return magnitude
- Tap any row to open the full **Detail Sheet** for that holding

### Watchlist

In the add sheet, toggle from **Portfolio** to **Watchlist** before adding. Watchlist items:
- Track live price and all % metrics
- Do not require buy price or quantity
- Appear below portfolio holdings in both views
- Have independent sort order in Analytics

---

## Install as a Native App (PWA)

### iPhone / iPad (Safari)
1. Open the URL in **Safari** (must be Safari, not Chrome on iOS)
2. Tap the **Share** button (box with arrow ↑)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add** — the icon appears on your home screen
5. Opens fullscreen, no browser chrome ✅

### Android (Chrome)
1. Open in **Chrome**
2. Tap **⋮ menu** → **"Add to Home Screen"** or **"Install app"**
   — or tap the **Install** button that appears in the top bar
3. Done ✅

> On Android Chrome, the in-app **Install** button appears automatically in the top bar when the PWA install prompt is available.

---

## Supported Brokers & File Formats

| Broker / Source | Format | Auto-detected |
|---|---|---|
| Zerodha Kite | CSV (Holdings export) | ✅ |
| Zerodha Console | XLS (Holdings Statement) | ✅ |
| Generic CSV | Any CSV with symbol + price + qty columns | ✅ |
| Generic TSV | Tab-separated | ✅ |
| Any Excel file | `.xls` / `.xlsx` | ✅ (via SheetJS) |

**Planned / community-contributed profiles:** Groww, Upstox, Angel One, HDFC Securities — add a profile in the `BROKER_PROFILES` array in `index.html`.

---

## Symbol Resolution & Exchange Handling

### How symbols are resolved

1. **Yahoo Finance search** (`/v1/finance/search`) — returns exchange-tagged symbols
2. **Built-in NSE name map** (150+ companies) — used when search is offline
3. **normalizeYfSymbol()** — appends `.NS` for NSE, `.BO` for BSE if no suffix present

### Exchange auto-fallback

If a symbol returns no data (e.g. `NSDL.NS` doesn't exist on NSE), the refresh engine automatically tries the alternate exchange:

```
NSDL.NS  → fetch fails → try NSDL.BO → success
           → portfolio entry updated to NSDL.BO permanently
```

This handles:
- Stocks listed only on BSE (e.g. NSDL, some PSU banks)
- REITs (Embassy, Mindspace, BIRET, Nexus Select) — all BSE-listed
- InvITs (PGINVIT, IRBINVIT, IndiGrid) — BSE-listed

### Sovereign Gold Bonds (SGB)

SGBs (e.g. `SGBAUG24`) are detected by the `-GB` suffix pattern. Yahoo Finance has no data for them — they show a **"SGB · not supported"** pill instead of performance data.

---

## CORS Proxy System

Yahoo Finance does not allow direct browser requests from most networks. StockPulse uses a **3-phase proxy strategy**:

```
Phase 0 — Direct fetch (no proxy)
  Try Yahoo Finance directly with corsDomain param.
  Works on some corporate/home networks.
  If successful, remembered in localStorage for next session.

Phase 1 — Last-known-good proxy (2.5 s window)
  The index of the last proxy that succeeded is stored in localStorage.
  On the next session, that proxy is tried first — fast recovery.

Phase 2 — Race all 16+ proxies in parallel (10 s timeout)
  All proxies fire simultaneously; first valid response wins.
  Winning proxy index saved for Phase 1 next session.

Fallback — v7/quote instead of v8/chart
  If all proxies fail for a symbol, try the lighter /v7/finance/quote
  endpoint which returns price only (no historical %).
```

**Proxy pool includes:**
- `corsproxy.io` (encoded + raw URLs)
- `api.allorigins.win` (JSON wrapper + raw)
- `proxy.cors.sh`
- `api.codetabs.com`
- `thingproxy.freeboard.io`
- `cors.eu.org`
- All of the above mirrored against `query2.finance.yahoo.com` (alternate host)

**Retry rounds** for failed symbols: 3 rounds at 8 s / 20 s / 40 s intervals, clearing proxy cache between rounds so throttled proxies get another chance.

---

## Offline Support & Caching

### Price cache (`sp_live_v1` in localStorage)
- After every successful refresh, all live prices are serialised and stored
- On next app open, cached prices are displayed instantly while fresh data is fetched
- Cached entries show a **📦 N min ago** pill so you always know data age
- Cache age banner (below action buttons) shows how old prices are:
  - **< 1 hour** — no banner (fresh enough)
  - **1 – 24 hours** — subtle "Cached prices from Xh ago" with refresh link
  - **> 1 day** — amber warning "Prices are N days old"
  - **> 7 days** — red alert "Significantly outdated"

### Service Worker (`sw.js`)
- **HTML** — always fetched fresh from network (you always get the latest version)
- **API calls** — network-only (no proxy caching)
- **Static assets** — cache-first with network fallback
- If completely offline, the app opens and shows last cached prices from localStorage

---

## Privacy

- **Zero backend.** No analytics, no telemetry, no server.
- **All data stored in your browser** via `localStorage` — never leaves your device.
- **Yahoo Finance is queried** for live prices (via third-party CORS proxies). The request contains only the stock symbol — no personal data.
- **No login, no account** — the app has no identity concept whatsoever.

---

## Optional: Local Python Server

For a persistent server-side database (e.g. shared on a home network):

```bash
# Clone and install
git clone https://github.com/ashi100sh/StockPulse.git
cd StockPulse
pip install -r requirements.txt

# Run
python app.py
# Open http://localhost:5000
```

### REST API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/holdings` | List all holdings |
| `POST` | `/api/holdings` | Add a holding |
| `PUT` | `/api/holdings/<id>` | Update buy price / qty / date |
| `DELETE` | `/api/holdings/<id>` | Delete a holding |
| `GET` | `/api/portfolio/refresh` | Fetch live data + compute P&L |
| `GET` | `/api/export/csv` | Export portfolio as CSV |
| `POST` | `/api/import/csv` | Import holdings from CSV |
| `GET` | `/api/quote/<SYMBOL:EXCHANGE>` | Live quote for one symbol |

> **Note:** The Flask server uses `yfinance` (server-side) so it doesn't need CORS proxies. The main `index.html` app is fully independent of the server.

---

## Development

### No build step needed

Edit `index.html` directly and open it in a browser. No npm, no bundler, no transpiler.

```bash
# Just open the file
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

### Running tests

```bash
node test.js
```

Tests cover: CSV row parsing, delimiter detection, symbol normalisation, cache age formatting, performance pill logic, portfolio summary calculations.

### Adding a broker profile

In `index.html`, find `BROKER_PROFILES` and add:

```javascript
{
  label: 'Groww',
  detect: hs => hs.includes('stock symbol') && hs.includes('avg buy price'),
  map: {
    symbol:    'stock symbol',
    qty:       'quantity',
    buy_price: 'avg buy price',
    exchange:  null,          // null → use defaultExchange
    name:      'stock name',
    buy_date:  null,
  },
  defaultExchange: 'NSE',
},
```

### Deploying to GitHub Pages

1. Go to your repo → **Settings → Pages**
2. Source: **Deploy from a branch** → **main** → **/ (root)** → **Save**
3. App is live at `https://<username>.github.io/StockPulse/` within ~1 min

---

## Build History

| Build | Highlights |
|---|---|
| **b20260318.34** | Long-press refresh sheet (Smart / Force), sticky stock name in analytics, allocation accordion with chevron, start-of-refresh notice |
| **b20260318.33** | Edit holding in-place, exchange auto-fallback (.NS↔.BO), import dialog (append/replace), Clear All button, duplicate detection, source tracking (📄 Imported badge), URBANCO-BL / EMBASSY-RR suffix stripping, REIT/InvIT name map, topbar mobile fix |
| **b20260318.32** | PWA beforeinstallprompt handler for Chrome Android |
| **b20260318.31** | Full-file header row scan (fixes Zerodha XLS with metadata rows) |
| **b20260318.30** | Zerodha Holdings Statement XLS import support |
| **b20260318.29** | Smart refresh (skip fresh symbols), analytics cleanup |
| **b20260318.28** | Holdings sort redesign, advanced analytics, dividend yield fix |
| **b20260318.27** | Watchlist independent sort sub-header |
| **b20260318.26** | Analytics redesign — filter tabs, heatmap cells, summary strip |
| **b20260318.25** | Direct Yahoo fetch (Phase 0), unit test suite |
| **b20260318.24** | Watchlist, 1D/6M% columns, dividend yield |
| **b20260318.23** | Separate Cancel button during refresh |
| **b20260318.22** | 4 CORS proxy fallbacks, stop button |

---

## localStorage Keys Reference

| Key | Contents |
|---|---|
| `ptf_v1` | Portfolio holdings array (JSON) |
| `sp_live_v1` | Live price cache with timestamp (JSON) |
| `sp_theme` | Theme preference: `"dark"` or `"light"` |
| `sp_proxy_idx` | Last-working proxy index (integer string) |
| `sp_direct` | `"1"` if direct Yahoo fetch works on this network |
| `sp_alloc_open` | `"1"` / `"0"` — allocation accordion open/closed state |

---

<p align="center">
  Built with vanilla HTML · CSS · JavaScript &nbsp;·&nbsp; No framework &nbsp;·&nbsp; No build step &nbsp;·&nbsp; No backend
</p>
