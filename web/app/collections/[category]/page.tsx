import { notFound } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import CollectionGallery from './CollectionGallery';

const CATEGORIES = {
  outerwear: {
    title: 'Outerwear',
    subtitle: 'Coats & Layers',
    description:
      'Structured silhouettes and premium fabrics that define presence in any room.',
  },
  bottoms: {
    title: 'Trousers',
    subtitle: 'The Foundation',
    description:
      'Cuts that sit right, move right, and finish an outfit with authority.',
  },
  tops: {
    title: 'Shirts & Tops',
    subtitle: 'Every Occasion',
    description:
      'From relaxed Saturday linen to sharp-collar occasions — shirts that adapt.',
  },
  accessories: {
    title: 'Accessories',
    subtitle: 'The Details',
    description: 'Finish the look. Scarves, belts, and bags with intention.',
  },
  shoes: {
    title: 'Footwear',
    subtitle: 'Soft Essentials',
    description: 'Hand-finished textures, rich in weight and warmth.',
  },
  all: {
    title: 'The Wardrobe',
    subtitle: 'Every Piece',
    description:
      'The full rail. Every piece on offer, sorted by category — pick a starting point or browse the whole collection.',
  },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORIES[category as CategoryKey];
  if (!meta) return { title: 'Collections — Wearhouse' };
  return {
    title: `${meta.title} — Wearhouse`,
    description: meta.description,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!CATEGORIES[category as CategoryKey]) notFound();

  const meta = CATEGORIES[category as CategoryKey];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />

      <section
        className="relative overflow-hidden"
        style={{ paddingTop: '140px', paddingBottom: '40px', backgroundColor: '#ffe8d6' }}
      >
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            height: '420px',
            background: 'linear-gradient(180deg, #ddbea9 0%, #ffe8d6 100%)',
            zIndex: 0,
          }}
        />

        <div className="relative z-10 px-8 md:px-16 max-w-6xl mx-auto">
          <span
            className="block text-xs uppercase mb-5"
            style={{ color: '#cb997e', letterSpacing: '0.35em' }}
          >
            {meta.subtitle}
          </span>
          <h1
            className="font-light leading-none mb-6"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
              color: '#6b705c',
              fontFamily: "'Georgia', serif",
              lineHeight: '1.05',
            }}
          >
            {meta.title}
          </h1>

          <div
            style={{
              height: '1px',
              width: '60px',
              backgroundColor: '#cb997e',
              marginBottom: '24px',
            }}
          />

          <p
            className="max-w-2xl mb-4"
            style={{
              color: '#6b705c',
              opacity: 0.75,
              lineHeight: '1.8',
              fontSize: '0.95rem',
            }}
          >
            {meta.description}
          </p>
        </div>
      </section>

      <CollectionGallery initialCategory={category as CategoryKey} />

      <Footer />
    </div>
  );
}
