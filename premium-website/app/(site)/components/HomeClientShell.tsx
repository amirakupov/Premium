'use client';

import { useEffect, useState } from 'react';
import useIsMobile from '@/app/(site)/hooks/useIsMobile';
import Preloader from '@/app/(site)/components/Preloader';

export default function HomeClientShell({
                                            desktop,
                                            mobile,
                                        }: {
    desktop: React.ReactNode;
    mobile: React.ReactNode;
}) {
    const [preloaderDone, setPreloaderDone] = useState(false);
    const isMobile = useIsMobile(768);

    useEffect(() => {
        if (preloaderDone) {
            window.dispatchEvent(new Event('preloaderFinished'));
            window.localStorage.setItem('preloaderPassed', '1');
        }
    }, [preloaderDone]);

    return (
        <>
            {!preloaderDone && <Preloader onComplete={() => setPreloaderDone(true)} />}
            {isMobile ? mobile : desktop}
        </>
    );
}