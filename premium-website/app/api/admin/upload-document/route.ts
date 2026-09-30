import { type NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL!;

/** Бэкенд режет на 32 МБ (max-request-size); незачем гнать больше по сети. */
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

/**
 * Прокси загрузки PDF. Не server action: у actions общий лимит тела 6 МБ
 * (next.config.ts), и тело там целиком лежит в памяти. Здесь поток уходит
 * на бэкенд как есть. Права проверяет только бэкенд — по куке, которую мы
 * пробрасываем; middleware.ts этот путь не охраняет (matcher — только /admin и /login).
 */
export const POST = async (req: NextRequest) => {
    const length = Number(req.headers.get("content-length") ?? "0");
    if (length > MAX_REQUEST_BYTES) {
        return new NextResponse("Файл больше 30 МБ", { status: 413 });
    }

    let r: Response;
    try {
        r = await fetch(`${BACKEND_URL}/api/cms/media/document`, {
            method: "POST",
            headers: {
                "content-type": req.headers.get("content-type") ?? "",
                cookie: req.headers.get("cookie") ?? "",
            },
            body: req.body,
            // Без duplex Node-овый fetch отказывается отправлять поток.
            duplex: "half",
            cache: "no-store",
        } as RequestInit & { duplex: "half" });
    } catch (error) {
        console.error("CMS upload-document недоступен", error);
        return new NextResponse("Сервер недоступен", { status: 502 });
    }

    return new NextResponse(await r.text(), {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "text/plain; charset=utf-8" },
    });
};
