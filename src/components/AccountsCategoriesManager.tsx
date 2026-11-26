"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AccountType = "cash" | "ewallet" | "bank" | "other";

interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
}

interface CategoryItem {
  id: string;
  name: string;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Tunai",
  ewallet: "E-Wallet",
  bank: "Bank",
  other: "Lainnya",
};

export function AccountsCategoriesManager() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<AccountType>("ewallet");
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [editAccName, setEditAccName] = useState("");
  const [editAccType, setEditAccType] = useState<AccountType>("cash");

  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      try {
        const [accRes, catRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/categories"),
        ]);
        if (cancelled) return;
        if (!accRes.ok || !catRes.ok) {
          setError("Gagal memuat sumber dana dan kategori.");
          return;
        }
        const accData = (await accRes.json()) as { accounts: AccountItem[] };
        const catData = (await catRes.json()) as { categories: CategoryItem[] };
        if (cancelled) return;
        setAccounts(accData.accounts);
        setCategories(catData.categories);
      } catch {
        if (!cancelled) {
          setError("Gagal terhubung ke server.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAccName, type: newAccType }),
    });
    const data = (await res.json()) as { account?: AccountItem; error?: string };
    if (!res.ok || !data.account) {
      setError(data.error ?? "Gagal menambah sumber dana.");
      return;
    }
    setAccounts((prev) =>
      [...prev, data.account!].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewAccName("");
  }

  async function handleSaveAccount(id: string) {
    setError(null);
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editAccName, type: editAccType }),
    });
    const data = (await res.json()) as { account?: AccountItem; error?: string };
    if (!res.ok || !data.account) {
      setError(data.error ?? "Gagal mengubah sumber dana.");
      return;
    }
    setAccounts((prev) =>
      prev
        .map((a) => (a.id === id ? data.account! : a))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingAccId(null);
  }

  async function handleDeleteAccount(id: string) {
    setError(null);
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Gagal menghapus sumber dana.");
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    });
    const data = (await res.json()) as {
      category?: CategoryItem;
      error?: string;
    };
    if (!res.ok || !data.category) {
      setError(data.error ?? "Gagal menambah kategori.");
      return;
    }
    setCategories((prev) =>
      [...prev, data.category!].sort((a, b) => a.name.localeCompare(b.name))
    );
    setNewCatName("");
  }

  async function handleSaveCategory(id: string) {
    setError(null);
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName }),
    });
    const data = (await res.json()) as {
      category?: CategoryItem;
      error?: string;
    };
    if (!res.ok || !data.category) {
      setError(data.error ?? "Gagal mengubah kategori.");
      return;
    }
    setCategories((prev) =>
      prev
        .map((c) => (c.id === id ? data.category! : c))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setEditingCatId(null);
  }

  async function handleDeleteCategory(id: string) {
    setError(null);
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Gagal menghapus kategori.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Sumber Dana &amp; Kategori
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Kelola daftar sumber dana dan kategori untuk transaksi Anda.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Kembali
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Memuat data...</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Sumber Dana</h2>

            <form onSubmit={handleAddAccount} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                placeholder="Nama (mis. OVO)"
                value={newAccName}
                onChange={(e) => setNewAccName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as AccountType)}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Tambah
              </button>
            </form>

            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {accounts.map((acc) => (
                <li
                  key={acc.id}
                  className="flex items-center justify-between gap-2 py-2.5 text-sm"
                >
                  {editingAccId === acc.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editAccName}
                        onChange={(e) => setEditAccName(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <select
                        value={editAccType}
                        onChange={(e) =>
                          setEditAccType(e.target.value as AccountType)
                        }
                        className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        {Object.entries(ACCOUNT_TYPE_LABELS).map(
                          ([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => void handleSaveAccount(acc.id)}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccId(null)}
                        className="text-zinc-500 hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">{acc.name}</span>{" "}
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {ACCOUNT_TYPE_LABELS[acc.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccId(acc.id);
                            setEditAccName(acc.name);
                            setEditAccType(acc.type);
                          }}
                          className="text-zinc-600 hover:underline dark:text-zinc-300"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAccount(acc.id)}
                          className="text-red-600 hover:underline dark:text-red-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Kategori</h2>

            <form onSubmit={handleAddCategory} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                placeholder="Nama kategori (mis. Kopi)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Tambah
              </button>
            </form>

            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="flex items-center justify-between gap-2 py-2.5 text-sm"
                >
                  {editingCatId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSaveCategory(cat.id)}
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="text-zinc-500 hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditCatName(cat.name);
                          }}
                          className="text-zinc-600 hover:underline dark:text-zinc-300"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCategory(cat.id)}
                          className="text-red-600 hover:underline dark:text-red-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
