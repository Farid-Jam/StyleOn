'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, User, Menu, X } from 'lucide-react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(255, 232, 214, 0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(203, 153, 126, 0.2)',
      }}
    >
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="text-2xl tracking-[0.3em] uppercase font-light"
          style={{ color: '#6b705c', fontFamily: "'Georgia', serif", letterSpacing: '0.35em' }}
        >
          Wearhouse
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-8">
        {['Collections', 'Seasons', 'Styles', 'Sale'].map((item) => (
          <a
            key={item}
            href="#"
            className="text-sm tracking-widest uppercase transition-colors duration-200"
            style={{ color: '#6b705c', fontFamily: "'Georgia', serif", letterSpacing: '0.12em' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#cb997e')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6b705c')}
          >
            {item}
          </a>
        ))}
      </nav>

      <div className="hidden md:flex items-center gap-5">
        <button style={{ color: '#6b705c' }} className="hover:opacity-70 transition-opacity">
          <Search size={18} />
        </button>
        <button style={{ color: '#6b705c' }} className="hover:opacity-70 transition-opacity">
          <User size={18} />
        </button>
        <button
          className="flex items-center gap-2 px-5 py-2.5 text-xs tracking-widest uppercase transition-all duration-200"
          style={{ backgroundColor: '#6b705c', color: '#ffe8d6', borderRadius: '2px', letterSpacing: '0.15em' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#cb997e')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6b705c')}
        >
          <ShoppingBag size={14} />
          Bag
        </button>
      </div>

      <button
        className="md:hidden"
        style={{ color: '#6b705c' }}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {menuOpen && (
        <div
          className="absolute top-full left-0 right-0 flex flex-col gap-6 px-8 py-8 md:hidden"
          style={{ backgroundColor: '#ffe8d6', borderTop: '1px solid rgba(203, 153, 126, 0.3)' }}
        >
          {['Collections', 'Seasons', 'Styles', 'Sale'].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm tracking-widest uppercase"
              style={{ color: '#6b705c' }}
            >
              {item}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
