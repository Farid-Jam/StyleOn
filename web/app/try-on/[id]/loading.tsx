import Header from '../../components/Header';

export default function TryOnLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffe8d6' }}>
      <Header />

      {/* Product intro skeleton */}
      <section
        style={{
          padding: 'clamp(100px, 10vw, 116px) clamp(24px, 4vw, 64px) 52px',
          backgroundColor: '#ddbea9',
        }}
      >
        <div className="skeleton" style={{ width: '120px', height: '10px', borderRadius: '2px', marginBottom: '28px' }} />
        <div className="skeleton" style={{ width: '60px', height: '10px', borderRadius: '2px', marginBottom: '14px' }} />
        <div className="skeleton" style={{ width: 'clamp(200px, 40vw, 420px)', height: 'clamp(38px, 4.5vw, 67px)', borderRadius: '2px', marginBottom: '20px' }} />
        <div style={{ width: '56px', height: '1px', backgroundColor: 'rgba(203,153,126,0.4)' }} />
      </section>

      {/* Workspace skeleton */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: 'clamp(280px, 42%, 600px) 1fr',
          alignItems: 'start',
          backgroundColor: '#ffe8d6',
        }}
      >
        {/* Garment panel skeleton */}
        <div className="skeleton" style={{ height: 'calc(100vh - 68px)', position: 'sticky', top: '68px' }} />

        {/* Steps panel skeleton */}
        <div style={{ padding: '52px 68px 96px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Progress row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: i < 2 ? 1 : undefined }}>
                <div className="skeleton" style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ width: '60px', height: '8px', borderRadius: '2px' }} />
                {i < 2 && <div className="skeleton" style={{ flex: 1, height: '1px' }} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          <div style={{ paddingBottom: '36px', borderBottom: '1px solid rgba(107,112,92,0.1)' }}>
            <div className="skeleton" style={{ width: '50px', height: '9px', borderRadius: '2px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '140px', height: '26px', borderRadius: '2px', marginBottom: '24px' }} />
            <div className="skeleton" style={{ width: '100%', aspectRatio: '3/4', maxHeight: '420px', borderRadius: '3px' }} />
          </div>

          {/* Step 2 */}
          <div style={{ paddingBottom: '36px', borderBottom: '1px solid rgba(107,112,92,0.1)' }}>
            <div className="skeleton" style={{ width: '50px', height: '9px', borderRadius: '2px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ width: '200px', height: '26px', borderRadius: '2px', marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '30px' }}>
              {[52, 52, 52, 52].map((w, i) => (
                <div key={i} className="skeleton" style={{ width: `${w}px`, height: '40px', borderRadius: '2px' }} />
              ))}
            </div>
            <div className="skeleton" style={{ width: '160px', height: '40px', borderRadius: '2px' }} />
          </div>

          {/* CTA */}
          <div style={{ paddingTop: '8px' }}>
            <div className="skeleton" style={{ width: '100%', height: '60px', borderRadius: '2px' }} />
          </div>
        </div>
      </main>
    </div>
  );
}
