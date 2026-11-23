// Sheet Program Bulanan / Mingguan / Harian — berumus ke sheet "Annual Plan".
import { segStarts, segAt, monthRows, weekDate, phaseColor, peakIdx, fmtLong } from './engine.js';

export function colL(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

export function linkedSheets(wb, plan, R, C0, { fill, border, argb, watermark }) {
  const W = plan.weeks, A = "'Annual Plan'!", MWs = "'Program Mingguan'!";
  const L = w => colL(C0 + w), firstL = colL(C0);
  const f = (formula, result) => (result === undefined ? { formula } : { formula, result });
  const sum = a => a.reduce((x, y) => x + y, 0);
  const style = (c, o = {}) => {
    c.border = border; c.alignment = { vertical: 'middle', horizontal: o.h || 'left', wrapText: true };
    c.font = { name: 'Calibri', size: o.size || 10, bold: !!o.bold, color: { argb: argb(o.color || '#1f2937') } };
    if (o.fill) fill(c, o.fill); if (o.fmt) c.numFmt = o.fmt;
  };
  const sheet = name => wb.addWorksheet(name, { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const title = (ws, t, sub, cols) => {
    ws.mergeCells(1, 1, 1, cols); const c = ws.getCell(1, 1); c.value = t; style(c, { bold: true, size: 14, color: '#ffffff', fill: '#0f766e', h: 'center' }); ws.getRow(1).height = 26;
    ws.mergeCells(2, 1, 2, cols); const s = ws.getCell(2, 1); s.value = sub; style(s, { size: 10, fill: '#e6f4f2', h: 'center' }); ws.getRow(2).height = 30;
  };
  const header = (ws, r, labels, color = '#334155') => { labels.forEach((l, i) => { const c = ws.getCell(r, i + 1); c.value = l; style(c, { bold: true, color: '#ffffff', fill: color, h: 'center' }); }); ws.getRow(r).height = 30; };
  const section = (ws, r, t, cols) => { ws.mergeCells(r, 1, r, cols); const c = ws.getCell(r, 1); c.value = t; style(c, { bold: true, size: 11, fill: '#fff3bf' }); };
  const pst = segStarts(plan.phases), mst = segStarts(plan.meso);
  const rows = monthRows(plan);
  const monthOf = w => rows.find(m => w >= m.start && w <= m.end);
  const WK0 = 26, WKn = WK0 + W - 1; // baris data tabel minggu di sheet Program Mingguan
  const MC = c => `${MWs}$${c}$${WK0}:$${c}$${WKn}`;
  const CNSC = { HIGH: '#ffc9c9', SEDANG: '#ffec99', LOW: '#b2f2bb', REST: '#dee2e6' };

  // Urutan sheet: Annual Plan, Program Bulanan, Program Mingguan, Program Harian
  const mb = sheet('Program Bulanan'), mw = sheet('Program Mingguan'), mh = sheet('Program Harian');

  // ===== PROGRAM MINGGUAN =====
  [11, 13, 16, 26, 14, 11, 12, 13, 10, 11, 10, 8, 8, 30].forEach((w, i) => mw.getColumn(i + 1).width = w);
  title(mw, 'PROGRAM SIKLUS MINGGUAN (MIKROSIKLUS)', `${plan.title} — data minggu diambil otomatis dari sheet Annual Plan. Ubah volume/intensitas/fase di Annual Plan.`, 14);
  section(mw, 4, '1. MIKROSIKLUS STANDAR (SENIN–MINGGU) — target intensitas hari = intensitas minggu × intensitas relatif', 14);
  mw.getCell('A5').value = 'Minggu ke'; style(mw.getCell('A5'), { bold: true, fill: '#f1f5f9' });
  mw.getCell('B5').value = 1; style(mw.getCell('B5'), { bold: true, fill: '#ffff00', h: 'center' });
  mw.mergeCells('C5:E5'); mw.getCell('C5').value = '← ketik nomor minggu (1–' + W + ')'; style(mw.getCell('C5'), { size: 9, color: '#64748b' });
  [['Tanggal', `INDEX($B$${WK0}:$B$${WKn},$B$5)`, 'd mmm yyyy'], ['Fase', `INDEX($D$${WK0}:$D$${WKn},$B$5)`], ['Volume', `INDEX($F$${WK0}:$F$${WKn},$B$5)`, '0"%"'], ['Intensitas', `INDEX($G$${WK0}:$G$${WKn},$B$5)`, '0"%"']]
    .forEach(([l, fm, fmt], i) => { const a = mw.getCell(6, 1 + i * 2), b = mw.getCell(6, 2 + i * 2); a.value = l; style(a, { bold: true, fill: '#f1f5f9' }); b.value = f(fm); style(b, { bold: true, fmt }); });
  header(mw, 8, ['Hari', 'Beban CNS', 'Fokus sesi', '', 'Komponen biomotor', '', 'Intensitas relatif', 'Target intensitas hari']);
  mw.mergeCells(8, 3, 8, 4); mw.mergeCells(8, 5, 8, 6);
  plan.micro.forEach((d, i) => {
    const r = 9 + i;
    mw.getCell(r, 1).value = d.day; style(mw.getCell(r, 1), { bold: true });
    mw.getCell(r, 2).value = d.cns; style(mw.getCell(r, 2), { bold: true, fill: CNSC[d.cns], h: 'center' });
    mw.mergeCells(r, 3, r, 4); mw.getCell(r, 3).value = d.fokus; style(mw.getCell(r, 3));
    mw.mergeCells(r, 5, r, 6); mw.getCell(r, 5).value = d.komponen; style(mw.getCell(r, 5));
    mw.getCell(r, 7).value = d.rel; style(mw.getCell(r, 7), { h: 'center', fmt: '0%' });
    mw.getCell(r, 8).value = f(`IF(B${r}="REST","Istirahat",ROUND(G${r}*$H$6,0))`); style(mw.getCell(r, 8), { bold: true, h: 'center', fmt: '0"%"', fill: '#fff9db' });
    mw.getRow(r).height = 30;
  });
  section(mw, 17, '2. MODEL BEBAN 3:1 (step loading & unloading) — berlaku di setiap mesosiklus', 14);
  header(mw, 18, ['Minggu meso', 'Karakter', 'Beban', 'Tujuan']); mw.mergeCells(18, 4, 18, 8);
  [['Minggu 1', 'Pengenalan / sedang', '±90%', 'Adaptasi awal terhadap stimulus baru'], ['Minggu 2', 'Meningkat', '±100%', 'Mendorong respons fisiologis'], ['Minggu 3', 'Puncak beban', '±108%', 'Stimulus adaptasi puncak (overreaching terkendali)'], ['Minggu 4', 'Unload / regenerasi', '±78%', 'Superkompensasi sebelum mesosiklus berikutnya']]
    .forEach((x, i) => { const r = 19 + i; x.forEach((v, k) => { const c = mw.getCell(r, k + 1); c.value = v; style(c); }); mw.mergeCells(r, 4, r, 8); });
  section(mw, WK0 - 2, '3. PROGRAM MINGGUAN SETAHUN — semua kolom berumus ke sheet Annual Plan', 14);
  header(mw, WK0 - 1, ['Minggu', 'Tanggal (Senin)', 'Bulan', 'Fase', 'Mesosiklus', 'Volume %', 'Intensitas %', 'Indeks puncak', 'Total sesi', 'Total intens.', 'Beban', 'Tes', 'TC', 'Pertandingan'], '#0f766e');
  for (let w = 0; w < W; w++) {
    const r = WK0 + w, l = L(w), pi = pst.findLastIndex(s => s <= w), mi = mst.findLastIndex(s => s <= w);
    const ev = plan.events.filter(e => e.week === w).map(e => (e.main ? '★ ' : '') + e.name + (e.place ? ` (${e.place})` : '')).join(' / ');
    const rng = row => `${A}$${firstL}$${row}:${l}$${row}`;
    const vals = [
      f(`${A}${l}${R.wno}`, w + 1), weekDate(plan, w), monthOf(w).key,
      f(`LOOKUP(2,1/(${rng(R.phase)}<>""),${rng(R.phase)})`, plan.phases[pi].label.toUpperCase()),
      f(`LOOKUP(2,1/(${rng(R.meso)}<>""),${rng(R.meso)})`, plan.meso[mi].label),
      f(`${A}${l}${R.vol}`, plan.vol[w]), f(`${A}${l}${R.int}`, plan.int[w]), f(`${A}${l}${R.peak}`, peakIdx(plan, w)),
      f(`${A}${l}${R.fTot}`, sum(plan.freq[w])), f(`${A}${l}${R.iTot}`, sum(plan.ci[w])), f(`${A}${l}${R.load}`, sum(plan.freq[w]) * sum(plan.ci[w])),
      f(`IF(${A}${l}${R.test}="","","Tes")`, plan.tests.includes(w) ? 'Tes' : ''), f(`IF(${A}${l}${R.camp}="","","TC")`, plan.camps.includes(w) ? 'TC' : ''),
      f(`${A}${l}${R.ev}&""`, ev),
    ];
    vals.forEach((v, k) => { const c = mw.getCell(r, k + 1); c.value = v; style(c, { h: k === 13 ? 'left' : 'center', fmt: k === 1 ? 'd mmm yyyy' : undefined }); });
    fill(mw.getCell(r, 4), phaseColor(plan.phases[pi])); mw.getCell(r, 4).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    fill(mw.getCell(r, 6), '#dbeafe'); fill(mw.getCell(r, 7), '#ffe3e3'); fill(mw.getCell(r, 11), '#ffff99');
  }

  // ===== PROGRAM BULANAN =====
  [5, 16, 13, 8, 20, 11, 12, 10, 7, 26, 34, 34, 30].forEach((w, i) => mb.getColumn(i + 1).width = w);
  title(mb, 'PROGRAM LATIHAN MESOSIKLUS (BULANAN)', `${plan.title} — minggu, fase, volume, intensitas, beban, dan tes dihitung dari sheet Program Mingguan (yang berumus ke Annual Plan).`, 13);
  const main = plan.events.find(e => e.main), G = plan.goals || {};
  [[1, 3, 'TARGET PRESTASI', plan.target || '-'], [4, 6, 'STRUKTUR SIKLUS', `${W} minggu · ${rows.length} bulan · ${plan.meso.length} mesosiklus`],
    [7, 10, 'PUNCAK PERFORMA', main ? `${main.name} — minggu ${main.week + 1} (${fmtLong(weekDate(plan, main.week))})` : '-'],
    [11, 13, 'TUJUAN FISIK & TEKNIK', [(G.fisik || []).join(', '), (G.teknik || []).join(', ')].filter(Boolean).join(' | ')]]
    .forEach(([a, b, k, v]) => { mb.mergeCells(4, a, 4, b); mb.mergeCells(5, a, 5, b); const c = mb.getCell(4, a); c.value = k; style(c, { bold: true, color: '#ffffff', fill: '#334155', h: 'center' }); const d = mb.getCell(5, a); d.value = v; style(d, { h: 'center' }); });
  mb.getRow(5).height = 42;
  section(mb, 7, 'TABEL RENCANA MESOSIKLUS', 13);
  header(mb, 8, ['No', 'Bulan', 'Minggu', 'Jml mg', 'Fase (awal bulan)', 'Volume rata %', 'Intensitas rata %', 'Beban total', 'Tes', 'Sub-fase / fokus utama', 'Fokus fisik & biomotor', 'Fokus teknik & taktik', 'Lomba & agenda'], '#0f766e');
  rows.forEach((m, i) => {
    const r = 9 + i, B = `$B${r}`, pc = plan.phases[segAt(plan.phases, m.start)];
    const vals = [m.no, m.key,
      f(`"W"&INDEX(${MC('A')},MATCH(${B},${MC('C')},0))&" - W"&(INDEX(${MC('A')},MATCH(${B},${MC('C')},0))+COUNTIF(${MC('C')},${B})-1)`, `W${m.start + 1} - W${m.end + 1}`),
      f(`COUNTIF(${MC('C')},${B})`, m.len), f(`INDEX(${MC('D')},MATCH(${B},${MC('C')},0))`, pc.label.toUpperCase()),
      f(`ROUND(AVERAGEIF(${MC('C')},${B},${MC('F')}),0)`, m.vol), f(`ROUND(AVERAGEIF(${MC('C')},${B},${MC('G')}),0)`, m.int),
      f(`SUMIF(${MC('C')},${B},${MC('K')})`, m.load), f(`COUNTIFS(${MC('C')},${B},${MC('L')},"Tes")`, m.tests.length),
      m.note.focus || '', m.note.fisik || '', m.note.teknik || '',
      [...m.events.map(e => (e.main ? '★ ' : '● ') + e.name), m.camps.length ? `TC minggu ${m.camps.join(', ')}` : '', m.note.agenda || ''].filter(Boolean).join('\n')];
    vals.forEach((v, k) => { const c = mb.getCell(r, k + 1); c.value = v; style(c, { h: k >= 9 ? 'left' : 'center', bold: k === 1 }); });
    fill(mb.getCell(r, 5), phaseColor(pc)); mb.getCell(r, 5).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
    mb.getRow(r).height = 48;
  });
  const sr = 9 + rows.length, e = sr - 1;
  ['', 'RATA-RATA / TOTAL', '', f(`SUM(D9:D${e})`, W), '', f(`ROUND(AVERAGE(F9:F${e}),0)`), f(`ROUND(AVERAGE(G9:G${e}),0)`), f(`SUM(H9:H${e})`), f(`SUM(I9:I${e})`)]
    .forEach((v, k) => { const c = mb.getCell(sr, k + 1); c.value = v; style(c, { bold: true, fill: '#fff9db', h: 'center' }); });
  mb.views = [{ state: 'frozen', ySplit: 8, showGridLines: false }];

  // ===== PROGRAM HARIAN =====
  [11, 26, 34, 18, 11, 16, 44].forEach((w, i) => mh.getColumn(i + 1).width = w);
  title(mh, 'PROGRAM LATIHAN HARIAN (MENU SESI)', `${plan.title} — target minggu & hari diambil dari Program Mingguan dan Annual Plan. Nomor minggu (sel kuning) mengikuti Program Mingguan, boleh diganti.`, 7);
  mh.getCell('A4').value = 'Minggu'; style(mh.getCell('A4'), { bold: true, fill: '#f1f5f9' });
  mh.getCell('B4').value = f(`${MWs}B5`, 1); style(mh.getCell('B4'), { bold: true, fill: '#ffff00', h: 'center' });
  [['Tanggal', `INDEX(${MC('B')},$B$4)`, 'd mmm yyyy'], ['Fase', `INDEX(${MC('D')},$B$4)`], ['Mesosiklus', `INDEX(${MC('E')},$B$4)`], ['Volume minggu', `INDEX(${MC('F')},$B$4)`, '0"%"'], ['Intensitas minggu', `INDEX(${MC('G')},$B$4)`, '0"%"']]
    .forEach(([l, fm, fmt], i) => { const k = i + 1, r = 4 + Math.floor(k / 3), c = (k % 3) * 2 + 1; const a = mh.getCell(r, c), b = mh.getCell(r, c + 1); a.value = l; style(a, { bold: true, fill: '#f1f5f9' }); b.value = f(fm); style(b, { bold: true, fmt }); });
  const mr = c => `${MWs}$${c}$9:$${c}$15`;
  let r = 7;
  plan.daily.forEach(s => {
    const day = s.day.replace(/"/g, '');
    mh.mergeCells(r, 1, r, 5); const t = mh.getCell(r, 1); t.value = `${s.title.toUpperCase()} — ${s.day.toUpperCase()}`; style(t, { bold: true, size: 11, color: '#ffffff', fill: '#0f766e' });
    const tg = mh.getCell(r, 6); tg.value = 'Target hari'; style(tg, { bold: true, color: '#ffffff', fill: '#0f766e', h: 'right' });
    const M = `MATCH("${day}",${mr('A')},0)`;
    const tv = mh.getCell(r, 7); tv.value = f(`IFERROR(INDEX(${mr('B')},${M})&" · intensitas "&IF(INDEX(${mr('B')},${M})="REST","istirahat",ROUND(INDEX(${mr('G')},${M})*$F$5,0)&"%"),"-")`);
    style(tv, { bold: true, fill: '#fff9db' }); mh.getRow(r).height = 22; r++;
    header(mh, r, ['No', 'Fase sesi & komponen', 'Latihan / drill', 'Dosis', 'Intensitas', 'Istirahat', 'Petunjuk / coaching cue']); r++;
    s.items.forEach((it, ii) => { [ii + 1, it.fase, it.latihan, it.dosis, (+it.int || 0) / 100, it.rest, it.cue].forEach((v, k) => { const c = mh.getCell(r, k + 1); c.value = v; style(c, { h: k === 0 || k === 4 ? 'center' : 'left', fmt: k === 4 ? '0%' : undefined }); }); mh.getRow(r).height = 30; r++; });
    r++;
  });
  // F5 = intensitas minggu, dipakai rumus target hari
  const rest = plan.micro.filter(d => d.cns === 'REST').map(d => d.day);
  if (rest.length) { mh.mergeCells(r, 1, r, 7); const c = mh.getCell(r, 1); c.value = `HARI ISTIRAHAT: ${rest.join(' & ').toUpperCase()} — pemulihan total (tidur 8–9 jam, hidrasi, peregangan ringan)`; style(c, { bold: true, fill: '#dee2e6' }); r++; }
  if (watermark) [mb, mw, mh].forEach(ws => { const rr = ws.rowCount + 2; ws.getCell(rr, 1).value = 'Dibuat dengan Coach Planner — versi Gratis'; ws.getCell(rr, 1).font = { bold: true, color: { argb: 'FF0F766E' } }; });
}
