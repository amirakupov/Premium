"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LoginRequest } from "@/lib/types";
import { useCursorGlow } from "../admin/components/ui/useCursorGlow";
import styles from "./login.module.css";

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
    const { ref, glowProps } = useCursorGlow<HTMLDivElement>();
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
        <main className={styles.screen}>
            <div
                ref={ref}
                className={`${styles.card} ${err ? styles.cardError : ""}`}
                {...glowProps}
            >
                <span aria-hidden="true" className={styles.glow} />

                <header className={styles.head}>
                    <span aria-hidden="true" className={styles.logo}>П</span>
                    <h1 className={styles.title}>Вход в админку</h1>
                    <p className={styles.subtitle}>Клиника неврологии «Премиум»</p>
                </header>

                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="username">Логин</label>
                        <input
                            id="username"
                            className={styles.input}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            aria-invalid={err ? true : undefined}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="password">Пароль</label>
                        <input
                            id="password"
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            aria-invalid={err ? true : undefined}
                            required
                        />
                    </div>

                    {err ? <p role="alert" className={styles.error}>{err}</p> : null}

                    <button type="submit" className={styles.submit} disabled={submitting}>
                        {submitting ? "Проверяем…" : "Войти"}
                    </button>
                </form>
            </div>
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
