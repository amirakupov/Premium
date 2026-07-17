"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { LoginRequest } from "@/lib/types";

async function login(payload: LoginRequest): Promise<boolean> {
    const response = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    return response.ok;
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;
        setErr("");
        setSubmitting(true);
        try {
            const ok = await login({ username, password });
            if (!ok) {
                setErr("Неверный логин или пароль");
                return;
            }
            // middleware кладёт исходный адрес в ?next=
            const next = searchParams.get("next");
            router.push(next && next.startsWith("/") ? next : "/admin");
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main style={{ padding: 24 }}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 280 }}>
                <label htmlFor="username">Логин</label>
                <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                />
                <label htmlFor="password">Пароль</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
                <button type="submit" disabled={submitting}>
                    {submitting ? "..." : "Войти"}
                </button>
                {err ? <div role="alert">{err}</div> : null}
            </form>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
