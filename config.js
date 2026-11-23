// Pengaturan Coach Planner. Ubah di sini saja.
export const CONFIG = {
  // Config web Firebase (Project settings → Your apps → Web). Kosongkan apiKey = mode perangkat (tanpa login online).
  firebase: {
    apiKey: 'AIzaSyCW1NMcaLLcvfKlJKObPoEzg3JJudhm8LQ',
    authDomain: 'coach-planner-8a3ec.firebaseapp.com',
    projectId: 'coach-planner-8a3ec',
    storageBucket: 'coach-planner-8a3ec.firebasestorage.app',
    messagingSenderId: '639970788778',
    appId: '1:639970788778:web:9ee8f819bd3ed1ac6d97d3',
  },
  freePlans: 1,                 // jumlah rencana untuk akun Gratis
  price: { month: 49000, year: 399000 },
  // GANTI: nomor WhatsApp admin untuk aktivasi Pro (format 62…)
  waAdmin: '6281234567890',
};
