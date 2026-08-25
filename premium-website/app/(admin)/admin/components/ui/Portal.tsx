"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Слои живут прямо в <body>. Содержимое админки при открытом sheet уходит
 * в глубину через filter/transform (.recessed в layout.module.css), а это
 * создаёт containing block и backdrop root и размывает всё поддерево —
 * включая fixed-панель, которую страница рендерит внутри <main>. Портал
 * выносит слой наружу: блюр остаётся на странице, панель остаётся резкой.
 */
export default function Portal({ children }: { children: ReactNode }) {
    // Рендер в один проход (без mounted-флага) — иначе ref слоя будет пуст
    // на момент эффекта ловушки фокуса и первый Tab уйдёт наружу.
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}
