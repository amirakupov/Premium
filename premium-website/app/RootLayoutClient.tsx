'use client';

import './globals.css'
import Header from '@/app/(site)/components/Header'
import Footer from '@/app/(site)/components/Footer'
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RootLayoutClientProps {
  children: React.ReactNode;
}

export default function RootLayoutClient({ children }: RootLayoutClientProps){
  const pathname = usePathname();
  const [hideFooter, setHideFooter] = useState(false);

  useEffect(() => {
    if (pathname === '/') {
      setHideFooter(true);

      const handler = () => setHideFooter(false);
      window.addEventListener('preloaderFinished', handler);

      if (window.localStorage.getItem('preloaderPassed')) setHideFooter(false);

      return () => window.removeEventListener('preloaderFinished', handler);
    } else {
      setHideFooter(false);
    }
  }, [pathname]);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Victor+Mono:ital,wght@0,100..700;1,100..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        {!hideFooter && <Footer />}
      </body>
    </html>
  )
}
