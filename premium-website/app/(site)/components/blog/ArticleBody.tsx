import Image from "next/image";
import EegLine from "@/app/(site)/components/EegLine";
import { INLINE_ALT } from "@/lib/blog/images";
import type { Article, Block, Inline } from "@/lib/blog/article";
import ArticleFaq from "./ArticleFaq";
import styles from "./ArticleBody.module.css";

/**
 * Модельный HTML уже разобран парсером в структуру, поэтому здесь нет
 * dangerouslySetInnerHTML: в браузер уходит только то, чьи теги перечислены
 * в типе Inline. Это второй слой защиты, независимый от Jsoup на бекенде.
 */
function InlineNodes({ nodes }: { nodes: Inline[] }) {
    return (
        <>
            {nodes.map((node, index) => (
                <InlineNode key={index} node={node} />
            ))}
        </>
    );
}

function InlineNode({ node }: { node: Inline }) {
    switch (node.kind) {
        case "text":
            return <>{node.text}</>;
        case "br":
            return <br />;
        case "strong":
            return <strong><InlineNodes nodes={node.children} /></strong>;
        case "em":
            return <em><InlineNodes nodes={node.children} /></em>;
        case "code":
            return <code className={styles.code}><InlineNodes nodes={node.children} /></code>;
        case "link":
            return node.external ? (
                <a className={styles.link} href={node.href} target="_blank" rel="nofollow noopener">
                    <InlineNodes nodes={node.children} />
                </a>
            ) : (
                <a className={styles.link} href={node.href}>
                    <InlineNodes nodes={node.children} />
                </a>
            );
    }
}

function Blocks({ blocks }: { blocks: Block[] }) {
    return (
        <>
            {blocks.map((block, index) => {
                if (block.kind === "p") {
                    return <p key={index} className={styles.paragraph}><InlineNodes nodes={block.content} /></p>;
                }
                if (block.kind === "h3") {
                    return <h3 key={index} className={styles.subheading}><InlineNodes nodes={block.content} /></h3>;
                }
                if (block.kind === "quote") {
                    return (
                        <blockquote key={index} className={styles.quote}>
                            <InlineNodes nodes={block.content} />
                        </blockquote>
                    );
                }
                const List = block.ordered ? "ol" : "ul";
                return (
                    <List key={index} className={block.ordered ? styles.orderedList : styles.list}>
                        {block.items.map((item, itemIndex) => (
                            <li key={itemIndex} className={styles.listItem}>
                                <InlineNodes nodes={item} />
                            </li>
                        ))}
                    </List>
                );
            })}
        </>
    );
}

/** Врезка после 2-й секции, вторая — после 5-й: индексы 1 и 4 при счёте с нуля. */
const INLINE_AFTER = [1, 4];

export default function ArticleBody({
    article,
    inlineImages,
}: {
    article: Article;
    inlineImages: string[];
}) {
    return (
        <div className={styles.prose}>
            {article.lead ? (
                <p className={styles.lead}><InlineNodes nodes={article.lead} /></p>
            ) : null}

            <Blocks blocks={article.intro} />

            {article.sections.map((section, index) => {
                const imageIndex = INLINE_AFTER.indexOf(index);
                const image = imageIndex >= 0 ? inlineImages[imageIndex] : undefined;
                return (
                    <section key={section.id} className={styles.section}>
                        <EegLine className={styles.divider} />
                        <h2 id={section.id} className={styles.heading}>{section.heading}</h2>
                        <Blocks blocks={section.blocks} />
                        {image ? (
                            <figure className={styles.figure}>
                                <Image
                                    src={image}
                                    alt={INLINE_ALT}
                                    width={1280}
                                    height={853}
                                    sizes="(max-width: 900px) 92vw, 720px"
                                    className={styles.figureImage}
                                />
                            </figure>
                        ) : null}
                    </section>
                );
            })}

            <ArticleFaq items={article.faq} />
        </div>
    );
}
