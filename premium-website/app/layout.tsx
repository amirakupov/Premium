import RootLayoutClient from "./RootLayoutClient";


export const metadata = {
  title: 'Клиника Неврологии Премиум в Уфе',
  description: 'Медицинский центр в Уфе, предлагающий широкий спектр услуг в области неврологии, физиотерапии и реабилитации. Мы помогаем восстановить здоровье и улучшить качество жизни наших пациентов.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}
