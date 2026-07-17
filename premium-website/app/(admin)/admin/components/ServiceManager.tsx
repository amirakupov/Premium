"use client";

import { useCallback, useEffect, useState } from "react";
import type { Service, ServicePayload } from "@/lib/types";
import {
    actionCreateService,
    actionListAllServices,
    actionPatchService,
    actionUploadMedia,
} from "../actions";
import styles from "../admin.module.css";

const emptyForm: ServicePayload = {
    serviceName: "",
    slug: "",
    price: 0,
    imageSrc: "",
    description: "",
    longDescription: "",
};

export default function ServiceManager() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [createForm, setCreateForm] = useState<ServicePayload>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<ServicePayload>(emptyForm);

    const refresh = useCallback(async () => {
        setErr("");
        setLoading(true);
        try {
            setServices(await actionListAllServices());
        } catch (e) {
            console.error(e);
            setErr("Не удалось загрузить услуги");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    async function uploadImage(file: File, apply: (url: string) => void) {
        setErr("");
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const url = await actionUploadMedia(fd);
            if (!url) {
                setErr("Не удалось загрузить изображение");
                return;
            }
            apply(url);
        } finally {
            setLoading(false);
        }
    }

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setLoading(true);
        try {
            const created = await actionCreateService(createForm);
            if (!created) {
                setErr("Не удалось создать услугу");
                return;
            }
            setCreateForm(emptyForm);
            await refresh();
        } finally {
            setLoading(false);
        }
    }

    function startEdit(s: Service) {
        setEditingId(s.id);
        setEditForm({
            serviceName: s.serviceName ?? "",
            slug: s.slug ?? "",
            price: Number(s.price ?? 0),
            imageSrc: s.imageSrc ?? "",
            description: s.description ?? "",
            longDescription: s.longDescription ?? "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm(emptyForm);
    }

    async function onSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId) return;
        setErr("");
        setLoading(true);
        try {
            const updated = await actionPatchService(editingId, editForm);
            if (!updated) {
                setErr("Не удалось обновить услугу");
                return;
            }
            await refresh();
            cancelEdit();
        } finally {
            setLoading(false);
        }
    }

    const fields = (
        form: ServicePayload,
        setForm: React.Dispatch<React.SetStateAction<ServicePayload>>,
        setImage: (url: string) => void
    ) => (
        <>
            <input
                className={styles.input}
                placeholder="Название услуги"
                value={form.serviceName}
                onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
                required
            />
            <input
                className={styles.input}
                placeholder="Слаг (URL)"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
            />
            <input
                className={styles.input}
                placeholder="Цена"
                type="number"
                value={Number.isFinite(form.price) ? form.price : 0}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                required
            />
            <input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f, setImage);
                }}
            />
            <input
                className={styles.input}
                placeholder="Краткое описание"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <textarea
                className={styles.textarea}
                placeholder="Подробное описание"
                value={form.longDescription}
                onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))}
                rows={5}
            />
        </>
    );

    return (
        <section className={styles.card}>
            <h2 className={styles.cardTitle}>Услуги</h2>

            {err ? <div className={styles.error}>{err}</div> : null}

            <div className={styles.subTitle}>Создать услугу</div>
            <form onSubmit={onCreate} className={styles.form}>
                {fields(createForm, setCreateForm, (url) =>
                    setCreateForm((f) => ({ ...f, imageSrc: url }))
                )}
                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? "..." : "Создать"}
                </button>
            </form>

            <div className={styles.subTitle}>Редактирование</div>
            {editingId ? (
                <form onSubmit={onSaveEdit} className={styles.form}>
                    <div className={styles.muted}>ID услуги: <b>{editingId}</b></div>
                    {fields(editForm, setEditForm, (url) =>
                        setEditForm((f) => ({ ...f, imageSrc: url }))
                    )}
                    <div className={styles.buttonRow}>
                        <button type="submit" disabled={loading} className={styles.button}>
                            {loading ? "..." : "Сохранить"}
                        </button>
                        <button type="button" onClick={cancelEdit} disabled={loading} className={styles.buttonGhost}>
                            Отменить
                        </button>
                    </div>
                </form>
            ) : (
                <div className={styles.muted}>Нажмите «Изменить» у услуги в списке</div>
            )}

            <div className={styles.cardHeader}>
                <div className={styles.subTitle}>Все услуги</div>
                <button onClick={refresh} disabled={loading} className={styles.buttonGhost}>
                    {loading ? "..." : "Обновить"}
                </button>
            </div>

            <div className={styles.list}>
                {services.map((s) => (
                    <div key={s.id} className={styles.item}>
                        <div className={styles.itemRow}>
                            <div>
                                <div className={styles.itemName}>{s.serviceName}</div>
                                <div className={styles.muted}>{s.slug}</div>
                                <div>{s.price}</div>
                            </div>
                            <button
                                onClick={() => startEdit(s)}
                                disabled={loading}
                                className={styles.buttonGhost}
                            >
                                Изменить
                            </button>
                        </div>
                    </div>
                ))}
                {services.length === 0 ? <div className={styles.muted}>Пусто</div> : null}
            </div>
        </section>
    );
}
