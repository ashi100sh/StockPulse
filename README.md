# 📊 Portfolio Performance Tracker — PWA

A mobile-first **Progressive Web App** that tracks your stocks and mutual funds with **1W / 1M / 3M / 1Y performance percentages**.

> No installation. No login. Works on any browser. Installs on mobile home screen like an app.

## Live App

👉 **https://ashi100sh.github.io/ClaudeCode-Experiment/**

## Features

| Feature | Detail |
|---|---|
| **Symbol Search** | Type company name or ticker — get live suggestions (Yahoo Finance) |
| **Performance %** | 1 Week, 1 Month, 3 Months, 1 Year for every holding |
| **P&L tracking** | Your invested vs current value |
| **Heatmap** | Visual grid — instantly see what's up/down by period |
| **Export CSV** | Download portfolio with all % columns |
| **Import CSV** | Bulk-add holdings from a spreadsheet |
| **Works offline** | Cached data shown when no internet |
| **Install on phone** | Add to Home Screen → opens like a native app |

## How to Install on Mobile (No App Store needed)

### iPhone / iPad (Safari)
1. Open the URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Done — icon appears on your home screen

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the **⋮ menu** → **"Add to Home screen"** or **"Install app"**
3. Done

## Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → **/ (root)**
4. Save — app is live in ~1 minute

## CSV Import Format

```csv
symbol,exchange,buy_price,quantity,buy_date
RELIANCE.NS,NSE,2500.00,10,2023-01-15
INFY.NS,NSE,1400.00,25,2023-03-20
AAPL,US,150.00,5,2022-11-01
```

## Also Included: Python Backend (optional)

If you want a local server version with persistent DB:
```bash
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```
