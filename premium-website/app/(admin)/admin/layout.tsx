"use client";

import { type ReactNode, useState } from "react";
import ToastProvider from "./components/ui/ToastProvider";
import AdminDataProvider from "./components/data/AdminDataProvider";
import AdminUiProvider, { useAdminUi } from "./components/shell/AdminUiProvider";
import HotkeyLayer from "./components/shell/HotkeyLayer";
import Sidebar from "./components/shell/Sidebar";
import Topbar from "./components/shell/Topbar";
import styles from "./layout.module.css";

/** Уводит содержимое в глубину, когда открыт sheet. */
function Content({
    children,
    onOpenDrawer,
}: {
    children: ReactNode;
    onOpenDrawer: () => void;
}) {
    const { sheetOpen } = useAdminUi();
    return (
        <div className={`${styles.column} ${sheetOpen ? styles.recessed : ""}`}>
            <Topbar onOpenDrawer={onOpenDrawer} />
            <main className={styles.main}>{children}</main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    // Drawer — состояние каркаса, а не UI-контекста: он существует только
    // на узком экране и никому, кроме сайдбара с топбаром, не нужен.
    const [drawer, setDrawer] = useState(false);

    return (
        <ToastProvider>
            <AdminDataProvider>
                <AdminUiProvider>
                    <div className={styles.shell}>
                        <Sidebar drawerOpen={drawer} onCloseDrawer={() => setDrawer(false)} />
                        <Content onOpenDrawer={() => setDrawer(true)}>{children}</Content>
                    </div>
                    <HotkeyLayer />
                </AdminUiProvider>
            </AdminDataProvider>
        </ToastProvider>
    );
}
