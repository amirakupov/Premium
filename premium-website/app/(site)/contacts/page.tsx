import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
    title: "Контакты и запись на приём",
    description:
        "Запишитесь на приём в клинику неврологии «Премиум» в Уфе: оставьте заявку онлайн — мы свяжемся с вами в течение дня.",
};

export default function ContactsPage() {
    return <ContactForm />;
}
