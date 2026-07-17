"use server";

import { cookies } from "next/headers";
import type { Doctor, DoctorPayload, Service, ServicePayload } from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_URL!;

async function cookieHeader() {
    const store = await cookies();
    return store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

async function cmsRequest<T>(
    path: string,
    init: { method?: string; body?: unknown } = {}
): Promise<T | null> {
    const r = await fetch(`${BACKEND_URL}${path}`, {
        method: init.method ?? "GET",
        headers: {
            accept: "application/json",
            cookie: await cookieHeader(),
            ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error(`CMS ${init.method ?? "GET"} ${path} → ${r.status}`, txt);
        return null;
    }
    return (await r.json().catch(() => null)) as T | null;
}

export async function actionListAllServices(): Promise<Service[]> {
    const list = await cmsRequest<Service[]>("/api/cms/services");
    return Array.isArray(list) ? list : [];
}

export async function actionCreateService(payload: ServicePayload) {
    return cmsRequest<Service>("/api/cms/service", { method: "POST", body: payload });
}

export async function actionPatchService(id: number, payload: Partial<ServicePayload>) {
    return cmsRequest<Service>(`/api/cms/service/${id}`, { method: "PATCH", body: payload });
}

export async function actionListAllDoctors(): Promise<Doctor[]> {
    const list = await cmsRequest<Doctor[]>("/api/cms/doctors");
    return Array.isArray(list) ? list : [];
}

export async function actionCreateDoctor(payload: DoctorPayload) {
    return cmsRequest<Doctor>("/api/cms/doctor", { method: "POST", body: payload });
}

export async function actionPatchDoctor(id: number, payload: Partial<DoctorPayload>) {
    return cmsRequest<Doctor>(`/api/cms/doctors/${id}`, { method: "PATCH", body: payload });
}

export async function actionUploadMedia(formData: FormData): Promise<string | null> {
    const r = await fetch(`${BACKEND_URL}/api/cms/media/upload`, {
        method: "POST",
        headers: { cookie: await cookieHeader() },
        body: formData,
        cache: "no-store",
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("CMS upload failed", r.status, txt);
        return null;
    }

    const json = (await r.json().catch(() => null)) as { url?: string } | null;
    return json?.url ?? null;
}
