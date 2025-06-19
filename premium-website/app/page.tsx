'use client';
import useIsMobile from './hooks/useIsMobile'; 
import MobileLanding from './components/MobileLanding';
import InfoBlock from './components/InfoBlock';
import Quote from './components/Quote';

import DoctorsPreview from './components/Doctors';
import Achievements from './components/Achievements';
import ClinicPhotos from './components/ClinicFotos';
import Reviews from './components/Reviews';
import Services from './components/Services';
import CookieBanner from './components/CookieBanner';
import Preloader from './components/Preloader';
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
      {/* основной контент всегда в DOM! */}
      {isMobile ? <MobileLanding /> : (
        <>
          <InfoBlock />
          <Quote />
          <Services />
          <ClinicPhotos />
          <DoctorsPreview />
          <Achievements />
          <Reviews />
          <CookieBanner />
        </>
      )}
    </>
  );
}
