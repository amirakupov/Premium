"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PRELOADER_DONE_EVENT, PRELOADER_SEEN_KEY } from "./Preloader";

/**
 * На главной футер прячется, пока играет прелоадер,
 * чтобы он не «выглядывал» из-под анимации.
 */
export default function FooterGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (pathname !== "/") {
            setHidden(false);
            return;
        }
        if (sessionStorage.getItem(PRELOADER_SEEN_KEY)) {
            setHidden(false);
            return;
        }
        setHidden(true);
        const handler = () => setHidden(false);
        window.addEventListener(PRELOADER_DONE_EVENT, handler);
        return () => window.removeEventListener(PRELOADER_DONE_EVENT, handler);
    }, [pathname]);

    if (hidden) return null;
    return <>{children}</>;
}
