// app/services/[slug]/page.tsx

interface ServicePageProps {
  params: { slug: string };
}

export default async function ServicePage({ params }: ServicePageProps) {
  // Awaiting the params object before using its properties
  const resolvedParams = await Promise.resolve(params);
  const { slug } = resolvedParams;

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Service: {slug}</h1>
      <p>This is a placeholder page for the {slug} service.</p>
    </div>
  );
}

