"use client";

import Image from "next/image";
import { useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import type { Doctor, DoctorPayload } from "@/lib/types";
import { doctorBadge } from "@/lib/admin/badges";
import { type Pending, isPending } from "@/lib/admin/optimistic";
import { type SortState, filterRows, sortRows, toggleSort } from "@/lib/admin/sort";
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
import styles from "./DoctorTable.module.css";

export const DOCTOR_COLS = "minmax(240px, 2fr) minmax(180px, 1.2fr) 150px 120px";

/** Первая буква фамилии для аватара-заглушки, когда фото нет. */
function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
}

export default function DoctorTable({
    doctors,
    loading,
    query,
    onOpen,
    onPatch,
    onResetQuery,
    onCreate,
    onRefresh,
}: {
    doctors: Pending<Doctor>[];
    loading: boolean;
    query: string;
    onOpen: (id: number) => void;
    onPatch: (id: number, patch: Partial<DoctorPayload>) => void;
    onResetQuery: () => void;
    onCreate: () => void;
    onRefresh: () => void;
}) {
    const [sort, setSort] = useState<SortState<string>>({ key: "name", dir: "asc" });

    const filtered = filterRows(doctors, query, ["name", "specialty"]);
    const rows = sortRows(filtered, sort.key as keyof Pending<Doctor>, sort.dir, "text");

    const title = (
        <>
            <span>Врачи</span>
            <TableCounter shown={filtered.length} total={doctors.length} />
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
                        Добавить врача
                    </Button>
                </>
            }
        >
            <TableHead cols={DOCTOR_COLS}>
                <TableHeadCell sortKey="name" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Врач
                </TableHeadCell>
                <TableHeadCell sortKey="specialty" state={sort} onSort={(k) => setSort(toggleSort(sort, k))}>
                    Специализация
                </TableHeadCell>
                <TableColumnLabel>Статус</TableColumnLabel>
                <TableColumnLabel>Действия</TableColumnLabel>
            </TableHead>

            {loading && doctors.length === 0 ? <SkeletonRows cols={DOCTOR_COLS} /> : null}

            {!loading && rows.length === 0 ? (
                query ? (
                    <EmptyState
                        title="По фильтру ничего не найдено"
                        description="Проверьте написание или сбросьте фильтр — в разделе есть другие врачи."
                        action={<Button variant="ghost" onClick={onResetQuery}>Сбросить фильтр</Button>}
                    />
                ) : (
                    <EmptyState
                        title="Врачей пока нет"
                        description="Добавьте первого врача: фотографию, полное имя и специализацию."
                        action={<Button variant="primary" onClick={onCreate}>Добавить врача</Button>}
                    />
                )
            ) : null}

            {rows.map((doctor) => {
                const pending = isPending(doctor);
                return (
                    <TableRow key={doctor.id} cols={DOCTOR_COLS} muted={pending}>
                        <TableCell>
                            <div className={styles.nameCell}>
                                {doctor.imgSrc ? (
                                    <Image
                                        src={doctor.imgSrc}
                                        alt=""
                                        width={34}
                                        height={34}
                                        className={styles.thumb}
                                        unoptimized
                                    />
                                ) : (
                                    <span aria-hidden="true" className={styles.thumbEmpty}>
                                        {initial(doctor.name)}
                                    </span>
                                )}
                                <div className={styles.nameText}>
                                    <InlineEdit
                                        value={doctor.name}
                                        label={`Имя врача «${doctor.name}»`}
                                        onCommit={(next) => onPatch(doctor.id, { name: next })}
                                    >
                                        <span className={styles.name}>{doctor.name}</span>
                                    </InlineEdit>
                                    <span className={styles.bio}>
                                        {doctor.bio ? doctor.bio.slice(0, 60) : "Биография не заполнена"}
                                    </span>
                                </div>
                            </div>
                        </TableCell>

                        {/* Специализация инлайн не правится: часто длинная, правится в панели. */}
                        <TableCell>
                            <button
                                type="button"
                                className={styles.specialty}
                                onClick={() => onOpen(doctor.id)}
                            >
                                {doctor.specialty}
                            </button>
                        </TableCell>

                        <TableCell>
                            <StatusBadge badge={doctorBadge(doctor, pending)} />
                        </TableCell>

                        <TableCell>
                            <Button
                                variant="quiet"
                                size="sm"
                                onClick={() => onOpen(doctor.id)}
                                aria-label={`Открыть карточку врача «${doctor.name}»`}
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
