import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { CLINIC, SITE_URL } from "@/lib/constants";
import "./globals.css";

const montserrat = Montserrat({
    subsets: ["latin", "cyrillic"],
    display: "swap",
    variable: "--font-sans",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru" className={montserrat.variable}>
        <head>
            <script dangerouslySetInnerHTML={{ __html: a11yInitScript }} />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(clinicJsonLd) }}
            />
        </head>
        <body>{children}</body>
        </html>
    );
}
