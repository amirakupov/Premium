"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DocumentSheet from "../components/DocumentSheet";
import DocumentTable from "../components/DocumentTable";
import { useDisclosureData } from "../components/data/DisclosureDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import styles from "./disclosure.module.css";

const TABS = [
    { key: "documents", label: "Документы" },
    { key: "requisites", label: "Реквизиты" },
    { key: "dms", label: "ДМС" },
    { key: "regulators", label: "Контролирующие органы" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;

function isTab(value: string | null): value is TabKey {
    return TABS.some((t) => t.key === value);
}

function DisclosureScreen() {
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { data } = useDisclosureData();
    const raw = params.get("tab");
    const tab: TabKey = isTab(raw) ? raw : "documents";
    const { sheetOpen, setSheetOpen } = useAdminUi();
    const [sheet, setSheet] = useState<SheetState>(null);

    useEffect(() => {
        setSheetOpen(sheet !== null);
    }, [sheet, setSheetOpen]);

    // Esc гасит флаг в контексте — панель закрывается следом (как в doctors/page.tsx).
    const wasOpen = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !sheetOpen) setSheet(null);
        wasOpen.current = sheetOpen;
    }, [sheetOpen]);

    const editing =
        sheet?.mode === "edit" ? data?.documents.find((d) => d.id === sheet.id) ?? null : null;

    function select(next: TabKey) {
        const query = new URLSearchParams(params);
        query.set("tab", next);
        router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Раскрытие информации</h1>
            <div role="tablist" aria-label="Разделы раскрытия информации" className={styles.tabs}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        id={`tab-${t.key}`}
                        aria-selected={tab === t.key}
                        aria-controls={`panel-${t.key}`}
                        tabIndex={tab === t.key ? 0 : -1}
                        className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                        onClick={() => select(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                {tab === "documents" ? (
                    <>
                        <DocumentTable
                            onOpen={(id) => setSheet({ mode: "edit", id })}
                            onCreate={() => setSheet({ mode: "create" })}
                        />
                        <DocumentSheet open={sheet !== null} document={editing} onClose={() => setSheet(null)} />
                    </>
                ) : null}
                {tab === "requisites" ? <p>ИНН: {data?.requisites.inn || "не заполнен"}</p> : null}
                {tab === "dms" ? <p>Страховых компаний: {data?.dmsPartners.length ?? "…"}</p> : null}
                {tab === "regulators" ? <p>Органов: {data?.regulators.length ?? "…"}</p> : null}
            </div>
        </div>
    );
}

export default function DisclosurePage() {
    return (
        <Suspense>
            <DisclosureScreen />
        </Suspense>
    );
}
