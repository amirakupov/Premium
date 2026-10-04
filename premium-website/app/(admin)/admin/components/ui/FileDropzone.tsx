"use client";

import { type DragEvent, useRef, useState } from "react";
import { FiFileText, FiUploadCloud } from "react-icons/fi";
import { backendErrorMessage, checkPdfFile, formatBytes } from "@/lib/admin/disclosure";
import Button from "./Button";
import styles from "./FileDropzone.module.css";

type Uploaded = { name: string; size: number };

/**
 * Загрузка PDF для раздела раскрытия. Отдельно от Dropzone картинок: другой
 * путь (route handler, а не server action — файлы до 30 МБ), нет превью,
 * вместо него — имя и размер загруженного файла.
 */
export default function FileDropzone({
    id,
    label,
    value,
    error,
    onUploaded,
    onError,
}: {
    id: string;
    label: string;
    value: string;
    error?: string;
    onUploaded: (url: string, fileName: string, size: number) => void;
    onError: (message: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const [busy, setBusy] = useState(false);
    const [uploaded, setUploaded] = useState<Uploaded | null>(null);

    async function upload(file: File) {
        const problem = checkPdfFile(file);
        if (problem) return onError(problem);
        setBusy(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const r = await fetch("/api/admin/upload-document", { method: "POST", body });
            const text = await r.text();
            if (!r.ok) return onError(backendErrorMessage(r.status, text));
            const { url } = JSON.parse(text) as { url: string };
            setUploaded({ name: file.name, size: file.size });
            onUploaded(url, file.name, file.size);
        } catch {
            onError("Сеть недоступна — файл не загрузился");
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
    }

    const errorId = `${id}-error`;

    return (
        <div className={styles.field}>
            <span className={styles.label} id={`${id}-label`}>{label}</span>
            <div
                className={`${styles.zone} ${over ? styles.over : ""} ${error ? styles.invalid : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
                aria-busy={busy}
            >
                {value ? (
                    <div className={styles.current}>
                        <FiFileText aria-hidden="true" />
                        <span className={styles.fileName}>
                            {uploaded ? `${uploaded.name} · ${formatBytes(uploaded.size)}` : "Файл загружен"}
                        </span>
                        <a href={value} target="_blank" rel="noreferrer" className={styles.open}>
                            Открыть
                        </a>
                    </div>
                ) : (
                    <div className={styles.hint}>
                        <FiUploadCloud aria-hidden="true" />
                        <span>Перетащите PDF сюда — до 30 МБ</span>
                    </div>
                )}
                <Button
                    id={id}
                    size="sm"
                    variant="ghost"
                    loading={busy}
                    busyLabel="Загружаем…"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={error ? errorId : undefined}
                    aria-labelledby={`${id}-label ${id}`}
                >
                    {value ? "Заменить файл" : "Выбрать файл"}
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                    }}
                />
            </div>
            {error ? (
                <p id={errorId} role="alert" className={styles.error}>{error}</p>
            ) : null}
        </div>
    );
}
