// StockPulse icon generator — run with: node generate-icon.js
const { createCanvas } = require('canvas');
const fs = require('fs');

function draw(canvas, size) {
  const ctx = canvas.getContext('2d');
  const s   = size;

  // ── Full-bleed background (OS applies its own rounding/masking) ──────────
  const bg = ctx.createLinearGradient(0, 0, s * 0.6, s);
  bg.addColorStop(0, '#0d1117');   // near-black
  bg.addColorStop(1, '#130d2e');   // deep indigo-black
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, s, s);

  // Indigo bloom — bottom-centre upward radial glow
  const bloom = ctx.createRadialGradient(s * 0.52, s * 0.88, 0, s * 0.52, s * 0.72, s * 0.72);
  bloom.addColorStop(0, 'rgba(99,102,241,0.42)');
  bloom.addColorStop(0.5, 'rgba(79,70,229,0.15)');
  bloom.addColorStop(1,   'rgba(79,70,229,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, s, s);

  // Top-left soft glow (gives depth)
  const corner = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
  corner.addColorStop(0, 'rgba(129,140,248,0.10)');
  corner.addColorStop(1, 'rgba(129,140,248,0)');
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, s, s);

  // ── Chart coordinate frame ────────────────────────────────────────────────
  const padL  = s * 0.135;
  const padR  = s * 0.135;
  const yBot  = s * 0.775;
  const yTop  = s * 0.185;
  const chartW = s - padL - padR;
  const chartH = yBot - yTop;

  // Very faint horizontal grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth   = Math.max(1, s * 0.002);
  [0.0, 0.33, 0.66, 1.0].forEach(t => {
    const y = yTop + chartH * t;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(s - padR, y);
    ctx.stroke();
  });

  // ── 3 candlestick-style bars (increasing height, L→R) ───────────────────
  const gap   = chartW * 0.06;
  const bw    = (chartW - gap * 2) / 3;
  const fracs = [0.42, 0.65, 0.93];   // bar heights as fraction of chartH

  fracs.forEach((frac, i) => {
    const x   = padL + i * (bw + gap);
    const bh  = chartH * frac;
    const byt = yBot - bh;

    // Bar body gradient: brighter at top, fades toward base
    const fill = ctx.createLinearGradient(0, byt, 0, yBot);
    fill.addColorStop(0,   'rgba(148,155,255,0.62)');
    fill.addColorStop(0.35,'rgba(120,130,250,0.38)');
    fill.addColorStop(1,   'rgba(80, 90, 220,0.08)');
    ctx.fillStyle = fill;

    const rr = Math.max(2, s * 0.018);
    ctx.beginPath();
    // Manual rounded-top rect (top-left, top-right rounded; bottom square)
    ctx.moveTo(x + rr, byt);
    ctx.lineTo(x + bw - rr, byt);
    ctx.quadraticCurveTo(x + bw, byt, x + bw, byt + rr);
    ctx.lineTo(x + bw, yBot);
    ctx.lineTo(x,      yBot);
    ctx.lineTo(x,      byt + rr);
    ctx.quadraticCurveTo(x, byt, x + rr, byt);
    ctx.closePath();
    ctx.fill();

    // Thin bright top-cap highlight line
    ctx.strokeStyle = 'rgba(200,205,255,0.45)';
    ctx.lineWidth   = Math.max(1, s * 0.005);
    ctx.beginPath();
    ctx.moveTo(x + rr, byt + ctx.lineWidth / 2);
    ctx.lineTo(x + bw - rr, byt + ctx.lineWidth / 2);
    ctx.stroke();
  });

  // ── Trend line — smooth curve through bar top-centres ────────────────────
  const pts = fracs.map((frac, i) => [
    padL + i * (bw + gap) + bw / 2,
    yBot - chartH * frac,
  ]);

  // Extend line slightly left (pre-history start) and right (future implication)
  const ext = bw * 0.55;
  const startX = pts[0][0] - ext;
  const startY = pts[0][1] + chartH * 0.1;   // slightly lower — shows upward momentum
  const endX   = pts[pts.length - 1][0] + ext * 0.4;
  const endY   = pts[pts.length - 1][1] - chartH * 0.025;

  const allPts = [[startX, startY], ...pts, [endX, endY]];

  // Glow pass (blurred white for the halo effect — simulate with wide stroke+alpha)
  [[s * 0.10, 'rgba(180,186,255,0.18)'],
   [s * 0.06, 'rgba(210,215,255,0.28)'],
   [s * 0.038, '#ffffff']
  ].forEach(([lw, color]) => {
    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(allPts[0][0], allPts[0][1]);
    for (let i = 0; i < allPts.length - 1; i++) {
      const mx = (allPts[i][0] + allPts[i + 1][0]) / 2;
      const my = (allPts[i][1] + allPts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(allPts[i][0], allPts[i][1], mx, my);
    }
    ctx.lineTo(allPts[allPts.length - 1][0], allPts[allPts.length - 1][1]);
    ctx.stroke();
  });

  // ── Glowing live-price dot at peak (rightmost bar top) ───────────────────
  const [px, py] = pts[pts.length - 1];

  // Halo rings (simulate glow with concentric circles)
  [[s * 0.115, 'rgba(165,180,252,0.12)'],
   [s * 0.075, 'rgba(165,180,252,0.22)'],
   [s * 0.048, 'rgba(255,255,255,0.55)'],
  ].forEach(([r, color]) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Core dot: white outer, indigo inner
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, s * 0.048, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4f46e5';
  ctx.beginPath();
  ctx.arc(px, py, s * 0.022, 0, Math.PI * 2);
  ctx.fill();

  // Tiny bright specular on dot (top-left)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(px - s * 0.014, py - s * 0.014, s * 0.01, 0, Math.PI * 2);
  ctx.fill();
}

// ── Generate both sizes ───────────────────────────────────────────────────
[512, 192].forEach(size => {
  const canvas = createCanvas(size, size);
  draw(canvas, size);
  const out  = `icon-${size}.png`;
  const buf  = canvas.toBuffer('image/png');
  fs.writeFileSync(out, buf);
  console.log(`✅  Written ${out}  (${(buf.length / 1024).toFixed(1)} KB)`);
});
