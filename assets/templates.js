// Templat program bulanan/mingguan/harian per cabang olahraga.
// Mikrosiklus: rel = intensitas hari relatif terhadap intensitas minggu (Annual).

const G = (fisik, teknik, taktik, mental) => ({ fisik, teknik, taktik, mental });
const MENTAL = ['Mental juara', 'Disiplin', 'Fokus & konsentrasi', 'Pantang menyerah', 'Tanggung jawab'];
const D = (day, cns, fokus, komponen, rel) => ({ day, cns, fokus, komponen, rel });
const I = (fase, latihan, dosis, int, rest, cue) => ({ fase, latihan, dosis, int, rest, cue });
const REST = d => D(d, 'REST', 'Istirahat total / pemulihan', 'Pemulihan', 0);

const T = {
  sprint: {
    goals: G(['Strength', 'Explosive power', 'Speed', 'Endurance', 'Power', 'Flexibility & mobility', 'Agility', 'Balance'],
      ['Akselerasi', 'Starting technique', 'Max velocity phase', 'Finishing technique', 'Strides & fartlek'],
      ['Opponent analysis', 'Start strategy', 'Acceleration strategy', 'Max velocity strategy', 'Mental strategy'], MENTAL),
    micro: [D('Senin', 'HIGH', 'Akselerasi 10–30 m, block start & gym kekuatan', 'Strength, explosive power, akselerasi', 1),
      D('Selasa', 'LOW', 'Extensive tempo 100–200 m, core & mobilitas', 'Endurance, flexibility, balance', .7),
      D('Rabu', 'HIGH', 'Max velocity (flying 20–30 m) & plyometrik reaktif', 'Speed, power, agility', 1),
      D('Kamis', 'LOW', 'Drill mekanika lari (A/B-skip) & penguatan hamstring', 'Strength, mobilitas, teknik', .75),
      REST('Jumat'),
      D('Sabtu', 'SEDANG', 'Speed endurance 60–120 m & power eksplosif', 'Speed, endurance, power', .9),
      REST('Minggu')],
    daily: [
      { title: 'Sesi 1 — Akselerasi & block start + kekuatan', day: 'Senin', items: [
        I('Pemanasan (RAMP)', 'Jogging dinamis & skipping variasi', '800 m', 60, 'Terkendali', 'Naikkan suhu tubuh bertahap'),
        I('Pemanasan (RAMP)', 'Dynamic mobility (leg swing, lunge twist, inchworm)', '10 gerak × 10', 60, '30 dtk', 'Buka mobilitas panggul & ankle'),
        I('Drill teknik', 'A-march & A-skip', '3 × 20 m', 85, '60 dtk', 'Dorsofleksi, kontak di bawah pinggul'),
        I('Inti — akselerasi', '3-point stance acceleration', '3 × 20 m', 95, '3 mnt', 'Kepala rendah, 3 langkah awal kuat'),
        I('Inti — akselerasi', 'Block start sprint', '4 × 30 m', 100, '4–5 mnt', 'Reaksi eksplosif pada aba-aba'),
        I('Kekuatan (gym)', 'Back squat / trap bar deadlift', '4 × 4–5', 85, '3 mnt', 'Konsentrik secepat mungkin'),
        I('Pendinginan', 'Jogging ringan + peregangan statis', '15 mnt', 30, 'Rileks', 'Turunkan denyut jantung')] },
      { title: 'Sesi 2 — Kecepatan maksimal & plyometrik', day: 'Rabu', items: [
        I('Pemanasan (RAMP)', 'Jogging dinamis + ankle pogo hops', '600 m + 2 × 20', 65, '45 dtk', 'Kontak kaki singkat'),
        I('Drill teknik', 'Dribble bleeds (ankle → knee)', '3 × 30 m', 90, '90 dtk', 'Putaran kaki melingkar'),
        I('Inti — max speed', 'Flying 20 m (build-up 25 m)', '3 × 20 m', 100, '5–6 mnt', 'Postur tegak, bahu rileks'),
        I('Inti — max speed', 'In-and-out sprint 20-15-20', '2 × 55 m', 95, '6 mnt', 'Ganti ritme sambil rileks'),
        I('Plyometrik', 'Hurdle hops reaktif', '4 × 5 gawang', 95, '2 mnt', 'Pantulan instan'),
        I('Pendinginan', 'Foam rolling & dekompresi', '15 mnt', 30, 'Rileks', '')] },
      { title: 'Sesi 3 — Extensive tempo & koreksi teknik', day: 'Selasa', items: [
        I('Pemanasan', 'General warm-up & arm mechanics', '15 mnt', 60, 'Terkendali', 'Ayunan lengan 90°'),
        I('Inti — tempo', 'Extensive tempo di rumput', '8 × 100 m', 70, 'Jalan 100 m', 'Bukan all-out, ritme halus'),
        I('Penguatan', 'Nordic hamstring curl', '3 × 6', 75, '2 mnt', 'Pencegah cedera hamstring'),
        I('Penguatan', 'Copenhagen plank & leg raise', '3 × 10 / 30 dtk', 70, '60 dtk', 'Stabilitas panggul'),
        I('Pendinginan', 'PNF stretching', '20 mnt', 30, 'Mandiri', '')] },
      { title: 'Sesi 4 — Speed endurance & power', day: 'Sabtu', items: [
        I('Pemanasan', 'Jogging dinamis & agility ladder', '15 mnt', 65, 'Terkendali', ''),
        I('Inti — speed end.', 'Split sprint 60–80–100 m', '4 repetisi', 90, '4–5 mnt', 'Postur tetap saat laktat naik'),
        I('Power', 'Medicine ball overhead slam', '3 × 8', 85, '90 dtk', 'Ledakan dari panggul'),
        I('Pendinginan', 'Jogging ringan & foam rolling', '15 mnt', 30, 'Rileks', '')] },
    ],
  },
  renang: {
    goals: G(['Daya tahan aerobik', 'Ambang laktat', 'Kekuatan darat', 'Power', 'Kelentukan bahu & ankle', 'Core'],
      ['Teknik gaya utama', 'Start', 'Pembalikan (turn)', 'Streamline & underwater kick', 'Finish'],
      ['Pacing / split', 'Strategi start', 'Strategi pembalikan', 'Analisis lawan'], MENTAL),
    micro: [D('Senin', 'SEDANG', 'Aerobik A2 + drill teknik gaya utama', 'Daya tahan, teknik', .8),
      D('Selasa', 'HIGH', 'Ambang laktat (AT) + latihan darat', 'Ambang, kekuatan', 1),
      D('Rabu', 'LOW', 'Recovery + kick & pull', 'Pemulihan aktif, teknik', .6),
      D('Kamis', 'HIGH', 'VO2max / race pace + start & turn', 'Kecepatan, power', 1),
      D('Jumat', 'SEDANG', 'Aerobik + drill streamline', 'Daya tahan, teknik', .8),
      D('Sabtu', 'HIGH', 'Simulasi lomba / time trial', 'Race pace', .95),
      REST('Minggu')],
    daily: [
      { title: 'Sesi ambang laktat', day: 'Selasa', items: [
        I('Pemanasan', 'Renang campuran + drill', '800 m', 60, '—', 'Teknik rileks'),
        I('Pre-set', 'Kick 4 × 50 m dengan papan', '200 m', 70, '15 dtk', ''),
        I('Inti — AT', '8 × 200 m gaya utama @ ambang', '1.600 m', 85, '20 dtk', 'Split stabil'),
        I('Inti — kecepatan', '8 × 25 m sprint', '200 m', 100, '40 dtk', 'Kayuhan cepat'),
        I('Darat', 'Core & band bahu', '20 mnt', 70, '45 dtk', ''),
        I('Pendinginan', 'Renang ringan', '300 m', 40, '—', '')] },
      { title: 'Sesi race pace + start & turn', day: 'Kamis', items: [
        I('Pemanasan', 'Renang campuran', '1.000 m', 60, '—', ''),
        I('Teknik', 'Start dari balok + 15 m', '6 × 15 m', 95, '1 mnt', 'Reaksi & entry'),
        I('Teknik', 'Turn + 10 m underwater', '8 ×', 90, '45 dtk', 'Streamline ketat'),
        I('Inti — race pace', '4 × 100 m @ target lomba', '400 m', 95, '3 mnt', 'Pacing sesuai target'),
        I('Pendinginan', 'Renang ringan', '400 m', 40, '—', '')] },
    ],
  },
};

const GENERIC = cats => ({
  goals: G(['Kekuatan', 'Power', 'Kecepatan', 'Daya tahan', 'Kelincahan', 'Kelentukan', 'Keseimbangan'],
    ['Teknik dasar', 'Teknik khusus', 'Kombinasi teknik'], ['Analisis lawan', 'Strategi pertandingan', 'Taktik individu/tim'], MENTAL),
  micro: [D('Senin', 'HIGH', `${cats[0]} intensif + kekuatan`, 'Kekuatan, teknik', 1),
    D('Selasa', 'LOW', 'Aerobik & mobilitas', 'Daya tahan, kelentukan', .7),
    D('Rabu', 'HIGH', `${cats[2] || cats[0]} + kecepatan/power`, 'Kecepatan, power', 1),
    D('Kamis', 'LOW', 'Koreksi teknik & core', 'Teknik, keseimbangan', .75),
    REST('Jumat'),
    D('Sabtu', 'SEDANG', 'Simulasi pertandingan / game', 'Taktik, daya tahan spesifik', .9),
    REST('Minggu')],
  daily: [
    { title: 'Sesi 1 — Teknik & kekuatan', day: 'Senin', items: [
      I('Pemanasan', 'Jogging & dinamis', '15 mnt', 60, '—', 'Naikkan suhu tubuh'),
      I('Inti — teknik', 'Drill teknik utama', '4 × 5 mnt', 80, '1 mnt', ''),
      I('Inti — kekuatan', 'Squat / push-up / pull', '3 × 8', 80, '2 mnt', ''),
      I('Pendinginan', 'Peregangan statis', '10 mnt', 30, '—', '')] },
    { title: 'Sesi 2 — Kecepatan & taktik', day: 'Rabu', items: [
      I('Pemanasan', 'Dinamis + kelincahan', '15 mnt', 65, '—', ''),
      I('Inti — kecepatan', 'Sprint pendek / reaksi', '6 × 20 m', 95, '2 mnt', ''),
      I('Inti — taktik', 'Latihan situasi pertandingan', '20 mnt', 85, '—', ''),
      I('Pendinginan', 'Jogging ringan + peregangan', '10 mnt', 30, '—', '')] },
  ],
});

export function template(sport, cats) { return JSON.parse(JSON.stringify(T[sport] || GENERIC(cats || ['Teknik', 'Fisik', 'Taktik']))); }
export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const CNS = ['HIGH', 'SEDANG', 'LOW', 'REST'];
