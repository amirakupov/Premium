import Image from "next/image";
import Link from "next/link";
import { pickArt } from "@/lib/blog/images";
import { articleDateIso, formatArticleDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";
import styles from "./BlogCard.module.css";

/**
 * Ведущая карточка (featured) кладёт фото и текст в две колонки — на индексе
 * она первая и на всю ширину, иначе сетка из одинаковых плиток читается
 * как каталог, а не как блог.
 */
export default function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
    const art = pickArt(post, 0);
    const date = formatArticleDate(post.createdAt);

    return (
        <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
            <div className={styles.imageContainer}>
                <Image
                    src={art.cover}
                    alt={art.coverAlt}
                    fill
                    sizes={featured ? "(max-width: 860px) 92vw, 620px" : "(max-width: 860px) 92vw, 380px"}
                    className={styles.image}
                />
            </div>

            <div className={styles.text}>
                {date ? (
                    <time className={styles.date} dateTime={articleDateIso(post.createdAt)}>
                        {date}
                    </time>
                ) : null}
                <h2 className={styles.title}>
                    <Link href={`/blog/${post.slug}`} className={styles.titleLink}>
                        {post.title}
                    </Link>
                </h2>
                {post.metaDescription ? <p className={styles.excerpt}>{post.metaDescription}</p> : null}
                <span className={styles.more} aria-hidden="true">Читать →</span>
            </div>
        </article>
    );
}
