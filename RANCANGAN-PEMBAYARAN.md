# Rancangan pembayaran Coach Planner (belum disambungkan)

Status saat ini (v1): **manual**. Tombol "Upgrade ke Pro" membuka WhatsApp admin (nomor di `config.js` → `waAdmin`)
berisi paket dan ID akun. Setelah transfer/QRIS diterima, admin membuka `#/admin` lalu menekan "Pro 1 bln" / "Pro 12 bln".
Aturan Firestore memastikan pengguna tidak bisa mengubah paketnya sendiri.

## Paket
| Paket | Harga | Batas |
|---|---|---|
| Gratis | Rp0 | 1 rencana, ekspor Excel/PDF bertanda "versi Gratis", tanpa duplikat |
| Pro bulanan | Rp49.000 | rencana tanpa batas, ekspor bersih, duplikat |
| Pro tahunan | Rp399.000 | sama, hemat ±32% |

Harga & batas diubah di `config.js` (`price`, `freePlans`).

## Tahap 2: pembayaran otomatis (perlu persetujuan pemilik sebelum disambungkan)
Pilihan gateway Indonesia: **Midtrans Snap** atau **Xendit Invoice** (QRIS, VA bank, e-wallet).
Butuh server kecil untuk menyimpan kunci rahasia — jangan pernah di kode web.

Alur:
1. Web memanggil fungsi server `createCheckout({ plan: 'month'|'year' })` dengan token login Firebase.
2. Server (Vercel Function / Firebase Cloud Function) memverifikasi token, membuat transaksi di gateway
   (`order_id = uid + timestamp`, nominal dari daftar harga di server), menyimpan `payments/{orderId}` = `pending`,
   lalu mengembalikan URL pembayaran / Snap token.
3. Pengguna membayar di halaman gateway.
4. Gateway memanggil **webhook** server → server memverifikasi tanda tangan (signature key Midtrans / callback token Xendit),
   mengecek nominal, lalu menulis `users/{uid}.tier = 'pro'`, `proUntil = sekarang + 1/12 bulan` (Admin SDK, melewati aturan).
5. Web membaca ulang profil → status Pro aktif.

Data yang perlu disiapkan pemilik: akun merchant (KTP/NPWP, rekening), kunci server sandbox & produksi,
URL webhook. Pengujian wajib memakai mode sandbox dulu.

## Penegakan batas
- v1: batas rencana dicek di aplikasi (klien). Pengguna teknis secara teori bisa melewatinya lewat API.
- Tahap 2: pindahkan pembuatan rencana ke fungsi server, atau tambahkan penghitung `planCount` di profil yang
  diperbarui dengan transaksi + aturan `planCount < 1 || tier == 'pro'`.
