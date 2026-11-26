"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatJakartaDateTime } from "@/lib/date";

interface OptionItem {
  id: string;
  name: string;
}

interface TransactionItem {
  id: string;
  amount: number;
  type: "expense" | "income";
  occurredAt: string;
  merchant: string | null;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  accountId: string | null;
  accountName: string | null;
  source: "manual" | "chat" | "receipt";
}

export function TransactionsList() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<OptionItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(
    async (filters: {
      from: string;
      to: string;
      categoryId: string;
      accountId: string;
    }) => {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.accountId) params.set("accountId", filters.accountId);

      const query = params.toString();
      const res = await fetch(`/api/transactions${query ? `?${query}` : ""}`);
      const data = (await res.json()) as {
        transactions?: TransactionItem[];
        error?: string;
      };
      if (!res.ok || !data.transactions) {
        throw new Error(data.error ?? "Gagal memuat daftar transaksi.");
      }
      return data.transactions;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      try {
        const [txList, accRes, catRes] = await Promise.all([
          fetchTransactions({ from: "", to: "", categoryId: "", accountId: "" }),
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);
        if (cancelled) return;
        setItems(txList);
        if (accRes.ok && catRes.ok) {
          const accData = (await accRes.json()) as { accounts: OptionItem[] };
          const catData = (await catRes.json()) as { categories: OptionItem[] };
          if (!cancelled) {
            setAccounts(accData.accounts);
            setCategories(catData.categories);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [fetchTransactions]);

  async function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const txList = await fetchTransactions({
        from,
        to,
        categoryId,
        accountId,
      });
      setItems(txList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setFrom("");
    setTo("");
    setCategoryId("");
    setAccountId("");
    setError(null);
    setLoading(true);
    try {
      const txList = await fetchTransactions({
        from: "",
        to: "",
        categoryId: "",
        accountId: "",
      });
      setItems(txList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Daftar Transaksi
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Filter berdasarkan tanggal (WIB), kategori, dan sumber dana.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/transactions/new"
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Tambah Transaksi
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
        onSubmit={handleFilterSubmit}
        className="mb-6 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Dari
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Sampai
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Kategori
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Semua</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Sumber Dana
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Semua</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Memuat transaksi...</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Belum ada transaksi yang sesuai filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {tx.merchant || tx.note || "Transaksi"}
                    </span>
                    {tx.categoryName ? (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {tx.categoryName}
                      </span>
                    ) : null}
                    {tx.accountName ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {tx.accountName}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatJakartaDateTime(tx.occurredAt)} WIB
                    {tx.merchant && tx.note ? ` · ${tx.note}` : ""}
                  </p>
                </div>
                <span
                  className={`text-base font-semibold ${
                    tx.type === "income"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-900 dark:text-zinc-50"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}Rp
                  {tx.amount.toLocaleString("id-ID")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
