"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DisclosureDocument, DisclosureDocumentPayload, DocumentKind } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/disclosure";
import { clearDraft, isDirty, loadDraft, saveDraft } from "@/lib/admin/draft";
import {
    DOCUMENT_FIELD_ORDER,
    DOCUMENT_NOTE_MAX,
    type DocumentField,
    type FieldErrors,
    firstErrorField,
    validateDocument,
} from "@/lib/admin/validation";
import { actionCreateDocument, actionPatchDocument } from "../disclosure/actions";
import { useDisclosureData } from "./data/DisclosureDataProvider";
import { useAdminUi } from "./shell/AdminUiProvider";
import { ADMIN_CATEGORY_ORDER } from "./DocumentTable";
import Button from "./ui/Button";
import FileDropzone from "./ui/FileDropzone";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import Sheet from "./ui/Sheet";
import Textarea from "./ui/Textarea";
import { useToast } from "./ui/ToastProvider";
import styles from "./Disclosure.module.css";
import sheetStyles from "./ServiceSheet.module.css";

const EMPTY: DisclosureDocumentPayload = { title: "", category: "CONTRACT", kind: "FILE", url: "", note: "" };

function toPayload(doc: DisclosureDocument): DisclosureDocumentPayload {
    return { title: doc.title, category: doc.category, kind: doc.kind, url: doc.url, note: doc.note };
}

/** Какое поле подсветить по тексту ошибки бэкенда; остальное — в тост. */
function fieldOfBackendError(message: string): DocumentField | null {
    if (message.includes("название")) return "title";
    if (message.includes("Примечание")) return "note";
    if (message.includes("https://") || message.includes("PDF") || message.includes("Файл")) return "url";
    return null;
}

export default function DocumentSheet({
    open,
    document,
    onClose,
}: {
    open: boolean;
    document: DisclosureDocument | null;
    onClose: () => void;
}) {
    const { push } = useToast();
    const { run, busy } = useDisclosureData();
    const { setFormSubmit, modalOpen, setModalOpen } = useAdminUi();
    const draftId = document ? document.id : "new";
    const initial = useMemo(() => (document ? toPayload(document) : EMPTY), [document]);

    const [form, setForm] = useState<DisclosureDocumentPayload>(initial);
    const [errors, setErrors] = useState<FieldErrors<DocumentField>>({});
    const [confirmClose, setConfirmClose] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm(loadDraft<DisclosureDocumentPayload>("document", draftId) ?? initial);
        setErrors({});
    }, [open, draftId, initial]);

    const dirty = isDirty(form, initial);

    useEffect(() => {
        if (open && dirty) saveDraft("document", draftId, form);
    }, [open, dirty, form, draftId]);

    useEffect(() => {
        if (!open || !dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [open, dirty]);

    async function submit() {
        const found = validateDocument(form);
        setErrors(found);
        const first = firstErrorField(found, DOCUMENT_FIELD_ORDER);
        if (first) {
            push({ tone: "error", title: "Проверьте форму" });
            window.document.getElementById(`document-${first}`)?.focus();
            return;
        }
        const result = await run(
            () => (document ? actionPatchDocument(document.id, form) : actionCreateDocument(form)),
            document ? "Документ сохранён" : "Документ добавлен",
        );
        if (!result.ok) {
            const field = fieldOfBackendError(result.error);
            if (field) setErrors({ [field]: result.error });
            return;
        }
        clearDraft("document", draftId);
        onClose();
    }

    useEffect(() => {
        if (!open) return;
        setFormSubmit(() => void submit());
        return () => setFormSubmit(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, form]);

    const modalWasOpen = useRef(false);
    useEffect(() => {
        if (modalWasOpen.current && !modalOpen) setConfirmClose(false);
        modalWasOpen.current = modalOpen;
    }, [modalOpen]);

    function requestClose() {
        if (dirty) {
            setConfirmClose(true);
            setModalOpen(true);
            return;
        }
        onClose();
    }

    function discard() {
        clearDraft("document", draftId);
        setConfirmClose(false);
        setModalOpen(false);
        onClose();
    }

    function setKind(kind: DocumentKind) {
        // Смена типа обнуляет адрес: путь к файлу не годится как ссылка и наоборот.
        setForm((f) => (f.kind === kind ? f : { ...f, kind, url: "" }));
    }

    return (
        <>
            <Sheet
                open={open}
                title={document ? `Документ: ${document.title}` : "Новый документ"}
                onClose={requestClose}
                footer={
                    <>
                        <span className={sheetStyles.draftHint}>
                            {dirty ? "Черновик сохраняется автоматически" : "Изменений нет"}
                        </span>
                        <Button variant="ghost" onClick={requestClose}>Отменить</Button>
                        <Button variant="primary" onClick={() => void submit()} loading={busy} busyLabel="Сохраняем…">
                            Сохранить <kbd className={sheetStyles.kbd}>⌘S</kbd>
                        </Button>
                    </>
                }
            >
                <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="document-category">Категория</label>
                    <select
                        id="document-category"
                        className={styles.select}
                        value={form.category}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, category: e.target.value as DisclosureDocumentPayload["category"] }))
                        }
                    >
                        {ADMIN_CATEGORY_ORDER.map((c) => (
                            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                    </select>
                </div>

                <Input
                    id="document-title"
                    label="Название"
                    required
                    value={form.title}
                    error={errors.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />

                <fieldset className={styles.kind}>
                    <legend className={styles.fieldLabel}>Тип</legend>
                    <label>
                        <input type="radio" name="document-kind" checked={form.kind === "FILE"} onChange={() => setKind("FILE")} />
                        Файл PDF
                    </label>
                    <label>
                        <input type="radio" name="document-kind" checked={form.kind === "LINK"} onChange={() => setKind("LINK")} />
                        Ссылка на внешний сайт
                    </label>
                </fieldset>

                {form.kind === "FILE" ? (
                    <FileDropzone
                        id="document-url"
                        label="Файл"
                        value={form.url}
                        error={errors.url}
                        onUploaded={(url, fileName) =>
                            setForm((f) => ({
                                ...f,
                                url,
                                // Пустое название подсказываем именем файла — редактор поправит.
                                title: f.title.trim() ? f.title : fileName.replace(/\.pdf$/i, ""),
                            }))
                        }
                        onError={(title) => push({ tone: "error", title })}
                    />
                ) : (
                    <Input
                        id="document-url"
                        label="Ссылка"
                        required
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={form.url}
                        error={errors.url}
                        onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    />
                )}

                <Textarea
                    id="document-note"
                    label="Примечание"
                    max={DOCUMENT_NOTE_MAX}
                    value={form.note}
                    error={errors.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
            </Sheet>

            <Modal
                open={confirmClose}
                title="Закрыть без сохранения?"
                description="Введённое останется в черновике и восстановится, когда вы вернётесь к этой записи."
                cancelLabel="Продолжить правку"
                confirmLabel="Закрыть"
                onCancel={() => {
                    setConfirmClose(false);
                    setModalOpen(false);
                }}
                onConfirm={discard}
            />
        </>
    );
}
