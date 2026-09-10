import type { MetadataRoute } from "next";
import { listAllServices, listBlogPosts } from "@/lib/cms";
import { SITE_URL } from "@/lib/constants";

// URL услуг и постов берутся из CMS — на билде бэкенд недоступен, и статический
// sitemap.xml навсегда остался бы без них. Подробнее: app/(site)/doctors/page.tsx.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPages: MetadataRoute.Sitemap = [
        "",
        "/services",
        "/doctors",
        "/blog",
        "/eeg",
        "/contacts",
        "/documents",
        "/privacy",
    ].map((path) => ({
        url: `${SITE_URL}${path}`,
        changeFrequency: "monthly",
        priority: path === "" ? 1 : 0.7,
    }));

    const services = await listAllServices();
    const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
        url: `${SITE_URL}/services/${s.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    const posts = await listBlogPosts();
    const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    return [...staticPages, ...servicePages, ...blogPages];
}
