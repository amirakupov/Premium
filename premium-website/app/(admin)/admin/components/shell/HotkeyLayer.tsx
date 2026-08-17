"use client";

import { useEffect } from "react";
import { isEditableTarget, matchHotkey, nextOverlayToClose } from "@/lib/admin/hotkeys";
import CommandPalette from "../ui/CommandPalette";
import { useAdminUi } from "./AdminUiProvider";

/**
 * Единственный глобальный keydown админки. Один слушатель — один
 * предсказуемый порядок закрытия слоёв по Esc.
 */
export default function HotkeyLayer() {
    const ui = useAdminUi();

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const inEditable = isEditableTarget(e.target as HTMLElement | null);
            const action = matchHotkey(e, { inEditable });
            if (!action) return;

            if (action === "palette") {
                e.preventDefault();
                ui.setPaletteOpen(!ui.paletteOpen);
                return;
            }

            if (action === "focusSearch") {
                e.preventDefault();
                ui.searchRef.current?.focus();
                return;
            }

            if (action === "close") {
                const layer = nextOverlayToClose({
                    palette: ui.paletteOpen,
                    modal: ui.modalOpen,
                    sheet: ui.sheetOpen,
                });
                if (!layer) return;
                e.preventDefault();
                // Sheet закрывает себя сам через onClose — здесь только палитра
                // и модалка, которыми владеет UI-контекст.
                if (layer === "palette") ui.setPaletteOpen(false);
                if (layer === "modal") ui.setModalOpen(false);
                if (layer === "sheet") ui.setSheetOpen(false);
                return;
            }

            if ((action === "save" || action === "submit") && ui.formSubmit) {
                e.preventDefault();
                ui.formSubmit();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [ui]);

    return <CommandPalette />;
}
