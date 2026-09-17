import { CLINIC } from "./constants";

/**
 * Раскрытие информации по Постановлению Правительства РФ № 659.
 *
 * Поля, которые обязана предоставить клиника, оставлены пустыми строками:
 * страница пустое поле не печатает, а придуманный ИНН хуже отсутствующего.
 * Список документов сторожит lib/disclosure.test.ts — объявить ссылку на
 * файл, которого нет в public/, не получится.
 */

export interface Requisites {
    legalName: string;
    inn: string;
    ogrn: string;
    registeredAt: string;
    legalAddress: string;
    actualAddress: string;
}

export const REQUISITES: Requisites = {
    legalName: "",
    inn: "",
    ogrn: "",
    registeredAt: "",
    legalAddress: "",
    actualAddress: CLINIC.addressFull,
};

export interface DisclosureDoc {
    title: string;
    href: string;
    note?: string;
}

/**
 * Порядок важен: договор и прейскурант проверяют первыми. Лицензия и текст
 * Постановления № 659 добавляются, когда клиника пришлёт файлы, — см. раздел
 * «Дозаполнение после получения данных» в плане.
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
        name: "Территориальный орган Росздравнадзора по Республике Башкортостан",
        address: "",
        phone: "",
        site: "https://roszdravnadzor.gov.ru",
    },
];
