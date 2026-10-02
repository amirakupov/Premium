import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL;

/**
 * Оптимизатор картинок принимает только хост бэкенда. `hostname: "**"` для
 * http и https делал /_next/image открытым прокси: любой мог гонять через
 * сервер произвольные URL — трафик за наш счёт и вектор SSRF. Протокол берётся
 * из BACKEND_URL: в проде это https, http остаётся только для локального
 * бэкенда разработчика.
 */
const backend = (() => {
    if (!BACKEND_URL) return null;
    try {
        return new URL(BACKEND_URL);
    } catch {
        console.error(`next.config: BACKEND_URL не разбирается как URL: ${BACKEND_URL}`);
        return null;
    }
})();

const nextConfig: NextConfig = {
    output: "standalone",
    /* Измерительная обвязка perf-v3 (docs/perf-v3) включается сборкой с
       NEXT_PUBLIC_PERF_HARNESS=1. Значение пинится явно, иначе при
       неопределённой переменной Turbopack оставляет обращение к process.env в
       рантайме, и отладочные ветки (window.__neuron и т.п.) не вырезаются из
       прод-бандла, хотя и не выполняются. */
    env: {
        NEXT_PUBLIC_PERF_HARNESS: process.env.NEXT_PUBLIC_PERF_HARNESS ?? "0",
    },
    experimental: {
        // Dropzone пропускает файлы до 5 МБ, а бэкенд — до 10 МБ, но сам файл
        // едет в server action, у которых дефолтный лимит тела 1 МБ:
        // всё, что тяжелее, падало с 413 «Body exceeded 1 MB limit».
        serverActions: { bodySizeLimit: "6mb" },
    },
    images: {
        formats: ["image/avif", "image/webp"],
        // Фото врачей/услуг загружаются через CMS с бэкенда — и только с него.
        remotePatterns: backend
            ? [
                  {
                      protocol: backend.protocol === "http:" ? "http" : "https",
                      hostname: backend.hostname,
                      ...(backend.port ? { port: backend.port } : {}),
                  },
              ]
            : [],
    },
    // PDF раздела раскрытия раньше лежали в public/docs/. Ссылки на них
    // проиндексированы — ведём на страницу раздела, а не в 404.
    async redirects() {
        return [{ source: "/docs/:path*", destination: "/documents", permanent: true }];
    },
    // Бэкенд отдаёт media как корневой путь «/uploads/<uuid>.<ext>», но сами
    // файлы лежат только у него. Без прокси Next искал бы их в public/ и
    // отвечал 404 — и на сайте, и в админке. Проксируем на бэкенд.
    async rewrites() {
        if (!BACKEND_URL) {
            console.error("next.config: BACKEND_URL не задан — /uploads/* не будет проксироваться");
            return [];
        }
        return [{ source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` }];
    },
};

export default nextConfig;