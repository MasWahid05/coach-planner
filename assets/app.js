import * as E from './engine.js';
import { chartSVG, COLORS } from './chart.js';
import { store } from './store.js';
import { CONFIG } from '../config.js';
import { DAYS, CNS } from './templates.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const rupiah = n => 'Rp' + n.toLocaleString('id-ID');
const SPORT_IC = { sprint: '⚡', endurance: '🏃', renang: '🏊', permainan: '⚽', beladiri: '🥋', raket: '🏸', umum: '🏅' };

// ---------- util UI ----------
let toastT;
function toast(msg, action) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button>${esc(action.label)}</button>` : '');
  if (action) t.querySelector('button').onclick = () => { action.run(); t.classList.remove('show'); };
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), action ? 7000 : 2800);
}
function modal(html, bind) {
  const m = $('#modal'); m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  m.onclick = e => { if (e.target === m || e.target.closest('[data-close]')) close(); };
  bind?.(m, close); m.querySelector('button, input, a')?.focus(); return close;
}
const confirmBox = (title, text, ok = 'Ya, lanjutkan', danger = false) => new Promise(res => {
  modal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="acts"><button class="btn btn-ghost" data-close>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="ok">${esc(ok)}</button></div>`,
    (m, close) => { m.querySelector('#ok').onclick = () => { close(); res(true); }; m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) res(false); }); });
});
function drawer(html, bind) {
  const d = $('#drawer'); d.innerHTML = `<div class="sheet-panel" role="dialog" aria-modal="true">${html}</div>`; d.hidden = false;
  const close = () => { d.hidden = true; d.innerHTML = ''; };
  d.onclick = e => { if (e.target === d || e.target.closest('[data-close]')) close(); };
  bind?.(d, close); d.querySelector('input,select,button')?.focus(); return close;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('#drawer').hidden = true; $('#modal').hidden = true; } });

function paywall(reason) {
  modal(`<span class="badge pro">PRO</span><h2 style="margin-top:10px">${esc(reason)}</h2>
    <p class="muted">Akun Gratis dapat menyimpan ${CONFIG.freePlans} rencana dan ekspor bertanda “versi Gratis”. Upgrade ke <b>Pro</b> untuk rencana tanpa batas, duplikat rencana, dan ekspor Excel/PDF bersih.</p>
    <p><b>${rupiah(CONFIG.price.month)}</b>/bulan atau <b>${rupiah(CONFIG.price.year)}</b>/tahun.</p>
    <div class="acts"><button class="btn btn-ghost" data-close>Nanti saja</button><a class="btn btn-primary" href="#/harga" data-close>Lihat paket Pro</a></div>`);
}

// ---------- navigasi ----------
function renderNav() {
  const u = store.user, r = location.hash || '#/';
  const cur = h => r.startsWith(h) ? ' aria-current="page"' : '';
  $('#menu').innerHTML = u
    ? `<li><a href="#/dasbor"${cur('#/dasbor')}>Rencana saya</a></li><li><a href="#/harga"${cur('#/harga')}>Harga</a></li>
       ${u.admin ? `<li><a href="#/admin"${cur('#/admin')}>Admin</a></li>` : ''}
       <li><a href="#/akun"${cur('#/akun')} style="display:flex;align-items:center;gap:8px">${u.photo ? `<img class="avatar" src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : ''}<span>${esc(u.name.split(' ')[0])}</span> <span class="badge ${store.isPro ? 'pro' : ''}">${store.isPro ? 'PRO' : 'Gratis'}</span></a></li>
       <li><a class="btn btn-primary btn-sm" href="#/baru">+ Rencana baru</a></li>`
    : `<li><a href="#/#fitur">Fitur</a></li><li><a href="#/#cara">Cara kerja</a></li><li><a href="#/harga"${cur('#/harga')}>Harga</a></li>
       <li><a href="#/masuk">Masuk</a></li><li><a class="btn btn-primary btn-sm" href="#/masuk">Mulai gratis</a></li>`;
  $('#banner').innerHTML = store.mode === 'local'
    ? `<div class="banner"><div class="wrap"><b>Mode perangkat.</b> Rencana tersimpan di browser ini saja. Login Google &amp; sinkron online aktif setelah server disambungkan.</div></div>` : '';
}
$('#burger').onclick = () => { const m = $('#menu'), o = !m.classList.contains('open'); m.classList.toggle('open', o); $('#burger').setAttribute('aria-expanded', o); };
$('#menu').addEventListener('click', e => { if (e.target.closest('a')) $('#menu').classList.remove('open'); });

const routes = [
  [/^#?\/?$/, landing], [/^#\/#(\w+)$/, landing], [/^#\/masuk$/, masuk], [/^#\/dasbor$/, dasbor], [/^#\/baru$/, wizard],
  [/^#\/r\/([\w-]+)$/, editor], [/^#\/harga$/, harga], [/^#\/akun$/, akun], [/^#\/admin$/, admin],
];
let cleanup = null;
async function route() {
  cleanup?.(); cleanup = null;
  $('#drawer').hidden = true; $('#modal').hidden = true;
  const h = location.hash || '#/';
  renderNav();
  for (const [re, fn] of routes) { const m = h.match(re); if (m) { await fn(...m.slice(1)); if (!/^#\/#/.test(h)) window.scrollTo(0, 0); app.focus({ preventScroll: true }); return; } }
  landing();
}
function needLogin() { if (!store.user) { sessionStorage.setItem('cp.next', location.hash); location.hash = '#/masuk'; return true; } return false; }

// ---------- beranda ----------
function samplePlan() {
  const y = new Date().getFullYear();
  const p = E.generate({ sport: 'sprint', start: `${y}-01-05`, end: `${y}-12-27`, mainDate: `${y}-10-14`, mainName: 'Kejuaraan Daerah', athlete: 'Tim Sprint', sessions: 6, others: [{ date: `${y}-07-08`, name: 'Kejurkot' }] });
  p.title = 'Contoh: Periodisasi Sprint 100 m'; p.tests = [0, 16, 26, 34]; p.camps = [30, 31]; return p;
}
function landing(anchor) {
  const sp = samplePlan();
  app.innerHTML = `
  <section class="hero"><div class="wrap hero-grid">
    <div>
      <span class="eyebrow">Untuk pelatih semua cabang olahraga</span>
      <h1>Periodisasi tahunan rapi dalam 5 menit.</h1>
      <p class="lead">Masukkan tanggal latihan dan lomba utama. Coach Planner menyusun fase, mesosiklus, minggu, dan gelombang volume–intensitas, lalu Anda tinggal menyesuaikan dan mengekspornya ke Excel.</p>
      <div class="actions"><a class="btn btn-primary" href="${store.user ? '#/baru' : '#/masuk'}">Buat rencana gratis</a><a class="btn btn-ghost" href="#/#video">▶ Tonton video 2 menit</a></div>
      <ul class="ticks"><li>Tanpa kartu kredit</li><li>Ekspor Excel berwarna</li><li>Bisa dibuka di HP</li></ul>
    </div>
    <div class="shot" aria-label="Contoh tampilan rencana tahunan"><div class="bar"><i></i><i></i><i></i></div>
      ${miniSheet(sp)}${chartSVG(sp, { colW: 12, height: 190, dots: false }).svg}</div>
  </div></section>

  <section class="s" id="video" style="padding-top:24px"><div class="wrap" style="max-width:980px">
    <div class="center"><span class="eyebrow">Video</span><h2>Lihat Coach Planner bekerja dalam 2 menit</h2></div>
    <div class="video-box"><iframe src="https://www.youtube-nocookie.com/embed/mGQZw4_UiG4?rel=0" title="Video promo Coach Planner" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
  </div></section>

  <section class="s alt" id="fitur"><div class="wrap">
    <div class="center"><span class="eyebrow">Fitur</span><h2>Semua bagian rencana tahunan, dalam satu layar</h2><p class="muted">Susunannya mengikuti format annual training plan yang biasa dipakai pelatih: periode, fase, mesosiklus, komponen biomotor, kalender lomba, sampai beban latihan.</p></div>
    <div class="grid">
      ${[['M3 3h18v18H3zM3 9h18M9 21V9', 'Pembagian fase otomatis', 'Persiapan umum, persiapan khusus, pra-kompetisi, kompetisi, dan transisi dihitung dari tanggal lomba utama.'],
      ['M4 19V5m0 14h16M8 15l3-4 3 2 5-7', 'Gelombang volume–intensitas', 'Pola beban 3:1 per mesosiklus, taper menjelang lomba, dan grafik yang bisa diubah langsung dengan menyeret titiknya.'],
      ['M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z', 'Kalender lomba', 'Tandai lomba utama dan lomba antara, geser ke minggu lain, dan beban di sekitarnya ikut menyesuaikan.'],
      ['M4 6h16M4 12h10M4 18h7', 'Komponen biomotor', 'Kekuatan, kecepatan, daya tahan, dan teknik/taktik dengan contoh isi per cabang: atletik, renang, permainan, bela diri, raket.'],
      ['M12 3v12m0 0l-4-4m4 4l4-4M4 21h16', 'Ekspor Excel & PDF', 'File .xlsx berwarna lengkap dengan sel gabung, rumus beban, dan grafik. Atau cetak langsung ke PDF A4.'],
      ['M5 11V7a7 7 0 0114 0v4M4 11h16v10H4z', 'Tersimpan di akun Anda', 'Masuk dengan Google, simpan banyak rencana untuk atlet dan tim yang berbeda, buka dari HP maupun laptop.']]
      .map(([d, t, p]) => `<div class="card feat"><div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg></div><h3>${t}</h3><p>${p}</p></div>`).join('')}
    </div></div></section>

  <section class="s" id="cara"><div class="wrap">
    <div class="center"><span class="eyebrow">Cara kerja</span><h2>Tiga langkah, rencana siap dibagikan</h2></div>
    <div class="steps">
      <div class="card"><h3>Isi data dasar</h3><p class="muted">Pilih cabang olahraga, nama atlet atau tim, tanggal mulai–selesai, lomba utama, dan jumlah sesi per minggu.</p></div>
      <div class="card"><h3>Sesuaikan</h3><p class="muted">Klik fase atau blok untuk mengubah panjangnya, geser lomba, isi tes dan training camp, atur volume–intensitas tiap minggu.</p></div>
      <div class="card"><h3>Ekspor & bagikan</h3><p class="muted">Unduh Excel berwarna untuk laporan ke klub/KONI, atau cetak ke PDF untuk ditempel di ruang latihan.</p></div>
    </div></div></section>

  <section class="s alt" id="harga-ringkas"><div class="wrap center">
    <span class="eyebrow">Harga</span><h2>Mulai gratis, upgrade saat butuh</h2>
    ${pricingCards()}
  </div></section>

  <section class="s"><div class="wrap" style="max-width:780px">
    <div class="center"><h2>Pertanyaan umum</h2></div>
    ${[['Apakah sesuai teori periodisasi?', 'Pembagian fase mengikuti model periodisasi klasik (Bompa): persiapan ±65%, kompetisi ±35% sebelum lomba utama, ditutup transisi. Mesosiklus memakai pola 3 minggu naik, 1 minggu pemulihan. Semua bisa Anda ubah.'],
      ['Bisa untuk cabang olahraga apa saja?', 'Ada contoh isi untuk atletik (sprint dan jarak jauh), renang, permainan bola, bela diri, dan raket. Cabang lain memakai template umum yang labelnya bisa diganti.'],
      ['Apakah file Excel-nya bisa diedit lagi?', 'Bisa. File .xlsx dibuka di Microsoft Excel, Google Sheets, atau WPS. Baris total dan beban latihan memakai rumus.'],
      ['Bagaimana cara membayar Pro?', 'Untuk saat ini pembayaran melalui transfer dan konfirmasi WhatsApp, lalu akun Anda diaktifkan manual. Pembayaran otomatis (QRIS/VA) sedang disiapkan.']]
      .map(([q, a]) => `<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join('')}
  </div></section>
  ${footer()}`;
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 30);
  bindPricing();
}
const footer = () => `<footer class="foot"><div class="wrap"><span>© ${new Date().getFullYear()} Coach Planner · Pembuat periodisasi latihan</span><span><a href="#/harga">Harga</a> · <a href="#/masuk">Masuk</a></span></div></footer>`;

function miniSheet(p) {
  const ph = E.segStarts(p.phases);
  return `<div style="display:grid;grid-template-columns:repeat(${p.weeks},1fr);gap:1px;font-size:9px;font-weight:700;color:#fff;margin-bottom:8px">
    ${E.periodSpans(p).map(s => `<div style="grid-column:span ${s.len};background:${E.PERIOD_COLORS[s.name]};padding:3px 2px;text-align:center;border-radius:3px">${s.name}</div>`).join('')}
    ${p.phases.map((f, i) => `<div style="grid-column:span ${f.len};background:${E.phaseColor(f)};padding:3px 2px;text-align:center;border-radius:3px;white-space:nowrap;overflow:hidden">${f.label}</div>`).join('')}
    ${p.meso.map((m, i) => `<div style="grid-column:span ${m.len};background:${i % 2 ? '#e2e8f0' : '#f1f5f9'};color:#334155;padding:2px;text-align:center;border-radius:3px;overflow:hidden;white-space:nowrap">${m.len > 3 ? m.label.replace('Meso ', 'M') : ''}</div>`).join('')}
  </div>`;
}

function pricingCards() {
  const pro = store.isPro;
  return `<div style="margin-top:18px"><div class="seg-toggle" role="group" aria-label="Periode tagihan"><button data-bill="month" aria-pressed="false">Bulanan</button><button data-bill="year" aria-pressed="true">Tahunan · hemat 32%</button></div></div>
  <div class="price-grid" style="text-align:left">
    <div class="card price"><h3>Gratis</h3><div class="amt">Rp0</div><p class="muted small">Untuk mencoba dan rencana satu atlet/tim.</p>
      <ul><li>${CONFIG.freePlans} rencana tersimpan</li><li>Wizard & editor lengkap</li><li>Grafik volume–intensitas</li><li>Ekspor Excel & PDF (bertanda “versi Gratis”)</li><li class="no">Duplikat rencana</li></ul>
      <a class="btn btn-ghost" href="${store.user ? '#/baru' : '#/masuk'}">${store.user ? 'Buat rencana' : 'Mulai gratis'}</a></div>
    <div class="card price pop"><h3>Pro</h3><div class="amt" id="pro-amt"></div><p class="muted small" id="pro-note"></p>
      <ul><li>Rencana tanpa batas</li><li>Ekspor Excel & PDF tanpa tanda</li><li>Duplikat rencana untuk atlet lain</li><li>Semua template cabang olahraga</li><li>Bantuan prioritas via WhatsApp</li></ul>
      ${pro ? `<span class="btn btn-ghost" aria-disabled="true">Paket Anda saat ini</span>` : `<button class="btn btn-primary" id="buy">Upgrade ke Pro</button>`}</div>
  </div>`;
}
function bindPricing() {
  let bill = 'year';
  const upd = () => {
    $$('[data-bill]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bill === bill));
    const a = $('#pro-amt'); if (!a) return;
    a.innerHTML = bill === 'year' ? `${rupiah(CONFIG.price.year)}<small>/tahun</small>` : `${rupiah(CONFIG.price.month)}<small>/bulan</small>`;
    $('#pro-note').textContent = bill === 'year' ? `Setara ${rupiah(Math.round(CONFIG.price.year / 12))} per bulan.` : 'Bisa berhenti kapan saja.';
  };
  $$('[data-bill]').forEach(b => b.onclick = () => { bill = b.dataset.bill; upd(); }); upd();
  const buy = $('#buy'); if (buy) buy.onclick = () => {
    if (!store.user) { sessionStorage.setItem('cp.next', '#/harga'); location.hash = '#/masuk'; return; }
    const paket = bill === 'year' ? `Tahunan (${rupiah(CONFIG.price.year)})` : `Bulanan (${rupiah(CONFIG.price.month)})`;
    const msg = `Halo, saya ingin upgrade Coach Planner Pro paket ${paket}.\nID akun: ${store.user.uid}`;
    modal(`<h2>Upgrade ke Pro</h2><p class="muted">Pembayaran saat ini melalui konfirmasi WhatsApp. Admin akan mengirim nomor rekening/QRIS, lalu mengaktifkan Pro di akun Anda (biasanya kurang dari 1×24 jam).</p>
      <p class="small">Paket: <b>${esc(paket)}</b><br>ID akun Anda: <code>${esc(store.user.uid)}</code></p>
      <div class="acts"><button class="btn btn-ghost" data-close>Batal</button><a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/${CONFIG.waAdmin}?text=${encodeURIComponent(msg)}">Lanjut ke WhatsApp</a></div>`);
  };
}
function harga() {
  app.innerHTML = `<section class="s"><div class="wrap center"><span class="eyebrow">Harga</span><h1 style="font-size:clamp(2rem,3vw + 1rem,3rem)">Pilih paket Coach Planner</h1><p class="muted">Mulai gratis. Upgrade ke Pro saat Anda menangani lebih dari satu atlet atau tim.</p>${pricingCards()}</div></section>${footer()}`;
  bindPricing();
}

// ---------- masuk ----------
const IN_APP = /FBAN|FBAV|Instagram|Line\/|WhatsApp|TikTok|musical_ly|BytedanceWebview|; wv\)/i.test(navigator.userAgent);
function authMsg(e) {
  const c = (e && e.code) || '';
  const M = {
    'auth/popup-closed-by-user': 'Jendela login ditutup sebelum selesai. Coba lagi.',
    'auth/cancelled-popup-request': 'Login dibatalkan. Coba lagi.',
    'auth/network-request-failed': 'Koneksi internet bermasalah. Periksa sinyal lalu coba lagi.',
    'auth/unauthorized-domain': 'Alamat web ini belum diizinkan untuk login. Buka lewat coach-planner-alpha.vercel.app.',
    'auth/web-storage-unsupported': 'Browser memblokir penyimpanan login. Matikan mode penyamaran / izinkan cookie, atau pakai Chrome.',
    'auth/operation-not-supported-in-this-environment': 'Browser ini tidak mendukung login Google. Buka di Chrome atau Safari.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  };
  return M[c] || ('Gagal masuk: ' + (c || (e && e.message) || 'tidak diketahui'));
}
window.addEventListener('cp-auth-error', e => { if (e.detail?.code !== 'auth/popup-closed-by-user') toast(authMsg(e.detail)); });
function masuk() {
  if (store.user) { location.hash = sessionStorage.getItem('cp.next') || '#/dasbor'; sessionStorage.removeItem('cp.next'); return; }
  app.innerHTML = `<section class="s"><div class="wrap" style="max-width:460px"><div class="card" style="padding:32px;text-align:center">
    <span class="mark" style="margin:0 auto 14px;width:52px;height:52px;border-radius:14px"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 17l5-6 4 3.5L21 5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <h1 style="font-size:1.7rem">Masuk ke Coach Planner</h1>
    <p class="muted">${store.mode === 'cloud' ? 'Gunakan akun Google Anda. Rencana tersimpan aman dan bisa dibuka dari perangkat mana pun.' : 'Mode perangkat: rencana disimpan di browser ini.'}</p>
    <button class="btn btn-ghost" id="g" style="width:100%;min-height:50px">${store.mode === 'cloud' ? `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Masuk dengan Google` : 'Mulai di perangkat ini'}</button>
    ${IN_APP && store.mode === 'cloud' ? `<div class="card" style="margin-top:14px;padding:14px;text-align:left;background:#fff7e0;border-color:#f5d48a"><b>Buka di Chrome / Safari</b><p class="small" style="margin:6px 0 10px">Google tidak mengizinkan login dari browser bawaan WhatsApp/Instagram/TikTok. Ketuk ⋮ atau ··· lalu pilih <i>Buka di browser</i>, atau salin tautan ini.</p><button class="btn btn-ghost btn-sm" id="cp-copy">Salin tautan</button></div>` : ''}
    <p class="small muted" style="margin-top:16px">Dengan masuk, Anda menyetujui penggunaan data akun (nama & email) hanya untuk menyimpan rencana Anda.</p>
  </div></div></section>`;
  const cpy = $('#cp-copy'); if (cpy) cpy.onclick = async () => { try { await navigator.clipboard.writeText(location.origin + '/#/masuk'); toast('Tautan disalin. Tempel di Chrome/Safari.'); } catch { prompt('Salin tautan ini:', location.origin + '/#/masuk'); } };
  $('#g').onclick = async () => {
    $('#g').disabled = true;
    try { await store.signIn(); const n = sessionStorage.getItem('cp.next') || '#/dasbor'; sessionStorage.removeItem('cp.next'); location.hash = n; }
    catch (e) { console.error(e); toast(authMsg(e)); $('#g').disabled = false; }
  };
}
function akun() {
  if (needLogin()) return; const u = store.user;
  app.innerHTML = `<div class="page"><div class="wrap" style="max-width:640px"><div class="page-head"><h1>Akun saya</h1></div>
    <div class="card"><p><b>${esc(u.name)}</b><br><span class="muted">${esc(u.email || 'Akun perangkat')}</span></p>
    <p>Paket: <span class="badge ${store.isPro ? 'pro' : ''}">${store.isPro ? 'PRO' : 'Gratis'}</span>${u.proUntil ? ` <span class="small muted">berlaku sampai ${E.fmtLong(new Date(u.proUntil))}</span>` : ''}</p>
    <p class="small muted">ID akun: <code>${esc(u.uid)}</code></p>
    <div class="toolbar">${u.admin ? '<a class="btn btn-primary" href="#/admin">Buka Admin</a>' : ''}${store.isPro ? '' : '<a class="btn btn-primary" href="#/harga">Upgrade ke Pro</a>'}<button class="btn btn-ghost" id="out">Keluar</button></div></div></div></div>`;
  $('#out').onclick = async () => { await store.signOut(); location.hash = '#/'; };
}

// ---------- dasbor ----------
async function dasbor() {
  if (needLogin()) return;
  app.innerHTML = `<div class="page"><div class="wrap"><div class="page-head"><div><span class="eyebrow">Dasbor</span><h1>Rencana saya</h1></div><button class="btn btn-primary" id="new">+ Rencana baru</button></div><div id="list" class="loading">Memuat rencana…</div></div></div>`;
  $('#new').onclick = newPlan;
  let list = [];
  try { list = await store.list(); } catch (e) { console.error(e); $('#list').textContent = 'Gagal memuat rencana. Periksa koneksi internet.'; return; }
  const lim = store.limits();
  if (!list.length) {
    $('#list').className = ''; $('#list').innerHTML = `<div class="card empty"><svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="1.4"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 14h4M7 17h7"/></svg>
      <h2 style="font-size:1.4rem">Belum ada rencana</h2><p class="muted">Buat rencana tahunan pertama Anda. Hanya butuh tanggal latihan dan tanggal lomba utama.</p><button class="btn btn-primary" id="new2">Buat rencana pertama</button></div>`;
    $('#new2').onclick = newPlan; return;
  }
  $('#list').className = 'plans';
  $('#list').innerHTML = list.map(p => {
    const next = (p.events || []).find(e => e.main);
    const d = next ? E.weekDate(p, next.week) : null;
    return `<div class="card plan-card"><a href="#/r/${p.id}" style="text-decoration:none;color:inherit"><span class="badge">${esc(p.sportName || '')}</span>
      <h3 style="margin-top:10px">${esc(p.title)}</h3><div class="muted small">${esc(p.athlete || '')} · ${p.weeks} minggu · mulai ${E.fmtLong(E.parseDate(p.start))}</div>
      ${next ? `<div class="small" style="margin-top:6px">★ ${esc(next.name)} · minggu ${next.week + 1} (${E.fmtShort(d)})</div>` : ''}</a>
      <div class="acts"><a class="btn btn-primary btn-sm" href="#/r/${p.id}">Buka</a><button class="btn btn-ghost btn-sm" data-dup="${p.id}">Duplikat${store.isPro ? '' : ' · Pro'}</button><button class="btn btn-danger btn-sm" data-del="${p.id}">Hapus</button></div></div>`;
  }).join('') + (lim.plans !== Infinity ? `<div class="card" style="display:flex;flex-direction:column;justify-content:center;gap:8px;background:var(--brand-soft);border-style:dashed"><b>${list.length}/${lim.plans} rencana (paket Gratis)</b><span class="small muted">Pro: rencana tanpa batas & ekspor tanpa tanda.</span><a class="btn btn-ghost btn-sm" href="#/harga" style="align-self:flex-start">Lihat Pro</a></div>` : '');
  $$('[data-del]').forEach(b => b.onclick = async () => {
    const p = list.find(x => x.id === b.dataset.del);
    if (!await confirmBox('Hapus rencana?', `“${p.title}” akan dihapus permanen dan tidak bisa dikembalikan.`, 'Hapus', true)) return;
    await store.remove(p.id); toast('Rencana dihapus'); dasbor();
  });
  $$('[data-dup]').forEach(b => b.onclick = async () => {
    if (!store.isPro) return paywall('Duplikat rencana adalah fitur Pro');
    const p = await store.get(b.dataset.dup); delete p.id; delete p.createdAt; p.title += ' (salinan)';
    await store.save(p); toast('Rencana diduplikat'); dasbor();
  });
}
async function newPlan() {
  if (!store.isPro) { const n = (await store.list()).length; if (n >= CONFIG.freePlans) return paywall(`Paket Gratis hanya ${CONFIG.freePlans} rencana`); }
  location.hash = '#/baru';
}

// ---------- wizard ----------
async function wizard() {
  if (needLogin()) return;
  if (!store.isPro && (await store.list()).length >= CONFIG.freePlans) { location.hash = '#/dasbor'; setTimeout(() => paywall(`Paket Gratis hanya ${CONFIG.freePlans} rencana`), 50); return; }
  const today = new Date(); const st = E.mondayOf(E.addDays(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())), 7));
  const d = {
    sport: 'sprint', sportName: '', athlete: '', coach: store.user.name !== 'Pelatih (perangkat ini)' ? store.user.name : '', target: '', longTarget: '',
    start: E.fmtISO(st), end: E.fmtISO(E.addDays(st, 52 * 7 - 1)), mainName: '', mainDate: E.fmtISO(E.addDays(st, 40 * 7 + 3)), mainPlace: '', others: [], sessions: 6,
  };
  let step = 0;
  const STEPS = ['Cabang olahraga', 'Atlet & target', 'Kalender & lomba', 'Sesi & ringkasan'];
  const draw = () => {
    const body = [
      () => `<h2>Cabang olahraga apa?</h2><p class="muted">Pilihan ini mengisi contoh komponen biomotor dan kategori beban latihan. Semua label bisa diubah nanti.</p>
        <div class="sports">${Object.entries(E.SPORTS).map(([k, s]) => `<button type="button" class="sport" data-sport="${k}" aria-pressed="${d.sport === k}"><span class="ic" aria-hidden="true">${SPORT_IC[k]}</span><span><b>${esc(s.name)}</b><span class="small muted">${s.cats.join(' · ')}</span></span></button>`).join('')}</div>
        <label class="f"><span>Nomor / spesialisasi (opsional)</span><input class="in" name="sportName" placeholder="mis. Atletik 100 m putra, Renang 50 m gaya bebas" value="${esc(d.sportName)}"></label>`,
      () => `<h2>Atlet & target</h2>
        <div class="row"><label class="f"><span>Nama atlet / tim *</span><input class="in" name="athlete" required placeholder="mis. Tim Sprint PPLP" value="${esc(d.athlete)}"></label>
        <label class="f"><span>Nama pelatih</span><input class="in" name="coach" value="${esc(d.coach)}"></label></div>
        <label class="f"><span>Target prestasi</span><input class="in" name="target" placeholder="mis. Medali emas 100 m" value="${esc(d.target)}"></label>
        <label class="f"><span>Target jangka panjang (opsional)</span><textarea class="in" name="longTarget" placeholder="mis. VO2max 60 ml/kg/mnt, catatan waktu 10,9 detik">${esc(d.longTarget)}</textarea></label>`,
      () => `<h2>Kalender & lomba</h2>
        <div class="row"><label class="f"><span>Tanggal mulai *</span><input class="in" type="date" name="start" value="${d.start}"><span class="hint">Dibulatkan ke hari Senin.</span></label>
        <label class="f"><span>Tanggal selesai *</span><input class="in" type="date" name="end" value="${d.end}"></label></div>
        <div class="card" style="padding:16px;background:var(--surface-2);margin-bottom:14px"><b>★ Lomba utama (puncak prestasi)</b>
          <div class="row" style="margin-top:10px"><label class="f"><span>Nama lomba *</span><input class="in" name="mainName" placeholder="mis. POPDA, Porprov, Kejurnas" value="${esc(d.mainName)}"></label>
          <label class="f"><span>Tanggal *</span><input class="in" type="date" name="mainDate" value="${d.mainDate}"></label>
          <label class="f"><span>Tempat</span><input class="in" name="mainPlace" value="${esc(d.mainPlace)}"></label></div></div>
        <b>Lomba lain / uji coba</b><p class="small muted" style="margin:2px 0 8px">Opsional. Dipakai sebagai lomba antara (tune-up).</p>
        <div class="others">${d.others.map((o, i) => `<div class="o"><input class="in" data-o="${i}" data-k="name" placeholder="Nama lomba" value="${esc(o.name)}"><input class="in" type="date" data-o="${i}" data-k="date" value="${o.date}"><input class="in" data-o="${i}" data-k="place" placeholder="Tempat" value="${esc(o.place)}"><button type="button" class="btn btn-ghost btn-icon" data-rm="${i}" aria-label="Hapus lomba">×</button></div>`).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="addO">+ Tambah lomba</button>`,
      () => {
        let pv = ''; try { const p = E.generate(d); pv = `<div class="preview-bar">${p.phases.map(f => `<div style="flex:${f.len};background:${E.phaseColor(f)}" title="${f.label}">${f.len > 3 ? esc(f.label) : ''}<br>${f.len} mg</div>`).join('')}</div>
          <p class="small muted">${p.weeks} minggu · ${p.meso.length} mesosiklus · lomba utama di minggu ke-${p.events[0].week + 1}${p.events.length > 1 ? ` · ${p.events.length - 1} lomba lain` : ''}</p>`; } catch (e) { pv = '<p class="muted">Lengkapi tanggal untuk melihat pratinjau.</p>'; }
        return `<h2>Sesi latihan per minggu</h2>
        <label class="f"><span>Jumlah sesi per minggu: <b id="sv">${d.sessions}</b></span><input class="range" type="range" min="2" max="14" name="sessions" value="${d.sessions}"><span class="hint">Dibagi otomatis ke kategori ${E.SPORTS[d.sport].cats.join(', ')} sesuai fase.</span></label>
        <h3 style="margin-top:18px">Pratinjau pembagian fase</h3>${pv}`;
      },
    ][step]();
    app.innerHTML = `<div class="page"><div class="wrap wiz"><span class="eyebrow">Rencana baru</span>
      <ol class="progress">${STEPS.map((s, i) => `<li class="${i <= step ? 'on' : ''}">${i + 1}. ${s}</li>`).join('')}</ol>
      <form class="card" id="wf" novalidate>${body}
      <div class="wiz-foot"><button type="button" class="btn btn-ghost" id="back">${step ? '← Kembali' : 'Batal'}</button><button class="btn btn-primary" id="next">${step < 3 ? 'Lanjut →' : 'Buat rencana'}</button></div></form></div></div>`;
    const f = $('#wf');
    f.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.o !== undefined) d.others[+t.dataset.o][t.dataset.k] = t.value;
      else if (t.name) d[t.name] = t.type === 'range' ? +t.value : t.value;
      if (t.name === 'sessions') { $('#sv').textContent = t.value; }
    });
    f.addEventListener('change', e => { if (e.target.name === 'sessions') draw(); });
    $$('[data-sport]').forEach(b => b.onclick = () => { d.sport = b.dataset.sport; $$('[data-sport]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
    $('#addO')?.addEventListener('click', () => { d.others.push({ name: '', date: d.mainDate, place: '' }); draw(); });
    $$('[data-rm]').forEach(b => b.onclick = () => { d.others.splice(+b.dataset.rm, 1); draw(); });
    $('#back').onclick = () => { if (step) { step--; draw(); } else location.hash = '#/dasbor'; };
    f.onsubmit = async e => {
      e.preventDefault();
      const err = validate(); if (err) { toast(err); return; }
      if (step < 3) { step++; draw(); return; }
      $('#next').disabled = true;
      try {
        const p = E.generate(d);
        p.title = `Periodisasi ${d.athlete}${d.mainName ? ' – ' + d.mainName : ''}`;
        const saved = await store.save(p); location.hash = '#/r/' + saved.id;
        setTimeout(() => toast('Rencana dibuat. Klik blok mana pun untuk mengubahnya.'), 300);
      } catch (e2) { console.error(e2); toast('Gagal menyimpan: ' + e2.message); $('#next').disabled = false; }
    };
    f.querySelector('input:not([type=range])')?.focus();
  };
  const validate = () => {
    if (step === 1 && !d.athlete.trim()) return 'Isi nama atlet atau tim.';
    if (step === 2) {
      if (!d.start || !d.end || !d.mainDate) return 'Lengkapi tanggal mulai, selesai, dan lomba utama.';
      if (!d.mainName.trim()) return 'Isi nama lomba utama.';
      const s = E.parseDate(d.start), en = E.parseDate(d.end), m = E.parseDate(d.mainDate);
      if ((en - s) / 864e5 < 56) return 'Rentang rencana minimal 8 minggu.';
      if ((en - s) / 864e5 > 728) return 'Rentang rencana maksimal 2 tahun.';
      if (m < E.addDays(s, 35)) return 'Lomba utama minimal 5 minggu setelah tanggal mulai.';
      if (m > en) return 'Lomba utama harus sebelum tanggal selesai.';
    }
    return '';
  };
  draw();
}

// ---------- editor ----------
async function editor(id) {
  if (needLogin()) return;
  app.innerHTML = `<div class="loading">Memuat rencana…</div>`;
  let plan;
  try { plan = await store.get(id); } catch (e) { console.error(e); }
  if (!plan) { app.innerHTML = `<div class="page"><div class="wrap empty card"><h2>Rencana tidak ditemukan</h2><a class="btn btn-primary" href="#/dasbor">Kembali ke dasbor</a></div></div>`; return; }
  plan.id = id; E.ensureExtras(plan);
  const hist = []; let saveT, dirty = false;
  const snapshot = () => { hist.push(JSON.stringify(plan)); if (hist.length > 60) hist.shift(); $('#undo') && ($('#undo').disabled = false); };
  const persist = () => {
    dirty = true; $('#ss').textContent = 'Menyimpan…'; clearTimeout(saveT);
    saveT = setTimeout(async () => { try { await store.save(plan); dirty = false; $('#ss').textContent = '✓ Tersimpan'; } catch (e) { console.error(e); $('#ss').textContent = '⚠ Gagal menyimpan'; } }, 700);
  };
  const change = (fn, { structural = false } = {}) => { snapshot(); fn(); persist(); renderAll(); if (structural) toast('Struktur diubah.', { label: 'Sesuaikan beban otomatis', run: () => change(() => E.autoLoad(plan)) }); };
  let editSeries = 'vol';

  app.innerHTML = `<div class="page"><div class="wrap">
    <div class="ed-head"><div><a href="#/dasbor" class="small no-print" style="text-decoration:none">← Rencana saya</a><h1 id="ttl"></h1><div class="ed-meta" id="meta"></div></div>
      <div class="toolbar"><span class="save-state" id="ss">✓ Tersimpan</span>
        <button class="btn btn-ghost btn-sm" id="undo" disabled title="Urungkan (Ctrl+Z)">↶ Urungkan</button>
        <button class="btn btn-ghost btn-sm" id="info">Info & label</button>
        <button class="btn btn-ghost btn-sm" id="auto">Hitung ulang beban</button>
        <button class="btn btn-ghost btn-sm" id="print">Cetak / PDF</button>
        <button class="btn btn-primary btn-sm" id="xlsx">Ekspor Excel</button></div></div>
    <div class="tabs no-print" role="tablist" aria-label="Bagian program">${[['annual', 'Tahunan'], ['bulanan', 'Bulanan'], ['mingguan', 'Mingguan'], ['harian', 'Harian']].map(([k, l], i) => `<button role="tab" data-view="${k}" aria-selected="${i === 0}">${l}</button>`).join('')}</div>
    <div id="v-other" hidden></div>
    <div id="v-annual">
    <div class="panel print-zoom"><div class="panel-head"><h2>Tabel periodisasi</h2><div class="legend">${E.PHASE_ORDER.map(k => `<span><i style="background:${E.PHASES[k].color}"></i>${E.PHASES[k].label}</span>`).join('')}</div></div>
      <p class="tip no-print" style="margin:10px 16px 0">Klik blok berwarna untuk mengubah nama/panjang, klik sel Tes/TC untuk menandai, klik baris Pertandingan untuk menambah atau menggeser lomba, ketik angka di baris volume/intensitas/frekuensi.</p>
      <div class="sheet-wrap" id="sw"></div></div>
    <div class="panel print-zoom"><div class="panel-head"><h2>Grafik volume & intensitas</h2>
      <div class="chart-tools"><span class="tip">Seret titik untuk mengubah:</span><div class="seg-toggle" role="group" aria-label="Seri yang diubah"><button data-series="vol" aria-pressed="true">Volume</button><button data-series="int" aria-pressed="false">Intensitas</button></div></div></div>
      <div class="chart-box" id="cb"></div></div>
    </div>
    <div class="print-only print-wm" id="pwm"></div>
  </div></div>`;

  const renderHead = () => {
    $('#ttl').textContent = plan.title;
    const endD = E.addDays(E.weekDate(plan, plan.weeks - 1), 6);
    $('#meta').innerHTML = [plan.sportName, plan.athlete && 'Atlet/tim: ' + plan.athlete, plan.coach && 'Pelatih: ' + plan.coach, plan.target && 'Target: ' + plan.target, `${E.fmtLong(E.weekDate(plan, 0))} – ${E.fmtLong(endD)} · ${plan.weeks} minggu · ${plan.sessions} sesi/minggu`]
      .filter(Boolean).map(s => `<span>${esc(s)}</span>`).join('');
    $('#pwm').textContent = store.limits().watermark ? 'Dibuat dengan Coach Planner — versi Gratis' : '';
  };
  const segRow = (name, segs, rowKey, colorFn, cls = '') => {
    const st = E.segStarts(segs);
    return `<tr class="${cls}"><th class="lab" scope="row">${name}</th>${segs.map((g, i) => {
      const c = colorFn(g, i); return `<td class="seg ${c.dark ? 'dark' : ''}" colspan="${g.len}" style="background:${c.bg}" data-row="${rowKey}" data-i="${i}" title="${esc(g.label)} · minggu ${st[i] + 1}–${st[i] + g.len} (klik untuk mengubah)">${esc(g.len * 34 > 40 ? g.label : '')}</td>`;
    }).join('')}</tr>`;
  };
  const numRow = (name, cls, get, key, k) => `<tr class="${cls}"><th class="lab" scope="row">${name}</th>${Array.from({ length: plan.weeks }, (_, w) => `<td class="num"><input inputmode="numeric" aria-label="${esc(name.replace(/<[^>]+>/g, ''))} minggu ${w + 1}" data-key="${key}" data-w="${w}" ${k !== undefined ? `data-k="${k}"` : ''} value="${get(w)}"></td>`).join('')}</tr>`;
  const calcRow = (name, cls, get, id) => `<tr class="${cls}"><th class="lab" scope="row">${name}</th>${Array.from({ length: plan.weeks }, (_, w) => `<td data-calc="${id}" data-w="${w}">${get(w)}</td>`).join('')}</tr>`;
  const gap = () => `<tr class="gap"><td colspan="${plan.weeks + 1}"></td></tr>`;
  const SOFT = ['#d3f9d8', '#fff3bf', '#ffe8cc', '#d0ebff', '#e5dbff', '#c3fae8', '#ffdeeb'];
  const BIO = ['#00b050', '#74b816', '#f59f00', '#1c9fd6', '#845ef7', '#f06595'];

  const renderSheet = () => {
    const W = plan.weeks, months = E.monthSpans(plan);
    const nowW = Math.floor((Date.now() - E.parseDate(plan.start)) / (7 * 864e5));
    let h = `<table class="sheet"><thead>
      <tr><th class="lab">Bulan</th>${months.map((m, i) => `<th class="mon ${i % 2 ? 'alt' : ''}" colspan="${m.len}">${m.len > 1 ? m.name : m.name.slice(0, 3)}${m.len > 2 ? ' ' + String(m.year).slice(2) : ''}</th>`).join('')}</tr>
      <tr><th class="lab">Tanggal (Senin)</th>${Array.from({ length: W }, (_, w) => `<th class="wk">${E.weekDate(plan, w).getUTCDate()}</th>`).join('')}</tr>
      <tr><th class="lab">Minggu ke</th>${Array.from({ length: W }, (_, w) => `<th class="wk wno ${w === nowW ? 'today' : ''}" ${w === nowW ? 'title="Minggu ini"' : ''}>${w + 1}</th>`).join('')}</tr></thead><tbody>`;
    { let s = 0; h += `<tr class="tall"><th class="lab" scope="row">Periode latihan</th>${E.periodSpans(plan).map(p => { const r = `<td colspan="${p.len}" style="background:${E.PERIOD_COLORS[p.name]};color:#fff;font-weight:800;letter-spacing:.06em">${p.len > 1 ? p.name : ''}</td>`; s += p.len; return r; }).join('')}</tr>`; }
    h += segRow('Fase latihan', plan.phases, 'phases', g => ({ bg: E.phaseColor(g), dark: true }), 'tall');
    h += segRow('Mesosiklus', plan.meso, 'meso', (g, i) => ({ bg: i % 2 ? '#e2e8f0' : '#f1f5f9' }));
    h += `<tr><th class="lab" scope="row">Tes</th>${Array.from({ length: W }, (_, w) => { const on = plan.tests.includes(w); return `<td class="tog ${on ? 'on' : ''}" data-tog="tests" data-w="${w}" style="${on ? 'background:#ffd8a8' : ''}" title="Tes minggu ${w + 1}">${on ? 'T' : ''}</td>`; }).join('')}</tr>`;
    h += `<tr><th class="lab" scope="row">Training camp</th>${Array.from({ length: W }, (_, w) => { const on = plan.camps.includes(w); return `<td class="tog ${on ? 'on' : ''}" data-tog="camps" data-w="${w}" style="${on ? 'background:#d0bfff' : ''}" title="Training camp minggu ${w + 1}">${on ? 'TC' : ''}</td>`; }).join('')}</tr>`;
    h += gap();
    plan.bio.forEach((b, bi) => { h += segRow(esc(b.name), b.segs, 'bio:' + bi, (g, i) => i % 2 ? { bg: SOFT[(bi + i) % SOFT.length] } : { bg: BIO[bi % BIO.length], dark: true }, 'tall'); });
    h += gap();
    h += `<tr><th class="lab" scope="row">Pertandingan<small>klik untuk menambah</small></th>${Array.from({ length: W }, (_, w) => {
      const ev = plan.events.filter(e => e.week === w);
      return `<td class="ev" data-ev="${w}" title="Minggu ${w + 1}">${ev.length ? ev.map(e => `<span class="chip ${e.main ? 'main' : ''}" data-eid="${e.id}">${e.main ? '★ ' : ''}${esc(e.name)}</span>`).join('') : '<span class="add" aria-hidden="true">+</span>'}</td>`;
    }).join('')}</tr>`;
    h += segRow('Target jangka menengah', plan.targets, 'targets', (g, i) => ({ bg: SOFT[i % SOFT.length] }), 'tall');
    h += gap();
    h += numRow('Volume (%)', 'vol', w => plan.vol[w], 'vol');
    h += numRow('Intensitas (%)', 'int', w => plan.int[w], 'int');
    h += calcRow('Indeks puncak<small>1 rendah – 5 puncak</small>', '', w => E.peakIdx(plan, w), 'peak');
    h += `<tr class="sec"><td class="lab" colspan="1">Beban latihan</td><td colspan="${W}"></td></tr>`;
    h += `<tr class="sec"><td class="lab" style="background:#475569">Intensitas (1–5)</td><td colspan="${W}" style="background:#475569"></td></tr>`;
    plan.cats.forEach((c, k) => { h += numRow(`<small>Intensitas</small>${esc(c)}`, '', w => plan.ci[w][k], 'ci', k); });
    h += calcRow('Total intensitas', 'tot', w => E.sum(plan.ci[w]), 'ciT');
    h += `<tr class="sec"><td class="lab" style="background:#475569">Frekuensi (sesi)</td><td colspan="${W}" style="background:#475569"></td></tr>`;
    plan.cats.forEach((c, k) => { h += numRow(`<small>Frekuensi</small>${esc(c)}`, '', w => plan.freq[w][k], 'freq', k); });
    h += calcRow('Total frekuensi', 'tot', w => E.sum(plan.freq[w]), 'fT');
    h += calcRow('Beban latihan<small>intensitas × frekuensi</small>', 'load', w => E.weekLoad(plan, w), 'load');
    h += `</tbody></table>`;
    const sw = $('#sw'), sl = sw.scrollLeft, stp = sw.scrollTop; sw.innerHTML = h; sw.scrollLeft = sl; sw.scrollTop = stp;
  };
  const renderCalc = () => {
    $$('[data-calc]').forEach(td => {
      const w = +td.dataset.w;
      td.textContent = { peak: () => E.peakIdx(plan, w), ciT: () => E.sum(plan.ci[w]), fT: () => E.sum(plan.freq[w]), load: () => E.weekLoad(plan, w) }[td.dataset.calc]();
    });
  };
  let chartGeom;
  const renderChart = () => { const c = chartSVG(plan, { colW: 34, height: 280 }); chartGeom = c; $('#cb').innerHTML = c.svg; };
  let view = 'annual', selWeek = Math.max(0, Math.min(plan.weeks - 1, Math.floor((Date.now() - E.parseDate(plan.start)) / (7 * 864e5))));
  const renderAll = () => { renderHead(); renderSheet(); renderChart(); if (view !== 'annual') renderOther(); };

  // --- tab Bulanan / Mingguan / Harian (semua terhubung ke data Tahunan) ---
  const vo = $('#v-other');
  const phaseOf = w => plan.phases[E.segAt(plan.phases, w)];
  const mesoOf = w => plan.meso[E.segAt(plan.meso, w)];
  const weekOpts = sel => Array.from({ length: plan.weeks }, (_, w) => `<option value="${w}" ${w === sel ? 'selected' : ''}>Minggu ${w + 1} · ${E.fmtShort(E.weekDate(plan, w))} · ${esc(phaseOf(w).label)}</option>`).join('');
  const dayOpts = sel => DAYS.map(d => `<option ${d === sel ? 'selected' : ''}>${d}</option>`).join('');
  const cnsBadge = c => `<span class="cns cns-${(c || '').toLowerCase()}">${esc(c)}</span>`;
  const linkNote = t => `<p class="tip" style="margin:0 0 12px">🔗 ${t}</p>`;
  function renderOther() {
    if (view === 'bulanan') {
      const rows = E.monthRows(plan), G = plan.goals;
      vo.innerHTML = `<div class="panel"><div class="panel-head"><h2>Tujuan latihan tahunan</h2><span class="tip">Satu butir per baris. Dipakai di Excel semua sheet.</span></div>
        <div class="goals">${[['fisik', 'Persiapan fisik'], ['teknik', 'Persiapan teknik'], ['taktik', 'Persiapan taktik'], ['mental', 'Persiapan mental']].map(([k, l]) => `<label class="f"><span>${l}</span><textarea class="in" rows="6" data-p="goals.${k}" data-kind="lines">${esc(G[k].join('\n'))}</textarea></label>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><h2>Program bulanan (mesosiklus)</h2></div><div style="padding:12px 16px 0">${linkNote('Minggu, fase, mesosiklus, volume, intensitas, beban, tes, dan lomba diambil otomatis dari tab Tahunan. Kolom fokus diisi pelatih.')}</div>
        <div class="sheet-wrap"><table class="prog"><thead><tr><th>No</th><th>Bulan</th><th>Minggu</th><th>Fase</th><th>Vol</th><th>Int</th><th>Beban</th><th style="min-width:180px">Sub-fase / fokus utama</th><th style="min-width:220px">Fokus fisik & biomotor</th><th style="min-width:220px">Fokus teknik & taktik</th><th style="min-width:200px">Tes, lomba & agenda</th></tr></thead><tbody>
        ${rows.map(m => { const p = `monthNotes.${m.key}`; return `<tr><td>${m.no}</td><td><b>${m.name}</b><br><small>${m.year}</small></td><td>W${m.start + 1}–W${m.end + 1}<br><small>${m.meso.join(', ')}</small></td>
          <td><span class="ph" style="background:${E.phaseColor(plan.phases[E.segAt(plan.phases, m.start)])}">${esc(m.phase)}</span></td><td class="n">${m.vol}%</td><td class="n">${m.int}%</td><td class="n">${m.load}</td>
          <td><textarea class="in" rows="2" data-p="${p}.focus">${esc(m.note.focus || '')}</textarea></td><td><textarea class="in" rows="3" data-p="${p}.fisik">${esc(m.note.fisik || '')}</textarea></td><td><textarea class="in" rows="3" data-p="${p}.teknik">${esc(m.note.teknik || '')}</textarea></td>
          <td><small>${[m.tests.length ? 'Tes: W' + m.tests.join(', W') : '', m.camps.length ? 'TC: W' + m.camps.join(', W') : '', ...m.events.map(e => (e.main ? '★ ' : '● ') + e.name)].filter(Boolean).map(esc).join('<br>') || '—'}</small><textarea class="in" rows="2" placeholder="Agenda lain" data-p="${p}.agenda">${esc(m.note.agenda || '')}</textarea></td></tr>`; }).join('')}
        </tbody></table></div></div>`;
    } else if (view === 'mingguan') {
      const w = selWeek;
      vo.innerHTML = `<div class="panel"><div class="panel-head"><h2>Mikrosiklus standar (Senin–Minggu)</h2><label class="tip" style="display:flex;gap:8px;align-items:center">Pratinjau <select class="in" id="selw" style="min-height:36px;width:auto">${weekOpts(w)}</select></label></div>
        <div style="padding:12px 16px 0">${linkNote(`Intensitas hari = intensitas minggu dari tab Tahunan × intensitas relatif. Minggu ${w + 1}: intensitas ${plan.int[w]}%, volume ${plan.vol[w]}%, fase ${esc(phaseOf(w).label)}.`)}</div>
        <div class="sheet-wrap"><table class="prog"><thead><tr><th>Hari</th><th>Beban CNS</th><th style="min-width:260px">Fokus sesi</th><th style="min-width:200px">Komponen biomotor</th><th>Intensitas relatif</th><th>Target minggu ${w + 1}</th></tr></thead><tbody>
        ${plan.micro.map((d, i) => `<tr><td><b>${d.day}</b></td><td><select class="in" data-p="micro.${i}.cns" data-rerender>${CNS.map(c => `<option ${c === d.cns ? 'selected' : ''}>${c}</option>`).join('')}</select></td>
          <td><input class="in" data-p="micro.${i}.fokus" value="${esc(d.fokus)}"></td><td><input class="in" data-p="micro.${i}.komponen" value="${esc(d.komponen)}"></td>
          <td><input class="in n" type="number" min="0" max="120" data-p="micro.${i}.rel" data-kind="pct" value="${Math.round(d.rel * 100)}" style="width:90px"> %</td><td class="n" data-dayt="${i}"><b>${d.cns === 'REST' ? 'Istirahat' : Math.round(plan.int[w] * d.rel) + '%'}</b></td></tr>`).join('')}
        </tbody></table></div></div>
        <div class="panel"><div class="panel-head"><h2>Program mingguan (${plan.weeks} minggu)</h2><span class="tip">Diambil dari tab Tahunan — ubah di sana.</span></div><div class="sheet-wrap" style="max-height:60vh"><table class="prog"><thead><tr><th>Minggu</th><th>Tanggal</th><th>Fase</th><th>Meso</th><th>Vol</th><th>Int</th><th>Puncak</th><th>Sesi</th><th>Beban</th><th>Tes/TC</th><th>Lomba</th></tr></thead><tbody>
        ${Array.from({ length: plan.weeks }, (_, k) => `<tr class="${k === w ? 'sel' : ''}"><td class="n"><b>${k + 1}</b></td><td>${E.fmtShort(E.weekDate(plan, k))}</td><td><span class="ph" style="background:${E.phaseColor(phaseOf(k))}">${esc(phaseOf(k).label)}</span></td><td>${esc(mesoOf(k).label)}</td><td class="n">${plan.vol[k]}%</td><td class="n">${plan.int[k]}%</td><td class="n">${E.peakIdx(plan, k)}</td><td class="n">${E.sum(plan.freq[k])}</td><td class="n">${E.weekLoad(plan, k)}</td><td>${[plan.tests.includes(k) ? 'Tes' : '', plan.camps.includes(k) ? 'TC' : ''].filter(Boolean).join(', ')}</td><td>${plan.events.filter(e => e.week === k).map(e => (e.main ? '★ ' : '') + esc(e.name)).join(' / ')}</td></tr>`).join('')}
        </tbody></table></div></div>`;
    } else if (view === 'harian') {
      const w = selWeek, dm = Object.fromEntries(plan.micro.map(d => [d.day, d]));
      vo.innerHTML = `<div class="panel"><div class="panel-head"><h2>Program harian</h2><label class="tip" style="display:flex;gap:8px;align-items:center">Untuk <select class="in" id="selw" style="min-height:36px;width:auto">${weekOpts(w)}</select></label></div>
        <div style="padding:12px 16px">${linkNote(`Minggu ${w + 1} (${E.fmtLong(E.weekDate(plan, w))}) · ${esc(phaseOf(w).label)} · ${esc(mesoOf(w).label)} · volume ${plan.vol[w]}% · intensitas ${plan.int[w]}% — dari tab Tahunan. Target harian dari mikrosiklus (tab Mingguan).`)}
        <button class="btn btn-ghost btn-sm" id="adds">+ Tambah sesi</button></div></div>
        ${plan.daily.map((s, si) => { const d = dm[s.day]; const tgt = d ? (d.cns === 'REST' ? 'Istirahat' : Math.round(plan.int[w] * d.rel) + '%') : '—'; return `<div class="panel"><div class="panel-head" style="gap:8px">
          <input class="in" style="flex:1;min-width:200px;font-weight:700" data-p="daily.${si}.title" value="${esc(s.title)}" aria-label="Judul sesi">
          <select class="in" style="width:auto" data-p="daily.${si}.day" data-rerender aria-label="Hari">${dayOpts(s.day)}</select>
          <span class="tip">${d ? cnsBadge(d.cns) : ''} target intensitas <b>${tgt}</b></span>
          <button class="btn btn-danger btn-sm" data-dels="${si}">Hapus sesi</button></div>
          <div class="sheet-wrap"><table class="prog"><thead><tr><th>No</th><th style="min-width:150px">Fase sesi</th><th style="min-width:220px">Latihan / drill</th><th style="min-width:110px">Dosis</th><th>Int. %</th><th style="min-width:90px">Istirahat</th><th style="min-width:200px">Petunjuk / coaching cue</th><th></th></tr></thead><tbody>
          ${s.items.map((it, ii) => `<tr><td class="n">${ii + 1}</td>${['fase', 'latihan', 'dosis'].map(k => `<td><input class="in" data-p="daily.${si}.items.${ii}.${k}" value="${esc(it[k])}"></td>`).join('')}
            <td><input class="in n" type="number" min="0" max="110" data-p="daily.${si}.items.${ii}.int" data-kind="num" value="${it.int}" style="width:72px"></td>
            ${['rest', 'cue'].map(k => `<td><input class="in" data-p="daily.${si}.items.${ii}.${k}" value="${esc(it[k])}"></td>`).join('')}
            <td><button class="btn btn-ghost btn-icon" data-deli="${si}.${ii}" aria-label="Hapus baris">×</button></td></tr>`).join('')}
          </tbody></table></div><div style="padding:10px 16px"><button class="btn btn-ghost btn-sm" data-addi="${si}">+ Tambah baris</button></div></div>`; }).join('')}`;
    }
  }
  const setPath = (obj, path, val) => { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) o = (o[ks[i]] ??= {}); o[ks[ks.length - 1]] = val; };
  let otherSnap = false;
  vo.addEventListener('focusin', () => { otherSnap = false; });
  vo.addEventListener('input', e => {
    const t = e.target, p = t.dataset.p; if (!p) return;
    if (!otherSnap) { snapshot(); otherSnap = true; }
    let v = t.value; const k = t.dataset.kind;
    if (k === 'lines') v = v.split('\n').map(s => s.trim()).filter(Boolean);
    else if (k === 'pct') v = E.clamp(+v || 0, 0, 150) / 100;
    else if (k === 'num') v = E.clamp(+v || 0, 0, 120);
    setPath(plan, p, v); persist();
    if (k === 'pct') { const i = +p.split('.')[1]; const d = plan.micro[i]; const c = vo.querySelector(`[data-dayt="${i}"]`); if (c) c.innerHTML = `<b>${d.cns === 'REST' ? 'Istirahat' : Math.round(plan.int[selWeek] * d.rel) + '%'}</b>`; }
  });
  vo.addEventListener('change', e => { if (e.target.id === 'selw') { selWeek = +e.target.value; renderOther(); } else if (e.target.hasAttribute('data-rerender')) renderOther(); });
  vo.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'adds') change(() => plan.daily.push({ title: `Sesi ${plan.daily.length + 1}`, day: 'Senin', items: [{ fase: 'Pemanasan', latihan: '', dosis: '', int: 60, rest: '', cue: '' }] }));
    else if (b.dataset.addi) change(() => plan.daily[+b.dataset.addi].items.push({ fase: '', latihan: '', dosis: '', int: 80, rest: '', cue: '' }));
    else if (b.dataset.deli) { const [s, i] = b.dataset.deli.split('.').map(Number); change(() => plan.daily[s].items.splice(i, 1)); }
    else if (b.dataset.dels) { const s = +b.dataset.dels; confirmBox('Hapus sesi?', `“${plan.daily[s].title}” akan dihapus (bisa diurungkan).`, 'Hapus', true).then(ok => ok && change(() => plan.daily.splice(s, 1))); }
  });
  $$('[data-view]').forEach(b => b.onclick = () => {
    view = b.dataset.view; $$('[data-view]').forEach(x => x.setAttribute('aria-selected', x === b));
    $('#v-annual').hidden = view !== 'annual'; vo.hidden = view === 'annual'; if (view !== 'annual') renderOther();
  });
  renderAll();

  // --- interaksi tabel ---
  const sw = $('#sw');
  sw.addEventListener('click', e => {
    const seg = e.target.closest('td.seg'); if (seg) return editSeg(seg.dataset.row, +seg.dataset.i);
    const tog = e.target.closest('td.tog'); if (tog) { const k = tog.dataset.tog, w = +tog.dataset.w; return change(() => { const a = plan[k]; const i = a.indexOf(w); i >= 0 ? a.splice(i, 1) : a.push(w); }); }
    const chip = e.target.closest('.chip'); if (chip) return editEvent(plan.events.find(x => x.id === chip.dataset.eid));
    const ev = e.target.closest('td.ev'); if (ev) return editEvent(null, +ev.dataset.ev);
  });
  let numSnap = false;
  sw.addEventListener('focusin', e => { if (e.target.matches('td.num input')) { e.target.select(); numSnap = false; } });
  sw.addEventListener('input', e => {
    const t = e.target; if (!t.matches('td.num input')) return;
    if (!numSnap) { snapshot(); numSnap = true; }
    const w = +t.dataset.w, key = t.dataset.key, max = key === 'ci' ? 5 : key === 'freq' ? 14 : 100;
    let v = parseInt(t.value, 10); if (isNaN(v)) return; v = E.clamp(v, 0, max);
    if (key === 'vol' || key === 'int') plan[key][w] = v; else plan[key][w][+t.dataset.k] = v;
    renderCalc(); renderChart(); persist();
  });
  sw.addEventListener('change', e => { const t = e.target; if (t.matches('td.num input')) { numSnap = false; const w = +t.dataset.w, key = t.dataset.key; t.value = key === 'vol' || key === 'int' ? plan[key][w] : plan[key][w][+t.dataset.k]; } });
  sw.addEventListener('keydown', e => { // panah atas/bawah/kiri/kanan antar sel angka
    const t = e.target; if (!t.matches('td.num input')) return;
    const td = t.parentElement, tr = td.parentElement; const idx = [...tr.children].indexOf(td);
    let target;
    if (e.key === 'ArrowRight' && t.selectionStart === t.value.length) target = td.nextElementSibling;
    else if (e.key === 'ArrowLeft' && t.selectionStart === 0) target = td.previousElementSibling;
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { let r = tr.nextElementSibling; while (r && !r.children[idx]?.querySelector('input')) r = r.nextElementSibling; target = r?.children[idx]; }
    else if (e.key === 'ArrowUp') { let r = tr.previousElementSibling; while (r && !r.children[idx]?.querySelector('input')) r = r.previousElementSibling; target = r?.children[idx]; }
    const inp = target?.querySelector?.('input'); if (inp) { e.preventDefault(); inp.focus(); }
  });

  // --- grafik yang bisa diseret ---
  const cb = $('#cb');
  $$('[data-series]').forEach(b => b.onclick = () => { editSeries = b.dataset.series; $$('[data-series]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  let dragging = false;
  const setFromPointer = e => {
    const svg = cb.querySelector('svg'); const r = svg.getBoundingClientRect();
    const sx = chartGeom.w / r.width, sy = chartGeom.h / r.height;
    const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sy;
    const w = Math.floor((x - chartGeom.padL) / chartGeom.cw); if (w < 0 || w >= plan.weeks) return;
    const v = E.clamp(Math.round((1 - (y - chartGeom.padT) / chartGeom.ih) * 100), 5, 100);
    plan[editSeries][w] = v;
    const inp = sw.querySelector(`input[data-key="${editSeries}"][data-w="${w}"]`); if (inp) inp.value = v;
    renderCalc(); renderChart();
  };
  cb.addEventListener('pointerdown', e => { if (!e.target.closest('svg')) return; dragging = true; snapshot(); cb.setPointerCapture(e.pointerId); setFromPointer(e); });
  cb.addEventListener('pointermove', e => { if (dragging) setFromPointer(e); });
  const endDrag = () => { if (dragging) { dragging = false; persist(); } };
  cb.addEventListener('pointerup', endDrag); cb.addEventListener('pointercancel', endDrag);

  // --- toolbar ---
  $('#undo').onclick = () => { const s = hist.pop(); if (!s) return; plan = Object.assign(JSON.parse(s), { id }); persist(); renderAll(); $('#undo').disabled = !hist.length; };
  const onKey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.target.matches('input,textarea') && $('#drawer').hidden) { e.preventDefault(); $('#undo').click(); } };
  document.addEventListener('keydown', onKey);
  $('#auto').onclick = async () => { if (await confirmBox('Hitung ulang beban?', 'Volume, intensitas, dan frekuensi semua minggu dihitung ulang dari fase, mesosiklus, dan lomba. Perubahan manual pada angka akan tertimpa (bisa diurungkan).')) change(() => E.autoLoad(plan)); };
  $('#xlsx').onclick = async () => {
    const b = $('#xlsx'); b.disabled = true; b.textContent = 'Menyiapkan…';
    try { const { exportXlsx } = await import('./export.js'); await exportXlsx(plan, { watermark: store.limits().watermark }); toast(store.limits().watermark ? 'Excel terunduh (versi Gratis bertanda).' : 'Excel terunduh.'); }
    catch (e) { console.error(e); toast('Ekspor gagal: ' + e.message); }
    b.disabled = false; b.textContent = 'Ekspor Excel';
  };
  $('#print').onclick = () => window.print();
  const beforePrint = () => { const t = sw.querySelector('table'); const z = Math.min(1, 1080 / (t?.scrollWidth || 1080)); $$('.print-zoom').forEach(el => el.style.setProperty('--pz', z.toFixed(3))); };
  window.addEventListener('beforeprint', beforePrint);
  $('#info').onclick = editInfo;
  const onLeave = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', onLeave);
  cleanup = () => { document.removeEventListener('keydown', onKey); window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('beforeunload', onLeave); if (dirty) { clearTimeout(saveT); store.save(plan).catch(console.error); } };

  // --- editor segmen ---
  function rowSegs(key) { if (key.startsWith('bio:')) return plan.bio[+key.slice(4)].segs; return plan[key]; }
  function rowName(key) { return key.startsWith('bio:') ? plan.bio[+key.slice(4)].name : { phases: 'Fase latihan', meso: 'Mesosiklus', targets: 'Target jangka menengah' }[key]; }
  function editSeg(key, i) {
    const segs = rowSegs(key), g = segs[i], st = E.segStarts(segs)[i];
    const isPhase = key === 'phases';
    drawer(`<h2>${esc(rowName(key))}<button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">×</button></h2>
      <p class="muted small">Blok ${i + 1} dari ${segs.length} · minggu ${st + 1}–${st + g.len} (${E.fmtShort(E.weekDate(plan, st))} – ${E.fmtShort(E.addDays(E.weekDate(plan, st + g.len - 1), 6))})</p>
      ${isPhase ? `<label class="f"><span>Jenis fase</span><select class="in" id="pk">${E.PHASE_ORDER.map(k => `<option value="${k}" ${g.key === k ? 'selected' : ''}>${E.PHASES[k].label} (${E.PHASES[k].period})</option>`).join('')}</select></label>` : ''}
      <label class="f"><span>Nama / isi blok</span><input class="in" id="lb" value="${esc(g.label)}"></label>
      <label class="f"><span>Panjang (minggu)</span><span class="stepper"><button class="btn btn-ghost btn-icon" id="mn" aria-label="Kurangi">−</button><input class="in" id="ln" type="number" min="1" value="${g.len}"><button class="btn btn-ghost btn-icon" id="pl" aria-label="Tambah">+</button></span>
        <span class="hint">${i < segs.length - 1 ? 'Blok sesudahnya' : 'Blok sebelumnya'} ikut memendek/memanjang.</span></label>
      <div class="acts"><button class="btn btn-ghost btn-sm" id="sp" ${g.len < 2 ? 'disabled' : ''}>Bagi dua</button><button class="btn btn-ghost btn-sm" id="mg" ${i >= segs.length - 1 ? 'disabled' : ''}>Gabung dengan berikutnya</button>
        ${key === 'phases' ? '' : `<button class="btn btn-ghost btn-sm" id="cp">Samakan dengan fase</button>`}</div>
      <div class="acts" style="margin-top:22px"><button class="btn btn-primary" id="ok" style="flex:1">Simpan</button></div>`,
      (d, close) => {
        const ln = $('#ln', d);
        $('#mn', d).onclick = () => ln.value = Math.max(1, +ln.value - 1);
        $('#pl', d).onclick = () => ln.value = +ln.value + 1;
        if (isPhase) $('#pk', d).onchange = e => { const k = e.target.value; if (Object.values(E.PHASES).some(p => p.label === $('#lb', d).value) || !$('#lb', d).value) $('#lb', d).value = E.PHASES[k].label; };
        $('#ok', d).onclick = () => {
          const nl = +ln.value, lb = $('#lb', d).value.trim() || g.label, nk = isPhase ? $('#pk', d).value : null;
          if (nl !== g.len) { const test = JSON.parse(JSON.stringify(segs)); if (!E.setSegLen(test, i, nl)) { toast('Panjang tidak muat: blok di sebelahnya minimal 1 minggu.'); return; } }
          change(() => { g.label = lb; if (nk) { g.key = nk; delete g.color; } if (nl !== g.len) { E.setSegLen(segs, i, nl); if (isPhase) E.syncToPhases(plan); } if (key === 'meso') relabelMeso(); }, { structural: (isPhase && nl !== g.len) || key === 'meso' || !!nk });
          close();
        };
        const n0 = plan.phases.length;
        $('#sp', d).onclick = () => { change(() => { E.splitSeg(segs, i, Math.ceil(g.len / 2)); if (isPhase) E.syncToPhases(plan, n0); if (key === 'meso') relabelMeso(); }, { structural: isPhase || key === 'meso' }); close(); };
        $('#mg', d).onclick = () => { change(() => { E.mergeNext(segs, i); if (isPhase) E.syncToPhases(plan, n0); if (key === 'meso') relabelMeso(); }, { structural: isPhase || key === 'meso' }); close(); };
        $('#cp', d) && ($('#cp', d).onclick = () => { // salin batas fase ke baris ini
          change(() => { const labels = segs.map(s => s.label); const nw = plan.phases.map((p, j) => ({ label: labels[j] ?? p.label, len: p.len })); segs.splice(0, segs.length, ...nw); if (key === 'meso') relabelMeso(); }); close();
        });
      });
  }
  function relabelMeso() { plan.meso.forEach((m, i) => { if (/^Meso \d+$/.test(m.label)) m.label = `Meso ${i + 1}`; }); }

  // --- editor lomba ---
  function editEvent(ev, week) {
    const isNew = !ev; ev = ev ? { ...ev } : { id: E.rid(), week, name: '', place: '', main: false };
    const opts = () => Array.from({ length: plan.weeks }, (_, w) => `<option value="${w}" ${w === ev.week ? 'selected' : ''}>Minggu ${w + 1} · ${E.fmtShort(E.weekDate(plan, w))}</option>`).join('');
    drawer(`<h2>${isNew ? 'Tambah lomba' : 'Ubah lomba'}<button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">×</button></h2>
      <label class="f"><span>Nama lomba</span><input class="in" id="nm" value="${esc(ev.name)}" placeholder="mis. Kejurkot, Uji coba"></label>
      <label class="f"><span>Tempat</span><input class="in" id="pl" value="${esc(ev.place)}"></label>
      <label class="f"><span>Minggu</span><span class="stepper" style="width:100%"><button class="btn btn-ghost btn-icon" id="lf" aria-label="Geser ke minggu sebelumnya">◀</button><select class="in" id="wk">${opts()}</select><button class="btn btn-ghost btn-icon" id="rt" aria-label="Geser ke minggu berikutnya">▶</button></span></label>
      <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="mn" ${ev.main ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--brand)"> <span style="margin:0">★ Lomba utama (target puncak)</span></label>
      <label class="f" style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="rl" ${isNew ? '' : 'checked'} style="width:20px;height:20px;accent-color:var(--brand)"> <span style="margin:0">Sesuaikan beban otomatis di sekitar lomba</span></label>
      <div class="acts" style="margin-top:18px"><button class="btn btn-primary" id="ok" style="flex:1">Simpan</button>${isNew ? '' : '<button class="btn btn-danger" id="del">Hapus</button>'}</div>`,
      (d, close) => {
        const wk = $('#wk', d);
        $('#lf', d).onclick = () => { wk.value = Math.max(0, +wk.value - 1); };
        $('#rt', d).onclick = () => { wk.value = Math.min(plan.weeks - 1, +wk.value + 1); };
        $('#ok', d).onclick = () => {
          const nm = $('#nm', d).value.trim(); if (!nm) { toast('Isi nama lomba.'); return; }
          const nw = +wk.value, main = $('#mn', d).checked, rl = $('#rl', d).checked;
          change(() => {
            if (main) plan.events.forEach(x => { if (x.id !== ev.id) x.main = false; });
            const upd = { ...ev, name: nm, place: $('#pl', d).value.trim(), week: nw, main };
            const i = plan.events.findIndex(x => x.id === ev.id); if (i >= 0) plan.events[i] = upd; else plan.events.push(upd);
            if (main && plan.events.filter(x => x.main).length === 1 && i >= 0 && nw !== ev.week) { /* lomba utama digeser */ }
            if (rl) E.autoLoad(plan);
          });
          close(); if (main && !rl) toast('Lomba utama dipindah. Fase tidak berubah otomatis — atur di baris Fase bila perlu.');
        };
        $('#del', d) && ($('#del', d).onclick = () => { change(() => { plan.events = plan.events.filter(x => x.id !== ev.id); }); close(); });
      });
  }

  // --- info rencana & label ---
  function editInfo() {
    drawer(`<h2>Info rencana<button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">×</button></h2>
      <label class="f"><span>Judul</span><input class="in" name="title" value="${esc(plan.title)}"></label>
      <label class="f"><span>Cabang olahraga / nomor</span><input class="in" name="sportName" value="${esc(plan.sportName)}"></label>
      <div class="row"><label class="f"><span>Atlet / tim</span><input class="in" name="athlete" value="${esc(plan.athlete)}"></label><label class="f"><span>Pelatih</span><input class="in" name="coach" value="${esc(plan.coach)}"></label></div>
      <label class="f"><span>Target prestasi</span><input class="in" name="target" value="${esc(plan.target)}"></label>
      <label class="f"><span>Target jangka panjang</span><textarea class="in" name="longTarget">${esc(plan.longTarget)}</textarea></label>
      <div class="row"><label class="f"><span>Sesi / minggu</span><input class="in" type="number" min="1" max="21" name="sessions" value="${plan.sessions}"></label><label class="f"><span>Jumlah minggu</span><input class="in" type="number" min="4" max="104" name="weeks" value="${plan.weeks}"></label></div>
      <label class="f"><span>Tanggal mulai (Senin)</span><input class="in" type="date" name="start" value="${plan.start}"><span class="hint">Menggeser seluruh kalender; struktur minggu tetap.</span></label>
      <h3 style="margin-top:8px">Norma / data tes awal</h3>
      <div id="norms">${plan.norms.map((n, i) => `<div class="row" style="grid-template-columns:1.4fr .8fr .8fr;margin-bottom:6px"><input class="in" data-n="${i}" data-k="name" value="${esc(n.name)}" placeholder="Komponen" aria-label="Komponen tes ${i + 1}"><input class="in" data-n="${i}" data-k="value" value="${esc(n.value)}" placeholder="Nilai" aria-label="Nilai"><input class="in" data-n="${i}" data-k="unit" value="${esc(n.unit)}" placeholder="Satuan" aria-label="Satuan"></div>`).join('')}</div>
      <button class="btn btn-ghost btn-sm" id="an">+ Tambah norma</button>
      <h3 style="margin-top:18px">Kategori beban latihan</h3>
      <div class="row" style="grid-template-columns:repeat(3,1fr)">${plan.cats.map((c, i) => `<input class="in" data-cat="${i}" value="${esc(c)}" aria-label="Kategori ${i + 1}">`).join('')}</div>
      <h3 style="margin-top:18px">Baris komponen biomotor</h3>
      <div id="bios">${plan.bio.map((b, i) => `<div style="display:flex;gap:6px;margin-bottom:6px"><input class="in" data-bio="${i}" value="${esc(b.name)}" aria-label="Nama baris ${i + 1}"><button class="btn btn-ghost btn-icon" data-rmbio="${i}" aria-label="Hapus baris">×</button></div>`).join('')}</div>
      <button class="btn btn-ghost btn-sm" id="ab">+ Tambah baris</button>
      <div class="acts" style="margin-top:22px"><button class="btn btn-primary" id="ok" style="flex:1">Simpan</button></div>`,
      (d, close) => {
        const tmp = { norms: plan.norms.map(n => ({ ...n })), bio: plan.bio.map(b => b.name), rm: new Set() };
        $('#an', d).onclick = () => { tmp.norms.push({ name: '', value: '', unit: '' }); const i = tmp.norms.length - 1; $('#norms', d).insertAdjacentHTML('beforeend', `<div class="row" style="grid-template-columns:1.4fr .8fr .8fr;margin-bottom:6px"><input class="in" data-n="${i}" data-k="name" placeholder="Komponen"><input class="in" data-n="${i}" data-k="value" placeholder="Nilai"><input class="in" data-n="${i}" data-k="unit" placeholder="Satuan"></div>`); };
        $('#ab', d).onclick = () => { tmp.bio.push('Latihan baru'); const i = tmp.bio.length - 1; $('#bios', d).insertAdjacentHTML('beforeend', `<div style="display:flex;gap:6px;margin-bottom:6px"><input class="in" data-bio="${i}" value="Latihan baru"><button class="btn btn-ghost btn-icon" data-rmbio="${i}" aria-label="Hapus baris">×</button></div>`); };
        d.addEventListener('click', e => { const b = e.target.closest('[data-rmbio]'); if (b) { tmp.rm.add(+b.dataset.rmbio); b.parentElement.remove(); } });
        $('#ok', d).onclick = () => {
          const v = n => $(`[name=${n}]`, d).value;
          change(() => {
            ['title', 'sportName', 'athlete', 'coach', 'target', 'longTarget'].forEach(k => plan[k] = v(k).trim());
            plan.sessions = E.clamp(+v('sessions') || plan.sessions, 1, 21);
            if (v('start') && v('start') !== plan.start) plan.start = E.fmtISO(E.mondayOf(E.parseDate(v('start'))));
            $$('[data-n]', d).forEach(inp => { tmp.norms[+inp.dataset.n][inp.dataset.k] = inp.value; }); plan.norms = tmp.norms.filter(n => n.name || n.value);
            $$('[data-cat]', d).forEach(inp => plan.cats[+inp.dataset.cat] = inp.value.trim() || plan.cats[+inp.dataset.cat]);
            $$('[data-bio]', d).forEach(inp => tmp.bio[+inp.dataset.bio] = inp.value.trim() || tmp.bio[+inp.dataset.bio]);
            const nb = []; tmp.bio.forEach((name, i) => { if (tmp.rm.has(i)) return; const old = plan.bio[i]; nb.push(old ? { ...old, name } : { name, segs: plan.phases.map(p => ({ label: '', len: p.len })) }); });
            plan.bio = nb;
            const nw = +v('weeks'); if (nw && nw !== plan.weeks) E.resizeWeeks(plan, nw);
          });
          close(); toast('Info rencana disimpan');
        };
      });
  }
}

// ---------- admin ----------
async function admin() {
  if (needLogin()) return;
  if (!store.user.admin) {
    app.innerHTML = `<div class="page"><div class="wrap card empty" style="max-width:520px"><h2>Khusus admin</h2><p class="muted">Anda sedang masuk sebagai <b>${esc(store.user.email || store.user.name)}</b>, yang bukan akun admin. Keluar lalu masuk lagi dengan akun Google admin.</p><div class="toolbar" style="justify-content:center"><button class="btn btn-primary" id="sw">Masuk dengan akun lain</button><a class="btn btn-ghost" href="#/dasbor">Kembali</a></div></div></div>`;
    $('#sw').onclick = async () => { await store.signOut(); sessionStorage.setItem('cp.next', '#/admin'); location.hash = '#/masuk'; };
    return;
  }
  app.innerHTML = `<div class="page"><div class="wrap"><div class="page-head"><div><span class="eyebrow">Admin</span><h1>Pengguna & aktivasi Pro</h1></div><input class="in" id="q" placeholder="Cari email / ID" style="max-width:280px"></div><div class="card" style="overflow-x:auto" id="ul">Memuat…</div></div></div>`;
  let users = [];
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    $('#ul').innerHTML = `<p class="small muted" style="margin:0 0 8px">${users.length} pengguna · ${users.filter(x => x.tier === 'pro').length} Pro</p><table class="admin"><tr><th>Pengguna</th><th>Paket</th><th>Aksi</th></tr>${users.filter(u => !q || (u.email || '').toLowerCase().includes(q) || u.uid.toLowerCase().includes(q)).map(u => `<tr><td><b>${esc(u.name || '')}</b><br><span class="small muted">${esc(u.email || '')}<br><code>${esc(u.uid)}</code></span></td>
      <td data-l="Paket"><span class="badge ${u.tier === 'pro' ? 'pro' : ''}">${u.tier === 'pro' ? 'PRO' : 'Gratis'}</span>${u.proUntil ? `<div class="small muted">s.d. ${E.fmtLong(new Date(u.proUntil))}</div>` : ''}</td>
      <td data-l="Aksi"><div class="toolbar"><button class="btn btn-ghost btn-sm" data-pro="${u.uid}" data-m="1">Pro 1 bln</button><button class="btn btn-ghost btn-sm" data-pro="${u.uid}" data-m="12">Pro 12 bln</button><button class="btn btn-danger btn-sm" data-pro="${u.uid}" data-m="0">Gratis</button></div></td></tr>`).join('')}</table>`;
  };
  try { users = await store.adminUsers(); draw(); } catch (e) { $('#ul').textContent = 'Gagal memuat: ' + e.message; return; }
  $('#q').oninput = draw;
  $('#ul').addEventListener('click', async e => {
    const b = e.target.closest('[data-pro]'); if (!b) return; const m = +b.dataset.m;
    if (!await confirmBox('Ubah paket?', m ? `Aktifkan Pro ${m} bulan untuk akun ini?` : 'Kembalikan akun ini ke paket Gratis?')) return;
    try { await store.adminSetPro(b.dataset.pro, m); toast('Paket diperbarui'); users = await store.adminUsers(); draw(); } catch (err) { toast('Gagal: ' + err.message); }
  });
}

// ---------- mulai ----------
store.onUser(() => renderNav());
window.addEventListener('cp-auth-error', e => toast('Gagal masuk: ' + (e.detail?.code || e.detail?.message || 'coba lagi')));
window.addEventListener('hashchange', route);
store.init().then(route).catch(e => { console.error(e); app.innerHTML = `<div class="page"><div class="wrap card"><h2>Gagal memuat aplikasi</h2><p class="muted">${esc(e.message)}</p></div></div>`; });
