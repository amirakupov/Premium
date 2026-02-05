export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100vh", padding: 24, background: "#0b0b0b", color: "white" }}>
            {children}
        </div>
    );
}