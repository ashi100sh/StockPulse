// StockPulse Unit Tests — run with: node test.js
'use strict';

// ── Pure functions under test (mirrors index.html) ──────────────────────────

const NSE_EX = new Set(['NSI', 'NSE']);
const BSE_EX = new Set(['BSE', 'BOM']);

function isSgb(sym) { return /-GB(\.(NS|BO))?$/i.test(sym || ''); }

function cacheAgeStr(ageMs) {
  const m = Math.floor(ageMs / 60000);
  if (m <  1)   return 'just now';
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d !== 1 ? 's' : ''} ago`;
}

function esc(s) { return String(s).replace(/'/g, "&#39;").replace(/"/g, '&quot;'); }

function parseCSVRow(line, delim = ',') {
  if (delim === '\t') return line.split('\t').map(c => c.trim());
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      cols.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function detectDelimiter(line) {
  const tabs   = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g)  || []).length;
  return tabs > commas ? '\t' : ',';
}

function normalizeYfSymbol(raw, exchange) {
  const s = (raw || '').trim().toUpperCase();
  if (!s || s.includes('.')) return s;
  const ex = (exchange || '').toUpperCase();
  if (NSE_EX.has(ex)) return s + '.NS';
  if (BSE_EX.has(ex)) return s + '.BO';
  return s;
}

function displaySym(s) { return (s || '').replace(/\.(NS|BO)$/i, ''); }

// Zerodha suffix stripping — mirrors ZERODHA_SUFFIXES in processImportText()
const ZERODHA_SUFFIXES = /-(BL|BE|SM|IL|BZ|MT|SZ|RR|IV|E)$/i;
function stripZerodhaSuffix(sym) { return sym.replace(ZERODHA_SUFFIXES, ''); }



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
async function testA(name, fn) {
  try {
    await fn();
    pass++;
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${name}\n`);
  } catch (e) {
    fail++;
    process.stderr.write(`  \x1b[31m✗\x1b[0m ${name}\n    ${e.message}\n`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(`${msg || ''}\n  expected: ${JSON.stringify(a)}\n  got:      ${JSON.stringify(b)}`);
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

// ── stripZerodhaSuffix ───────────────────────────────────────────────────────
console.log('\nstripZerodhaSuffix');
test('ETF -E stripped (GOLDBEES-E → GOLDBEES)',   'GOLDBEES',  stripZerodhaSuffix('GOLDBEES-E'));
test('ETF -E stripped (NIFTYBEES-E)',             'NIFTYBEES', stripZerodhaSuffix('NIFTYBEES-E'));
test('ETF -E stripped (LIQUIDBEES-E)',            'LIQUIDBEES',stripZerodhaSuffix('LIQUIDBEES-E'));
test('-BL stripped (blocked)',                    'URBANCO',   stripZerodhaSuffix('URBANCO-BL'));
test('-BE stripped (book entry)',                 'SUZLON',    stripZerodhaSuffix('SUZLON-BE'));
test('-SM stripped (SME)',                        'ABCD',      stripZerodhaSuffix('ABCD-SM'));
test('-IL stripped (illiquid)',                   'XYZ',       stripZerodhaSuffix('XYZ-IL'));
test('-RR stripped (REIT on NSE)',                'EMBASSY',   stripZerodhaSuffix('EMBASSY-RR'));
test('-IV stripped (InvIT on NSE)',               'PGINVIT',   stripZerodhaSuffix('PGINVIT-IV'));
test('-BZ stripped',                             'ABC',       stripZerodhaSuffix('ABC-BZ'));
test('-MT stripped',                             'ABC',       stripZerodhaSuffix('ABC-MT'));
test('-SZ stripped',                             'ABC',       stripZerodhaSuffix('ABC-SZ'));
test('Case-insensitive: -bl stripped',           'URBANCO',   stripZerodhaSuffix('URBANCO-bl'));
test('Clean symbol → unchanged',                 'RELIANCE',  stripZerodhaSuffix('RELIANCE'));
test('Symbol with dot → unchanged',              'INFY.NS',   stripZerodhaSuffix('INFY.NS'));
test('-E only stripped at end',                  'A-EB',      stripZerodhaSuffix('A-EB'));  // -EB is not a suffix
test('GOLDBEES-E normalizes to GOLDBEES.NS',
  'GOLDBEES.NS',
  normalizeYfSymbol(stripZerodhaSuffix('GOLDBEES-E'), 'NSE'));

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

// ── isSgb ────────────────────────────────────────────────────────────────────
console.log('\nisSgb');
test('SGB symbol bare',              true,  isSgb('SGBBSE2428-GB'));
test('SGB with .NS suffix',          true,  isSgb('SGBBSE2428-GB.NS'));
test('SGB with .BO suffix',          true,  isSgb('SGBBSE2428-GB.BO'));
test('SGB lowercase -gb',            true,  isSgb('SGBBSE2428-gb'));
test('Regular stock → false',        false, isSgb('RELIANCE.NS'));
test('Empty string → false',         false, isSgb(''));
test('Null → false',                 false, isSgb(null));
test('Symbol ending in GB but no dash → false', false, isSgb('SGBGB'));

// ── cacheAgeStr ──────────────────────────────────────────────────────────────
console.log('\ncacheAgeStr');
test('< 1 min → just now',           'just now', cacheAgeStr(30000));
test('exactly 0 ms → just now',      'just now', cacheAgeStr(0));
test('1 min',                        '1m ago',   cacheAgeStr(60000));
test('59 min',                       '59m ago',  cacheAgeStr(59 * 60000));
test('1 hour',                       '1h ago',   cacheAgeStr(60 * 60000));
test('23 hours',                     '23h ago',  cacheAgeStr(23 * 60 * 60000));
test('1 day (singular)',             '1 day ago', cacheAgeStr(24 * 60 * 60000));
test('2 days (plural)',              '2 days ago', cacheAgeStr(2 * 24 * 60 * 60000));

// ── esc ──────────────────────────────────────────────────────────────────────
console.log('\nesc');
test('Escapes single quote',         'it&#39;s', esc("it's"));
test('Escapes double quote',         '&quot;hi&quot;', esc('"hi"'));
test('No special chars → unchanged', 'RELIANCE', esc('RELIANCE'));
test('Number coerced to string',     '123',      esc(123));
test('Empty string',                 '',         esc(''));

// ── parseCSVRow ───────────────────────────────────────────────────────────────
console.log('\nparseCSVRow');
test('Simple comma row',             ['A','B','C'],           parseCSVRow('A,B,C'));
test('Quoted field with comma',      ['RELIANCE','1,000','5'], parseCSVRow('"RELIANCE","1,000","5"'));
test('Escaped double-quote in field',['say "hi"','x'],        parseCSVRow('"say ""hi""",x'));
test('Tab-delimited fast path',      ['A','B','C'],           parseCSVRow('A\tB\tC', '\t'));
test('Trailing empty field',         ['A','B',''],            parseCSVRow('A,B,'));
test('Leading/trailing spaces trimmed', ['A','B'],            parseCSVRow(' A , B '));

// ── detectDelimiter ───────────────────────────────────────────────────────────
console.log('\ndetectDelimiter');
test('More tabs → tab',   '\t', detectDelimiter('A\tB\tC,D'));
test('More commas → comma', ',', detectDelimiter('A,B,C\tD'));
test('Only commas → comma', ',', detectDelimiter('A,B,C'));
test('Only tabs → tab',     '\t', detectDelimiter('A\tB\tC'));
test('Equal counts → comma', ',', detectDelimiter('A\tB,C'));

/** Pure dividend yield resolution — mirrors fetchDividendYield() field priority. */
function resolveDivYield(q) {
  if (!q) return null;
  const rawYield = q.trailingAnnualDividendYield ?? q.dividendYield ?? q.forwardAnnualDividendYield;
  if (rawYield != null && rawYield > 0)
    return parseFloat((rawYield * 100).toFixed(2));
  const rate  = q.trailingAnnualDividendRate ?? q.forwardAnnualDividendRate;
  const price = q.regularMarketPrice;
  if (rate != null && rate > 0 && price > 0)
    return parseFloat((rate / price * 100).toFixed(2));
  return 0;
}

/** Returns the matching entry if sym already in same bucket, else null. */
function checkDuplicate(portfolio, yfSymbol, isWatch) {
  return portfolio.find(h => h.yf_symbol === yfSymbol && !!h.watch === isWatch) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  New functions under test
// ─────────────────────────────────────────────────────────────────────────────

function buildPillsHtml(d, isStale) {
  const PERF = [['1D','pct_1d'],['1W','pct_1w'],['1M','pct_1m']];
  let pills = PERF.map(([lbl, key]) => {
    const v = d[key];
    if (v == null) return `<span class="perf-pill na${isStale ? ' stale' : ''}">${lbl} —</span>`;
    return `<span class="perf-pill ${v >= 0 ? 'pos' : 'neg'}${isStale ? ' stale' : ''}">${lbl} ${v >= 0 ? '+' : ''}${v}%</span>`;
  }).join('');
  if (d.div_yield != null && d.div_yield > 0)
    pills += `<span class="perf-pill info" title="Trailing annual dividend yield">Div ${d.div_yield}%</span>`;
  if (d._quoteOnly)
    pills += '<span class="perf-pill warn" title="Chart API blocked — price only; %% on next refresh">~ price only</span>';
  return pills;
}

/**
 * portfolioSummaryCalc — pure math used by updateSummary().
 * Returns { inv, cur } only counting non-watchlist holdings.
 */
// Mirror of sortRows in index.html — nulls always sink to bottom
function sortRows(rows, col, dir) {
  return rows.slice().sort((a, b) => {
    if (col === 'symbol') return dir * a.h.symbol.localeCompare(b.h.symbol);
    const MISSING = dir > 0 ? Infinity : -Infinity;
    const pick = (r, c) =>
      c === 'price'  ? (r.d?.price  ?? MISSING) :
      c === 'value'  ? (r.curVal    ?? MISSING) :
      c === 'pl_pct' ? (r.pl_pct   ?? MISSING) :
      c === 'pl_abs' ? (r.pl_abs   ?? MISSING) :
      c === 'wt'     ? (r.wt       ?? MISSING) : (r.d?.[c] ?? MISSING);
    return dir * (pick(a, col) - pick(b, col));
  });
}

function portfolioSummaryCalc(portfolio, liveData) {
  const holdings = portfolio.filter(h => !h.watch);
  let inv = 0, cur = 0;
  holdings.forEach(h => {
    const d = liveData[h.yf_symbol];
    inv += h.buy_price * h.qty;
    cur += d ? d.price * h.qty : h.buy_price * h.qty;
  });
  return { inv, cur, pl: cur - inv, count: holdings.length };
}

/**
 * Minimal, injectable proxyFetch for unit tests.
 * All AbortController/timeout behaviour is stripped so tests run synchronously.
 */
function makeProxyFetch(fetchImpl, lsStore, proxyDefs) {
  const PROXY_CACHE_KEY = 'sp_proxy_idx';
  const DIRECT_KEY      = 'sp_direct';
  const ls = {
    getItem:    k     => lsStore[k] ?? null,
    setItem:    (k,v) => { lsStore[k] = v; },
    removeItem: k     => { delete lsStore[k]; },
  };

  async function _tryDirect(rawUrl) {
    const res = await fetchImpl(rawUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text) throw new Error('empty');
    return { _isDirect: true, text };
  }

  async function _tryOneProxy(rawUrl, idx) {
    const { make, extract } = proxyDefs[idx];
    const res  = await fetchImpl(make(rawUrl));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await extract(res);
    if (!text) throw new Error('empty');
    return { _isProxy: true, idx, text };
  }

  async function proxyFetch(rawUrl) {
    // Phase 0
    if (ls.getItem(DIRECT_KEY) === '1') {
      const direct = await _tryDirect(rawUrl).catch(() => null);
      if (direct) return direct;
      ls.removeItem(DIRECT_KEY);
    }
    // Phase 1
    const preferred = parseInt(ls.getItem(PROXY_CACHE_KEY) ?? '-1');
    if (preferred >= 0 && preferred < proxyDefs.length) {
      const quick = await _tryOneProxy(rawUrl, preferred).catch(() => null);
      if (quick) return quick;
    }
    // Phase 2: race proxies + direct
    const proxyAttempts = proxyDefs.map(async ({ make, extract }, i) => {
      const res  = await fetchImpl(make(rawUrl));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await extract(res);
      if (!text) throw new Error('empty');
      ls.removeItem(DIRECT_KEY);
      ls.setItem(PROXY_CACHE_KEY, String(i));
      return { _isProxy: true, idx: i, text };
    });
    const directAttempt = _tryDirect(rawUrl).then(r => {
      ls.setItem(DIRECT_KEY, '1');
      ls.removeItem(PROXY_CACHE_KEY);
      return r;
    });
    try {
      return await Promise.any([...proxyAttempts, directAttempt]);
    } catch {
      ls.removeItem(PROXY_CACHE_KEY);
      throw new Error('All proxies and direct fetch failed');
    }
  }

  return { proxyFetch, ls };
}

// ── resolveDivYield (mirrors fetchDividendYield field priority) ───────────────
console.log('\nresolveDivYield');
// trailingAnnualDividendYield wins when present
test('trailing yield → multiplied to %',          3.65, resolveDivYield({ trailingAnnualDividendYield: 0.0365 }));
// dividendYield (forward in Yahoo API) wins when trailing is absent
test('dividendYield used when trailing absent',   4.71, resolveDivYield({ dividendYield: 0.0471 }));
// forwardAnnualDividendYield is last yield fallback
test('forwardAnnualDividendYield last resort',    2.50, resolveDivYield({ forwardAnnualDividendYield: 0.025 }));
// trailing > dividendYield > forward priority
test('trailing wins over dividendYield',          1.00, resolveDivYield({ trailingAnnualDividendYield: 0.01, dividendYield: 0.05 }));
test('dividendYield wins over forwardYield',      5.00, resolveDivYield({ dividendYield: 0.05, forwardAnnualDividendYield: 0.02 }));
// rate/price fallback — INFY style: rate=45, price~1230
test('rate/price fallback (trailingRate)',         parseFloat((45 / 1230 * 100).toFixed(2)),
  resolveDivYield({ trailingAnnualDividendRate: 45, regularMarketPrice: 1230 }));
test('forwardAnnualDividendRate fallback',        parseFloat((14.35 / 305 * 100).toFixed(2)),
  resolveDivYield({ forwardAnnualDividendRate: 14.35, regularMarketPrice: 305 }));
// trailing rate preferred over forward rate
test('trailingRate wins over forwardRate',
  parseFloat((20 / 500 * 100).toFixed(2)),
  resolveDivYield({ trailingAnnualDividendRate: 20, forwardAnnualDividendRate: 10, regularMarketPrice: 500 }));
// zero / null yield → 0
test('all null → 0',                              0, resolveDivYield({}));
test('yield=0 treated as absent, rate also 0 → 0', 0, resolveDivYield({ trailingAnnualDividendYield: 0, trailingAnnualDividendRate: 0 }));
test('null q → null',                             null, resolveDivYield(null));
// price = 0 prevents divide-by-zero
test('rate present but price=0 → 0',             0, resolveDivYield({ trailingAnnualDividendRate: 45, regularMarketPrice: 0 }));

// ── checkDuplicate ────────────────────────────────────────────────────────────
console.log('\ncheckDuplicate');
const mixedPortfolio = [
  { id: 1, yf_symbol: 'RELIANCE.NS', buy_price: 2800, qty: 2 },           // portfolio
  { id: 2, yf_symbol: 'HDFCBANK.NS', buy_price: 1600, qty: 5 },           // portfolio
  { id: 3, yf_symbol: 'TCS.NS',      watch: true },                        // watchlist
  { id: 4, yf_symbol: 'AAPL',        watch: true },                        // watchlist
];
test('portfolio dupe found',                   1,    checkDuplicate(mixedPortfolio, 'RELIANCE.NS', false)?.id);
test('second portfolio dupe found',            2,    checkDuplicate(mixedPortfolio, 'HDFCBANK.NS', false)?.id);
test('watchlist dupe found',                   3,    checkDuplicate(mixedPortfolio, 'TCS.NS',      true)?.id);
test('no dupe — new portfolio sym → null',     null, checkDuplicate(mixedPortfolio, 'INFY.NS',     false));
test('no dupe — new watchlist sym → null',     null, checkDuplicate(mixedPortfolio, 'MSFT',        true));
test('portfolio sym not a watchlist dupe',     null, checkDuplicate(mixedPortfolio, 'RELIANCE.NS', true));
test('watchlist sym not a portfolio dupe',     null, checkDuplicate(mixedPortfolio, 'TCS.NS',      false));
test('empty portfolio → null',                 null, checkDuplicate([], 'AAPL', false));
test('watch:false same as no watch flag',      1,    checkDuplicate(
  [{ id:1, yf_symbol:'X.NS', watch:false }], 'X.NS', false)?.id);
test('watch:undefined treated as portfolio',   1,    checkDuplicate(
  [{ id:1, yf_symbol:'X.NS' }], 'X.NS', false)?.id);

// ─────────────────────────────────────────────────────────────────────────────
//  Async test sections
// ─────────────────────────────────────────────────────────────────────────────
(async () => {

// ── pctChange 6M ─────────────────────────────────────────────────────────────
console.log('\npctChange 6M');
// Build ~200-day dataset (step = 1 day = 86400s); cur=last, 6M~182 days ago
const TS200 = Array.from({length:200}, (_, i) => 1000000 + i * 86400);
const CS200 = Array.from({length:200}, (_, i) => 100 + i * 0.5); // 100 → 199.5
// targetTs = TS200[199] - 182*86400 → index 17 → close[17]=108.5; cur=199.5
// expected = (199.5 - 108.5) / 108.5 * 100 = 83.87
test('6M change (182 days) = (cur - hist) / hist * 100',
  parseFloat(((199.5 - 108.5) / 108.5 * 100).toFixed(2)),
  pctChange(CS200, TS200, 182));
test('1D from 200-day set', parseFloat(((199.5 - 199.0) / 199.0 * 100).toFixed(2)),
  pctChange(CS200, TS200, 1));

// ── buildPillsHtml ────────────────────────────────────────────────────────────
console.log('\nbuildPillsHtml');
test('All null → 3 na pills (1D 1W 1M only)',
  3,
  (buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null }, false)
    .match(/perf-pill na/g) || []).length);

test('3M/6M/1Y keys ignored — only 3 pills rendered',
  3,
  (buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null,pct_3m:5,pct_6m:5,pct_1y:5 }, false)
    .match(/perf-pill/g) || []).length);

test('Positive value → pos class',
  true,
  buildPillsHtml({ pct_1d:1.5,pct_1w:null,pct_1m:null }, false)
    .includes('perf-pill pos'));

test('Negative value → neg class',
  true,
  buildPillsHtml({ pct_1d:-2.3,pct_1w:null,pct_1m:null }, false)
    .includes('perf-pill neg'));

test('Stale flag → stale added to na pill',
  true,
  buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null }, true)
    .includes('perf-pill na stale'));

test('Stale flag → stale added to pos pill',
  true,
  buildPillsHtml({ pct_1d:1.0,pct_1w:null,pct_1m:null }, true)
    .includes('perf-pill pos stale'));

test('div_yield present → info pill shown',
  true,
  buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null,div_yield:2.5 }, false)
    .includes('perf-pill info'));

test('div_yield 0 → info pill NOT shown',
  false,
  buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null,div_yield:0 }, false)
    .includes('perf-pill info'));

test('_quoteOnly → warn pill shown',
  true,
  buildPillsHtml({ pct_1d:null,pct_1w:null,pct_1m:null,_quoteOnly:true }, false)
    .includes('perf-pill warn'));

test('3 perf labels present: 1D 1W 1M',
  true,
  ['1D','1W','1M'].every(lbl =>
    buildPillsHtml({ pct_1d:1,pct_1w:1,pct_1m:1 }, false).includes(lbl)));

test('3M label NOT shown on card (analytics only)',
  false,
  buildPillsHtml({ pct_1d:1,pct_1w:1,pct_1m:1,pct_3m:1 }, false).includes('>3M '));

// ── portfolioSummaryCalc ──────────────────────────────────────────────────────
console.log('\nportfolioSummaryCalc');
const ptf = [
  { yf_symbol:'A.NS', buy_price:100, qty:10 },              // portfolio
  { yf_symbol:'B.NS', buy_price:200, qty:5  },              // portfolio
  { yf_symbol:'C.NS', watch:true },                         // watchlist — must be excluded
];
const ld = { 'A.NS':{ price:120 }, 'B.NS':{ price:180 }, 'C.NS':{ price:500 } };
const s = portfolioSummaryCalc(ptf, ld);
test('count excludes watchlist',         2,      s.count);
test('inv = sum of portfolio holdings',  2000,   s.inv);  // 100*10 + 200*5
test('cur = live prices of portfolio',   2100,   s.cur);  // 120*10 + 180*5
test('pl = cur - inv',                   100,    s.pl);

const sNoLive = portfolioSummaryCalc(ptf, {});
test('no live data → cur falls back to buy_price', 2000, sNoLive.cur);
test('no live data → pl = 0',                      0,    sNoLive.pl);

const sOnlyWatch = portfolioSummaryCalc([{ yf_symbol:'C.NS', watch:true }], ld);
test('only watchlist → count=0',   0, sOnlyWatch.count);
test('only watchlist → inv=0',     0, sOnlyWatch.inv);

// ── proxyFetch phases ─────────────────────────────────────────────────────────
console.log('\nproxyFetch phases');

// Helper: make a fake ok fetch response
const okFetch = text => Promise.resolve({ ok:true, text: () => Promise.resolve(text) });
const failFetch = () => Promise.resolve({ ok:false, status:429, text: () => Promise.resolve('') });
const throwFetch = () => Promise.reject(new Error('network error'));

// Minimal proxy defs for tests (2 proxies)
const FAKE_PROXIES = [
  { make: u => 'p0:' + u, extract: async r => r.text() },
  { make: u => 'p1:' + u, extract: async r => r.text() },
];

await testA('Phase 0: DIRECT_KEY set + direct succeeds → returns without hitting proxy', async () => {
  let proxyCalled = false;
  const fetchImpl = url => {
    if (!url.startsWith('p')) return okFetch('{"ok":1}');
    proxyCalled = true;
    return okFetch('{"proxy":1}');
  };
  const ls = { sp_direct: '1' };
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isDirect, 'should return direct result');
  assert(!proxyCalled, 'proxy should not be called');
  assertEqual('1', ls.sp_direct, 'DIRECT_KEY should stay set');
});

await testA('Phase 0: DIRECT_KEY set + direct fails → clears DIRECT_KEY, falls through to proxy', async () => {
  const fetchImpl = url => url.startsWith('p0:') ? okFetch('{"proxy":1}') : failFetch();
  const ls = { sp_direct: '1' };
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isProxy, 'should fall through to proxy');
  assert(!ls.hasOwnProperty('sp_direct'), 'DIRECT_KEY should be cleared after direct fail');
});

await testA('Phase 1: preferred proxy cached + succeeds → fast return without Phase 2 race', async () => {
  let callCount = 0;
  const fetchImpl = url => { callCount++; return okFetch('{"ok":1}'); };
  const ls = { sp_proxy_idx: '1' };    // preferred = proxy index 1
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isProxy && r.idx === 1, 'should use proxy 1');
  assert(callCount === 1, 'only 1 fetch call (Phase 1 hit, no Phase 2 race)');
});

await testA('Phase 1: preferred proxy fails → Phase 2 race runs', async () => {
  const fetchImpl = url => {
    if (url === 'p1:https://yf.test/data') return failFetch(); // preferred (idx=1) fails
    return okFetch('{"ok":1}');
  };
  const ls = { sp_proxy_idx: '1' };
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r, 'should succeed via Phase 2');
});

await testA('Phase 2: direct wins → sets DIRECT_KEY, clears PROXY_CACHE_KEY', async () => {
  // All proxies fail, direct succeeds
  const fetchImpl = url => url.startsWith('p') ? failFetch() : okFetch('{"direct":1}');
  const ls = {};  // no cache
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isDirect, 'direct should win');
  assertEqual('1', ls.sp_direct, 'DIRECT_KEY should be set');
  assert(!ls.hasOwnProperty('sp_proxy_idx'), 'PROXY_CACHE_KEY should be cleared');
});

await testA('Phase 2: proxy wins → sets PROXY_CACHE_KEY, clears DIRECT_KEY', async () => {
  // Direct fails, proxy 0 succeeds
  const fetchImpl = url => url.startsWith('p0:') ? okFetch('{"proxy0":1}') : failFetch();
  const ls = {};
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isProxy, 'proxy should win');
  assertEqual('0', ls.sp_proxy_idx, 'winning proxy index saved');
  assert(!ls.hasOwnProperty('sp_direct'), 'DIRECT_KEY should be absent');
});

await testA('All fail → throws and clears PROXY_CACHE_KEY', async () => {
  const fetchImpl = () => throwFetch();
  const ls = { sp_proxy_idx: '0' };
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  let threw = false;
  try { await proxyFetch('https://yf.test/data'); }
  catch { threw = true; }
  assert(threw, 'should throw when all fail');
  assert(!ls.hasOwnProperty('sp_proxy_idx'), 'PROXY_CACHE_KEY cleared on total failure');
});

await testA('DIRECT_KEY not set + no proxy cache → Phase 2 discovery, direct wins', async () => {
  const fetchImpl = url => url.startsWith('p') ? throwFetch() : okFetch('{"fresh":1}');
  const ls = {};
  const { proxyFetch } = makeProxyFetch(fetchImpl, ls, FAKE_PROXIES);
  const r = await proxyFetch('https://yf.test/data');
  assert(r._isDirect, 'direct discovery via Phase 2');
  assertEqual('1', ls.sp_direct, 'DIRECT_KEY saved for next time');
});

// ── sortRows: null-sinks-to-bottom ───────────────────────────────────────────
// Helper: make a minimal row object
function mkRow(sym, pct1d, value, plPct) {
  return { h: { symbol: sym }, d: pct1d != null ? { pct_1d: pct1d } : null,
           curVal: value ?? null, pl_pct: plPct ?? null, pl_abs: null, wt: null };
}

// DESC (dir=-1): ↓ arrow → highest pct_1d first, nulls last
{
  const rows = [mkRow('A', null), mkRow('B', 2.0), mkRow('C', -1.5), mkRow('D', null), mkRow('E', 5.0)];
  const sorted = sortRows(rows, 'pct_1d', -1);
  test('sortRows ↓ pct_1d: first entry is highest value',  'E', sorted[0].h.symbol);
  test('sortRows ↓ pct_1d: second entry is next highest',  'B', sorted[1].h.symbol);
  test('sortRows ↓ pct_1d: third entry is negative',       'C', sorted[2].h.symbol);
  test('sortRows ↓ pct_1d: null sinks to 4th',             true, sorted[3].d == null);
  test('sortRows ↓ pct_1d: null sinks to last',            true, sorted[4].d == null);
}

// ASC (dir=1): ↑ arrow → lowest pct_1d first, nulls last (BUG was here: nulls floated to top)
{
  const rows = [mkRow('A', null), mkRow('B', 2.0), mkRow('C', -1.5), mkRow('D', 5.0)];
  const sorted = sortRows(rows, 'pct_1d', 1);
  test('sortRows ↑ pct_1d: first entry is most negative',    'C', sorted[0].h.symbol);
  test('sortRows ↑ pct_1d: second entry is positive',        'B', sorted[1].h.symbol);
  test('sortRows ↑ pct_1d: third entry is highest',          'D', sorted[2].h.symbol);
  test('sortRows ↑ pct_1d: null sinks to last (not first!)', true, sorted[3].d == null);
}

// DESC by value: null value sinks to bottom (not top)
{
  const rows = [
    { h:{symbol:'X'}, d:null, curVal:null, pl_pct:null, pl_abs:null, wt:null },
    { h:{symbol:'Y'}, d:null, curVal:1000, pl_pct:null, pl_abs:null, wt:null },
    { h:{symbol:'Z'}, d:null, curVal:500,  pl_pct:null, pl_abs:null, wt:null },
  ];
  const sorted = sortRows(rows, 'value', -1);
  test('sortRows ↓ value: highest first',          'Y', sorted[0].h.symbol);
  test('sortRows ↓ value: second highest',         'Z', sorted[1].h.symbol);
  test('sortRows ↓ value: null curVal sinks last', 'X', sorted[2].h.symbol);
}

// ASC by value: null value sinks to bottom (not top)
{
  const rows = [
    { h:{symbol:'X'}, d:null, curVal:null, pl_pct:null, pl_abs:null, wt:null },
    { h:{symbol:'Y'}, d:null, curVal:1000, pl_pct:null, pl_abs:null, wt:null },
    { h:{symbol:'Z'}, d:null, curVal:500,  pl_pct:null, pl_abs:null, wt:null },
  ];
  const sorted = sortRows(rows, 'value', 1);
  test('sortRows ↑ value: lowest first',           'Z', sorted[0].h.symbol);
  test('sortRows ↑ value: highest second',         'Y', sorted[1].h.symbol);
  test('sortRows ↑ value: null curVal sinks last', 'X', sorted[2].h.symbol);
}

// Symbol sort (alpha): no null issue, just directional correctness
{
  const rows = [mkRow('RELIANCE'), mkRow('HDFCBANK'), mkRow('TCS')];
  test('sortRows ↓ symbol: Z first', 'TCS',      sortRows(rows, 'symbol', -1)[0].h.symbol);
  test('sortRows ↑ symbol: A first', 'HDFCBANK', sortRows(rows, 'symbol',  1)[0].h.symbol);
}

// div_yield null sinks to bottom
{
  const mkDivRow = (sym, dy) => ({
    h: { symbol: sym }, d: { pct_1d: 0, div_yield: dy }, curVal: 100, pl_pct: 0, pl_abs: 0, wt: 1
  });
  const rows = [mkDivRow('A', null), mkDivRow('B', 3.5), mkDivRow('C', 1.2)];
  const descSorted = sortRows(rows, 'div_yield', -1);
  const ascSorted  = sortRows(rows, 'div_yield',  1);
  test('sortRows ↓ div_yield: highest first',    'B', descSorted[0].h.symbol);
  test('sortRows ↓ div_yield: null last',        'A', descSorted[2].h.symbol);
  test('sortRows ↑ div_yield: lowest first',     'C', ascSorted[0].h.symbol);
  test('sortRows ↑ div_yield: null last',        'A', ascSorted[2].h.symbol);
}

// ── Summary ──────────────────────────────────────────────────────────────────
const total = pass + fail;
const colour = fail ? '\x1b[31m' : '\x1b[32m';
console.log(`\n${colour}${total} tests: ${pass} passed, ${fail} failed\x1b[0m\n`);
if (fail > 0) process.exit(1);

})();
