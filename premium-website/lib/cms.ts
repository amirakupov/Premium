import { normalizeImageSrc } from "./image";
import type { Doctor, Service } from "./types";

const BACKEND_URL = process.env.BACKEND_URL;

/** Публичный контент меняется редко — час ISR вместо запроса на каждый просмотр. */
const REVALIDATE_SECONDS = 3600;

async function fetchCms(path: string): Promise<unknown> {
    if (!BACKEND_URL) {
        console.error(`CMS: переменная BACKEND_URL не задана (запрос ${path})`);
        return null;
    }
    try {
        const response = await fetch(`${BACKEND_URL}${path}`, {
            headers: { accept: "application/json" },
            next: { revalidate: REVALIDATE_SECONDS },
        });
        if (!response.ok) {
            console.error(`CMS: GET ${path} → ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`CMS: GET ${path} недоступен`, error);
        return null;
    }
}

export async function listAllServices(): Promise<Service[]> {
    const json = await fetchCms("/api/cms/services");
    if (!Array.isArray(json)) return [];
    return (json as Service[]).map((s) => ({ ...s, imageSrc: normalizeImageSrc(s.imageSrc) }));
}

export async function listAllDoctors(): Promise<Doctor[]> {
    const json = await fetchCms("/api/cms/doctors");
    if (!Array.isArray(json)) return [];
    return (json as Doctor[]).map((d) => ({ ...d, imgSrc: normalizeImageSrc(d.imgSrc) }));
}
