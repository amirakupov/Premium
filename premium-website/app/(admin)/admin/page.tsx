"use client";

import { useEffect, useState } from "react";
import type { ServiceInterfaceReq } from "@/app/api/interaface/ServiceInterfaceReq";
import type { ServiceInterfaceRes } from "@/app/api/interaface/ServiceInterfaceRes";
import {actionCreateService, actionListAll, actionListOne, actionPatchService, actionUploadMedia} from "./actions";
import {
    actionCreateDoctor,
    actionPatchDoctor,
    actionListAllDoctors,
    actionGetDoctor,
} from "./actions";
import {DoctorInterfaceRes} from "@/app/api/interaface/DoctorInterfaceRes";
import {black} from "next/dist/lib/picocolors";

export default function AdminPage() {
    const [services, setServices] = useState<ServiceInterfaceRes[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    // form
    const [serviceName, setServiceName] = useState("");
    const [slug, setSlug] = useState("");
    const [price, setPrice] = useState<number>(0);
    const [imageSrc, setImageSrc] = useState("");
    const [description, setDescription] = useState("");
    const [longDescription, setLongDescription] = useState("");

    // get one
    const [oneId, setOneId] = useState<number>(0);
    const [one, setOne] = useState<ServiceInterfaceRes | null>(null);

    const [doctors, setDoctors] = useState<DoctorInterfaceRes[]>([]);

    // create doctor form
    const [dImgSrc, setDImgSrc] = useState("");
    const [dName, setDName] = useState("");
    const [dSpecialty, setDSpecialty] = useState("");
    const [dBio, setDBio] = useState("");

    // patch
    const [patchId, setPatchId] = useState<number>(0);

    // get one doctor
    const [docOneId, setDocOneId] = useState<number>(0);
    const [docOne, setDocOne] = useState<DoctorInterfaceRes | null>(null);

    const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);

    const [editImgSrc, setEditImgSrc] = useState("");
    const [editName, setEditName] = useState("");
    const [editSpecialty, setEditSpecialty] = useState("");
    const [editBio, setEditBio] = useState("");

    const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

    const [editServiceName, setEditServiceName] = useState("");
    const [editSlug, setEditSlug] = useState("");
    const [editPrice, setEditPrice] = useState<number>(0);
    const [editImageSrc, setEditImageSrc] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editLongDescription, setEditLongDescription] = useState("");


    function startEditService(s: ServiceInterfaceRes) {
        setEditingServiceId(s.id);

        setEditServiceName((s as any).serviceName ?? (s as any).service_name ?? "");
        setEditSlug((s as any).slug ?? "");
        setEditPrice(Number((s as any).price ?? 0));
        setEditImageSrc((s as any).imageSrc ?? (s as any).image_src ?? "");
        setEditDescription((s as any).description ?? "");
        setEditLongDescription((s as any).longDescription ?? (s as any).long_description ?? "");
    }

    function cancelEditService() {
        setEditingServiceId(null);
        setEditServiceName("");
        setEditSlug("");
        setEditPrice(0);
        setEditImageSrc("");
        setEditDescription("");
        setEditLongDescription("");
    }

    async function saveEditService(e: React.FormEvent) {
        e.preventDefault();
        if (!editingServiceId) return;

        setErr("");
        setLoading(true);
        try {
            const patch: Partial<ServiceInterfaceReq> = {
                serviceName: editServiceName,
                slug: editSlug,
                price: editPrice,
                imageSrc: editImageSrc,
                description: editDescription,
                longDescription: editLongDescription,
            };

            const updated = await actionPatchService(editingServiceId, patch);
            if (!updated) {
                setErr("Update service failed");
                return;
            }

            await refresh();
            cancelEditService();
        } finally {
            setLoading(false);
        }
    }

    function startEdit(d: DoctorInterfaceRes) {
        setEditingDoctorId(d.id);
        setEditImgSrc(d.imgSrc ?? "");
        setEditName(d.name ?? "");
        setEditSpecialty(d.specialty ?? "");
        setEditBio(d.bio ?? "");
    }

    function cancelEdit() {
        setEditingDoctorId(null);
        setEditImgSrc("");
        setEditName("");
        setEditSpecialty("");
        setEditBio("");
    }

    async function saveEditDoctor(e: React.FormEvent) {
        e.preventDefault();
        if (!editingDoctorId) return;

        setErr("");
        setLoading(true);
        try {
            const payload = {
                imgSrc: editImgSrc,
                name: editName,
                specialty: editSpecialty,
                bio: editBio,
            };

            const updated = await actionPatchDoctor(editingDoctorId, payload as any);
            if (!updated) {
                setErr("Update doctor failed");
                return;
            }

            await refreshDoctors();
            cancelEdit();
        } finally {
            setLoading(false);
        }
    }

    async function refreshDoctors() {
        const list = await actionListAllDoctors();
        setDoctors(list);
    }

    async function refresh() {
        setErr("");
        setLoading(true);
        try {
            const list = await actionListAll();
            setServices(list);
        } catch (e) {
            console.error(e);
            setErr("Failed to load services");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function onCreateDoctor(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setLoading(true);

        const payload = {
            imgSrc: dImgSrc,
            name: dName,
            specialty: dSpecialty,
            bio: dBio,
        };

        try {
            const created = await actionCreateDoctor(payload as any);
            if (!created) {
                setErr("Create doctor failed");
                return;
            }
            setDImgSrc(""); setDName(""); setDSpecialty(""); setDBio("");
            await refreshDoctors();
        } finally {
            setLoading(false);
        }
    }

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setLoading(true);

        const payload: ServiceInterfaceReq = {
            serviceName,
            slug,
            price,
            imageSrc,
            description,
            longDescription,
        } as any;

        try {
            const created = await actionCreateService(payload);
            if (!created) {
                setErr("Create failed");
                return;
            }
            // очистим форму
            setServiceName("");
            setSlug("");
            setPrice(0);
            setImageSrc("");
            setDescription("");
            setLongDescription("");
            await refresh();
        } catch (e) {
            console.error(e);
            setErr("Create error");
        } finally {
            setLoading(false);
        }
    }
    async function onPatchDoctor(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setLoading(true);

        const patchPayload: any = {};
        if (dImgSrc) patchPayload.imgSrc = dImgSrc;
        if (dName) patchPayload.name = dName;
        if (dSpecialty) patchPayload.specialty = dSpecialty;
        if (dBio) patchPayload.bio = dBio;

        try {
            const updated = await actionPatchDoctor(patchId, patchPayload);
            if (!updated) {
                setErr("Patch doctor failed");
                return;
            }
            await refreshDoctors();
        } finally {
            setLoading(false);
        }
    }
    async function onGetDoctor(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setDocOne(null);
        try {
            const res = await actionGetDoctor(docOneId);
            setDocOne(res);
            if (!res) setErr("Doctor not found");
        } finally {
            setLoading(false);
        }
    }
    async function onGetOne(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        setLoading(true);
        setOne(null);

        try {
            const res = await actionListOne(oneId);
            setOne(res);
            if (!res) setErr("Not found / request failed");
        } catch (e) {
            console.error(e);
            setErr("Failed to load service");
        } finally {
            setLoading(false);
        }
    }
    async function onLogout() {
        setLoading(true);
        setErr("");
        try {
            const r = await fetch("/api/logout", {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            });

            if (!r.ok) {
                const t = await r.text().catch(() => "");
                setErr("Logout failed: " + r.status + " " + t);
                return;
            }

            window.location.href = "/login";
        } finally {
            setLoading(false);
        }
    }

    async function uploadImageAndSet(
        file: File,
        setValue: (url: string) => void
    ) {
        setErr("");
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);

            const url = await actionUploadMedia(fd);
            if (!url) {
                setErr("Upload failed");
                return;
            }

            setValue(url); // ✅ сюда запишется путь
        } finally {
            setLoading(false);
        }
    }

    const S = {
        page: { padding: 24, maxWidth: 1200, margin: "0 auto", color: "pink", backgroundColor: "pink"},
        header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
        title: { fontSize: 28, fontWeight: 800, margin: 0, color: "#111827"},
        grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" },
        card: { border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, background: "white" },
        cardTitle: { fontSize: 16, fontWeight: 800, margin: "0 0 12px 0", color: "#111827"  },
        subTitle: { fontSize: 13, fontWeight: 700, margin: "12px 0 8px 0", color: "#111827" },
        form: { display: "grid", gap: 10 },
        row: { display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, alignItems: "center" as const },
        input: {
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            background: "white",
            color: "#111827",
            caretColor: "#111827",
        },
        textarea: {
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            resize: "vertical",
            background: "white",
            color: "#111827",
            caretColor: "#111827",
        },
        button: { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#111827", color: "white", cursor: "pointer" },
        buttonGhost: { padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "black", cursor: "pointer" },
        error: { marginBottom: 12, padding: 10, border: "1px solid #fca5a5", background: "#fff1f2", borderRadius: 12 },
        list: { display: "grid", gap: 10, marginTop: 12 },
        item: { padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" },
        muted: { color: "#6b7280", fontSize: 12 },
        pre: { whiteSpace: "pre-wrap" as const, background: "#f9fafb", padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" },
    };

    return (
        <main style={S.page}>
            <div style={S.header}>
                <h1 style={S.title}>пикми админка</h1>
                <button onClick={onLogout} disabled={loading} style={S.button}>
                    {loading ? "..." : "логаут"}
                </button>
            </div>

            {err ? <div style={S.error}>{err}</div> : null}

            <div style={S.grid}>
                <section style={S.card}>
                    <h2 style={S.cardTitle}>сервисы</h2>

                    <div style={S.subTitle}>создать новый сервис</div>
                    <form onSubmit={onCreate} style={S.form}>
                        <input style={S.input} placeholder="имя сервиса" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
                        <input style={S.input} placeholder="слаг" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                        <input style={S.input} placeholder="цена" type="number" value={Number.isFinite(price) ? price : 0} onChange={(e) => setPrice(Number(e.target.value))} required />
                        <input
                            type="file"
                            accept="image/*"
                            disabled={loading}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImageAndSet(f, setImageSrc);
                            }}
                        />
                        <input style={S.input} placeholder="описание" value={description} onChange={(e) => setDescription(e.target.value)} />
                        <textarea style={S.textarea} placeholder="большое описание" value={longDescription} onChange={(e) => setLongDescription(e.target.value)} rows={5} />
                        <button type="submit" disabled={loading} style={S.button}>
                            {loading ? "..." : "создать"}
                        </button>
                    </form>

                    <div style={S.subTitle}>обновить сервис</div>
                    {editingServiceId ? (
                        <form onSubmit={saveEditService} style={S.form}>
                            <div style={{ ...S.muted, marginTop: -6 }}>
                                Editing service ID: <b>{editingServiceId}</b>
                            </div>

                            <input style={S.input} placeholder="имя сервиса" value={editServiceName}
                                   onChange={(e) => setEditServiceName(e.target.value)} required />

                            <input style={S.input} placeholder="слаг" value={editSlug}
                                   onChange={(e) => setEditSlug(e.target.value)} required />

                            <input style={S.input} placeholder="цена" type="number"
                                   value={Number.isFinite(editPrice) ? editPrice : 0}
                                   onChange={(e) => setEditPrice(Number(e.target.value))} required />

                            <input
                                type="file"
                                accept="image/*"
                                disabled={loading}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadImageAndSet(f, setEditImageSrc);
                                }}
                            />

                            <input style={S.input} placeholder="описание" value={editDescription}
                                   onChange={(e) => setEditDescription(e.target.value)} />

                            <textarea style={S.textarea} placeholder="большое описание" value={editLongDescription}
                                      onChange={(e) => setEditLongDescription(e.target.value)} rows={5} />

                            <div style={{ display: "flex", gap: 10 }}>
                                <button type="submit" disabled={loading} style={S.button}>
                                    {loading ? "..." : "сохранить"}
                                </button>
                                <button type="button" onClick={cancelEditService} disabled={loading} style={S.buttonGhost}>
                                    отменить
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div style={S.muted}>нажми на Edit у сервиса ниже</div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                        <div style={S.subTitle}>все сервисы</div>
                        <button onClick={refresh} disabled={loading} style={S.buttonGhost}>
                            {loading ? "..." : "обновить"}
                        </button>
                    </div>

                    <div style={S.list}>
                        {services.map((s: any) => (
                            <div key={String(s.id ?? s.slug)} style={S.item}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{s.serviceName ?? s.service_name ?? s.name}</div>
                                        <div style={S.muted}>{s.slug}</div>
                                        <div style={{ marginTop: 6 }}>{s.price}</div>
                                    </div>

                                    <button
                                        onClick={() => startEditService(s)}
                                        disabled={loading}
                                        style={S.buttonGhost}
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                        ))}
                        {services.length === 0 ? <div style={S.muted}>пусто</div> : null}
                    </div>
                </section>

                <section style={S.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={S.cardTitle}>врачи</h2>
                        <button onClick={refreshDoctors} disabled={loading} style={S.buttonGhost}>
                            {loading ? "..." : "обновить"}
                        </button>
                    </div>

                    {/* CREATE */}
                    <div style={S.subTitle}>создать врача</div>
                    <form onSubmit={onCreateDoctor} style={S.form}>
                        <input
                            type="file"
                            accept="image/*"
                            disabled={loading}
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImageAndSet(f, setDImgSrc);
                            }}
                        />
                        <input style={S.input} placeholder="полное имя" value={dName} onChange={(e) => setDName(e.target.value)} required />
                        <input style={S.input} placeholder="специализация" value={dSpecialty} onChange={(e) => setDSpecialty(e.target.value)} required />
                        <textarea style={S.textarea} placeholder="биография" value={dBio} onChange={(e) => setDBio(e.target.value)} rows={4} />
                        <button type="submit" disabled={loading} style={S.button}>
                            {loading ? "..." : "создать"}
                        </button>
                    </form>

                    {/* EDIT */}
                    <div style={S.subTitle}>обновить доктора</div>
                    {editingDoctorId ? (
                        <form onSubmit={saveEditDoctor} style={S.form}>
                            <div style={{ ...S.muted, marginTop: -6 }}>
                                Editing doctor ID: <b>{editingDoctorId}</b>
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                disabled={loading}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadImageAndSet(f, setEditImgSrc);
                                }}
                            />
                            <input style={S.input} placeholder="полное имя" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                            <input style={S.input} placeholder="специальность" value={editSpecialty} onChange={(e) => setEditSpecialty(e.target.value)} required />
                            <textarea style={S.textarea} placeholder="биография" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={4} />

                            <div style={{ display: "flex", gap: 10 }}>
                                <button type="submit" disabled={loading} style={S.button}>
                                    {loading ? "..." : "сохранить"}
                                </button>
                                <button type="button" onClick={cancelEdit} disabled={loading} style={S.buttonGhost}>
                                    отменить
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div style={S.muted}>нажми на "изменить" на кнопочке снизу</div>
                    )}

                    {/* LIST */}
                    <div style={S.subTitle}>все врачи</div>
                    <div style={S.list}>
                        {doctors.map((d: any) => (
                            <div key={String(d.id)} style={S.item}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{d.name}</div>
                                        <div style={S.muted}>{d.specialty}</div>
                                        {d.imgSrc ? <div style={S.muted}>{d.imgSrc}</div> : null}
                                    </div>

                                    <button
                                        onClick={() => startEdit(d)}
                                        disabled={loading}
                                        style={S.buttonGhost}
                                        title="Load doctor into the update form"
                                    >
                                        Edit
                                    </button>
                                </div>

                                {d.bio ? <div style={{ marginTop: 8, fontSize: 13, color: "#111827" }}>{d.bio}</div> : null}
                            </div>
                        ))}

                        {doctors.length === 0 ? <div style={S.muted}>пусто</div> : null}
                    </div>
                </section>
            </div>
        </main>
    );