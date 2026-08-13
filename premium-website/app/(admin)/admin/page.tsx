"use client";

import Link from "next/link";
import { countAttention, doctorBadge, serviceBadge } from "@/lib/admin/badges";
import GlassCard from "./components/ui/GlassCard";
import { SkeletonBar } from "./components/ui/Skeleton";
import { useAdminData } from "./components/data/AdminDataProvider";
import styles from "./overview.module.css";

export default function OverviewPage() {
    const { services, doctors, loading } = useAdminData();

    const servicesAttention = countAttention(services, (s) => serviceBadge(s, false));
    const doctorsAttention = countAttention(doctors, (d) => doctorBadge(d, false));

    const tiles = [
        {
            href: "/admin/services",
            title: "Услуг на сайте",
            value: services.length,
            note: servicesAttention > 0
                ? `${servicesAttention} требуют внимания`
                : "Все заполнены",
        },
        {
            href: "/admin/doctors",
            title: "Врачей на сайте",
            value: doctors.length,
            note: doctorsAttention > 0 ? `${doctorsAttention} без фото` : "Все с фото",
        },
    ];

    return (
        <div className={styles.page}>
            <header className={styles.head}>
                <h1 className={styles.title}>Управление контентом</h1>
                <p className={styles.subtitle}>
                    Услуги и врачи клиники «Премиум». Изменения попадают на сайт
                    в течение часа — страницы обновляются по расписанию.
                </p>
            </header>

            <div className={styles.tiles}>
                {tiles.map((tile) => (
                    <GlassCard key={tile.href} glow className={styles.tile}>
                        <span className={styles.tileTitle}>{tile.title}</span>
                        {loading ? (
                            <span className={styles.tileLoading}><SkeletonBar width="88px" /></span>
                        ) : (
                            <span className={styles.tileValue}>{tile.value}</span>
                        )}
                        <span className={styles.tileNote}>{loading ? "Загружаем…" : tile.note}</span>
                        <Link href={tile.href} className={styles.tileLink}>Открыть раздел</Link>
                    </GlassCard>
                ))}
            </div>

            <div className={styles.actions}>
                {/* ?new=1 открывает sheet создания сразу на нужном маршруте. */}
                <Link href="/admin/services?new=1" className={styles.action}>
                    <span className={styles.actionTitle}>Создать услугу</span>
                    <span className={styles.actionNote}>Название, слаг, цена и фото</span>
                </Link>
                <Link href="/admin/doctors?new=1" className={styles.action}>
                    <span className={styles.actionTitle}>Добавить врача</span>
                    <span className={styles.actionNote}>Фото, имя, специализация</span>
                </Link>
            </div>

            <p className={styles.footer}>
                <a href="/" target="_blank" rel="noreferrer">Открыть сайт клиники</a>
            </p>
        </div>
    );
}
