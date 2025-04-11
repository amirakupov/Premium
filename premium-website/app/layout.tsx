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
        {/* e.g. Google Fonts, or anything else */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
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
