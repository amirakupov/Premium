"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState } from "react";
import { FiChevronLeft, FiGrid, FiLogOut, FiPackage, FiUsers } from "react-icons/fi";
import Button from "../ui/Button";
import { useAdminData } from "../data/AdminDataProvider";
import styles from "./Sidebar.module.css";

const COLLAPSE_KEY = "admin:sidebar";
/** Шаг пилюли = высота пункта (46) + зазор (6). */
const ITEM_STEP = 52;

const ITEMS = [
    { href: "/admin", label: "Обзор", Icon: FiGrid },
    { href: "/admin/services", label: "Услуги", Icon: FiPackage },
    { href: "/admin/doctors", label: "Врачи", Icon: FiUsers },
] as const;

const HOTKEYS = [
    ["⌘K", "поиск"],
    ["/", "фокус в поиск"],
    ["Esc", "закрыть"],
    ["⌘S", "сохранить"],
    ["⌘↵", "отправить"],
] as const;

export default function Sidebar() {
    const pathname = usePathname();
    const { services, doctors } = useAdminData();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    }, []);

    function toggle() {
        const next = !collapsed;
        setCollapsed(next);
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    }

    const counts: Record<string, number | null> = {
        "/admin": null,
        "/admin/services": services.length,
        "/admin/doctors": doctors.length,
    };

    // Самый длинный совпадающий путь: /admin/services не должен подсвечивать «Обзор».
    const activeIndex = ITEMS.reduce((best, item, index) => {
        const match = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return match && item.href.length >= ITEMS[best].href.length ? index : best;
    }, 0);

    async function logout() {
        await fetch("/api/logout", { method: "POST", credentials: "include", cache: "no-store" });
        window.location.href = "/login";
    }

    return (
        <nav
            aria-label="Разделы админки"
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}
        >
            <div className={styles.brand}>
                <span aria-hidden="true" className={styles.logo}>П</span>
                <span className={styles.brandText}>
                    <span className={styles.brandName}>Премиум</span>
                    <span className={styles.brandKicker}>CMS</span>
                </span>
                <button
                    type="button"
                    className={styles.collapseButton}
                    onClick={toggle}
                    aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
                    aria-expanded={!collapsed}
                >
                    <FiChevronLeft aria-hidden="true" className={styles.chevron} />
                </button>
            </div>

            <div className={styles.items}>
                {/* Пилюля перетекает между пунктами, а не перескакивает. */}
                <span
                    aria-hidden="true"
                    className={styles.pill}
                    style={{ "--pill-y": `${activeIndex * ITEM_STEP}px` } as CSSProperties}
                />
                {ITEMS.map(({ href, label, Icon }) => {
                    const active = ITEMS[activeIndex].href === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`${styles.item} ${active ? styles.itemActive : ""}`}
                            aria-current={active ? "page" : undefined}
                            // В свёрнутом виде подпись скрыта через display: none,
                            // а такой текст выпадает из имени ссылки — без aria-label
                            // скринридер прочитает «ссылка» без названия раздела.
                            aria-label={label}
                        >
                            <Icon aria-hidden="true" className={styles.itemIcon} />
                            <span className={styles.itemLabel}>{label}</span>
                            {counts[href] !== null ? (
                                <span className={styles.count}>{counts[href]}</span>
                            ) : null}
                        </Link>
                    );
                })}
            </div>

            <div className={styles.hotkeys}>
                {HOTKEYS.map(([keys, what]) => (
                    <span key={keys} className={styles.hotkeyRow}>
                        <kbd className={styles.kbd}>{keys}</kbd>
                        <span className={styles.hotkeyWhat}>{what}</span>
                    </span>
                ))}
            </div>

            <div className={styles.user}>
                <span aria-hidden="true" className={styles.avatar}>А</span>
                <span className={styles.userText}>
                    <span className={styles.userName}>Администратор</span>
                    <span className={styles.userRole}>Управление контентом</span>
                </span>
                <Button
                    variant="quiet"
                    size="icon"
                    className={styles.logout}
                    onClick={() => void logout()}
                    aria-label="Выйти из админки"
                >
                    <FiLogOut aria-hidden="true" />
                </Button>
            </div>
        </nav>
    );
}
