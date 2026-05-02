import Header from '../../components/Header';

export default function CollectionLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />
      {/* Hero skeleton */}
      <section
        style={{
          paddingTop: '140px',
          paddingBottom: '40px',
          paddingLeft: 'clamp(32px, 4vw, 64px)',
          paddingRight: 'clamp(32px, 4vw, 64px)',
          backgroundColor: '#ffe8d6',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '420px',
            background: 'linear-gradient(180deg, #ddbea9 0%, #ffe8d6 100%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto" style={{ zIndex: 10 }}>
          <div className="skeleton" style={{ width: '80px', height: '11px', borderRadius: '2px', marginBottom: '20px' }} />
          <div className="skeleton" style={{ width: '260px', height: 'clamp(40px, 6vw, 88px)', borderRadius: '2px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '60px', height: '1px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ width: '380px', maxWidth: '100%', height: '14px', borderRadius: '2px' }} />
        </div>
      </section>

      {/* Grid skeleton */}
      <section className="relative px-8 md:px-16 pb-24" style={{ backgroundColor: '#ffe8d6' }}>
        <div className="max-w-6xl mx-auto">
          {/* Filter rail skeleton */}
          <div className="flex items-center gap-3 mb-12">
            <div className="skeleton" style={{ width: '36px', height: '10px', borderRadius: '2px' }} />
            {[90, 80, 110, 90, 80, 90].map((w, i) => (
              <div key={i} className="skeleton" style={{ width: `${w}px`, height: '34px', borderRadius: '2px' }} />
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '340px', borderRadius: '3px' }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
