'use client';
import useIsMobile from '@/app/(site)/hooks/useIsMobile';
import MobileLanding from '@/app/(site)/components/MobileLanding';
import InfoBlock from '@/app/(site)/components/InfoBlock';
import Quote from '@/app/(site)/components/Quote';

import DoctorsPreview from '@/app/(site)/components/Doctors';
import ClinicPhotos from '@/app/(site)/components/ClinicFotos';
import Services from '@/app/(site)/components/Services';
import CookieBanner from '@/app/(site)/components/CookieBanner';
import Preloader from '@/app/(site)/components/Preloader';
import { useEffect, useState } from 'react';

export default function HomePage() {
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
      {isMobile ? <MobileLanding /> : (
        <>
          <InfoBlock />
          <Quote />
          <Services />
          <ClinicPhotos />
          <DoctorsPreview />
          <CookieBanner />
        </>
      )}
    </>
  );
}
