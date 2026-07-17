/** Контакты и реквизиты клиники — единственный источник для всего сайта. */
export const CLINIC = {
    name: "Клиника «Премиум»",
    fullName: "Клиника неврологии «Премиум» в Уфе",
    phone: "+7 (917) 369-55-09",
    phoneHref: "tel:+79173695509",
    email: "premium.ufa02@gmail.com",
    address: "г. Уфа, ул. Даяна Мурзина, 7/1",
    addressFull: "г. Уфа, ул. Даяна Мурзина, 7/1, Респ. Башкортостан, 450018",
    hoursWeekdays: "Пн–Пт: 9:00–20:00",
    hoursWeekend: "Сб–Вс: 9:00–18:00",
    instagram: "https://www.instagram.com/premium_ufa102/",
} as const;

export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://premium-ufa.ru";

export const NAV_LINKS = [
    { href: "/services", label: "Услуги" },
    { href: "/doctors", label: "Врачи" },
    { href: "/eeg", label: "ЭЭГ" },
    { href: "/contacts", label: "Контакты" },
    { href: "/#address", label: "Адрес" },
] as const;

/** Акцентная ссылка — рендерится отдельно от NAV_LINKS. */
export const EMERGENCY_LINK = { href: "/emergency", label: "Экстренная помощь" } as const;

/**
 * Ключи EmailJS публичные по дизайну, но держим их в env,
 * чтобы менять без деплоя и не размазывать по коду.
 */
export const EMAILJS = {
    serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "service_d5ejdz9",
    userTemplateId: process.env.NEXT_PUBLIC_EMAILJS_USER_TEMPLATE_ID ?? "template_v2ofuzf",
    adminTemplateId: process.env.NEXT_PUBLIC_EMAILJS_ADMIN_TEMPLATE_ID ?? "template_2tlppgm",
    publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "rg3ZXe_2vm2ejlIWW",
    adminEmail: process.env.NEXT_PUBLIC_EMAILJS_ADMIN_EMAIL ?? "premium.ufa02@gmail.com",
} as const;
