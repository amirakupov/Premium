"use client";

import { useState } from "react";
import { FiArrowDown, FiArrowUp, FiExternalLink, FiTrash2 } from "react-icons/fi";
import type { DisclosureDocument, DocumentCategory } from "@/lib/types";
import { CATEGORY_LABELS, formatRuDate } from "@/lib/disclosure";
import { missingRequiredCategories, moveId } from "@/lib/admin/disclosure";
import { actionDeleteDocument, actionReorderDocuments } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import Modal from "./ui/Modal";
import { SkeletonRows } from "./ui/Skeleton";
import {
    StatusBadge,
    TableCell,
    TableColumnLabel,
    TableHead,
    TableRow,
    TableShell,
} from "./ui/Table";
import styles from "./Disclosure.module.css";

export const DOCUMENT_COLS = "minmax(240px, 2fr) 90px 110px 190px";

/** Порядок групп админки: как на сайте, госгарантии — перед «Прочими». */
export const ADMIN_CATEGORY_ORDER: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "GUARANTEE_PROGRAM",
    "OTHER",
];

export default function DocumentTable({
    onOpen,
    onCreate,
}: {
    onOpen: (id: number) => void;
    onCreate: () => void;
}) {
    const { data, loading, busy, reload, run } = useDisclosureData();
    const { setModalOpen } = useAdminUi();
    const [removing, setRemoving] = useState<DisclosureDocument | null>(null);

    const documents = data?.documents ?? [];
    const missing = new Set(missingRequiredCategories(documents));

    function move(category: DocumentCategory, id: number, delta: -1 | 1) {
        const ids = documents.filter((d) => d.category === category).map((d) => d.id);
        const next = moveId(ids, id, delta);
        if (next) void run(() => actionReorderDocuments(next), "Порядок сохранён");
    }

    function confirmRemove() {
        const target = removing;
        setRemoving(null);
        setModalOpen(false);
        if (target) void run(() => actionDeleteDocument(target.id), "Документ удалён");
    }

    return (
        <>
            <TableShell
                title={<span>Документы</span>}
                actions={
                    <>
                        <Button variant="ghost" size="sm" onClick={() => void reload()} loading={loading} busyLabel="Обновляем…">
                            Обновить
                        </Button>
                        <Button variant="primary" size="sm" onClick={onCreate}>
                            Добавить документ
                        </Button>
                    </>
                }
            >
                <TableHead cols={DOCUMENT_COLS}>
                    <TableColumnLabel>Документ</TableColumnLabel>
                    <TableColumnLabel>Тип</TableColumnLabel>
                    <TableColumnLabel>Обновлён</TableColumnLabel>
                    <TableColumnLabel>Действия</TableColumnLabel>
                </TableHead>

                {loading && !data ? <SkeletonRows cols={DOCUMENT_COLS} /> : null}

                {data && documents.length === 0 ? (
                    <EmptyState
                        title="Документов пока нет"
                        description="Загрузите договор, прейскурант, лицензию и текст Постановления № 659 — без них раздел не соответствует требованиям."
                        action={<Button variant="primary" onClick={onCreate}>Добавить документ</Button>}
                    />
                ) : null}

                {data && documents.length > 0
                    ? ADMIN_CATEGORY_ORDER.map((category) => {
                          const rows = documents.filter((d) => d.category === category);
                          if (rows.length === 0 && !missing.has(category)) return null;
                          return (
                              <div key={category} role="rowgroup" aria-label={CATEGORY_LABELS[category]}>
                                  <div role="row" className={styles.groupHead}>
                                      <span role="columnheader">{CATEGORY_LABELS[category]}</span>
                                      {missing.has(category) ? (
                                          <StatusBadge badge={{ label: "Не хватает", tone: "danger" }} />
                                      ) : null}
                                  </div>
                                  {rows.map((doc, index) => (
                                      <TableRow key={doc.id} cols={DOCUMENT_COLS}>
                                          <TableCell>
                                              <button type="button" className={styles.docTitle} onClick={() => onOpen(doc.id)}>
                                                  {doc.title}
                                              </button>
                                              {doc.note ? <span className={styles.docNote}>{doc.note}</span> : null}
                                          </TableCell>
                                          <TableCell>{doc.kind === "FILE" ? "PDF" : "Ссылка"}</TableCell>
                                          <TableCell>{formatRuDate(doc.updatedAt)}</TableCell>
                                          <TableCell>
                                              <div className={styles.actions}>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy || index === 0}
                                                      onClick={() => move(category, doc.id, -1)}
                                                      aria-label={`Поднять «${doc.title}»`}
                                                  >
                                                      <FiArrowUp aria-hidden="true" />
                                                  </Button>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy || index === rows.length - 1}
                                                      onClick={() => move(category, doc.id, 1)}
                                                      aria-label={`Опустить «${doc.title}»`}
                                                  >
                                                      <FiArrowDown aria-hidden="true" />
                                                  </Button>
                                                  <a
                                                      href={doc.url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className={styles.iconLink}
                                                      aria-label={`Открыть «${doc.title}» в новой вкладке`}
                                                  >
                                                      <FiExternalLink aria-hidden="true" />
                                                  </a>
                                                  <Button
                                                      variant="quiet"
                                                      size="icon"
                                                      disabled={busy}
                                                      onClick={() => {
                                                          setRemoving(doc);
                                                          setModalOpen(true);
                                                      }}
                                                      aria-label={`Удалить «${doc.title}»`}
                                                  >
                                                      <FiTrash2 aria-hidden="true" />
                                                  </Button>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </div>
                          );
                      })
                    : null}
            </TableShell>

            <Modal
                open={removing !== null}
                title="Удалить документ?"
                description={`«${removing?.title ?? ""}» пропадёт со страницы раскрытия информации. Файл останется на сервере, но ссылки на него больше не будет.`}
                cancelLabel="Оставить"
                confirmLabel="Удалить"
                onCancel={() => {
                    setRemoving(null);
                    setModalOpen(false);
                }}
                onConfirm={confirmRemove}
            />
        </>
    );
}
