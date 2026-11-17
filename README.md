# Chi Nho Nha Coffee — Deploy ke Netlify

## Isi folder
- `index.html` — website (sudah termasuk dashboard admin)
- `netlify/functions/api.mjs` — server kecil (login PIN + penyimpanan data)
- `netlify.toml`, `package.json` — konfigurasi

## Langkah deploy
1. Upload folder ini ke repositori GitHub (private juga boleh).
2. Netlify → **Add new site → Import from Git** → pilih repositori. Biarkan pengaturan build default.
3. Netlify → **Site configuration → Environment variables**, tambahkan:
   - `ADMIN_PIN` = `5546`  (PIN admin, 4 angka; ganti kapan saja lalu deploy ulang)
   - `SESSION_SECRET` = teks acak panjang apa saja (mis. 40 karakter)
4. Deploy ulang. Selesai.

> Catatan: deploy dengan drag-and-drop folder saja tidak menjalankan function. Gunakan Git atau Netlify CLI (`netlify deploy --prod`).

## Cara membuka dashboard admin
- Klik logo kecil di pojok footer, atau tekan `Ctrl + Shift + A`, lalu masukkan PIN.
- PIN dicek di server. 5 kali salah → dikunci sebentar. Sesi berakhir otomatis setelah 15 menit.

## Apa yang tersimpan di server (terlihat oleh semua pengunjung)
Community Voice, Customer Reviews, harga/status produk (tampil/habis), pengumuman, nomor WhatsApp.
Ulasan dari pengunjung masuk ke antrean "Menunggu persetujuan" dan hanya tampil setelah Anda setujui.
