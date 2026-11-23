// Ekspor .xlsx berwarna (ExcelJS dari CDN, dimuat saat dibutuhkan).
import { PHASES, PERIOD_COLORS, segStarts, monthSpans, periodSpans, weekDate, phaseColor, peakIdx, fmtLong } from './engine.js';
import { chartPNG } from './chart.js';

const EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
let loading;
function loadExcel() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return loading ||= new Promise((res, rej) => { const s = document.createElement('script'); s.src = EXCELJS; s.onload = () => res(window.ExcelJS); s.onerror = () => rej(new Error('Gagal memuat ExcelJS')); document.head.appendChild(s); });
}

const argb = hex => 'FF' + hex.replace('#', '').toUpperCase();
const SOFT = ['#d3f9d8', '#fff3bf', '#ffe8cc', '#d0ebff', '#e5dbff', '#c3fae8', '#ffdeeb', '#e9ecef'];
const MESO = ['#e7f5ff', '#f1f3f5'];
const BIO_FILL = ['#00b050', '#92d050', '#ffc000', '#00b0f0', '#b197fc', '#ff8787'];

export async function exportXlsx(plan, { watermark }) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook(); wb.creator = 'Coach Planner'; wb.created = new Date();
  const ws = wb.addWorksheet('Annual Plan', {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .3, right: .3, top: .4, bottom: .4, header: .2, footer: .2 } },
  });
  const W = plan.weeks, C0 = 3, last = C0 + W - 1; // kolom minggu mulai C
  ws.getColumn(1).width = 24; ws.getColumn(2).width = 14;
  for (let c = C0; c <= last; c++) ws.getColumn(c).width = 5.2;
  const thin = { style: 'thin', color: { argb: 'FFB8C2CC' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const cell = (r, c) => ws.getCell(r, c);
  const fill = (cl, hex) => { cl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } }; };
  const put = (r, c1, c2, v, o = {}) => {
    if (c2 > c1) ws.mergeCells(r, c1, r, c2);
    const cl = cell(r, c1); cl.value = v;
    cl.alignment = { horizontal: o.h || 'center', vertical: 'middle', wrapText: true, textRotation: o.rot || 0 };
    cl.font = { name: 'Calibri', size: o.size || 9, bold: !!o.bold, color: { argb: argb(o.color || '#1f2937') } };
    if (o.fill) fill(cl, o.fill);
    for (let c = c1; c <= c2; c++) cell(r, c).border = border;
    return cl;
  };
  const label = (r, a, b) => { // label kolom A (dan B)
    if (b === undefined) { put(r, 1, 2, a, { h: 'left', bold: true, fill: '#f1f5f9' }); }
    else { put(r, 1, 1, a, { h: 'left', bold: true, fill: '#f1f5f9' }); put(r, 2, 2, b, { h: 'left', fill: '#f8fafc' }); }
  };

  // ---- Judul & identitas ----
  let r = 1;
  put(r, 1, last, 'PERENCANAAN LATIHAN TAHUNAN (ANNUAL TRAINING PLAN)', { size: 15, bold: true, color: '#ffffff', fill: '#0f766e' }); ws.getRow(r).height = 28; r++;
  put(r, 1, last, plan.title, { size: 11, bold: true, fill: '#e6f4f2' }); ws.getRow(r).height = 20; r++;
  const half = C0 + Math.floor(W / 2);
  const idRows = [
    ['Cabang olahraga', plan.sportName, 'Target prestasi', plan.target],
    ['Atlet / tim', plan.athlete, 'Pelatih', plan.coach],
    ['Periode', `${fmtLong(weekDate(plan, 0))} – ${fmtLong(new Date(weekDate(plan, W - 1).getTime() + 6 * 864e5))} (${W} minggu)`, 'Sesi per minggu', String(plan.sessions)],
    ['Norma tes', plan.norms.filter(n => n.name).map((n, i) => `${i + 1}. ${n.name}: ${n.value || '…'} ${n.unit}`).join('   '), 'Target jangka panjang', plan.longTarget],
  ];
  idRows.forEach(([a, b, c, d]) => {
    put(r, 1, 2, a, { h: 'left', bold: true, fill: '#f1f5f9' }); put(r, C0, half - 1, b || '', { h: 'left' });
    put(r, half, half + 5, c, { h: 'left', bold: true, fill: '#f1f5f9' }); put(r, half + 6, last, d || '', { h: 'left' });
    ws.getRow(r).height = 18; r++;
  });
  r++;

  // ---- Kalender ----
  const top = r;
  label(r, 'Bulan'); monthSpans(plan).forEach((m, i) => put(r, C0 + m.start, C0 + m.start + m.len - 1, m.len > 1 ? m.name : m.name.slice(0, 3), { bold: true, fill: i % 2 ? '#dbeafe' : '#bfdbfe' })); r++;
  label(r, 'Tanggal (Senin)'); for (let w = 0; w < W; w++) put(r, C0 + w, C0 + w, weekDate(plan, w).getUTCDate()); r++;
  label(r, 'Minggu ke'); for (let w = 0; w < W; w++) put(r, C0 + w, C0 + w, w + 1, { bold: true, fill: '#ffff00' }); r++;
  const freezeRow = r - 1;
  r++;

  // ---- Periode, fase, meso ----
  label(r, 'Periode latihan'); { let s = 0; periodSpans(plan).forEach(p => { put(r, C0 + s, C0 + s + p.len - 1, p.name, { bold: true, color: '#ffffff', fill: PERIOD_COLORS[p.name] || '#475569' }); s += p.len; }); } ws.getRow(r).height = 20; r++;
  label(r, 'Fase latihan'); { const st = segStarts(plan.phases); plan.phases.forEach((p, i) => put(r, C0 + st[i], C0 + st[i] + p.len - 1, p.label.toUpperCase(), { bold: true, color: '#ffffff', fill: phaseColor(p) })); } ws.getRow(r).height = 30; r++;
  label(r, 'Mesosiklus'); { const st = segStarts(plan.meso); plan.meso.forEach((m, i) => put(r, C0 + st[i], C0 + st[i] + m.len - 1, m.label, { fill: MESO[i % 2] })); } r++;
  label(r, 'Tes'); for (let w = 0; w < W; w++) { const on = plan.tests.includes(w); put(r, C0 + w, C0 + w, on ? 'T' : '', on ? { bold: true, fill: '#ffd8a8' } : {}); } r++;
  label(r, 'Training camp'); for (let w = 0; w < W; w++) { const on = plan.camps.includes(w); put(r, C0 + w, C0 + w, on ? 'TC' : '', on ? { bold: true, fill: '#d0bfff' } : {}); } r++;
  r++;

  // ---- Biomotor ----
  plan.bio.forEach((b, bi) => {
    label(r, b.name); const st = segStarts(b.segs);
    b.segs.forEach((g, i) => put(r, C0 + st[i], C0 + st[i] + g.len - 1, g.label, { fill: g.len ? (i % 2 ? SOFT[(bi + 1) % SOFT.length] : BIO_FILL[bi % BIO_FILL.length]) : undefined, bold: i % 2 === 0, color: i % 2 ? '#1f2937' : '#ffffff' }));
    ws.getRow(r).height = 30; r++;
  });
  r++;

  // ---- Pertandingan ----
  label(r, 'Pertandingan'); ws.getRow(r).height = 90;
  for (let w = 0; w < W; w++) {
    const ev = plan.events.filter(e => e.week === w);
    const txt = ev.map(e => (e.main ? '★ ' : '') + e.name + (e.place ? ` (${e.place})` : '')).join(' / ');
    put(r, C0 + w, C0 + w, txt, ev.length ? { rot: 90, bold: true, fill: ev.some(e => e.main) ? '#ff6b6b' : '#ffd43b', color: ev.some(e => e.main) ? '#ffffff' : '#1f2937' } : {});
  }
  r++;
  label(r, 'Target jangka menengah'); { const st = segStarts(plan.targets); plan.targets.forEach((g, i) => put(r, C0 + st[i], C0 + st[i] + g.len - 1, g.label, { fill: SOFT[i % SOFT.length] })); } ws.getRow(r).height = 30; r++;
  r++;

  // ---- Beban latihan ----
  const nr = (name, sub, arr, o = {}) => { label(r, name, sub); for (let w = 0; w < W; w++) put(r, C0 + w, C0 + w, arr(w), o); r++; return r - 1; };
  const volRow = nr('Volume (%)', '', w => plan.vol[w], { fill: '#dbeafe' });
  const intRow = nr('Intensitas (%)', '', w => plan.int[w], { fill: '#ffe3e3' });
  nr('Indeks puncak (1–5)', '', w => peakIdx(plan, w));
  r++;
  put(r, 1, 2, 'BEBAN LATIHAN (Practice Work Load)', { h: 'left', bold: true, color: '#ffffff', fill: '#334155' }); r++;
  put(r, 1, 1, 'Intensitas (1–5)', { h: 'left', bold: true, fill: '#f1f5f9' }); r++;
  const iStart = r;
  plan.cats.forEach((c, k) => nr('', c, w => plan.ci[w][k]));
  const iTot = r; label(r, '', 'Total');
  for (let w = 0; w < W; w++) { const L = colL(C0 + w); put(r, C0 + w, C0 + w, { formula: `SUM(${L}${iStart}:${L}${iTot - 1})`, result: plan.ci[w].reduce((a, b) => a + b, 0) }, { bold: true, fill: '#00b0f0' }); } r++;
  put(r, 1, 1, 'Frekuensi (sesi)', { h: 'left', bold: true, fill: '#f1f5f9' }); r++;
  const fStart = r;
  plan.cats.forEach((c, k) => nr('', c, w => plan.freq[w][k]));
  const fTot = r; label(r, '', 'Total');
  for (let w = 0; w < W; w++) { const L = colL(C0 + w); put(r, C0 + w, C0 + w, { formula: `SUM(${L}${fStart}:${L}${fTot - 1})`, result: plan.freq[w].reduce((a, b) => a + b, 0) }, { bold: true, fill: '#00b0f0' }); } r++;
  label(r, 'Beban latihan', 'Int × Frek');
  for (let w = 0; w < W; w++) { const L = colL(C0 + w); put(r, C0 + w, C0 + w, { formula: `${L}${iTot}*${L}${fTot}`, result: plan.ci[w].reduce((a, b) => a + b, 0) * plan.freq[w].reduce((a, b) => a + b, 0) }, { bold: true, fill: '#ffff00' }); }
  r += 2;

  // ---- Grafik (gambar) ----
  try {
    const png = await chartPNG(plan, { colW: 41, height: 320, scale: 1.5 });
    put(r, 1, 2, 'Grafik volume & intensitas', { h: 'left', bold: true, fill: '#f1f5f9' }); r++;
    const id = wb.addImage({ base64: png.dataUrl, extension: 'png' });
    const totalWpx = 38 * 7 + 10 + W * 41; // perkiraan lebar kolom A..akhir dalam piksel
    const scale = Math.min(1.2, totalWpx / png.w);
    ws.addImage(id, { tl: { col: 0, row: r - 1 }, ext: { width: png.w * scale, height: png.h * scale } });
    r += Math.ceil(png.h * scale / 20) + 1;
  } catch (e) { console.warn('grafik', e); }

  if (watermark) {
    put(r, 1, last, 'Dibuat dengan Coach Planner — versi Gratis. Upgrade ke Pro untuk ekspor tanpa tanda ini.', { size: 10, bold: true, color: '#0f766e', fill: '#e6f4f2' }); r++;
    ws.headerFooter.oddFooter = '&LCoach Planner (versi Gratis)&R&P / &N';
  } else ws.headerFooter.oddFooter = `&L${plan.title.replace(/&/g, '&&')}&R&P / &N`;

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: freezeRow, showGridLines: false }];
  ws.pageSetup.printTitlesRow = `${top}:${freezeRow}`;

  // ---- Sheet 2: tabel per minggu ----
  const t = wb.addWorksheet('Tabel Mingguan');
  t.columns = [
    { header: 'Minggu', key: 'w', width: 8 }, { header: 'Tanggal (Senin)', key: 'd', width: 16 }, { header: 'Fase', key: 'f', width: 18 },
    { header: 'Mesosiklus', key: 'm', width: 12 }, { header: 'Volume (%)', key: 'v', width: 11 }, { header: 'Intensitas (%)', key: 'i', width: 13 },
    { header: 'Indeks puncak', key: 'p', width: 13 }, ...plan.cats.map((c, k) => ({ header: `Frek. ${c}`, key: 'f' + k, width: 12 })),
    { header: 'Beban', key: 'b', width: 9 }, { header: 'Tes / TC', key: 't', width: 10 }, { header: 'Pertandingan', key: 'e', width: 34 },
  ];
  const hr = t.getRow(1); hr.font = { bold: true, color: { argb: 'FFFFFFFF' } }; hr.eachCell(c => { fill(c, '#0f766e'); c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }); hr.height = 30;
  const pst = segStarts(plan.phases), mst = segStarts(plan.meso);
  for (let w = 0; w < W; w++) {
    const pi = pst.findLastIndex(s => s <= w), mi = mst.findLastIndex(s => s <= w);
    const row = t.addRow({
      w: w + 1, d: weekDate(plan, w), f: plan.phases[pi].label, m: plan.meso[mi].label, v: plan.vol[w], i: plan.int[w], p: peakIdx(plan, w),
      ...Object.fromEntries(plan.cats.map((c, k) => ['f' + k, plan.freq[w][k]])),
      b: plan.ci[w].reduce((a, b) => a + b, 0) * plan.freq[w].reduce((a, b) => a + b, 0),
      t: [plan.tests.includes(w) ? 'Tes' : '', plan.camps.includes(w) ? 'TC' : ''].filter(Boolean).join(', '),
      e: plan.events.filter(e => e.week === w).map(e => (e.main ? '★ ' : '') + e.name).join(' / '),
    });
    row.getCell('d').numFmt = 'd mmm yyyy';
    const pc = phaseColor(plan.phases[pi]); row.getCell('f').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(pc) } }; row.getCell('f').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    row.eachCell(c => { c.border = border; if (!c.alignment) c.alignment = { horizontal: 'center' }; });
  }
  t.views = [{ state: 'frozen', ySplit: 1 }];
  if (watermark) t.addRow([]).getCell(1).value = 'Dibuat dengan Coach Planner — versi Gratis';

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = (plan.title || 'periodisasi').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') + '.xlsx';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  return blob;
}

function colL(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
