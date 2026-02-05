"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LoginRequest } from "@/app/api/interaface/LoginRequest";
import {login} from "@/app/api/login/login";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        const payload: LoginRequest = { username, password };
        const ok = await login(payload);
        if (!ok) {
            setErr("Login failed");
            return;
        }
        router.push("/admin");
        router.refresh();
    };

    return (
        <main style={{ padding: 24 }}>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 280 }}>
                <input
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                />
                <input
                    placeholder="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                />
                <button type="submit">login</button>
                {err ? <div>{err}</div> : null}
            </form>
        </main>
    );
}