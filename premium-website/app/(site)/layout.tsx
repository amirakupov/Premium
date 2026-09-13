import Header from "@/app/(site)/components/Header";
import Footer from "@/app/(site)/components/Footer";
import A11yToggle from "@/app/(site)/components/A11yToggle";
import CookieBanner from "@/app/(site)/components/CookieBanner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="site">
            {/* Первый фокусируемый элемент страницы: шапка фиксированная, и без
                этой ссылки клавиатурный пользователь табает через всю навигацию
                и поиск на каждой странице. Видна только по фокусу. */}
            <a href="#main" className="skip-link">
                К основному содержанию
            </a>
            {/* Грунт страницы: цвет фона и «обои». Сцена пишет цвет главы и
                «темноту» сюда, а не на <html>, — инвалидация стилей ограничена
                одним слоем без потомков. См. neuron/pageTheme.ts и globals.css. */}
            <div className="page-ground" id="page-ground" aria-hidden="true" />
            <Header />
            <div className="a11y-row">
                <A11yToggle />
            </div>
            <main id="main" className="site-main" tabIndex={-1}>
                {children}
            </main>
            {/* Пока идёт занавес, футер спрятан CSS-ом (html[data-curtain="1"]),
                а не снят из дерева: так он всегда в серверном HTML и не моргает. */}
            <Footer />
            <CookieBanner />
        </div>
    );
}
