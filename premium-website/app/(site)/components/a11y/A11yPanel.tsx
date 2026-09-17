"use client";

import { useEffect, useState } from "react";
import Portal from "@/app/(admin)/admin/components/ui/Portal";
import { useFocusTrap } from "@/app/(admin)/admin/components/ui/useFocusTrap";
import {
    A11Y_DEFAULTS,
    A11Y_OPEN_EVENT,
    type A11yFont,
    type A11yLetter,
    type A11yScheme,
    type A11ySettings,
    readA11ySettings,
    writeA11ySettings,
} from "@/lib/a11y";
import styles from "./A11yPanel.module.css";

const SCHEMES: { value: A11yScheme; label: string }[] = [
    { value: "black-on-white", label: "Чёрным по белому" },
    { value: "white-on-black", label: "Белым по чёрному" },
    { value: "brown-on-beige", label: "Коричневым по бежевому" },
];

const FONTS: { value: A11yFont; label: string }[] = [
    { value: "normal", label: "Обычный" },
    { value: "large", label: "Крупный" },
    { value: "huge", label: "Очень крупный" },
];

const LETTERS: { value: A11yLetter; label: string }[] = [
    { value: "normal", label: "Обычный" },
    { value: "wide", label: "Увеличенный" },
];

/**
 * Панель настроек отображения по ГОСТ Р 52872. Монтируется один раз на макет,
 * открывается событием от любой кнопки A11yTrigger.
 *
 * Слой уходит в портал по той же причине, что и слои админки: содержимое под
 * ним может быть размыто фильтром родителя, а панель обязана остаться резкой.
 * Настройки применяются сразу при выборе — «Применить» тут лишняя ступень:
 * человек должен видеть результат, а не угадывать его.
 */
export default function A11yPanel() {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<A11ySettings>(A11Y_DEFAULTS);
    const ref = useFocusTrap(open);

    // Сервер про localStorage не знает, поэтому стартуем с умолчаний
    // и выравниваемся в эффекте — иначе расхождение гидрации.
    useEffect(() => {
        setSettings(readA11ySettings());
        const openPanel = () => setOpen(true);
        window.addEventListener(A11Y_OPEN_EVENT, openPanel);
        return () => window.removeEventListener(A11Y_OPEN_EVENT, openPanel);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    const apply = (patch: Partial<A11ySettings>) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        writeA11ySettings(next);
    };

    if (!open) return null;

    return (
        <Portal>
            <div className={styles.backdrop} onClick={() => setOpen(false)}>
                <div
                    ref={ref}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Настройки отображения"
                    className={styles.panel}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.head}>
                        <h2 className={styles.title}>Настройки отображения</h2>
                        <button
                            type="button"
                            className={styles.close}
                            onClick={() => setOpen(false)}
                        >
                            Закрыть
                        </button>
                    </div>

                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={settings.on}
                            onChange={(e) => apply({ on: e.target.checked })}
                        />
                        <span>Версия для слабовидящих</span>
                    </label>

                    {/* disabled на fieldset выключает вложенные поля и убирает
                        их из обхода табом — выключенный режим не должен
                        подсовывать клавиатуре мёртвые контролы. */}
                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Размер шрифта</legend>
                        <div className={styles.options}>
                            {FONTS.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-font"
                                        checked={settings.font === item.value}
                                        onChange={() => apply({ font: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Цветовая схема</legend>
                        <div className={styles.options}>
                            {SCHEMES.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-scheme"
                                        checked={settings.scheme === item.value}
                                        onChange={() => apply({ scheme: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Интервал между буквами</legend>
                        <div className={styles.options}>
                            {LETTERS.map((item) => (
                                <label key={item.value} className={styles.option}>
                                    <input
                                        type="radio"
                                        name="a11y-letter"
                                        checked={settings.letter === item.value}
                                        onChange={() => apply({ letter: item.value })}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className={styles.group} disabled={!settings.on}>
                        <legend className={styles.legend}>Изображения</legend>
                        <div className={styles.options}>
                            <label className={styles.option}>
                                <input
                                    type="radio"
                                    name="a11y-images"
                                    checked={settings.images}
                                    onChange={() => apply({ images: true })}
                                />
                                <span>Показывать</span>
                            </label>
                            <label className={styles.option}>
                                <input
                                    type="radio"
                                    name="a11y-images"
                                    checked={!settings.images}
                                    onChange={() => apply({ images: false })}
                                />
                                <span>Скрыть</span>
                            </label>
                        </div>
                    </fieldset>

                    <button
                        type="button"
                        className={styles.reset}
                        onClick={() => apply(A11Y_DEFAULTS)}
                    >
                        Вернуть обычную версию
                    </button>
                </div>
            </div>
        </Portal>
    );
}
