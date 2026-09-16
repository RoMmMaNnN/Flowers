"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, hasToken, storeToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasToken()) router.replace("/admin");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await api.login(email, password);
      storeToken(result.accessToken);
      router.replace("/admin");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 401
          ? "The email or password is incorrect."
          : "Unable to sign in right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">Sweet Bouquets / Admin</p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="panel-copy">Sign in to shape the catalogue and keep every bouquet in bloom.</p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
