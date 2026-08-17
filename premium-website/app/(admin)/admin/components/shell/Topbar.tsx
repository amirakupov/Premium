"use client";

import { usePathname } from "next/navigation";
import { FiMenu, FiSearch } from "react-icons/fi";
import A11yToggle from "@/app/(site)/components/A11yToggle";
import { useAdminData } from "../data/AdminDataProvider";
import { useAdminUi } from "./AdminUiProvider";
import SaveStatus from "./SaveStatus";
import styles from "./Topbar.module.css";

const SECTIONS: { prefix: string; label: string }[] = [
    { prefix: "/admin/services", label: "Услуги" },
    { prefix: "/admin/doctors", label: "Врачи" },
    { prefix: "/admin", label: "Обзор" },
];

export default function Topbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
    const pathname = usePathname();
    const { save } = useAdminData();
    const { query, setQuery, searchRef, setPaletteOpen } = useAdminUi();

    const section = SECTIONS.find((s) => pathname.startsWith(s.prefix))?.label ?? "Обзор";

    return (
        <header className={styles.topbar}>
            {/* Видна только в drawer-режиме — на широком экране сайдбар и так на месте. */}
            <button
                type="button"
                className={styles.menu}
                onClick={onOpenDrawer}
                aria-label="Открыть меню разделов"
            >
                <FiMenu aria-hidden="true" />
            </button>

            <nav aria-label="Хлебные крошки" className={styles.crumbs}>
                <span className={styles.crumbRoot}>Админка</span>
                <span aria-hidden="true" className={styles.slash}>/</span>
                <span aria-current="page" className={styles.crumbLeaf}>{section}</span>
            </nav>

            <div className={styles.right}>
                {/* Геометрия — из Searchbar.module.css витрины: капсула расширяется пружиной. */}
                <div className={styles.search}>
                    <FiSearch aria-hidden="true" className={styles.searchIcon} />
                    <input
                        ref={searchRef}
                        type="search"
                        className={styles.searchInput}
                        placeholder={`Поиск в разделе «${section}»`}
                        aria-label={`Поиск в разделе «${section}»`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button
                        type="button"
                        className={styles.paletteHint}
                        onClick={() => setPaletteOpen(true)}
                        aria-label="Открыть палитру команд"
                    >
                        <kbd className={styles.kbd}>⌘K</kbd>
                    </button>
                </div>

                <SaveStatus state={save} />

                <A11yToggle className={styles.a11y} />
            </div>
        </header>
    );
}
