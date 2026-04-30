import Header from '../../components/Header';
import Footer from '../../components/Footer';
import PersonalizedGallery from './PersonalizedGallery';

export const metadata = {
  title: 'Your Palette — Wearhouse',
  description: 'A personal collection ranked by your color season analysis.',
};

export default function PersonalizedCollectionPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />
      <PersonalizedGallery />
      <Footer />
    </div>
  );
}
