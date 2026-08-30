import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { inlineToText, parseArticle } from "@/lib/blog/article";
import { pickArt } from "@/lib/blog/images";
import { getBlogPostBySlug, listBlogPosts } from "@/lib/cms";
import { CLINIC, SITE_URL } from "@/lib/constants";
import { articleDateIso, formatArticleDate } from "@/lib/format";
import ArticleBody from "@/app/(site)/components/blog/ArticleBody";
import ArticleToc from "@/app/(site)/components/blog/ArticleToc";
import styles from "./page.module.css";

type Params = { params: Promise<{ slug: string }> };

const DESCRIPTION_LIMIT = 160;

/**
 * Черновик отсекаем и на своей стороне: бекенд анонимам его не отдаёт, но
 * страховка стоит одну строку, а цена ошибки — неотрецензированный
 * медицинский текст в открытом доступе.
 */
async function loadPublished(slug: string) {
    const post = await getBlogPostBySlug(slug);
    if (!post || post.status !== "PUBLISHED") return null;
    return post;
}

export async function generateStaticParams() {
    const posts = await listBlogPosts();
    return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    const post = await loadPublished(slug);
    if (!post) return { title: "Статья не найдена" };

    const article = parseArticle(post.body);
    const description =
        post.metaDescription?.trim() || article.plainText.slice(0, DESCRIPTION_LIMIT);
    const art = pickArt(post);

    return {
        title: post.title,
        description,
        alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
        openGraph: {
            type: "article",
            title: post.title,
            description,
            url: `${SITE_URL}/blog/${post.slug}`,
            images: [{ url: `${SITE_URL}${art.cover}` }],
            publishedTime: articleDateIso(post.createdAt) || undefined,
            modifiedTime: articleDateIso(post.updatedAt) || undefined,
        },
    };
}

export default async function BlogPostPage({ params }: Params) {
    const { slug } = await params;
    const post = await loadPublished(slug);
    if (!post) notFound();

    const article = parseArticle(post.body);
    const art = pickArt(post);
    const date = formatArticleDate(post.createdAt);
    const url = `${SITE_URL}/blog/${post.slug}`;

    const schema: unknown[] = [
        {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.metaDescription ?? article.plainText.slice(0, DESCRIPTION_LIMIT),
            image: `${SITE_URL}${art.cover}`,
            datePublished: articleDateIso(post.createdAt) || undefined,
            dateModified: articleDateIso(post.updatedAt) || undefined,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            author: { "@type": "Organization", name: CLINIC.fullName },
            publisher: { "@type": "Organization", name: CLINIC.fullName },
        },
    ];

    if (article.faq.length > 0) {
        schema.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: article.faq.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer
                        .map((block) => (block.kind === "list"
                            ? block.items.map(inlineToText).join(" ")
                            : inlineToText(block.content)))
                        .join(" "),
                },
            })),
        });
    }

    return (
        <article className={styles.container}>
            <header className={styles.hero}>
                <div className={styles.cover}>
                    <Image
                        src={art.cover}
                        alt={art.coverAlt}
                        fill
                        priority
                        sizes="100vw"
                        className={styles.coverImage}
                    />
                </div>
                {/* На узком экране заголовок уходит под фото: текст поверх
                    снимка при 360px нечитаем, сколько бы затемнения ни лить. */}
                <div className={styles.heroText}>
                    <h1 className={styles.title}>{post.title}</h1>
                    <p className={styles.meta}>
                        {date ? <time dateTime={articleDateIso(post.createdAt)}>{date}</time> : null}
                        {date ? <span aria-hidden="true"> · </span> : null}
                        <span>{article.readingMinutes} мин чтения</span>
                    </p>
                </div>
            </header>

            <div className={styles.layout}>
                <ArticleBody article={article} />
                <ArticleToc sections={article.sections} hasFaq={article.faq.length > 0} />
            </div>

            <footer className={styles.foot}>
                <p className={styles.disclaimer}>
                    Статья носит справочный характер и не заменяет консультацию врача.
                </p>
                <Link href="/contacts" className="btn btn--primary">Записаться на приём</Link>
            </footer>

            {/* Единственное место с dangerouslySetInnerHTML: JSON-LD не может быть
                текстовым потомком script — React экранировал бы кавычки. `<`
                заменяем на <, чтобы содержимое не могло закрыть тег. */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
                }}
            />
        </article>
    );
}
