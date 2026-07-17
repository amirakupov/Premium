'use client';

import { useCallback, useEffect, useState } from 'react';
import Preloader, { PRELOADER_DONE_EVENT, PRELOADER_SEEN_KEY } from './Preloader';

/** Прелоадер играет один раз за сессию браузера. */
export default function HomeShell({ children }: { children: React.ReactNode }) {
    const [showPreloader, setShowPreloader] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem(PRELOADER_SEEN_KEY)) {
            setShowPreloader(false);
            window.dispatchEvent(new Event(PRELOADER_DONE_EVENT));
        }
    }, []);

    const finish = useCallback(() => {
        sessionStorage.setItem(PRELOADER_SEEN_KEY, '1');
        window.dispatchEvent(new Event(PRELOADER_DONE_EVENT));
        setShowPreloader(false);
    }, []);

    return (
        <>
            {showPreloader && <Preloader onComplete={finish} />}
            {children}
        </>
    );
}
