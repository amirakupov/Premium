import "./globals.css";

export const metadata = {
  title: 'Клиника Неврологии Премиум в Уфе',
  description: 'Медицинский центр в Уфе, предлагающий широкий спектр услуг в области неврологии, физиотерапии и реабилитации. Мы помогаем восстановить здоровье и улучшить качество жизни наших пациентов.',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html lang="en">
      <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
              href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100..900&display=swap"
              rel="stylesheet"
          />
      </head>
      <body>{children}</body>
      </html>
  );
}
