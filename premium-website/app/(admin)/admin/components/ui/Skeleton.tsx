import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export function SkeletonBar({ width = "100%" }: { width?: string }) {
    return (
        <span
            aria-hidden="true"
            className={styles.bar}
            style={{ "--bar-w": width } as CSSProperties}
        />
    );
}

/**
 * Скелетон повторяет геометрию таблицы, а не крутит спиннер по центру:
 * страница не перекладывается, когда данные приезжают.
 */
export function SkeletonRows({
    cols,
    rows = 6,
    widths = [["62%"], ["48%"], ["70%"], ["40%"]],
}: {
    cols: string;
    rows?: number;
    widths?: string[][];
}) {
    return (
        <div
            className={styles.rows}
            style={{ "--cols": cols } as CSSProperties}
            aria-hidden="true"
        >
            {Array.from({ length: rows }, (_, rowIndex) => (
                <div key={rowIndex} className={styles.row}>
                    {widths.map((cell, cellIndex) => (
                        <SkeletonBar key={cellIndex} width={cell[0]} />
                    ))}
                </div>
            ))}
        </div>
    );
}
