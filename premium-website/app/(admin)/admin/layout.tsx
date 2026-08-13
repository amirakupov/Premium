"use client";

import type { ReactNode } from "react";
import ToastProvider from "./components/ui/ToastProvider";
import AdminDataProvider from "./components/data/AdminDataProvider";
import AdminUiProvider, { useAdminUi } from "./components/shell/AdminUiProvider";
import Sidebar from "./components/shell/Sidebar";
import Topbar from "./components/shell/Topbar";
import styles from "./layout.module.css";

/** Уводит содержимое в глубину, когда открыт sheet. */
function Content({ children }: { children: ReactNode }) {
    const { sheetOpen } = useAdminUi();
    return (
        <div className={`${styles.column} ${sheetOpen ? styles.recessed : ""}`}>
            <Topbar />
            <main className={styles.main}>{children}</main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AdminDataProvider>
                <AdminUiProvider>
                    <div className={styles.shell}>
                        <Sidebar />
                        <Content>{children}</Content>
                    </div>
                </AdminUiProvider>
            </AdminDataProvider>
        </ToastProvider>
    );
}
