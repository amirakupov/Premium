import type { SaveState } from "../data/AdminDataProvider";
import styles from "./SaveStatus.module.css";

const COPY: Record<SaveState, string> = {
    idle: "Все изменения сохранены",
    draft: "Черновик сохранён",
    saving: "Сохраняем…",
    saved: "Сохранено",
    error: "Ошибка сохранения",
};

/** Живёт в топбаре и озвучивается вежливо: не перебивает ввод. */
export default function SaveStatus({ state }: { state: SaveState }) {
    return (
        <p role="status" aria-live="polite" className={`${styles.status} ${styles[state]}`}>
            <span aria-hidden="true" className={styles.dot} />
            {COPY[state]}
        </p>
    );
}
