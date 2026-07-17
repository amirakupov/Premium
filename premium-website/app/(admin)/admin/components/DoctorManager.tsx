"use client";

import { useCallback, useEffect, useState } from "react";
import type { Doctor, DoctorPayload } from "@/lib/types";
import {
    actionCreateDoctor,
    actionListAllDoctors,
    actionPatchDoctor,
    actionUploadMedia,
} from "../actions";
import styles from "../admin.module.css";

const emptyForm: DoctorPayload = {
    imgSrc: "",
    name: "",
    specialty: "",
    bio: "",
};

export default function DoctorManager() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [createForm, setCreateForm] = useState<DoctorPayload>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<DoctorPayload>(emptyForm);

    const refresh = useCallback(async () => {
        setErr("");
        setLoading(true);
        try {
            setDoctors(await actionListAllDoctors());
        } catch (e) {
            console.error(e);
            setErr("Не удалось загрузить врачей");
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
            const created = await actionCreateDoctor(createForm);
            if (!created) {
                setErr("Не удалось создать врача");
                return;
            }
            setCreateForm(emptyForm);
            await refresh();
        } finally {
            setLoading(false);
        }
    }

    function startEdit(d: Doctor) {
        setEditingId(d.id);
        setEditForm({
            imgSrc: d.imgSrc ?? "",
            name: d.name ?? "",
            specialty: d.specialty ?? "",
            bio: d.bio ?? "",
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
            const updated = await actionPatchDoctor(editingId, editForm);
            if (!updated) {
                setErr("Не удалось обновить врача");
                return;
            }
            await refresh();
            cancelEdit();
        } finally {
            setLoading(false);
        }
    }

    const fields = (
        form: DoctorPayload,
        setForm: React.Dispatch<React.SetStateAction<DoctorPayload>>,
        setImage: (url: string) => void
    ) => (
        <>
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
                placeholder="Полное имя"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
            />
            <input
                className={styles.input}
                placeholder="Специализация"
                value={form.specialty}
                onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                required
            />
            <textarea
                className={styles.textarea}
                placeholder="Биография"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
            />
        </>
    );

    return (
        <section className={styles.card}>
            <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Врачи</h2>
                <button onClick={refresh} disabled={loading} className={styles.buttonGhost}>
                    {loading ? "..." : "Обновить"}
                </button>
            </div>

            {err ? <div className={styles.error}>{err}</div> : null}

            <div className={styles.subTitle}>Создать врача</div>
            <form onSubmit={onCreate} className={styles.form}>
                {fields(createForm, setCreateForm, (url) =>
                    setCreateForm((f) => ({ ...f, imgSrc: url }))
                )}
                <button type="submit" disabled={loading} className={styles.button}>
                    {loading ? "..." : "Создать"}
                </button>
            </form>

            <div className={styles.subTitle}>Редактирование</div>
            {editingId ? (
                <form onSubmit={onSaveEdit} className={styles.form}>
                    <div className={styles.muted}>ID врача: <b>{editingId}</b></div>
                    {fields(editForm, setEditForm, (url) =>
                        setEditForm((f) => ({ ...f, imgSrc: url }))
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
                <div className={styles.muted}>Нажмите «Изменить» у врача в списке</div>
            )}

            <div className={styles.subTitle}>Все врачи</div>
            <div className={styles.list}>
                {doctors.map((d) => (
                    <div key={d.id} className={styles.item}>
                        <div className={styles.itemRow}>
                            <div>
                                <div className={styles.itemName}>{d.name}</div>
                                <div className={styles.muted}>{d.specialty}</div>
                                {d.imgSrc ? <div className={styles.muted}>{d.imgSrc}</div> : null}
                            </div>
                            <button
                                onClick={() => startEdit(d)}
                                disabled={loading}
                                className={styles.buttonGhost}
                            >
                                Изменить
                            </button>
                        </div>
                        {d.bio ? <div className={styles.itemBio}>{d.bio}</div> : null}
                    </div>
                ))}
                {doctors.length === 0 ? <div className={styles.muted}>Пусто</div> : null}
            </div>
        </section>
    );
}
