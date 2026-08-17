"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { filterRows } from "@/lib/admin/sort";
import { useAdminData } from "../data/AdminDataProvider";
import { useAdminUi } from "../shell/AdminUiProvider";
import { useFocusTrap } from "./useFocusTrap";
import styles from "./CommandPalette.module.css";

type Item = { key: string; tag: string; title: string; note: string; run: () => void };

export default function CommandPalette() {
    const router = useRouter();
    const { services, doctors } = useAdminData();
    const { paletteOpen, setPaletteOpen } = useAdminUi();
    const trapRef = useFocusTrap(paletteOpen);
    const [term, setTerm] = useState("");

    // Каждое открытие начинается с чистой строки.
    useEffect(() => {
        if (paletteOpen) setTerm("");
    }, [paletteOpen]);

    if (!paletteOpen) return null;

    function go(href: string) {
        setPaletteOpen(false);
        router.push(href);
    }

    const commands: Item[] = [
        { key: "cmd-service", tag: "Команда", title: "Создать услугу", note: "Открыть форму новой услуги", run: () => go("/admin/services?new=1") },
        { key: "cmd-doctor", tag: "Команда", title: "Добавить врача", note: "Открыть форму нового врача", run: () => go("/admin/doctors?new=1") },
        { key: "cmd-overview", tag: "Команда", title: "Обзор", note: "Сводка по разделам", run: () => go("/admin") },
    ];

    const serviceItems: Item[] = filterRows(services, term, ["serviceName", "slug"]).map((s) => ({
        key: `service-${s.id}`,
        tag: "Услуга",
        title: s.serviceName,
        note: `/services/${s.slug}`,
        run: () => go("/admin/services"),
    }));

    const doctorItems: Item[] = filterRows(doctors, term, ["name", "specialty"]).map((d) => ({
        key: `doctor-${d.id}`,
        tag: "Врач",
        title: d.name,
        note: d.specialty,
        run: () => go("/admin/doctors"),
    }));

    const commandItems = filterRows(commands, term, ["title", "note"]);
    const items = [...commandItems, ...serviceItems, ...doctorItems];

    return (
        <>
            <div className={styles.scrim} onClick={() => setPaletteOpen(false)} aria-hidden="true" />
            <div className={styles.wrap}>
                <div
                    ref={trapRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Палитра команд"
                    className={styles.palette}
                >
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Услуга, врач или команда"
                        aria-label="Поиск по услугам, врачам и командам"
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                    />
                    <div className={styles.results}>
                        {items.length === 0 ? (
                            <p className={styles.nothing}>Ничего не найдено</p>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={styles.item}
                                    onClick={item.run}
                                >
                                    <span className={styles.tag}>{item.tag}</span>
                                    <span className={styles.itemText}>
                                        <span className={styles.itemTitle}>{item.title}</span>
                                        <span className={styles.itemNote}>{item.note}</span>
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
