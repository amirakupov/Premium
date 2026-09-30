import { CLINIC } from "./constants";
import type { DisclosureDocument, DocumentCategory } from "./types";

/**
 * Раскрытие информации по Постановлению Правительства РФ № 659.
 *
 * Реквизиты взяты из карты предприятия ООО «ПРЕМИУМ» — наименования, адрес,
 * ИНН/КПП, ОГРН и дата регистрации перенесены дословно, включая заглавные
 * буквы в наименовании: страница раскрытия сверяется с ЕГРЮЛ, а не с тем,
 * как клинику зовут в рекламе. Банковские реквизиты и ФИО директора в карте
 * тоже есть, но постановление их не требует и на сайт они не выносятся.
 *
 * Поля, которые клиника ещё не прислала, оставлены пустыми строками:
 * страница пустое поле не печатает, а придуманный реквизит хуже
 * отсутствующего. Список документов сторожит lib/disclosure.test.ts —
 * объявить ссылку на файл, которого нет в public/, не получится.
 */

export interface Requisites {
    legalName: string;
    /** Для надписи про ОМС и подписей: полное наименование там нечитаемо. */
    shortName: string;
    inn: string;
    kpp: string;
    ogrn: string;
    registeredAt: string;
    legalAddress: string;
    actualAddress: string;
}

export const REQUISITES: Requisites = {
    legalName: "Общество с ограниченной ответственностью «ПРЕМИУМ»",
    shortName: "ООО «ПРЕМИУМ»",
    inn: "0276970983",
    kpp: "027401001",
    ogrn: "1220200030710",
    registeredAt: "06.09.2022",
    legalAddress:
        "450018, Республика Башкортостан, г. Уфа, ул. Даяна Мурзина, д. 7/1, помещ. 1ж",
    actualAddress: CLINIC.addressFull,
};

export interface DisclosureDoc {
    title: string;
    href: string;
    note?: string;
}

/**
 * Порядок важен: договор и прейскурант проверяют первыми. Скан самой
 * лицензии с приложениями добавится, когда клиника его пришлёт, — пока
 * вместо него выписка из реестра.
 */
export const DISCLOSURE_DOCS: DisclosureDoc[] = [
    {
        title: "Образец договора на оказание платных медицинских услуг",
        href: "/docs/contract.pdf",
    },
    {
        title: "Прейскурант цен",
        href: "/docs/price.pdf",
        note: "Действующий; цены совпадают с кассой клиники",
    },
    {
        title: "Выписка из реестра лицензий",
        href: "/docs/reestr.pdf",
    },
    {
        title: "Свидетельство о постановке на налоговый учёт (ИНН/КПП)",
        href: "/docs/nalog.pdf",
    },
    {
        title:
            "Постановление Правительства РФ от 30.05.2026 № 659 «Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг»",
        href: "/docs/pp-659.pdf",
    },
];

/** Территориальная программа госгарантий. href пустой — блок не печатается. */
export const GUARANTEE_PROGRAM = {
    title:
        "Территориальная программа государственных гарантий бесплатного оказания гражданам медицинской помощи в Республике Башкортостан",
    href: "",
};

/** Страховые компании-партнёры по ДМС. */
export const DMS_PARTNERS: string[] = [];

/**
 * Требование постановления — заявить отсутствие ОМС прямо и крупно.
 * Формулировка собирается из наименования, чтобы не разъезжаться с реквизитами.
 */
export function omsNotice(legalName: string): string {
    const org = legalName.trim() || CLINIC.name;
    return `Внимание: ${org} НЕ оказывает медицинские услуги в рамках программы обязательного медицинского страхования (ОМС).`;
}

export interface Regulator {
    name: string;
    address: string;
    phone: string;
    site: string;
}

/**
 * Адреса и телефоны сверяются на официальных сайтах ведомств: они меняются
 * чаще, чем сами сайты. Пустые поля страница не печатает.
 */
export const REGULATORS: Regulator[] = [
    {
        name: "Министерство здравоохранения Республики Башкортостан",
        address: "",
        phone: "",
        site: "https://health.bashkortostan.ru",
    },
    {
        name: "Управление Роспотребнадзора по Республике Башкортостан",
        address: "",
        phone: "",
        site: "https://02.rospotrebnadzor.ru",
    },
    {
        // Название — федеральное, вслед за ссылкой: сайт ниже федеральный
        // (roszdravnadzor.gov.ru), а не территориального управления по
        // Башкортостану. Территориальные адрес и телефон подставятся вместе
        // с адресом и телефоном самого ведомства, когда клиника их пришлёт —
        // выдумывать территориальный URL нельзя: непроверенная ссылка на
        // странице раскрытия информации хуже федеральной.
        name: "Федеральная служба по надзору в сфере здравоохранения (Росздравнадзор)",
        address: "",
        phone: "",
        site: "https://roszdravnadzor.gov.ru",
    },
];

/** Тег кеша данных раздела: админка сбрасывает его после каждого изменения. */
export const DISCLOSURE_TAG = "disclosure";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
    CONTRACT: "Договор",
    PRICE_LIST: "Прейскурант",
    LICENSE: "Лицензия",
    REGULATION: "Нормативные акты",
    GUARANTEE_PROGRAM: "Программа госгарантий",
    OTHER: "Прочие документы",
    CERTIFICATE: "Сертификат",
    DIPLOMA: "Диплом",
};

/**
 * Категории списка «Документы» в порядке показа — тот же порядок, что у
 * перечисления на бэкенде. Программа госгарантий выводится в блоке ОМС.
 */
export const CLINIC_CATEGORIES: DocumentCategory[] = [
    "CONTRACT",
    "PRICE_LIST",
    "LICENSE",
    "REGULATION",
    "OTHER",
];

export function isDoctorCategory(category: DocumentCategory): boolean {
    return category === "CERTIFICATE" || category === "DIPLOMA";
}

export interface DocumentGroup {
    category: DocumentCategory;
    label: string;
    documents: DisclosureDocument[];
}

/** Непустые группы списка «Документы»; порядок внутри — по sortOrder. */
export function groupDocuments(documents: DisclosureDocument[]): DocumentGroup[] {
    return CLINIC_CATEGORIES.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        documents: documents
            .filter((d) => d.category === category && d.doctorId === null)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    })).filter((group) => group.documents.length > 0);
}

export function guaranteeProgram(documents: DisclosureDocument[]): DisclosureDocument | null {
    const found = documents
        .filter((d) => d.category === "GUARANTEE_PROGRAM" && d.doctorId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return found[0] ?? null;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Строковый разбор, а не Date: бэкенд отдаёт время без зоны, и new Date()
 * сдвинул бы дату у документа, обновлённого около полуночи.
 */
export function formatRuDate(iso: string): string {
    const match = ISO_DATE_RE.exec(iso);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
}
