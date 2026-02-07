"use server";

import { cookies } from "next/headers";
import type { ServiceInterfaceReq } from "@/app/api/interaface/ServiceInterfaceReq";
import {listAllServices} from "@/app/api/listAllServices";
import {ServiceInterfaceRes} from "@/app/api/interaface/ServiceInterfaceRes";
import {listOneServices} from "@/app/api/listOneService";
import {createService} from "@/app/api/service/createService";
import {DoctorInterfaceRes} from "@/app/api/interaface/DoctorInterfaceRes";
import {DoctorInterfaceReq} from "@/app/api/interaface/DoctorInterfaceReq";

const BACKEND_URL = process.env.BACKEND_URL!;

function buildCookieHeader(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    const all = cookieStore.getAll();
    return all.map(c => `${c.name}=${c.value}`).join("; ");
}

export async function actionCreateService(payload: ServiceInterfaceReq) {


    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore);

    const r = await fetch(`${BACKEND_URL}/api/cms/service`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            cookie: cookieHeader,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Create failed", r.status, txt);
        return null;
    }

    return await r.json().catch(() => null);
}

export async function actionListAllDoctors(): Promise<DoctorInterfaceRes[]> {

    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore);

    const r = await fetch(`${BACKEND_URL}/api/cms/doctors`, {
        method: "GET",
        headers: {
            accept: "application/json",
            cookie: cookieHeader,
        },
        cache: "no-store",
    });

    if (!r.ok) return [];
    return (await r.json().catch(() => [])) as DoctorInterfaceRes[];
}

export async function actionGetDoctor(id: number): Promise<DoctorInterfaceRes | null> {
    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore);

    const r = await fetch(`${BACKEND_URL}/api/cms/doctor/${id}`, {
        method: "GET",
        headers: {
            accept: "application/json",
            cookie: cookieHeader,
        },
        cache: "no-store",
    });

    if (!r.ok) return null;
    return (await r.json().catch(() => null)) as DoctorInterfaceRes | null;
}

export async function actionCreateDoctor(payload: DoctorInterfaceReq): Promise<DoctorInterfaceRes | null> {
    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore);

    const r = await fetch(`${BACKEND_URL}/api/cms/doctor`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            cookie: cookieHeader,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Create doctor failed", r.status, txt);
        return null;
    }

    return (await r.json().catch(() => null)) as DoctorInterfaceRes | null;
}

export async function actionPatchDoctor(
    id: number,
    payload: Partial<DoctorInterfaceReq>
): Promise<DoctorInterfaceRes | null> {
    const cookieStore = await cookies();
    const cookieHeader = buildCookieHeader(cookieStore);

    const r = await fetch(`${BACKEND_URL}/api/cms/doctors/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            cookie: cookieHeader,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
    });

    if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("Patch doctor failed", r.status, txt);
        return null;
    }

    return (await r.json().catch(() => null)) as DoctorInterfaceRes | null;
}

export async function actionListAll(): Promise<ServiceInterfaceRes[]> {
    return await listAllServices();
}

export async function actionListOne(id: number): Promise<ServiceInterfaceRes | null> {
    return await listOneServices(id);
}

export async function actionCreate(payload: ServiceInterfaceReq) {
    return await createService(payload);
}