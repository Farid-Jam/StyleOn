import Header from './components/Header';
import HeroSection from './components/HeroSection';
import TrendsSection from './components/TrendsSection';
import CollectionsSection from './components/CollectionsSection';
import TailorSection from './components/TailorSection';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />
      <HeroSection />
      <TrendsSection />
      <CollectionsSection />
      <TailorSection />
      <Footer />
    </div>
  );
}
