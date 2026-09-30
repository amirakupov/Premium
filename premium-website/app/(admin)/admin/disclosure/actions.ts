"use server";

import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { backendErrorMessage } from "@/lib/admin/disclosure";
import { DISCLOSURE_TAG } from "@/lib/disclosure";
import type {
    ClinicRequisites,
    Disclosure,
    DisclosureDocument,
    DisclosureDocumentPayload,
    DmsPartner,
    Regulator,
} from "@/lib/types";

const BACKEND_URL = process.env.BACKEND_URL!;

/**
 * Результат вместо null, как в соседнем admin/actions.ts: здесь текст ошибки
 * бэкенда (неверный ИНН, «список устарел») нужен у поля, а не только в логе.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type RegulatorFields = { name: string; address: string; phone: string; site: string };
type PartnerFields = { name: string; site: string };

async function cookieHeader() {
    const store = await cookies();
    return store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
}

async function send<T>(path: string, method: string, body?: unknown): Promise<ActionResult<T>> {
    let r: Response;
    try {
        r = await fetch(`${BACKEND_URL}${path}`, {
            method,
            headers: {
                accept: "application/json",
                cookie: await cookieHeader(),
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
            cache: "no-store",
        });
    } catch (error) {
        console.error(`CMS ${method} ${path} недоступен`, error);
        return { ok: false, error: "Сервер недоступен — проверьте соединение" };
    }

    if (!r.ok) {
        const text = await r.text().catch(() => "");
        console.error(`CMS ${method} ${path} → ${r.status}`, text);
        return { ok: false, error: backendErrorMessage(r.status, text) };
    }
    if (r.status === 204) return { ok: true, data: null as T };
    return { ok: true, data: (await r.json()) as T };
}

/**
 * Изменение сразу помечает кеш витрины просроченным: следующий посетитель
 * /documents получит свежие данные, а не версию часовой давности.
 */
async function mutate<T>(path: string, method: string, body?: unknown): Promise<ActionResult<T>> {
    const result = await send<T>(path, method, body);
    if (result.ok) revalidateTag(DISCLOSURE_TAG, { expire: 0 });
    return result;
}

export async function actionLoadDisclosure(): Promise<ActionResult<Disclosure>> {
    return send<Disclosure>("/api/cms/disclosure", "GET");
}

export async function actionCreateDocument(p: DisclosureDocumentPayload) {
    return mutate<DisclosureDocument>("/api/cms/document", "POST", p);
}

export async function actionPatchDocument(id: number, p: Partial<DisclosureDocumentPayload>) {
    return mutate<DisclosureDocument>(`/api/cms/document/${id}`, "PATCH", p);
}

export async function actionDeleteDocument(id: number) {
    return mutate<null>(`/api/cms/document/${id}`, "DELETE");
}

export async function actionReorderDocuments(ids: number[]) {
    return mutate<null>("/api/cms/documents/order", "PATCH", { ids });
}

export async function actionPatchRequisites(p: Partial<ClinicRequisites>) {
    return mutate<ClinicRequisites>("/api/cms/requisites", "PATCH", p);
}

export async function actionCreateDmsPartner(p: PartnerFields) {
    return mutate<DmsPartner>("/api/cms/dms-partner", "POST", p);
}

export async function actionPatchDmsPartner(id: number, p: Partial<PartnerFields>) {
    return mutate<DmsPartner>(`/api/cms/dms-partner/${id}`, "PATCH", p);
}

export async function actionDeleteDmsPartner(id: number) {
    return mutate<null>(`/api/cms/dms-partner/${id}`, "DELETE");
}

export async function actionReorderDmsPartners(ids: number[]) {
    return mutate<null>("/api/cms/dms-partners/order", "PATCH", { ids });
}

export async function actionCreateRegulator(p: RegulatorFields) {
    return mutate<Regulator>("/api/cms/regulator", "POST", p);
}

export async function actionPatchRegulator(id: number, p: Partial<RegulatorFields>) {
    return mutate<Regulator>(`/api/cms/regulator/${id}`, "PATCH", p);
}

export async function actionDeleteRegulator(id: number) {
    return mutate<null>(`/api/cms/regulator/${id}`, "DELETE");
}

export async function actionReorderRegulators(ids: number[]) {
    return mutate<null>("/api/cms/regulators/order", "PATCH", { ids });
}
