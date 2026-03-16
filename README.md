# Portfolio Performance Tracker

A web app to track stocks and mutual funds with **performance percentages** (1W, 1M, 3M, 1Y) — the feature missing from Zerodha Kite.

## Features

- Add stocks from **NSE, BSE, US markets**
- Live prices via **Yahoo Finance** (free, no API key needed)
- **Performance %** for 1 Week, 1 Month, 3 Months, 1 Year
- **P&L tracking** (invested vs current value)
- **Heatmap** visualisation by performance period
- **Export to CSV** for offline analysis
- **Import from CSV** to bulk-add holdings
- Filter/search by symbol, name, or exchange

## Setup

```bash
pip install -r requirements.txt
python app.py
```

Then open http://localhost:5000

## Adding Stocks

| Exchange | Example Symbol | Notes |
|----------|---------------|-------|
| NSE      | RELIANCE, INFY, TCS | Indian NSE stocks |
| BSE      | RELIANCE, INFY | Indian BSE stocks |
| US       | AAPL, MSFT, TSLA | US market stocks |
| MF       | 0P0001JFT5.BO | Yahoo Finance MF symbol |

## CSV Import Format

```csv
symbol,exchange,buy_price,quantity,buy_date,asset_type
RELIANCE,NSE,2500.00,10,2023-01-15,stock
INFY,NSE,1400.00,25,2023-03-20,stock
AAPL,US,150.00,5,2022-11-01,stock
```
