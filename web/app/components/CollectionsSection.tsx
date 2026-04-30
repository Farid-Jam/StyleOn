import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const featured = [
  {
    title: 'OUTERWEAR',
    subtitle: 'Coats & Layers',
    description: 'Structured silhouettes and premium fabrics that define presence in any room.',
    image: 'https://images.pexels.com/photos/2220316/pexels-photo-2220316.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'outerwear',
    size: 'large',
  },
  {
    title: 'FOOTWEAR',
    subtitle: 'Soft Essentials',
    description: 'Hand-finished textures, rich in weight and warmth.',
    image: 'https://wwd.com/wp-content/uploads/2025/09/Stella-McCartney-Spring-2026-RTW-R-GG-150.jpg?w=800',
    category: 'shoes',
    size: 'large',
  },
  {
    title: 'TROUSERS',
    subtitle: 'The Foundation',
    description: 'Cuts that sit right, move right, and finish an outfit with authority.',
    image: 'https://www.apetogentleman.com/wp-content/uploads/2023/05/wide-leg-pants-men.jpg',
    category: 'bottoms',
    size: 'large',
  },
  {
    title: 'SHIRTS & TOPS',
    subtitle: 'Every Occasion',
    description: 'From relaxed Saturday linen to sharp-collar occasions — shirts that adapt.',
    image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=900',
    category: 'tops',
    size: 'medium',
  },
  {
    title: 'ACCESSORIES',
    subtitle: 'The Details',
    description: 'Finish the look. Scarves, belts, and bags with intention.',
    image: 'https://www.apetogentleman.com/wp-content/uploads/2024/10/fashion-accessories.jpg',
    category: 'accessories',
    size: 'medium',
  },
];

export default function CollectionsSection() {
  return (
    <section id="collections" style={{ backgroundColor: '#b7b7a4' }} className="py-24 px-8 md:px-16">
      <div className="flex items-end justify-between mb-14">
        <div>
          <span
            className="block text-xs tracking-[0.35em] uppercase mb-3"
            style={{ color: '#ffe8d6', opacity: 0.7, letterSpacing: '0.3em' }}
          >
            Shop by Category
          </span>
          <h2
            className="font-light leading-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', color: '#ffe8d6', fontFamily: "'Georgia', serif" }}
          >
            The Collections
          </h2>
        </div>
        <Link
          href="/collections/all"
          className="hidden md:flex items-center gap-1 text-xs tracking-widest uppercase"
          style={{ color: '#ffe8d6', opacity: 0.75, letterSpacing: '0.15em' }}
        >
          All Collections <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Asymmetric grid layout inspired by image 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Large hero card */}
        <Link
          href={`/collections/${featured[0].category}`}
          className="md:col-span-2 relative overflow-hidden group cursor-pointer block"
          style={{ height: '100%', minHeight: '520px', borderRadius: '3px' }}
        >
          <img
            src={featured[0].image}
            alt={featured[0].title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ filter: 'brightness(0.72) saturate(0.6)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(107,112,92,0.7) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(107,112,92,0.85) 0%, transparent 50%)' }} />
          <div className="absolute bottom-8 left-8 right-8">
            <span className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#ddbea9', letterSpacing: '0.25em' }}>{featured[0].subtitle}</span>
            <h3 style={{ color: '#ffe8d6', fontFamily: "'Georgia', serif", fontSize: '2.8rem', fontWeight: 300, lineHeight: 1.1 }}>{featured[0].title}</h3>
            <p className="mt-2 max-w-sm text-sm" style={{ color: 'rgba(255,232,214,0.75)', lineHeight: '1.6' }}>{featured[0].description}</p>
            <span
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase transition-all duration-200 group-hover:bg-[rgba(255,232,214,0.15)]"
              style={{ border: '1px solid rgba(255,232,214,0.5)', color: '#ffe8d6', borderRadius: '2px', letterSpacing: '0.15em' }}
            >
              Discover Collection <ArrowUpRight size={13} />
            </span>
          </div>
        </Link>

        {/* Two small cards stacked */}
        <div className="flex flex-col gap-4">
          {[featured[1], featured[2]].map((item) => (
            <Link
              key={item.title}
              href={`/collections/${item.category}`}
              className="relative overflow-hidden group cursor-pointer flex-1 block"
              style={{ minHeight: '248px', borderRadius: '3px' }}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ filter: 'brightness(0.72) saturate(0.6)' }}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(107,112,92,0.9) 0%, transparent 55%)' }} />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="block text-xs tracking-widest uppercase mb-1" style={{ color: '#ddbea9', letterSpacing: '0.2em' }}>{item.subtitle}</span>
                <h3 className="font-light" style={{ color: '#ffe8d6', fontFamily: "'Georgia', serif", fontSize: '1.4rem' }}>{item.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs" style={{ color: 'rgba(255,232,214,0.65)', lineHeight: '1.5', maxWidth: '80%' }}>{item.description}</p>
                  <ArrowUpRight size={16} style={{ color: '#ddbea9', flexShrink: 0, marginLeft: '8px' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Two medium cards side by side */}
        {[featured[3], featured[4]].map((item) => (
          <Link
            key={item.title}
            href={`/collections/${item.category}`}
            className="relative overflow-hidden group cursor-pointer block"
            style={{ height: '280px', borderRadius: '3px' }}
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ filter: 'brightness(0.72) saturate(0.6)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(107,112,92,0.9) 0%, transparent 55%)' }} />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="block text-xs tracking-widest uppercase mb-1" style={{ color: '#ddbea9', letterSpacing: '0.2em' }}>{item.subtitle}</span>
              <h3 className="font-light" style={{ color: '#ffe8d6', fontFamily: "'Georgia', serif", fontSize: '1.6rem' }}>{item.title}</h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,232,214,0.65)', lineHeight: '1.5' }}>{item.description}</p>
            </div>
          </Link>
        ))}

        {/* Quote / CTA card */}
        <Link
          href="/collections/all"
          className="flex flex-col justify-between p-8 cursor-pointer group transition-all duration-300 hover:bg-[#cb997e]"
          style={{ height: '280px', borderRadius: '3px', backgroundColor: '#6b705c' }}
        >
          <p
            className="font-light italic leading-snug"
            style={{ color: '#ffe8d6', fontFamily: "'Georgia', serif", fontSize: '1.3rem', lineHeight: '1.55' }}
          >
            &ldquo;Dress not for the occasion, but for the person you are becoming.&rdquo;
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,232,214,0.6)', letterSpacing: '0.2em' }}>View all pieces</span>
            <ArrowUpRight size={18} style={{ color: '#ddbea9' }} />
          </div>
        </Link>
      </div>
    </section>
  );
}
