"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";
  const title = isRegister ? "Daftar Catatku" : "Masuk ke Catatku";
  const submitLabel = isRegister ? "Daftar" : "Masuk";
  const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Terjadi kesalahan, coba lagi.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isRegister
            ? "Buat akun pribadi untuk mulai mencatat keuangan."
            : "Masuk menggunakan email dan password Anda."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@contoh.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Memproses..." : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          {isRegister ? (
            <>
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Masuk
              </Link>
            </>
          ) : (
            <>
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Daftar
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
