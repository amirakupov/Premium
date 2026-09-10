import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL;

const nextConfig: NextConfig = {
    output: "standalone",
    experimental: {
        // Dropzone пропускает файлы до 5 МБ, а бэкенд — до 10 МБ, но сам файл
        // едет в server action, у которых дефолтный лимит тела 1 МБ:
        // всё, что тяжелее, падало с 413 «Body exceeded 1 MB limit».
        serverActions: { bodySizeLimit: "6mb" },
    },
    images: {
        formats: ["image/avif", "image/webp"],
        // Фото врачей/услуг загружаются через CMS с бэкенда.
        // TODO: сузить hostname до домена бэкенда.
        remotePatterns: [
            { protocol: "https", hostname: "**" },
            { protocol: "http", hostname: "**" },
        ],
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