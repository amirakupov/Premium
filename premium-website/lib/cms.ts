import { normalizeImageSrc } from "./image";
import { DISCLOSURE_TAG } from "./disclosure";
import type { BlogPost, Disclosure, Doctor, Service } from "./types";

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

/** Опубликованные посты, свежие сверху. Черновики бекенд анонимам не отдаёт. */
export async function listBlogPosts(): Promise<BlogPost[]> {
    const json = await fetchCms("/api/cms/blog");
    if (!Array.isArray(json)) return [];
    return (json as BlogPost[])
        .filter((post) => post.status === "PUBLISHED")
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    const json = await fetchCms(`/api/cms/blog/${encodeURIComponent(slug)}`);
    if (!json || typeof json !== "object") return null;
    return json as BlogPost;
}

/**
 * Проверка формы ответа: витрина печатает раздел по постановлению, и
 * «пустой, потому что пришло не то» опаснее явной ошибки.
 */
export function normalizeDisclosure(raw: unknown): Disclosure {
    const value = raw as Partial<Disclosure> | null;
    if (
        !value ||
        typeof value.requisites !== "object" ||
        value.requisites === null ||
        !Array.isArray(value.documents) ||
        !Array.isArray(value.dmsPartners) ||
        !Array.isArray(value.regulators)
    ) {
        throw new Error("CMS: /api/cms/disclosure вернул данные неверной формы");
    }
    return value as Disclosure;
}

/**
 * В отличие от fetchCms, бросает. Пустой раздел раскрытия, закешированный на
 * час, — это нарушение постановления, а не деградация. Если сбой случится при
 * фоновой ревалидации, Next продолжит отдавать прошлые данные; если данных
 * ещё не было — страница покажет error.tsx.
 */
export async function getDisclosure(): Promise<Disclosure> {
    if (!BACKEND_URL) throw new Error("CMS: переменная BACKEND_URL не задана");
    const response = await fetch(`${BACKEND_URL}/api/cms/disclosure`, {
        headers: { accept: "application/json" },
        next: { tags: [DISCLOSURE_TAG], revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) throw new Error(`CMS: GET /api/cms/disclosure → ${response.status}`);
    return normalizeDisclosure(await response.json());
}
