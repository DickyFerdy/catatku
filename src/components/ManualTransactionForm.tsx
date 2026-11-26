"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { nowJakartaDateTimeInput } from "@/lib/date";

interface OptionItem {
  id: string;
  name: string;
}

export function ManualTransactionForm() {
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amountInput, setAmountInput] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);
        if (cancelled) return;
        setOccurredAt((prev) => prev || nowJakartaDateTimeInput());
        if (!accRes.ok || !catRes.ok) return;
        const accData = (await accRes.json()) as { accounts: OptionItem[] };
        const catData = (await catRes.json()) as { categories: OptionItem[] };
        if (cancelled) return;
        setAccounts(accData.accounts);
        setCategories(catData.categories);
      } catch {
        if (!cancelled) {
          setOccurredAt((prev) => prev || nowJakartaDateTimeInput());
        }
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d+$/.test(amountInput.trim())) {
      setError("Nominal harus berupa bilangan bulat rupiah tanpa desimal.");
      return;
    }

    const amount = Number.parseInt(amountInput.trim(), 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount,
          occurredAt,
          categoryId: categoryId || null,
          accountId: accountId || null,
          merchant: merchant.trim() || null,
          note: note.trim() || null,
          source: "manual",
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan transaksi.");
        return;
      }

      setSuccess(
        `Transaksi Rp${amount.toLocaleString("id-ID")} berhasil disimpan.`
      );
      setAmountInput("");
      setMerchant("");
      setNote("");
      setOccurredAt(nowJakartaDateTimeInput());
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Tambah Transaksi Manual
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Masukkan nominal dalam bilangan bulat rupiah (tanpa titik/koma).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/transactions"
            className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Daftar Transaksi
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Kembali
          </Link>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "expense"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              type === "income"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            Pemasukan
          </button>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Nominal (Rp)
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            step={1}
            min={1}
            required
            placeholder="35000"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div>
          <label
            htmlFor="occurredAt"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Tanggal &amp; Waktu (WIB)
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            required
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="categoryId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Kategori
            </label>
            <select
              id="categoryId"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">-- Pilih kategori --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="accountId"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Sumber Dana
            </label>
            <select
              id="accountId"
              name="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">-- Pilih sumber dana --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="merchant"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Toko / Tempat (opsional)
          </label>
          <input
            id="merchant"
            name="merchant"
            type="text"
            placeholder="Mis. Warteg Bahari"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        <div>
          <label
            htmlFor="note"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Catatan (opsional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            placeholder="Mis. makan siang bersama tim"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
      </form>
    </main>
  );
}
