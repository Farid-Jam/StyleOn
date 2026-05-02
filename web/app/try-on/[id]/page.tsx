import Header from '../../components/Header';
import Footer from '../../components/Footer';
import TryOnExperience from './TryOnExperience';
import { getProductServer } from '../../lib/styleon';

export const metadata = {
  title: 'Try On — Wearhouse',
  description: 'Upload a photo and see how the piece looks on you.',
};

export default async function TryOnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialProduct = await getProductServer(id);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />
      <TryOnExperience itemId={id} initialProduct={initialProduct ?? undefined} />
      <Footer />
    </div>
  );
}
