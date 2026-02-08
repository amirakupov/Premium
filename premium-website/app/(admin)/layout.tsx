import AdminHeader from "@/app/(admin)/admin/components/header/AdminHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AdminHeader />
            <main style={{ paddingTop: 70 }}>{children}</main>
        </>
    );
}