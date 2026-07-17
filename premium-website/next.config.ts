import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    images: {
        formats: ["image/avif", "image/webp"],
        // Фото врачей/услуг загружаются через CMS с бэкенда.
        // TODO: сузить hostname до домена бэкенда.
        remotePatterns: [
            { protocol: "https", hostname: "**" },
            { protocol: "http", hostname: "**" },
        ],
    },
};

export default nextConfig;
