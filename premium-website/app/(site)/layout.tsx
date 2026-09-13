import Header from "@/app/(site)/components/Header";
import Footer from "@/app/(site)/components/Footer";
import A11yToggle from "@/app/(site)/components/A11yToggle";
import CookieBanner from "@/app/(site)/components/CookieBanner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="site">
            <Header />
            <div className="a11y-row">
                <A11yToggle />
            </div>
            <main className="site-main">{children}</main>
            {/* Пока идёт занавес, футер спрятан CSS-ом (html[data-curtain="1"]),
                а не снят из дерева: так он всегда в серверном HTML и не моргает. */}
            <Footer />
            <CookieBanner />
        </div>
    );
}
