# Catatku

> Asisten keuangan pribadi: ketik atau potret struk, AI menyusun catatannya, kamu tinggal mengecek.

**Demo:** _GIF / video singkat_

## Masalah yang diselesaikan

Mencatat pengeluaran itu membosankan, jadi sering ditinggalkan. Catatku mengurangi usahanya menjadi satu kalimat atau satu foto, tanpa mengorbankan akurasi: setiap hasil AI adalah draft yang kamu cek dan koreksi sebelum disimpan.

## Fitur

- Catat lewat chat teks ("makan siang 35rb pakai GoPay")
- Catat lewat foto struk
- Draft → koreksi → simpan (AI tidak menyimpan sendiri)
- Ringkasan bulanan per kategori dan sumber dana
- Tanya jawab atas datamu ("berapa pengeluaran makan bulan ini?")
- Ekspor CSV
- Login dan isolasi data per pengguna

_Tambahkan screenshot / GIF di sini._

## Arsitektur

_Tempel diagram dari `ARCHITECTURE.md`._

Satu aplikasi Next.js + SQLite + Gemini API. Output AI divalidasi dengan Zod; angka pada tanya jawab dihitung lewat function calling ke query terparameter, bukan oleh LLM.

## Hasil evaluasi

_Ringkas tabel dari `EVAL.md`: akurasi nominal, tanggal, kategori, total struk, tingkat koreksi pengguna, latency, biaya._

## Keputusan desain penting

_Pilih 3-4 dari `DECISIONS.md`, misalnya: strategi struk A vs B dengan angkanya, function calling vs text-to-SQL, nominal sebagai integer._

## Menjalankan secara lokal

```bash
cp .env.example .env     # isi GEMINI_API_KEY dan SESSION_SECRET
npm install
npm run db:migrate
npm run dev
```

## Stack

Next.js · TypeScript · Tailwind · SQLite (Drizzle) · Zod · Gemini API

## Privasi

Data tersimpan lokal. Teks transaksi dan foto struk dikirim ke Gemini API untuk diproses; gambar struk tidak disimpan secara default. Lihat `DECISIONS.md` (D-010).

## Keterbatasan

_Contoh: struk pudar atau tulisan tangan bisa salah dibaca; kategori otomatis bisa meleset._

## Rencana ke depan

Impor mutasi CSV, anggaran per kategori, transaksi berulang, PWA.
