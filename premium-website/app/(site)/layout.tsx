import Header from "@/app/(site)/components/Header";
import Footer from "@/app/(site)/components/Footer";
import FooterGate from "@/app/(site)/components/FooterGate";
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
            <FooterGate>
                <Footer />
            </FooterGate>
            <CookieBanner />
        </div>
    );
}
