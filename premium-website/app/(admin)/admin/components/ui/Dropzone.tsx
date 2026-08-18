"use client";

import Image from "next/image";
import { type DragEvent, useId, useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { actionUploadMedia } from "../../actions";
import Button from "./Button";
import styles from "./Dropzone.module.css";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 5 * 1024 * 1024;

export default function Dropzone({
    label,
    value,
    onChange,
    onError,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    onError: (message: string) => void;
}) {
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const [busy, setBusy] = useState(false);

    async function upload(file: File) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
            onError("Подойдёт JPG, PNG или WebP");
            return;
        }
        if (file.size > MAX_BYTES) {
            onError("Файл тяжелее 5 МБ");
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const url = await actionUploadMedia(fd);
            if (!url) {
                onError("Не удалось загрузить изображение");
                return;
            }
            onChange(url);
        } catch {
            // Экшен возвращает null на ответ не-2xx, но сам fetch при обрыве
            // сети бросает. Без catch это необработанный reject: тоста нет,
            // и пользователь видит только погасший индикатор.
            onError("Сеть недоступна — изображение не загрузилось");
        } finally {
            setBusy(false);
        }
    }

    function onDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
    }

    return (
        <div className={styles.field}>
            <span className={styles.label} id={`${inputId}-label`}>{label}</span>
            <div
                className={`${styles.zone} ${over ? styles.over : ""}`}
                onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
            >
                {value ? (
                    <Image
                        src={value}
                        alt=""
                        width={118}
                        height={118}
                        className={styles.preview}
                        unoptimized
                    />
                ) : (
                    <span aria-hidden="true" className={styles.icon}><FiUploadCloud /></span>
                )}
                <div className={styles.copy}>
                    <p className={styles.hint}>
                        {busy ? "Загружаем…" : "Перетащите файл или выберите вручную"}
                    </p>
                    <p className={styles.meta}>JPG, PNG или WebP, до 5 МБ</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    loading={busy}
                    busyLabel="Загружаем…"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={`${inputId}-label`}
                >
                    Выбрать файл
                </Button>
                {/* Настоящий input скрыт, но остаётся в потоке — им пользуется клавиатура. */}
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    className={styles.input}
                    accept={ACCEPTED_TYPES.join(",")}
                    disabled={busy}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void upload(file);
                        e.target.value = "";
                    }}
                />
                {busy ? <span aria-hidden="true" className={styles.progress} /> : null}
            </div>
        </div>
    );
}
