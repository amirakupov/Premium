import type { Metadata } from "next";
import { listBlogPosts } from "@/lib/cms";
import { CLINIC } from "@/lib/constants";
import BlogCard from "@/app/(site)/components/blog/BlogCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
    title: "Блог",
    description: `Статьи о неврологии от врачей ${CLINIC.name}: симптомы, обследования и лечение.`,
};

export default async function BlogIndexPage() {
    const posts = await listBlogPosts();

    return (
        <div className={styles.container}>
            <header className={styles.head}>
                <h1 className={styles.title}>Блог</h1>
                <p className={styles.subtitle}>
                    Разбираем симптомы и обследования простым языком. Статьи не заменяют приём врача.
                </p>
            </header>

            {posts.length === 0 ? (
                <p className={styles.empty}>Статей пока нет. Заглядывайте позже.</p>
            ) : (
                <div className={styles.grid}>
                    {posts.map((post, index) => (
                        <BlogCard key={post.slug} post={post} featured={index === 0} />
                    ))}
                </div>
            )}
        </div>
    );
}
