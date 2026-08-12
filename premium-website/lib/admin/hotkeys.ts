/**
 * Разбор клавиатурных сочетаний админки. Событие принимается «утиным» типом:
 * функция ничего не знает о DOM и её легко читать целиком.
 */

export type HotkeyAction = "palette" | "focusSearch" | "close" | "save" | "submit";

export interface HotkeyEventLike {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
}

export interface EditableLike {
    tagName?: string;
    isContentEditable?: boolean;
}

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isEditableTarget(target: EditableLike | null): boolean {
    if (!target) return false;
    if (target.isContentEditable) return true;
    return EDITABLE_TAGS.has(target.tagName ?? "");
}

export function matchHotkey(
    e: HotkeyEventLike,
    ctx: { inEditable: boolean },
): HotkeyAction | null {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Сочетания с модификатором работают и внутри полей: это команды приложения.
    if (mod && key === "k") return "palette";
    if (mod && key === "s") return "save";
    if (mod && key === "enter") return "submit";
    if (key === "escape") return "close";
    // Одиночный символ — команда только вне полей, иначе его нельзя набрать.
    if (!mod && !ctx.inEditable && e.key === "/") return "focusSearch";

    return null;
}

export type OverlayState = { palette: boolean; modal: boolean; sheet: boolean };

/** Escape закрывает слои сверху вниз: палитра → модалка → sheet. */
export function nextOverlayToClose(s: OverlayState): "palette" | "modal" | "sheet" | null {
    if (s.palette) return "palette";
    if (s.modal) return "modal";
    if (s.sheet) return "sheet";
    return null;
}
