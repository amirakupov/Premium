"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ServicePayload } from "@/lib/types";
import ServiceSheet from "../components/ServiceSheet";
import ServiceTable from "../components/ServiceTable";
import { useAdminData } from "../components/data/AdminDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import styles from "./services.module.css";

type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;

function ServicesScreen() {
    const { services, loading, refresh, createService, patchService } = useAdminData();
    const { query, setQuery, sheetOpen, setSheetOpen } = useAdminUi();
    const params = useSearchParams();
    const [sheet, setSheet] = useState<SheetState>(null);

    // Обзор ведёт сюда со ?new=1 — сразу открываем форму создания.
    useEffect(() => {
        if (params.get("new") === "1") setSheet({ mode: "create" });
    }, [params]);

    // Каркас размывает содержимое, пока панель открыта.
    useEffect(() => {
        setSheetOpen(sheet !== null);
    }, [sheet, setSheetOpen]);

    // Esc сбрасывает флаг в контексте — панель закрывается следом.
    // Ловим именно переход true → false: в том коммите, где панель
    // открылась, sheetOpen ещё false (эффект выше только что назначил
    // его на следующий рендер), и сравнение «панель есть, а флага нет»
    // закрыло бы её сразу после открытия.
    const wasOpen = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !sheetOpen) setSheet(null);
        wasOpen.current = sheetOpen;
    }, [sheetOpen]);

    // Фильтр принадлежит разделу: уходя, сбрасываем.
    useEffect(() => () => setQuery(""), [setQuery]);

    const editing =
        sheet?.mode === "edit" ? services.find((s) => s.id === sheet.id) ?? null : null;

    function submit(payload: ServicePayload) {
        if (sheet?.mode === "edit") patchService(sheet.id, payload);
        else createService(payload);
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Услуги</h1>
            <ServiceTable
                services={services}
                loading={loading}
                query={query}
                onOpen={(id) => setSheet({ mode: "edit", id })}
                onPatch={patchService}
                onResetQuery={() => setQuery("")}
                onCreate={() => setSheet({ mode: "create" })}
                onRefresh={() => void refresh()}
            />
            <ServiceSheet
                open={sheet !== null}
                service={editing}
                onClose={() => setSheet(null)}
                onSubmit={submit}
            />
        </div>
    );
}

export default function ServicesPage() {
    // useSearchParams требует границы Suspense при пререндере.
    return (
        <Suspense>
            <ServicesScreen />
        </Suspense>
    );
}
