"use client";

import Image from "next/image";
import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { Service, ServicePayload } from "@/lib/types";
import { serviceBadge } from "@/lib/admin/badges";
import { type Pending, isPending } from "@/lib/admin/optimistic";
import { type SortState, filterRows, sortRows, toggleSort } from "@/lib/admin/sort";
import { isPriceInput } from "@/lib/admin/validation";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import InlineEdit from "./ui/InlineEdit";
import { SkeletonRows } from "./ui/Skeleton";
import {
    StatusBadge,
    TableCell,
    TableChip,
    TableColumnLabel,
    TableCounter,
    TableHead,
    TableHeadCell,
    TableRow,
    TableShell,
} from "./ui/Table";
import styles from "./ServiceTable.module.css";

export const SERVICE_COLS = "minmax(240px, 2fr) minmax(120px, 0.8fr) 150px 120px";

export default function ServiceTable({
    services,
    loading,
    query,
    onOpen,
    onPatch,
    onResetQuery,
    onCreate,
    onRefresh,
}: {
    services: Pending<Service>[];
    loading: boolean;
    query: string;
    onOpen: (id: number) => void;
    onPatch: (id: number, patch: Partial<ServicePayload>) => void;
    onResetQuery: () => void;
    onCreate: () => void;
    onRefresh: () => void;
}) {
    const [sort, setSort] = useState<SortState<string>>({ key: "serviceName", dir: "asc" });

    const filtered = filterRows(services, query, ["serviceName", "slug"]);
    const rows = sortRows(
        filtered,
        sort.key as keyof Pending<Service>,
        sort.dir,
        sort.key === "price" ? "number" : "text",
    );

    const title = (
        <>
            <span>Услуги</span>
            <TableCounter shown={filtered.length} total={services.length} />
            {query ? <TableChip>фильтр: {query}</TableChip> : null}
        </>
    );

    return (
        <TableShell
            title={title}
            actions={
                <>
                    <Button variant="ghost" size="sm" onClick={onRefresh} loading={loading} busyLabel="Обновляем…">
                        Обновить
                    </Button>
                    <Button variant="primary" size="sm" onClick={onCreate}>
                        Создать услугу
                    </Button>
                </>
            }
        >
            <TableHead cols={SERVICE_COLS}>
                <TableHeadCell sortKey="serviceName" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Услуга
                </TableHeadCell>
                <TableHeadCell sortKey="price" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Цена
                </TableHeadCell>
                <TableColumnLabel>Статус</TableColumnLabel>
                <TableColumnLabel>Действия</TableColumnLabel>
            </TableHead>

            {loading && services.length === 0 ? <SkeletonRows cols={SERVICE_COLS} /> : null}

            {!loading && rows.length === 0 ? (
                query ? (
                    <EmptyState
                        title="По фильтру ничего не найдено"
                        description="Проверьте написание или сбросьте фильтр — в разделе есть другие услуги."
                        action={<Button variant="ghost" onClick={onResetQuery}>Сбросить фильтр</Button>}
                    />
                ) : (
                    <EmptyState
                        title="Услуг пока нет"
                        description="Добавьте первую услугу: название, адрес страницы, цену и фотографию."
                        action={<Button variant="primary" onClick={onCreate}>Создать услугу</Button>}
                    />
                )
            ) : null}

            {rows.map((service) => {
                const pending = isPending(service);
                return (
                    <TableRow key={service.id} cols={SERVICE_COLS} muted={pending}>
                        <TableCell>
                            <div className={styles.nameCell}>
                                {service.imageSrc ? (
                                    <Image
                                        src={service.imageSrc}
                                        alt=""
                                        width={34}
                                        height={34}
                                        className={styles.thumb}
                                        unoptimized
                                    />
                                ) : (
                                    <span aria-hidden="true" className={styles.thumbEmpty}>нет</span>
                                )}
                                <div className={styles.nameText}>
                                    <InlineEdit
                                        value={service.serviceName}
                                        label={`Название услуги «${service.serviceName}»`}
                                        onCommit={(next) => onPatch(service.id, { serviceName: next })}
                                    >
                                        <span className={styles.name}>{service.serviceName}</span>
                                    </InlineEdit>
                                    <span className={styles.slug}>/services/{service.slug}</span>
                                </div>
                            </div>
                        </TableCell>

                        <TableCell>
                            <InlineEdit
                                value={String(service.price)}
                                label={`Цена услуги «${service.serviceName}»`}
                                validate={isPriceInput}
                                onCommit={(next) => onPatch(service.id, { price: Number(next || 0) })}
                            >
                                <span className={styles.price}>{service.price} ₽</span>
                            </InlineEdit>
                        </TableCell>

                        <TableCell>
                            <StatusBadge badge={serviceBadge(service, pending)} />
                        </TableCell>

                        <TableCell>
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={() => onOpen(service.id)}
                                aria-label={`Открыть услугу «${service.serviceName}»`}
                            >
                                <FiExternalLink aria-hidden="true" />
                                Открыть
                            </Button>
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableShell>
    );
}
