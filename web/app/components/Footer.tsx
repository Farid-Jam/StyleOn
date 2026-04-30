'use client';

import { Instagram, Twitter, ArrowUpRight } from 'lucide-react';

const links = {
  Shop: ['New Arrivals', 'Collections', 'Sale', 'Gift Cards'],
  Tailor: ['Style Quiz', 'Fit Guide', 'Body Types', 'Size Chart'],
  Company: ['Our Story', 'Sustainability', 'Careers', 'Press'],
  Support: ['Contact', 'Shipping', 'Returns', 'FAQ'],
};

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#6b705c', color: '#ffe8d6' }}>
      <div
        className="flex flex-col md:flex-row items-start md:items-center justify-between px-8 md:px-16 py-12"
        style={{ borderBottom: '1px solid rgba(255,232,214,0.12)' }}
      >
        <div>
          <h3 className="font-light mb-1" style={{ fontFamily: "'Georgia', serif", fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
            Dressed for who you are.
          </h3>
          <p className="text-sm" style={{ color: 'rgba(255,232,214,0.6)', lineHeight: '1.6' }}>
            Start the style quiz and receive your personal lookbook today.
          </p>
        </div>
        <button
          className="mt-6 md:mt-0 flex items-center gap-2 px-8 py-4 text-xs tracking-widest uppercase transition-all duration-300"
          style={{ backgroundColor: '#cb997e', color: '#ffe8d6', borderRadius: '2px', letterSpacing: '0.15em' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ddbea9')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#cb997e')}
        >
          Start Style Quiz <ArrowUpRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-10 px-8 md:px-16 py-14">
        <div className="col-span-2 md:col-span-1">
          <div className="text-xl tracking-[0.35em] uppercase font-light mb-4" style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.35em' }}>
            StyleOn
          </div>
          <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(255,232,214,0.55)', lineHeight: '1.7' }}>
            A virtual atelier that matches curated fashion to the person wearing it.
          </p>
          <div className="flex gap-3">
            {[Instagram, Twitter].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 flex items-center justify-center transition-all duration-200"
                style={{ border: '1px solid rgba(255,232,214,0.2)', borderRadius: '2px' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = '#cb997e')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,232,214,0.2)')}
              >
                <Icon size={14} style={{ color: 'rgba(255,232,214,0.7)' }} />
              </a>
            ))}
          </div>
        </div>

        {Object.entries(links).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-xs tracking-widest uppercase mb-5" style={{ color: 'rgba(255,232,214,0.45)', letterSpacing: '0.2em' }}>
              {category}
            </h4>
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-sm transition-colors duration-200"
                    style={{ color: 'rgba(255,232,214,0.7)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#cb997e')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,232,214,0.7)')}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className="flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-5 text-xs"
        style={{ borderTop: '1px solid rgba(255,232,214,0.1)', color: 'rgba(255,232,214,0.35)', letterSpacing: '0.1em' }}
      >
        <span>&copy; 2026 StyleOn. All rights reserved.</span>
        <div className="flex gap-6 mt-3 md:mt-0">
          <a href="#" className="hover:opacity-70 transition-opacity">Privacy Policy</a>
          <a href="#" className="hover:opacity-70 transition-opacity">Terms of Service</a>
          <a href="#" className="hover:opacity-70 transition-opacity">Cookie Settings</a>
        </div>
      </div>
    </footer>
  );
}
