import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Asisten Keuangan Pribadi
        </span>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Catatku</h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
          Catat pengeluaran lewat chat santai atau foto struk, periksa draft
          sebelum disimpan, pantau ringkasan bulanan, dan tanya jawab atas data
          keuanganmu sendiri.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Chat &amp; Struk</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Ubah teks atau foto struk menjadi draft transaksi terstruktur.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Ringkasan Bulanan</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Lihat total per kategori dan sumber dana secara langsung.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold">Tanya Jawab Data</h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Angka dihitung dari database, bukan ditebak oleh AI.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
          <span className="text-zinc-500 dark:text-zinc-400">
            Status sistem tersedia melalui endpoint kesehatan.
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/transactions/new"
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              Tambah Transaksi
            </Link>
            <Link
              href="/settings"
              className="rounded-lg border border-zinc-300 px-3.5 py-1.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Sumber Dana &amp; Kategori
            </Link>
            <Link
              href="/api/health"
              className="rounded-lg border border-zinc-300 px-3.5 py-1.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cek /api/health
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
