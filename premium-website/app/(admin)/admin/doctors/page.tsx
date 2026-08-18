"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DoctorPayload } from "@/lib/types";
import DoctorSheet from "../components/DoctorSheet";
import DoctorTable from "../components/DoctorTable";
import { useAdminData } from "../components/data/AdminDataProvider";
import { useAdminUi } from "../components/shell/AdminUiProvider";
import styles from "./doctors.module.css";

type SheetState = { mode: "create" } | { mode: "edit"; id: number } | null;

function DoctorsScreen() {
    const { doctors, loading, refresh, createDoctor, patchDoctor } = useAdminData();
    const { query, setQuery, sheetOpen, setSheetOpen } = useAdminUi();
    const params = useSearchParams();
    const [sheet, setSheet] = useState<SheetState>(null);

    useEffect(() => {
        if (params.get("new") === "1") setSheet({ mode: "create" });
    }, [params]);

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

    useEffect(() => () => setQuery(""), [setQuery]);

    const editing =
        sheet?.mode === "edit" ? doctors.find((d) => d.id === sheet.id) ?? null : null;

    function submit(payload: DoctorPayload) {
        if (sheet?.mode === "edit") patchDoctor(sheet.id, payload);
        else createDoctor(payload);
    }

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Врачи</h1>
            <DoctorTable
                doctors={doctors}
                loading={loading}
                query={query}
                onOpen={(id) => setSheet({ mode: "edit", id })}
                onPatch={patchDoctor}
                onResetQuery={() => setQuery("")}
                onCreate={() => setSheet({ mode: "create" })}
                onRefresh={() => void refresh()}
            />
            <DoctorSheet
                open={sheet !== null}
                doctor={editing}
                onClose={() => setSheet(null)}
                onSubmit={submit}
            />
        </div>
    );
}

export default function DoctorsPage() {
    return (
        <Suspense>
            <DoctorsScreen />
        </Suspense>
    );
}
