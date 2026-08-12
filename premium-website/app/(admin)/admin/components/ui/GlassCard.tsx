"use client";

import type { ReactNode } from "react";
import { useCursorGlow } from "./useCursorGlow";
import styles from "./GlassCard.module.css";

type Props = {
    children: ReactNode;
    /** light — карточки и контейнеры, strong — плотное стекло оверлеев. */
    density?: "light" | "strong";
    /** Блик, идущий за курсором. Не включать на элементах, которых много. */
    glow?: boolean;
    className?: string;
    as?: "div" | "section" | "article";
};

export default function GlassCard({
    children,
    density = "light",
    glow = false,
    className = "",
    as: Tag = "div",
}: Props) {
    const { ref, glowProps } = useCursorGlow<HTMLDivElement>();

    return (
        <Tag
            ref={glow ? ref : undefined}
            className={`${styles.card} ${density === "strong" ? styles.strong : ""} ${className}`}
            {...(glow ? glowProps : {})}
        >
            {glow ? <span aria-hidden="true" className={styles.glow} /> : null}
            {children}
        </Tag>
    );
}
