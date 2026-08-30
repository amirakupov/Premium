import type { Block, FaqItem, Inline } from "@/lib/blog/article";
import styles from "./ArticleFaq.module.css";

/**
 * Нативные details/summary: аккордеон работает с клавиатуры, попадает в поиск
 * по странице и не тянет ни строчки клиентского JS.
 */
function Text({ nodes }: { nodes: Inline[] }) {
    return (
        <>
            {nodes.map((node, index) => {
                if (node.kind === "text") return <span key={index}>{node.text}</span>;
                if (node.kind === "br") return <br key={index} />;
                if (node.kind === "link") {
                    return node.external ? (
                        <a key={index} href={node.href} target="_blank" rel="nofollow noopener">
                            <Text nodes={node.children} />
                        </a>
                    ) : (
                        <a key={index} href={node.href}><Text nodes={node.children} /></a>
                    );
                }
                const Tag = node.kind === "strong" ? "strong" : node.kind === "em" ? "em" : "code";
                return <Tag key={index}><Text nodes={node.children} /></Tag>;
            })}
        </>
    );
}

function Answer({ blocks }: { blocks: Block[] }) {
    return (
        <>
            {blocks.map((block, index) => {
                if (block.kind === "list") {
                    const List = block.ordered ? "ol" : "ul";
                    return (
                        <List key={index} className={styles.list}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}><Text nodes={item} /></li>
                            ))}
                        </List>
                    );
                }
                return <p key={index} className={styles.answer}><Text nodes={block.content} /></p>;
            })}
        </>
    );
}

export default function ArticleFaq({ items }: { items: FaqItem[] }) {
    if (items.length === 0) return null;

    return (
        <section className={styles.faq}>
            <h2 id="faq" className={styles.heading}>Частые вопросы</h2>
            {items.map((item, index) => (
                <details key={index} className={styles.item}>
                    <summary className={styles.question}>{item.question}</summary>
                    <div className={styles.body}>
                        <Answer blocks={item.answer} />
                    </div>
                </details>
            ))}
        </section>
    );
}
