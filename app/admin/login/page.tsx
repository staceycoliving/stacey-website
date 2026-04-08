"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Wrong password");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-alt">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[5px] border border-lightgray p-8">
          <h1 className="text-xl font-bold text-black mb-1">STACEY Admin</h1>
          <p className="text-sm text-gray mb-6">Enter password to continue</p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-3 border border-lightgray rounded-[5px] text-sm focus:outline-none focus:border-black transition-colors"
            />

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full mt-4 bg-black text-white py-3 rounded-[5px] text-sm font-semibold hover:bg-black/90 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
