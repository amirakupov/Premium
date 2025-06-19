import RootLayoutClient from "./RootLayoutClient";


export const metadata = {
  title: 'Neurological Clinic',
  description: 'Multi-page site for a neurological private clinic',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}
