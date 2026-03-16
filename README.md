# ⚡ StockPulse

> **The performance tracker Zerodha Kite never gave you.**
> Track NSE, BSE & US stocks with **1W / 1M / 3M / 1Y %** — straight from your browser, no install needed.

<p align="center">
  <img src="icon-512.png" width="100" alt="StockPulse icon" />
</p>

## Live App

👉 **https://ashi100sh.github.io/StockPulse/**

Open in any browser. Install on your phone like a native app — no App Store, no Play Store.

---

## Why StockPulse?

| Zerodha Kite | StockPulse |
|---|---|
| Shows buy price & current price | ✅ Same |
| Shows P&L in ₹ | ✅ Same |
| ❌ No 1 week % change | ✅ 1 Week % |
| ❌ No 1 month % change | ✅ 1 Month % |
| ❌ No 3 month % change | ✅ 3 Months % |
| ❌ No 1 year % change | ✅ 1 Year % |
| ❌ No heatmap view | ✅ Visual heatmap |
| ❌ No CSV export with % data | ✅ Full CSV export |

---

## Features

- **Live symbol search** — type "Reliance" or "INFY", get instant suggestions
- **1W / 1M / 3M / 1Y performance %** — color-coded green/red on every holding
- **P&L tracking** — invested vs current value
- **Performance heatmap** — visual grid, switch periods with one tap
- **Tap any stock** — full detail sheet with all metrics
- **Export to CSV** — with all % columns, ready for Excel/Sheets
- **Import from CSV** — bulk-add your existing Zerodha holdings
- **Installs on phone** — works like a native app via "Add to Home Screen"
- **Works offline** — shows last cached prices without internet
- **Private** — all data stays in your browser, nothing sent to any server

---

## Install on Your Phone (No App Store)

### iPhone / iPad (Safari)
1. Open the URL in **Safari**
2. Tap the **Share button** (box with arrow ↑)
3. Tap **"Add to Home Screen"**
4. Icon appears — opens fullscreen like a real app ✅

### Android (Chrome)
1. Open in **Chrome**
2. Tap **⋮ menu → "Add to Home screen"** or **"Install app"**
3. Done ✅

---

## Enable GitHub Pages (one-time setup)

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → **main** → **/ (root)** → **Save**
3. Rename this repo to **`StockPulse`** in **Settings → General → Repository name**
4. App goes live at `https://ashi100sh.github.io/StockPulse/` within ~1 min

---

## Adding Stocks

Just type the company name or symbol in the search box — no need to know the exact ticker.

| What you type | What it finds |
|---|---|
| `Reliance` | RELIANCE.NS (NSE) |
| `Infosys` | INFY.NS |
| `Apple` | AAPL (NASDAQ) |
| `Nifty 50 ETF` | NIFTYBEES.NS |
| `HDFC Flexi Cap` | MF suggestions |

---

## Import from Zerodha / CSV

Export your holdings from Zerodha as CSV, or use this format:

```csv
symbol,exchange,buy_price,quantity,buy_date
RELIANCE.NS,NSE,2500.00,10,2023-01-15
INFY.NS,NSE,1400.00,25,2023-03-20
HDFCBANK.NS,NSE,1620.00,15,2023-06-10
AAPL,US,150.00,5,2022-11-01
```

Tap **⬆ Import CSV** in the app and select your file.

---

## Tech Stack

- Pure HTML/CSS/JS — no framework, no build step
- Yahoo Finance API for live prices and history
- `localStorage` for data — fully private
- Service Worker for offline support + PWA install
- GitHub Pages for free hosting

---

## Optional: Local Python Server

If you prefer a local version with a persistent database:

```bash
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```
