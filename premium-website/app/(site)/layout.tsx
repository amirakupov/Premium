"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/app/(site)/components/Header";
import Footer from "@/app/(site)/components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hideFooter, setHideFooter] = useState(false);

    useEffect(() => {
        if (pathname === "/") {
            setHideFooter(true);
            const handler = () => setHideFooter(false);
            window.addEventListener("preloaderFinished", handler);
            if (window.localStorage.getItem("preloaderPassed")) setHideFooter(false);
            return () => window.removeEventListener("preloaderFinished", handler);
        }
        setHideFooter(false);
    }, [pathname]);

    return (
        <div className="site">
            <Header />
            <main className="site-main">{children}</main>
            {!hideFooter && <Footer />}
        </div>
    );
}