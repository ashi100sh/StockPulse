from flask import Flask, request, jsonify, render_template, send_file
import yfinance as yf
import sqlite3
import csv
import io
import json
from datetime import datetime, timedelta

app = Flask(__name__)
DB_PATH = "portfolio.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS holdings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                name TEXT,
                exchange TEXT DEFAULT 'NSE',
                buy_price REAL NOT NULL,
                quantity REAL NOT NULL,
                buy_date TEXT,
                asset_type TEXT DEFAULT 'stock',
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()


def get_yf_symbol(symbol, exchange):
    symbol = symbol.upper().strip()
    if exchange == "NSE":
        return f"{symbol}.NS"
    elif exchange == "BSE":
        return f"{symbol}.BO"
    elif exchange == "MF":
        return symbol  # Mutual fund symbols as-is (e.g. for Indian MF use AMFICODE or direct)
    return symbol  # US stocks etc.


def fetch_stock_data(yf_symbol):
    """Fetch current price and historical performance from Yahoo Finance."""
    try:
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period="1y")

        if hist.empty:
            return None

        current_price = float(hist["Close"].iloc[-1])
        info = {}
        try:
            info = ticker.fast_info
        except Exception:
            pass

        name = yf_symbol
        try:
            details = ticker.info
            name = details.get("longName") or details.get("shortName") or yf_symbol
        except Exception:
            pass

        def pct_change(days):
            target_date = hist.index[-1] - timedelta(days=days)
            past = hist[hist.index <= target_date]
            if past.empty:
                return None
            past_price = float(past["Close"].iloc[-1])
            if past_price == 0:
                return None
            return round(((current_price - past_price) / past_price) * 100, 2)

        return {
            "current_price": round(current_price, 2),
            "name": name,
            "pct_1w": pct_change(7),
            "pct_1m": pct_change(30),
            "pct_3m": pct_change(90),
            "pct_1y": pct_change(365),
        }
    except Exception as e:
        return {"error": str(e)}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/holdings", methods=["GET"])
def get_holdings():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM holdings ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/holdings", methods=["POST"])
def add_holding():
    data = request.json
    symbol = data.get("symbol", "").upper().strip()
    exchange = data.get("exchange", "NSE").upper()
    buy_price = float(data["buy_price"])
    quantity = float(data["quantity"])
    buy_date = data.get("buy_date", "")
    asset_type = data.get("asset_type", "stock")

    yf_sym = get_yf_symbol(symbol, exchange)
    stock_data = fetch_stock_data(yf_sym)
    name = stock_data.get("name", symbol) if stock_data and "error" not in stock_data else symbol

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO holdings (symbol, name, exchange, buy_price, quantity, buy_date, asset_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (symbol, name, exchange, buy_price, quantity, buy_date, asset_type),
        )
        conn.commit()
        holding_id = cursor.lastrowid

    return jsonify({"id": holding_id, "message": "Added successfully"}), 201


@app.route("/api/holdings/<int:holding_id>", methods=["DELETE"])
def delete_holding(holding_id):
    with get_db() as conn:
        conn.execute("DELETE FROM holdings WHERE id = ?", (holding_id,))
        conn.commit()
    return jsonify({"message": "Deleted"})


@app.route("/api/holdings/<int:holding_id>", methods=["PUT"])
def update_holding(holding_id):
    data = request.json
    with get_db() as conn:
        conn.execute(
            "UPDATE holdings SET buy_price=?, quantity=?, buy_date=? WHERE id=?",
            (float(data["buy_price"]), float(data["quantity"]), data.get("buy_date", ""), holding_id),
        )
        conn.commit()
    return jsonify({"message": "Updated"})


@app.route("/api/quote/<path:symbol>")
def get_quote(symbol):
    """Get live quote and performance for a symbol (format: SYMBOL:EXCHANGE)"""
    parts = symbol.split(":")
    sym = parts[0].upper()
    exchange = parts[1].upper() if len(parts) > 1 else "NSE"
    yf_sym = get_yf_symbol(sym, exchange)
    data = fetch_stock_data(yf_sym)
    if data is None:
        return jsonify({"error": f"Symbol {yf_sym} not found"}), 404
    return jsonify(data)


@app.route("/api/portfolio/refresh")
def refresh_portfolio():
    """Fetch live data for all holdings and compute P&L + performance."""
    with get_db() as conn:
        holdings = conn.execute("SELECT * FROM holdings").fetchall()

    results = []
    total_invested = 0
    total_current = 0

    for h in holdings:
        h = dict(h)
        yf_sym = get_yf_symbol(h["symbol"], h["exchange"])
        market_data = fetch_stock_data(yf_sym)

        invested = h["buy_price"] * h["quantity"]
        total_invested += invested

        if market_data and "error" not in market_data:
            current_val = market_data["current_price"] * h["quantity"]
            total_current += current_val
            pl = current_val - invested
            pl_pct = round((pl / invested) * 100, 2) if invested else 0

            results.append({
                **h,
                **market_data,
                "invested": round(invested, 2),
                "current_value": round(current_val, 2),
                "pl": round(pl, 2),
                "pl_pct": pl_pct,
            })
        else:
            total_current += invested
            results.append({
                **h,
                "current_price": None,
                "invested": round(invested, 2),
                "current_value": round(invested, 2),
                "pl": 0,
                "pl_pct": 0,
                "pct_1w": None,
                "pct_1m": None,
                "pct_3m": None,
                "pct_1y": None,
                "error": market_data.get("error") if market_data else "No data",
            })

    total_pl = total_current - total_invested
    total_pl_pct = round((total_pl / total_invested) * 100, 2) if total_invested else 0

    return jsonify({
        "holdings": results,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current": round(total_current, 2),
            "total_pl": round(total_pl, 2),
            "total_pl_pct": total_pl_pct,
        },
    })


@app.route("/api/export/csv")
def export_csv():
    """Export portfolio to CSV."""
    data = refresh_portfolio().get_json()
    holdings = data["holdings"]

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "symbol", "name", "exchange", "asset_type", "quantity",
            "buy_price", "buy_date", "current_price",
            "invested", "current_value", "pl", "pl_pct",
            "pct_1w", "pct_1m", "pct_3m", "pct_1y",
        ],
    )
    writer.writeheader()
    for h in holdings:
        writer.writerow({k: h.get(k, "") for k in writer.fieldnames})

    output.seek(0)
    return send_file(
        io.BytesIO(output.read().encode()),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"portfolio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
    )


@app.route("/api/import/csv", methods=["POST"])
def import_csv():
    """Import holdings from CSV file."""
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file provided"}), 400

    content = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    added = 0

    with get_db() as conn:
        for row in reader:
            try:
                symbol = row.get("symbol", "").upper().strip()
                if not symbol:
                    continue
                conn.execute(
                    "INSERT INTO holdings (symbol, name, exchange, buy_price, quantity, buy_date, asset_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        symbol,
                        row.get("name", symbol),
                        row.get("exchange", "NSE").upper(),
                        float(row.get("buy_price", 0)),
                        float(row.get("quantity", 0)),
                        row.get("buy_date", ""),
                        row.get("asset_type", "stock"),
                    ),
                )
                added += 1
            except Exception:
                continue
        conn.commit()

    return jsonify({"message": f"Imported {added} holdings"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
