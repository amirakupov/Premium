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

export default function HomePage() {
  const isMobile = useIsMobile(768);

  if (isMobile) {
    // If user is on mobile screen
    return (
      <MobileLanding />
    );
  } else {
    // Else render the normal "desktop" landing
    return (
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
    );
  }
}

