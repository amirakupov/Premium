import InfoBlock from '@/app/(site)/components/InfoBlock';
import Quote from '@/app/(site)/components/Quote';
import Doctors from '@/app/(site)/components/Doctors';
import ClinicPhotos from '@/app/(site)/components/ClinicFotos';
import CookieBanner from '@/app/(site)/components/CookieBanner';
import MobileLanding from '@/app/(site)/components/MobileLanding';

import HomeClientShell from '@/app/(site)/components/HomeClientShell';
import ServicesSection from "@/app/(site)/components/ServiceSection";

export default function HomePage() {
  return (
      <HomeClientShell
          desktop={
            <>
              <InfoBlock />
              <Quote />
              <ServicesSection />
              <ClinicPhotos />
              <Doctors doctors={[]}/>
              <CookieBanner />
            </>
          }
          mobile={<MobileLanding />}
      />
  );
}