"use client";

import Link from "next/link";

export default function AdminHeader() {
    return (
        <header
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 70,
                zIndex: 10000,
                background: "pink",
                color: "white",
                borderBottom: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    height: "100%",
                    padding: "0 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Link href="/admin" style={{ color: "black", textDecoration: "none", fontWeight: 900 }}>
                    Контент Менеджмент Алины Габдрахмановой
                </Link>

                <div style={{ display: "flex", gap: 10 }}>
                    <Link href="/" style={{ color: "black", textDecoration: "none", fontWeight: 800, opacity: 0.9 }}>
                        На сайт клиники
                    </Link>
                </div>
            </div>
        </header>
    );
}