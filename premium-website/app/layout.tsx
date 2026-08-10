import type { Metadata } from "next";
import { Golos_Text, Prata } from "next/font/google";
import { CLINIC, SITE_URL } from "@/lib/constants";
import "./globals.css";

const golos = Golos_Text({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-sans",
});

const prata = Prata({
    weight: "400",
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-display",
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "Клиника Неврологии Премиум в Уфе",
        template: "%s — Клиника «Премиум» Уфа",
    },
    description:
        "Медицинский центр в Уфе, предлагающий широкий спектр услуг в области неврологии, физиотерапии и реабилитации. Мы помогаем восстановить здоровье и улучшить качество жизни наших пациентов.",
    openGraph: {
        type: "website",
        locale: "ru_RU",
        siteName: CLINIC.fullName,
        title: "Клиника Неврологии Премиум в Уфе",
        description:
            "Диагностика и лечение заболеваний нервной системы: ЭЭГ, ботулинотерапия, физиотерапия, реабилитация. Запись на приём онлайн и по телефону.",
    },
};

const clinicJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: CLINIC.fullName,
    telephone: CLINIC.phone,
    email: CLINIC.email,
    url: SITE_URL,
    address: {
        "@type": "PostalAddress",
        streetAddress: "ул. Даяна Мурзина, 7/1",
        addressLocality: "Уфа",
        addressRegion: "Республика Башкортостан",
        postalCode: "450018",
        addressCountry: "RU",
    },
    openingHours: ["Mo-Fr 09:00-20:00", "Sa-Su 09:00-18:00"],
    medicalSpecialty: "Neurology",
};

/**
 * Режим для слабовидящих применяем до отрисовки,
 * чтобы страница не «мигала» обычной версией после гидрации.
 */
const a11yInitScript = `document.documentElement.dataset.a11y = localStorage.getItem("a11y") === "1" ? "1" : "0";`;

/* Контракт визуального направления — обязан пережить production-сборку. */
const designContract = `<!--
THESIS: Чистая современная неврологическая клиника в духе Celestia/Phenomenon Labs:
белый воздух, дружелюбный синий, доверие с первого экрана. Отказ — от «люкса» без
врача и цены и от тёмного тяжёлого хрома.
OWN-WORLD: белый/сине-белый фон #f4f8fd + surface #fff, дружелюбный синий #2563eb
как основной акцент и CTA, голубой тинт #e6f0fd для секций/карточек, тёмно-синий
#12294d для футера; navy-текст #0f1f38, серо-синий вторичный #556781; дисплейная
антиква Prata, текст Golos Text; ЭЭГ-линия (синяя) — единственный орнамент.
STORY: посетитель узнаёт специализацию и основателя, видит цены и врачей, верит и
звонит/записывается — телефон достижим с любого экрана.
FIRST VIEWPORT: светлый воздушный экран с мягкой голубой подложкой: слева
Prata-заголовок с синим акцентом «Премиум», подзаголовок, синий CTA «Записаться» и
контурная «Услуги», факты-цифры; справа крупный скруглённый портрет основателя.
FORM: канон категории (standing exit); палитра и стиль запинены пользователем —
синий/голубой/серый/белый/чёрный, Phenomenon Labs / Celestia dental.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
-->`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru" className={`${golos.variable} ${prata.variable}`}>
        <head>
            <script dangerouslySetInnerHTML={{ __html: a11yInitScript }} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd) }}
            />
        </head>
        <body>
        <span
            hidden
            dangerouslySetInnerHTML={{ __html: designContract }}
        />
        {children}
        </body>
        </html>
    );
}
