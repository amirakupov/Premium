"use client";

import { useState } from "react";
import ServiceManager from "./components/ServiceManager";
import DoctorManager from "./components/DoctorManager";
import styles from "./admin.module.css";

export default function AdminPage() {
    const [loggingOut, setLoggingOut] = useState(false);
    const [err, setErr] = useState("");

    async function onLogout() {
        setLoggingOut(true);
        setErr("");
        try {
            const r = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            });
            if (!r.ok) {
                setErr(`Не удалось выйти: ${r.status}`);
                return;
            }
            window.location.href = "/login";
        } finally {
            setLoggingOut(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Управление контентом</h1>
                <button onClick={onLogout} disabled={loggingOut} className={styles.button}>
                    {loggingOut ? "..." : "Выйти"}
                </button>
            </div>

            {err ? <div className={styles.error}>{err}</div> : null}

            <div className={styles.grid}>
                <ServiceManager />
                <DoctorManager />
            </div>
        </main>
    );
}
