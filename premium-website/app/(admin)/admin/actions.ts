"use server";

import { cookies } from "next/headers";
import type { ServiceInterfaceReq } from "@/app/api/interaface/ServiceInterfaceReq";
import {listAllServices} from "@/app/api/listAllServices";
import {ServiceInterfaceRes} from "@/app/api/interaface/ServiceInterfaceRes";
import {listOneServices} from "@/app/api/listOneService";
import {createService} from "@/app/api/service/createService";

const BACKEND_URL = process.env.BACKEND_URL!;

export async function actionCreateService(payload: ServiceInterfaceReq) {
    const cookieHeader = cookies().toString();

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

export async function actionListAll(): Promise<ServiceInterfaceRes[]> {
    return await listAllServices();
}

export async function actionListOne(id: number): Promise<ServiceInterfaceRes | null> {
    return await listOneServices(id);
}

export async function actionCreate(payload: ServiceInterfaceReq) {
    return await createService(payload);
}