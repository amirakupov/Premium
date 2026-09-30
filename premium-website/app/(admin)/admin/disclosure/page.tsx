"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DocumentSheet from "../components/DocumentSheet";
import DocumentTable from "../components/DocumentTable";
import OrderedListTable from "../components/OrderedListTable";
import RequisitesForm from "../components/RequisitesForm";
import { useDisclosureData } from "../components/data/DisclosureDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import { validateDmsPartner, validateRegulator } from "@/lib/admin/validation";
import {
    actionCreateDmsPartner,
    actionCreateRegulator,
    actionDeleteDmsPartner,
    actionDeleteRegulator,
    actionPatchDmsPartner,
    actionPatchRegulator,
    actionReorderDmsPartners,
    actionReorderRegulators,
} from "./actions";
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
    const { data, run } = useDisclosureData();
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
                {tab === "requisites" ? <RequisitesForm /> : null}
                {tab === "dms" ? (
                    <OrderedListTable
                        title="Страховые компании-партнёры по ДМС"
                        rows={data?.dmsPartners ?? []}
                        columns={[
                            { key: "name", label: "Название", placeholder: "Название компании", width: "minmax(200px, 2fr)" },
                            { key: "site", label: "Сайт", placeholder: "https://", width: "minmax(180px, 1.5fr)" },
                        ]}
                        emptyTitle="Партнёров по ДМС пока нет"
                        emptyDescription="Пока список пуст, сайт предлагает уточнить партнёров по телефону клиники."
                        validate={(d) => validateDmsPartner({ name: d.name, site: d.site })}
                        onCreate={(d) => run(() => actionCreateDmsPartner({ name: d.name, site: d.site }), "Компания добавлена")}
                        onPatch={(id, key, value) => void run(() => actionPatchDmsPartner(id, { [key]: value }), "Сохранено")}
                        onDelete={(id) => void run(() => actionDeleteDmsPartner(id), "Компания удалена")}
                        onReorder={(ids) => void run(() => actionReorderDmsPartners(ids), "Порядок сохранён")}
                        itemName={(row) => row.name}
                    />
                ) : null}
                {tab === "regulators" ? (
                    <OrderedListTable
                        title="Контролирующие органы"
                        rows={data?.regulators ?? []}
                        columns={[
                            { key: "name", label: "Название", placeholder: "Название органа", width: "minmax(200px, 2fr)" },
                            { key: "address", label: "Адрес", placeholder: "Адрес", width: "minmax(180px, 1.5fr)" },
                            { key: "phone", label: "Телефон", placeholder: "+7 …", width: "140px" },
                            { key: "site", label: "Сайт", placeholder: "https://", width: "minmax(160px, 1fr)" },
                        ]}
                        emptyTitle="Органы не добавлены"
                        emptyDescription="Постановление требует адреса, телефоны и сайты Минздрава РБ, Роспотребнадзора и Росздравнадзора."
                        validate={(d) =>
                            validateRegulator({ name: d.name, address: d.address, phone: d.phone, site: d.site })
                        }
                        onCreate={(d) =>
                            run(
                                () => actionCreateRegulator({ name: d.name, address: d.address, phone: d.phone, site: d.site }),
                                "Орган добавлен",
                            )
                        }
                        onPatch={(id, key, value) => void run(() => actionPatchRegulator(id, { [key]: value }), "Сохранено")}
                        onDelete={(id) => void run(() => actionDeleteRegulator(id), "Орган удалён")}
                        onReorder={(ids) => void run(() => actionReorderRegulators(ids), "Порядок сохранён")}
                        itemName={(row) => row.name}
                    />
                ) : null}
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
