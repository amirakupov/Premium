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
                zIndex: 100,
                background: "#111827",
                color: "#fff",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
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
                <Link href="/admin" style={{ color: "#fff", textDecoration: "none", fontWeight: 800 }}>
                    Админ-панель клиники «Премиум»
                </Link>

                <Link href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 600, opacity: 0.85 }}>
                    На сайт клиники
                </Link>
            </div>
        </header>
    );
}
