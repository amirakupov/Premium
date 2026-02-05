"use client";

import { useEffect, useState } from "react";
import type { ServiceInterfaceReq } from "@/app/api/interaface/ServiceInterfaceReq";
import type { ServiceInterfaceRes } from "@/app/api/interaface/ServiceInterfaceRes";
import {actionCreateService, actionListAll, actionListOne} from "./actions";

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

    return (
        <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>CMS Admin</h1>

            {err ? (
                <div style={{ marginBottom: 12, padding: 10, border: "1px solid #fca5a5", background: "#fff1f2" }}>
                    {err}
                </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Create service</h2>

                    <form onSubmit={onCreate} style={{ display: "grid", gap: 10 }}>
                        <input placeholder="serviceName" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
                        <input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                        <input
                            placeholder="price"
                            type="number"
                            value={Number.isFinite(price) ? price : 0}
                            onChange={(e) => setPrice(Number(e.target.value))}
                            required
                        />
                        <input placeholder="imageSrc" value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} />
                        <input placeholder="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        <textarea
                            placeholder="longDescription"
                            value={longDescription}
                            onChange={(e) => setLongDescription(e.target.value)}
                            rows={5}
                        />
                        <button type="submit" disabled={loading} style={{ padding: "10px 12px" }}>
                            {loading ? "..." : "Create"}
                        </button>
                    </form>
                </section>

                {/* GET ONE */}
                <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Get one service</h2>

                    <form onSubmit={onGetOne} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        <input
                            placeholder="id"
                            type="number"
                            value={oneId}
                            onChange={(e) => setOneId(Number(e.target.value))}
                            style={{ width: 120 }}
                        />
                        <button type="submit" disabled={loading} style={{ padding: "10px 12px" }}>
                            {loading ? "..." : "Get"}
                        </button>
                    </form>

                    {one ? (
                        <pre style={{ whiteSpace: "pre-wrap", background: "#f9fafb", padding: 12, borderRadius: 10 }}>
              {JSON.stringify(one, null, 2)}
            </pre>
                    ) : (
                        <div style={{ color: "#6b7280" }}>No item loaded</div>
                    )}
                </section>
            </div>

            <section style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>All services</h2>
                    <button onClick={refresh} disabled={loading} style={{ padding: "10px 12px" }}>
                        {loading ? "..." : "Refresh"}
                    </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                    {services.map((s: any) => (
                        <div key={String(s.id ?? s.slug ?? Math.random())} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                            <div style={{ fontWeight: 700 }}>{s.serviceName ?? s.service_name ?? s.name}</div>
                            <div style={{ color: "#6b7280" }}>{s.slug}</div>
                            <div>{s.price}</div>
                        </div>
                    ))}
                    {services.length === 0 ? <div style={{ color: "#6b7280" }}>Empty</div> : null}
                </div>
            </section>
        </main>
    );
}