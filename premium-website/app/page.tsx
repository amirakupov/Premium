// app/page.js
import InfoBlock from './components/InfoBlock'
import Quote from './components/Quote'
import ServicesPreview from './components/Services'
import DoctorsPreview from './components/Doctors'
import Achievements from './components/Achievements'
import ClinicPhotos from './components/ClinicFotos'
import Reviews from './components/Reviews'

export default function HomePage() {
  return (
    <>
      <InfoBlock />
      <Quote />
      <ServicesPreview />
      <DoctorsPreview />
      <Achievements />
      <ClinicPhotos />
      <Reviews />
    </>
  )
}
