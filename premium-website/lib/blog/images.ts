import type { BlogPost } from "@/lib/types";

/**
 * Картинок в данных нет: на бекенде img намеренно вырезан из Safelist, а поля
 * обложки у поста не существует. Поэтому обложку подбирает витрина — из
 * уже снятых фото клиники и услуг, по теме статьи.
 *
 * Иллюстрируется только обложка. Врезки по ходу текста здесь были и убраны:
 * тематического правила для них нет, в текст попадал случайный интерьер
 * клиники — картинка, которой нечего сказать по теме абзаца.
 *
 * Альт описывает то, что НА ФОТО, а не заголовок статьи: снимок процедурного
 * кабинета не является изображением мигрени, и подпись заголовком была бы
 * ложью для скринридера.
 */
interface Rule {
    test: RegExp;
    asset: string;
    alt: string;
}

const RULES: Rule[] = [
    {
        test: /эпилепс|приступ|ээг|память|концентрац|сон|бессонниц/,
        asset: "/services/eeg.png",
        alt: "Кабинет электроэнцефалографии клиники «Премиум»",
    },
    {
        test: /поясниц|спин|грыж|диск|седалищн|защемлен/,
        asset: "/services/blocade.png",
        alt: "Процедурный кабинет клиники «Премиум»",
    },
    {
        test: /онемен|покалыван|невропат|тремор|лицев/,
        asset: "/services/elektro.png",
        alt: "Аппарат физиотерапии в клинике «Премиум»",
    },
    {
        test: /инсульт|восстановлен|реабилитац/,
        asset: "/services/capelnic.png",
        alt: "Внутривенная инфузия в клинике «Премиум»",
    },
    {
        test: /головокружен/,
        asset: "/services/uzi2.png",
        alt: "Ультразвуковое исследование в клинике «Премиум»",
    },
    {
        test: /мигрен|головн|напряжен/,
        asset: "/services/massage.png",
        alt: "Лечебный массаж в клинике «Премиум»",
    },
    {
        test: /приём|прием|обследован|анализ/,
        asset: "/services/anal.png",
        alt: "Лабораторные анализы в клинике «Премиум»",
    },
];

/** Портретный clinic4.jpg (853×1280) исключён: он рвёт обложку 21:9. */
const CLINIC_POOL = [
    "/clinic/clinic5.jpg",
    "/clinic/clinic6.jpg",
    "/clinic/clinic7.jpg",
    "/clinic/clinic9.jpg",
    "/clinic/clinic10.jpg",
    "/clinic/clinic11.jpg",
    "/clinic/clinic12.jpg",
    "/clinic/clinic13.png",
    "/clinic/clinic14.jpg",
];

const CLINIC_ALT = "Интерьер клиники неврологии «Премиум» в Уфе";

/**
 * FNV-1a. Именно хеш, а не Math.random: при ISR страница рендерится
 * многократно, и случайный выбор давал бы разную картинку в разных копиях кеша.
 */
function hash(value: string): number {
    let result = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
        result ^= value.charCodeAt(i);
        result = Math.imul(result, 0x01000193) >>> 0;
    }
    return result >>> 0;
}

export interface ArticleArt {
    cover: string;
    coverAlt: string;
}

export function pickArt(post: BlogPost): ArticleArt {
    const haystack = `${post.title} ${post.keywords ?? ""} ${post.slug}`.toLowerCase();
    const rule = RULES.find((item) => item.test.test(haystack));
    if (rule) return { cover: rule.asset, coverAlt: rule.alt };

    const seed = hash(post.slug);
    return { cover: CLINIC_POOL[seed % CLINIC_POOL.length], coverAlt: CLINIC_ALT };
}
