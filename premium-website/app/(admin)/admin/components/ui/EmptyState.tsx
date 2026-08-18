import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/**
 * Пустое состояние всегда объясняет причину и даёт первое действие.
 * Текст «список пуст» и «по фильтру ничего не найдено» — разный:
 * это решает вызывающий экран, компонент только показывает.
 */
export default function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className={styles.empty}>
            <div aria-hidden="true" className={styles.mark} />
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
            {action ? <div className={styles.action}>{action}</div> : null}
        </div>
    );
}
