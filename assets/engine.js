// Coach Planner — mesin periodisasi (tanpa ketergantungan).
// Rencana = daftar minggu + baris "segmen" bersambung (fase, mesosiklus, biomotor, target)
// + data per minggu (volume, intensitas, frekuensi & intensitas per kategori).

export const PHASES = {
  PU:  { label: 'Persiapan Umum',   period: 'PERSIAPAN', color: '#2f9e6b' },
  PK:  { label: 'Persiapan Khusus', period: 'PERSIAPAN', color: '#8cc63f' },
  PRA: { label: 'Pra-Kompetisi',    period: 'KOMPETISI', color: '#f2b705' },
  KOM: { label: 'Kompetisi',        period: 'KOMPETISI', color: '#e8590c' },
  TR:  { label: 'Transisi',         period: 'TRANSISI',  color: '#4c8bf5' },
};
export const PERIOD_COLORS = { PERSIAPAN: '#1f7a52', KOMPETISI: '#c2410c', TRANSISI: '#2f6fd6' };
export const PHASE_ORDER = ['PU', 'PK', 'PRA', 'KOM', 'TR'];

// Label biomotor per fase [PU, PK, PRA, KOM, TR]
const BIO_UMUM = {
  'Latihan Kekuatan': ['Adaptasi anatomi', 'Kekuatan maksimal', 'Konversi ke power', 'Pemeliharaan', 'Aktif rekreatif'],
  'Latihan Kecepatan': ['Koordinasi', 'Akselerasi', 'Kecepatan maksimal', 'Kecepatan spesifik', 'Bermain'],
  'Latihan Daya Tahan': ['Aerobik umum', 'Aerobik khusus', 'Anaerobik khusus', 'Daya tahan spesifik', 'Aerobik ringan'],
  'Latihan Teknik/Taktik': ['Teknik dasar', 'Teknik khusus', 'Model pertandingan', 'Taktik & strategi', 'Evaluasi'],
};

export const SPORTS = {
  sprint: {
    name: 'Atletik – Sprint / Lompat',
    cats: ['Teknik', 'Strength', 'Running'],
    bio: {
      'Latihan Kekuatan': ['Stabilisasi', 'Daya tahan kekuatan', 'Daya ledak eksplosif', 'Maintenance power', 'Transisi'],
      'Latihan Kecepatan': ['Koordinasi', 'Speed akselerasi', 'Kecepatan maksimal', 'Top speed', 'Bermain'],
      'Latihan Daya Tahan': ['Aerobic endurance', 'Strength endurance', 'Speed endurance', 'Anaerobic endurance', 'Aerobik ringan'],
      'Latihan Teknik': ['Teknik dasar lari', 'Start & akselerasi', 'Teknik race model', 'Race tactic', 'Evaluasi'],
    },
  },
  endurance: {
    name: 'Atletik – Jarak menengah / jauh',
    cats: ['Teknik', 'Strength', 'Running'],
    bio: {
      'Latihan Kekuatan': ['Adaptasi anatomi', 'Daya tahan kekuatan', 'Power endurance', 'Pemeliharaan', 'Aktif rekreatif'],
      'Latihan Kecepatan': ['Koordinasi', 'Kecepatan aerobik', 'Kecepatan lomba', 'Kick finish', 'Bermain'],
      'Latihan Daya Tahan': ['Base aerobik', 'Ambang laktat', 'VO2max & interval', 'Race pace', 'Aerobik ringan'],
      'Latihan Teknik': ['Ekonomi lari', 'Ritme & pacing', 'Model lomba', 'Taktik lomba', 'Evaluasi'],
    },
  },
  renang: {
    name: 'Renang',
    cats: ['Teknik', 'Darat', 'Kolam'],
    bio: {
      'Latihan Kekuatan (darat)': ['Core & stabilisasi', 'Kekuatan maksimal', 'Power (lempar, lompat)', 'Pemeliharaan', 'Aktif rekreatif'],
      'Latihan Kecepatan': ['Teknik & frekuensi', 'Sprint pendek', 'Race pace', 'Start, turn, finish', 'Bermain air'],
      'Latihan Daya Tahan': ['Aerobik (A1–A2)', 'Ambang (AT)', 'VO2max & toleransi laktat', 'Race pace', 'Recovery'],
      'Latihan Teknik': ['Teknik 4 gaya', 'Teknik gaya utama', 'Start & pembalikan', 'Strategi lomba', 'Evaluasi'],
    },
  },
  permainan: {
    name: 'Permainan bola (sepak bola, futsal, basket, voli)',
    cats: ['Teknik-Taktik', 'Fisik', 'Game'],
    bio: {
      'Latihan Kekuatan': ['Adaptasi anatomi', 'Kekuatan maksimal', 'Power & plyometrik', 'Pemeliharaan', 'Aktif rekreatif'],
      'Latihan Kecepatan & Kelincahan': ['Koordinasi', 'Akselerasi & agility', 'Repeated sprint', 'Kecepatan reaksi', 'Bermain'],
      'Latihan Daya Tahan': ['Aerobik umum', 'Intermittent', 'Small-sided games', 'Match fitness', 'Aerobik ringan'],
      'Latihan Teknik/Taktik': ['Teknik dasar', 'Taktik unit', 'Taktik tim', 'Strategi pertandingan', 'Evaluasi'],
    },
  },
  beladiri: {
    name: 'Bela diri (pencak silat, karate, taekwondo, judo)',
    cats: ['Teknik', 'Fisik', 'Sparring'],
    bio: {
      'Latihan Kekuatan': ['Adaptasi anatomi', 'Kekuatan maksimal', 'Power eksplosif', 'Pemeliharaan', 'Aktif rekreatif'],
      'Latihan Kecepatan': ['Koordinasi', 'Kecepatan gerak', 'Kecepatan reaksi', 'Kecepatan serangan', 'Bermain'],
      'Latihan Daya Tahan': ['Aerobik umum', 'Anaerobik alaktik', 'Anaerobik laktik', 'Ronde pertandingan', 'Aerobik ringan'],
      'Latihan Teknik/Taktik': ['Teknik dasar', 'Kombinasi teknik', 'Sparring terarah', 'Strategi pertandingan', 'Evaluasi'],
    },
  },
  raket: {
    name: 'Raket (bulu tangkis, tenis, tenis meja)',
    cats: ['Teknik', 'Fisik', 'Game'],
    bio: {
      'Latihan Kekuatan': ['Adaptasi anatomi', 'Kekuatan maksimal', 'Power & plyometrik', 'Pemeliharaan', 'Aktif rekreatif'],
      'Latihan Kecepatan & Kelincahan': ['Koordinasi', 'Footwork', 'Kelincahan reaktif', 'Kecepatan pukulan', 'Bermain'],
      'Latihan Daya Tahan': ['Aerobik umum', 'Interval', 'Rally panjang', 'Match fitness', 'Aerobik ringan'],
      'Latihan Teknik/Taktik': ['Teknik pukulan', 'Pola permainan', 'Simulasi pertandingan', 'Strategi', 'Evaluasi'],
    },
  },
  umum: { name: 'Cabang olahraga lain', cats: ['Teknik', 'Fisik', 'Taktik'], bio: BIO_UMUM },
};

export const TARGET_MENENGAH = ['Membangun fondasi', 'Meningkatkan kemampuan khusus', 'Membangun performa lomba', 'Mencapai puncak prestasi', 'Pemulihan & evaluasi'];

// ---------- utilitas tanggal ----------
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const fmtISO = d => d.toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
export const mondayOf = d => addDays(d, -((d.getUTCDay() + 6) % 7));
export const weekDate = (plan, i) => addDays(parseDate(plan.start), i * 7);
export const weekOfDate = (plan, iso) => Math.floor((parseDate(iso) - parseDate(plan.start)) / (7 * 864e5));
export const fmtShort = d => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()].slice(0, 3)}`;
export const fmtLong = d => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

// ---------- segmen ----------
export const segStarts = segs => { let s = 0; return segs.map(g => { const r = s; s += g.len; return r; }); };
export const segAt = (segs, w) => { let s = 0; for (let i = 0; i < segs.length; i++) { if (w < s + segs[i].len) return i; s += segs[i].len; } return segs.length - 1; };

// pecah n ke beberapa bagian menurut proporsi, minimal min tiap bagian
function split(n, props, min = 1) {
  const k = props.length; if (n < k * min) { const a = Array(k).fill(0); for (let i = 0; i < n; i++) a[i % k]++; return a; }
  const tot = props.reduce((a, b) => a + b, 0);
  const a = props.map(p => Math.max(min, Math.floor(n * p / tot)));
  let diff = n - a.reduce((x, y) => x + y, 0);
  const order = props.map((p, i) => i).sort((i, j) => props[j] - props[i]);
  let k2 = 0; while (diff !== 0) { const i = order[k2 % k]; if (diff > 0) { a[i]++; diff--; } else if (a[i] > min) { a[i]--; diff++; } k2++; if (k2 > 999) break; }
  return a;
}

// bagi panjang fase ke mesosiklus 3:1 (4 minggu); sisa 1–2 minggu digabung ke blok terakhir
export function mesoLens(len) {
  if (len <= 5) return [len];
  const out = []; let r = len;
  while (r > 0) { if (r <= 5) { out.push(r); break; } if (r === 6) { out.push(3, 3); break; } if (r === 7) { out.push(4, 3); break; } out.push(4); r -= 4; }
  return out;
}

// ---------- pembuatan rencana ----------
export function generate(input) {
  const sport = SPORTS[input.sport] ? input.sport : 'umum';
  const S = SPORTS[sport];
  let start = mondayOf(parseDate(input.start));
  const mainDate = parseDate(input.mainDate);
  let end = parseDate(input.end);
  let mainW = Math.floor((mondayOf(mainDate) - start) / (7 * 864e5));
  let weeks = Math.floor((end - start) / (7 * 864e5)) + 1;
  if (weeks <= mainW + 1) weeks = mainW + 3; // pastikan ada transisi ≥ 2 minggu
  weeks = Math.max(8, Math.min(weeks, 104));
  mainW = Math.max(5, Math.min(mainW, weeks - 2));

  const pre = mainW + 1; // minggu 0..mainW
  const [pu, pk, pra, kom] = split(pre, [40, 25, 20, 15], 1);
  const lens = { PU: pu, PK: pk, PRA: pra, KOM: kom, TR: weeks - pre };
  const phases = PHASE_ORDER.filter(k => lens[k] > 0).map(k => ({ key: k, label: PHASES[k].label, len: lens[k] }));

  const meso = []; let mi = 1;
  phases.forEach(p => mesoLens(p.len).forEach(l => meso.push({ label: `Meso ${mi++}`, len: l })));

  const bio = Object.entries(S.bio).map(([name, labels]) => ({
    name, segs: phases.map(p => ({ label: labels[PHASE_ORDER.indexOf(p.key)], len: p.len })),
  }));
  const targets = phases.map(p => ({ label: TARGET_MENENGAH[PHASE_ORDER.indexOf(p.key)], len: p.len }));

  const plan = {
    v: 1,
    title: input.title || `Periodisasi ${input.athlete || ''}`.trim(),
    sport, sportName: input.sportName || S.name,
    athlete: input.athlete || '', coach: input.coach || '', target: input.target || '',
    sessions: +input.sessions || 6,
    start: fmtISO(start), weeks,
    cats: [...S.cats],
    phases, meso, bio, targets,
    longTarget: input.longTarget || '',
    events: [{ id: rid(), week: mainW, name: input.mainName || 'Lomba utama', place: input.mainPlace || '', main: true }]
      .concat((input.others || []).filter(o => o.date).map(o => ({ id: rid(), week: Math.floor((mondayOf(parseDate(o.date)) - start) / (7 * 864e5)), name: o.name || 'Lomba', place: o.place || '', main: false }))
        .filter(e => e.week >= 0 && e.week < weeks)),
    tests: [], camps: [],
    norms: [{ name: 'VO2max', value: '', unit: 'ml/kg/mnt' }, { name: 'Kekuatan maksimal', value: '', unit: 'kg' }, { name: 'Kecepatan', value: '', unit: 'detik' }],
    vol: [], int: [], freq: [], ci: [],
  };
  // tes: minggu pertama + akhir PU + akhir PK + akhir PRA
  const st = segStarts(phases);
  plan.tests = [0, ...phases.filter(p => ['PU', 'PK', 'PRA'].includes(p.key)).map(p => st[phases.indexOf(p)] + p.len - 1)];
  plan.tests = [...new Set(plan.tests)].filter(w => w < weeks);
  autoLoad(plan);
  return plan;
}

export const rid = () => Math.random().toString(36).slice(2, 10);

// baseline [vol awal, vol akhir, int awal, int akhir] per fase (persen)
const BASE = { PU: [65, 85, 40, 55], PK: [80, 90, 55, 68], PRA: [75, 62, 70, 85], KOM: [55, 42, 85, 95], TR: [30, 25, 30, 25] };
const MESO_V = { 1: [1], 2: [1, .8], 3: [.95, 1.05, .8], 4: [.92, 1, 1.08, .78], 5: [.9, .97, 1.04, 1.1, .78] };
const MESO_I = { 1: [1], 2: [1, .9], 3: [.97, 1.03, .9], 4: [.95, 1, 1.05, .88], 5: [.94, .98, 1.02, 1.06, .88] };
// rasio frekuensi kategori [teknik, fisik, spesifik] per fase dan intensitas kategori (1–5)
const FREQ = { PU: [.35, .4, .25], PK: [.35, .35, .3], PRA: [.35, .25, .4], KOM: [.4, .2, .4], TR: [.3, .4, .3] };
const CINT = { PU: [2, 2, 2], PK: [3, 3, 3], PRA: [4, 3, 4], KOM: [4, 2, 5], TR: [1, 1, 1] };

// isi ulang volume/intensitas/frekuensi dari struktur fase + meso + lomba
export function autoLoad(plan) {
  const W = plan.weeks, vol = [], int = [], freq = [], ci = [];
  const ps = segStarts(plan.phases), ms = segStarts(plan.meso);
  for (let w = 0; w < W; w++) {
    const pi = segAt(plan.phases, w), p = plan.phases[pi], key = p.key;
    const t = p.len > 1 ? (w - ps[pi]) / (p.len - 1) : 0;
    const b = BASE[key] || BASE.PU;
    let v = b[0] + (b[1] - b[0]) * t, i = b[2] + (b[3] - b[2]) * t;
    const mj = segAt(plan.meso, w), m = plan.meso[mj], pos = w - ms[mj];
    const L = Math.min(5, m.len);
    if (key !== 'TR') { v *= (MESO_V[L] || MESO_V[4])[Math.min(pos, L - 1)]; i *= (MESO_I[L] || MESO_I[4])[Math.min(pos, L - 1)]; }
    vol.push(v); int.push(i);
    const s = key === 'TR' ? Math.max(2, Math.round(plan.sessions * .5)) : plan.sessions;
    const r = FREQ[key] || FREQ.PU; const f = split(s, r, 0);
    freq.push(f); ci.push([...(CINT[key] || CINT.PU)]);
  }
  // taper & puncak di sekitar lomba
  plan.events.forEach(e => {
    const w = e.week; if (w < 0 || w >= W) return;
    if (e.main) {
      [[-2, .75, 1.02], [-1, .6, 1.03]].forEach(([d, fv, fi]) => { const k = w + d; if (k >= 0) { vol[k] *= fv; int[k] = Math.min(98, int[k] * fi); } });
      vol[w] = 35; int[w] = 100;
      if (w + 1 < W) { vol[w + 1] = Math.min(vol[w + 1], 30); int[w + 1] = Math.min(int[w + 1], 35); }
    } else { vol[w] *= .8; int[w] = Math.min(100, int[w] * 1.08); if (w - 1 >= 0) vol[w - 1] *= .9; }
  });
  plan.vol = vol.map(x => clamp(Math.round(x), 5, 100));
  plan.int = int.map(x => clamp(Math.round(x), 5, 100));
  plan.freq = freq; plan.ci = ci;
  return plan;
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// indeks puncak 1 (rendah) – 5 (puncak)
export const peakIdx = (plan, w) => clamp(Math.round((plan.int[w] * 1.2 - plan.vol[w] * .5 + 20) / 20), 1, 5);
export const sum = a => a.reduce((x, y) => x + (+y || 0), 0);
export const weekLoad = (plan, w) => sum(plan.freq[w]) * sum(plan.ci[w]);

// ---------- operasi segmen (bersambung, jumlah = weeks) ----------
export function setSegLen(segs, i, len) {
  len = Math.max(1, Math.round(len));
  if (i === segs.length - 1) { // segmen terakhir: ambil/beri ke sebelumnya
    if (i === 0) return false;
    const d = len - segs[i].len; if (segs[i - 1].len - d < 1) return false;
    segs[i - 1].len -= d; segs[i].len = len; return true;
  }
  const d = len - segs[i].len; if (segs[i + 1].len - d < 1) return false;
  segs[i + 1].len -= d; segs[i].len = len; return true;
}
export function splitSeg(segs, i, at) { // at = minggu relatif dalam segmen
  const g = segs[i]; if (at <= 0 || at >= g.len) return false;
  segs.splice(i + 1, 0, { ...g, label: g.label, len: g.len - at }); g.len = at; return true;
}
export function mergeNext(segs, i) { if (i >= segs.length - 1) return false; segs[i].len += segs[i + 1].len; segs.splice(i + 1, 1); return true; }

// selaraskan mesosiklus & baris yang mengikuti fase setelah batas fase berubah
export function syncToPhases(plan, oldPhaseCount = plan.phases.length) {
  let mi = 1; plan.meso = [];
  plan.phases.forEach(p => mesoLens(p.len).forEach(l => plan.meso.push({ label: `Meso ${mi++}`, len: l })));
  [plan.targets, ...plan.bio.map(b => b.segs)].forEach(segs => {
    if (segs.length === plan.phases.length || segs.length === oldPhaseCount) {
      const labels = segs.map(s => s.label);
      segs.splice(0, segs.length, ...plan.phases.map((p, i) => ({ label: labels[i] ?? '', len: p.len })));
    }
  });
}

// ubah jumlah minggu total (tambah/kurangi di segmen terakhir tiap baris)
export function resizeWeeks(plan, W) {
  W = clamp(W, 4, 104); const d = W - plan.weeks; if (!d) return;
  const fix = segs => { if (d > 0) segs[segs.length - 1].len += d; else { let r = -d; for (let i = segs.length - 1; i >= 0 && r > 0; i--) { const t = Math.min(r, segs[i].len - (i === 0 ? 1 : 0)); segs[i].len -= t; r -= t; if (segs[i].len === 0) segs.splice(i, 1); } } };
  [plan.phases, plan.meso, plan.targets, ...plan.bio.map(b => b.segs)].forEach(fix);
  const pad = (a, v) => { while (a.length < W) a.push(typeof v === 'function' ? v() : v); a.length = W; };
  pad(plan.vol, 30); pad(plan.int, 30); pad(plan.freq, () => [1, 1, 1]); pad(plan.ci, () => [1, 1, 1]);
  plan.weeks = W; plan.events = plan.events.filter(e => e.week < W); plan.tests = plan.tests.filter(w => w < W); plan.camps = plan.camps.filter(w => w < W);
}

// kolom bulan: [{name, year, start, len}]
export function monthSpans(plan) {
  const out = [];
  for (let w = 0; w < plan.weeks; w++) {
    const d = addDays(weekDate(plan, w), 3); // Kamis menentukan bulan (gaya ISO)
    const k = d.getUTCFullYear() * 12 + d.getUTCMonth();
    const last = out[out.length - 1];
    if (last && last.k === k) last.len++; else out.push({ k, name: BULAN[d.getUTCMonth()], year: d.getUTCFullYear(), start: w, len: 1 });
  }
  return out;
}
export function periodSpans(plan) {
  const out = [];
  plan.phases.forEach(p => { const per = PHASES[p.key]?.period || 'PERSIAPAN'; const l = out[out.length - 1]; if (l && l.name === per) l.len += p.len; else out.push({ name: per, len: p.len }); });
  return out;
}
export const phaseColor = p => p.color || PHASES[p.key]?.color || '#94a3b8';
