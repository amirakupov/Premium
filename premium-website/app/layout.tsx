import './globals.css'
import Header from './components/Header'
import Footer from './components/Footer'

// The metadata object can be used to set default <title>, etc.
export const metadata = {
  title: 'Neurological Clinic',
  description: 'Multi-page site for a neurological private clinic',
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps){
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
          <main>
            {children}  {/* This is where each route's content is rendered */}
          </main>
        <Footer />
      </body>
    </html>
  )
}
