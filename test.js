// StockPulse Unit Tests — run with: node test.js
'use strict';

// ── Pure functions under test (mirrors index.html) ──────────────────────────

const NSE_EX = new Set(['NSI', 'NSE']);
const BSE_EX = new Set(['BSE', 'BOM']);

function normalizeYfSymbol(raw, exchange) {
  const s = (raw || '').trim().toUpperCase();
  if (!s || s.includes('.')) return s;
  const ex = (exchange || '').toUpperCase();
  if (NSE_EX.has(ex)) return s + '.NS';
  if (BSE_EX.has(ex)) return s + '.BO';
  return s;
}

function displaySym(s) { return (s || '').replace(/\.(NS|BO)$/i, ''); }

function pctChange(closes, timestamps, daysAgo) {
  if (!closes || !closes.length) return null;
  const valid = closes.filter(c => c != null);
  if (!valid.length) return null;
  const cur = valid[valid.length - 1];
  const targetTs = timestamps[timestamps.length - 1] - daysAgo * 86400;
  let best = null;
  for (let i = timestamps.length - 2; i >= 0; i--) {
    if (timestamps[i] <= targetTs && closes[i] != null) { best = closes[i]; break; }
  }
  if (!best || best === 0) return null;
  return parseFloat(((cur - best) / best * 100).toFixed(2));
}

function parseImportRow(headers, cols) {
  const row = {};
  headers.forEach((h, i) => row[h] = (cols[i] || '').replace(/"/g, '').trim());
  const sym = (row['symbol'] || row['tradingsymbol'] || '').toUpperCase().trim();
  const bp  = parseFloat(row['buy price'] || row['buy_price'] || row['average price'] || row['average_price'] || 0);
  const qty = parseFloat(row['quantity'] || row['qty'] || 0);
  const exch = (row['exchange'] || 'NSE').toUpperCase();
  return { sym, bp, qty, exch };
}

// ── Test runner ──────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
function test(name, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) { pass++; process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`); }
  else     { fail++; process.stderr.write(`  \x1b[31m✗\x1b[0m ${name}\n    expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}\n`); }
}

// ── normalizeYfSymbol ────────────────────────────────────────────────────────
console.log('\nnormalizeYfSymbol');
test('NSE exchange → .NS',              'ICICIBANK.NS', normalizeYfSymbol('ICICIBANK', 'NSE'));
test('NSI exchange → .NS',              'HDFCBANK.NS',  normalizeYfSymbol('HDFCBANK',  'NSI'));
test('BSE exchange → .BO',              'ICICIBANK.BO', normalizeYfSymbol('ICICIBANK', 'BSE'));
test('BOM exchange → .BO',              'TCS.BO',       normalizeYfSymbol('TCS',       'BOM'));
test('Already has .NS → no change',     'RELIANCE.NS',  normalizeYfSymbol('RELIANCE.NS', 'NSE'));
test('Already has .BO → no change',     'RELIANCE.BO',  normalizeYfSymbol('RELIANCE.BO', 'BSE'));
test('Foreign exchange → no suffix',    'AAPL',         normalizeYfSymbol('AAPL', 'NMS'));
test('Empty exchange → no suffix',      'AAPL',         normalizeYfSymbol('AAPL', ''));
test('Lowercase input → uppercased',    'ICICIBANK.NS', normalizeYfSymbol('icicibank', 'NSE'));
test('Empty string → empty',            '',             normalizeYfSymbol('', 'NSE'));
test('Mutual fund symbol with dot',     '0P0000ABCD.BO',normalizeYfSymbol('0P0000ABCD.BO', 'BSE'));

// ── displaySym ───────────────────────────────────────────────────────────────
console.log('\ndisplaySym');
test('Strip .NS',          'ICICIBANK', displaySym('ICICIBANK.NS'));
test('Strip .BO',          'ICICIBANK', displaySym('ICICIBANK.BO'));
test('No suffix unchanged','AAPL',      displaySym('AAPL'));
test('Null → empty',       '',          displaySym(null));
test('Empty → empty',      '',          displaySym(''));
test('Case insensitive .ns','ICICI',    displaySym('ICICI.ns'));

// ── pctChange ────────────────────────────────────────────────────────────────
console.log('\npctChange');
// 5 days of data: day0=1000000, day4=1345600
const TS = [1000000, 1086400, 1172800, 1259200, 1345600];
const CS = [100, 102, 98, 105, 110];
test('Full-range change: (110-100)/100*100',  10.0, pctChange(CS, TS, 4));
test('1-day change: (110-105)/105*100',        4.76, pctChange(CS, TS, 1));
test('Null closes → null',    null, pctChange(null, TS, 7));
test('Empty closes → null',   null, pctChange([], TS, 7));
test('No prior data → null',  null, pctChange([null, null, 100], [1, 2, 3], 365));
test('Zero prior price → null', null, pctChange([0, 100], [1000000, 1086400], 1));

// ── parseImportRow (CSV parsing) ─────────────────────────────────────────────
console.log('\nparseImportRow');
const stdHeaders = ['symbol','exchange','buy price','quantity'];
test('Standard CSV row',
  { sym:'ICICIBANK', bp:450.5, qty:10, exch:'NSE' },
  parseImportRow(stdHeaders, ['"ICICIBANK"','"NSE"','"450.5"','"10"']));

const growwHeaders = ['tradingsymbol','exchange','average_price','quantity'];
test('Groww-style CSV row',
  { sym:'HDFCBANK', bp:1600, qty:5, exch:'NSE' },
  parseImportRow(growwHeaders, ['HDFCBANK','NSE','1600','5']));

test('Missing exchange defaults to NSE',
  { sym:'RELIANCE', bp:2800, qty:2, exch:'NSE' },
  parseImportRow(['symbol','buy price','quantity'], ['RELIANCE','2800','2']));

// ── Summary ──────────────────────────────────────────────────────────────────
const total = pass + fail;
const colour = fail ? '\x1b[31m' : '\x1b[32m';
console.log(`\n${colour}${total} tests: ${pass} passed, ${fail} failed\x1b[0m\n`);
if (fail > 0) process.exit(1);
