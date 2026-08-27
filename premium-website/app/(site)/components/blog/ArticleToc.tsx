import type { Section } from "@/lib/blog/article";
import styles from "./ArticleToc.module.css";

/**
 * Обычные якорные ссылки, ноль клиентского JS. Подсветка активного пункта при
 * скролле потребовала бы клиентского компонента и осталась вне охвата.
 * На коротких статьях оглавление скрыто: три пункта только шумят.
 */
export default function ArticleToc({ sections, hasFaq }: { sections: Section[]; hasFaq: boolean }) {
    if (sections.length < 3) return null;

    return (
        <nav className={styles.toc} aria-label="Содержание статьи">
            <p className={styles.label}>На странице</p>
            <ol className={styles.list}>
                {sections.map((section) => (
                    <li key={section.id} className={styles.item}>
                        <a href={`#${section.id}`} className={styles.link}>{section.heading}</a>
                    </li>
                ))}
                {hasFaq ? (
                    <li className={styles.item}>
                        <a href="#faq" className={styles.link}>Частые вопросы</a>
                    </li>
                ) : null}
            </ol>
        </nav>
    );
}
