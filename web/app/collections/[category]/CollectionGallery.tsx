'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { getProducts, type Product } from '../../lib/styleon';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'bottoms', label: 'Trousers' },
  { key: 'tops', label: 'Shirts & Tops' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'shoes', label: 'Footwear' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

interface Props {
  initialCategory: FilterKey;
}

export default function CollectionGallery({ initialCategory }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<FilterKey>(initialCategory);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setActive(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    const queryCategory = active === 'all' ? undefined : active;
    getProducts(queryCategory)
      .then((data) => {
        if (alive) setItems(data);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load items.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [active]);

  const grouped = useMemo(() => {
    if (active !== 'all') return null;
    const groups: Record<string, Product[]> = {};
    for (const p of items) {
      const key = p.category ?? 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return groups;
  }, [items, active]);

  function selectFilter(next: FilterKey) {
    if (next === active) return;
    setActive(next);
    router.push(`/collections/${next}`, { scroll: false });
  }

  return (
    <section
      className="relative px-8 md:px-16 pb-24"
      style={{ backgroundColor: '#ffe8d6' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Filter rail */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-12">
          <span
            className="block text-[0.65rem] uppercase mr-2"
            style={{ color: '#6b705c', opacity: 0.6, letterSpacing: '0.3em' }}
          >
            Filter
          </span>
          {FILTERS.map((f) => {
            const isActive = f.key === active;
            return (
              <button
                key={f.key}
                onClick={() => selectFilter(f.key)}
                className="text-xs uppercase tracking-widest transition-all duration-200"
                style={{
                  padding: '8px 16px',
                  border: isActive
                    ? '1px solid #6b705c'
                    : '1px solid rgba(107,112,92,0.25)',
                  backgroundColor: isActive ? '#6b705c' : 'transparent',
                  color: isActive ? '#ffe8d6' : '#6b705c',
                  borderRadius: '2px',
                  letterSpacing: '0.15em',
                  fontFamily: "'Georgia', serif",
                }}
              >
                {f.label}
              </button>
            );
          })}
          <span
            className="ml-auto text-xs uppercase"
            style={{ color: '#6b705c', opacity: 0.65, letterSpacing: '0.2em' }}
          >
            {loading ? 'Loading…' : `${items.length} pieces`}
          </span>
        </div>

        {error && (
          <div
            className="mb-10 text-sm"
            style={{ color: '#6b705c', opacity: 0.85, letterSpacing: '0.05em' }}
          >
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div
            className="text-sm py-20 text-center"
            style={{ color: '#6b705c', opacity: 0.7, letterSpacing: '0.05em' }}
          >
            No pieces in this category yet.
          </div>
        )}

        {grouped ? (
          <div className="space-y-16">
            {Object.entries(grouped).map(([cat, list]) => (
              <CategoryGroup key={cat} category={cat} items={list} />
            ))}
          </div>
        ) : (
          <ProductGrid items={items} />
        )}
      </div>
    </section>
  );
}

function CategoryGroup({ category, items }: { category: string; items: Product[] }) {
  const label =
    FILTERS.find((f) => f.key === category)?.label ??
    category.charAt(0).toUpperCase() + category.slice(1);
  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <h3
          className="font-light"
          style={{
            fontFamily: "'Georgia', serif",
            color: '#6b705c',
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </h3>
        <Link
          href={`/collections/${category}`}
          className="flex items-center gap-1 text-xs uppercase"
          style={{ color: '#cb997e', letterSpacing: '0.2em' }}
        >
          View all <ArrowUpRight size={13} />
        </Link>
      </div>
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(107,112,92,0.18)',
          marginBottom: '24px',
        }}
      />
      <ProductGrid items={items.slice(0, 10)} />
    </div>
  );
}

function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {items.map((item) => (
        <ProductTile key={item.id} item={item} />
      ))}
    </div>
  );
}

function ProductTile({ item }: { item: Product }) {
  const image = item.image_url ?? item.try_on_ready_image_url ?? '';
  const price =
    item.price != null
      ? `$${Number(item.price).toFixed(0)} ${item.currency ?? ''}`.trim()
      : null;

  return (
    <Link
      href={`/try-on/${item.id}`}
      className="relative overflow-hidden group cursor-pointer block"
      style={{ height: '340px', borderRadius: '3px' }}
    >
      <img
        src={image}
        alt={item.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ filter: 'brightness(0.82) saturate(0.7)' }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(107,112,92,0.9) 0%, transparent 55%)',
        }}
      />
      <div className="absolute bottom-4 left-4 right-4">
        <span
          className="block text-[0.6rem] tracking-widest uppercase mb-1"
          style={{ color: '#ddbea9', letterSpacing: '0.2em' }}
        >
          {item.subcategory ?? item.category}
        </span>
        <h4
          className="font-light"
          style={{
            color: '#ffe8d6',
            fontFamily: "'Georgia', serif",
            fontSize: '1.05rem',
            lineHeight: '1.25',
          }}
        >
          {item.name}
        </h4>
        <div className="flex items-center justify-between mt-2">
          <p
            className="text-[0.65rem] uppercase"
            style={{
              color: 'rgba(255,232,214,0.7)',
              letterSpacing: '0.18em',
            }}
          >
            {item.brand ?? price ?? 'Try it on'}
          </p>
          <ArrowUpRight
            size={14}
            style={{ color: '#ddbea9' }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </Link>
  );
}
