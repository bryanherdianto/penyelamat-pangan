'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Box } from '../lib/boxes';

type Section = 'dashboard' | 'box-detail' | 'route' | 'help';

const ICONS: Record<Section, string> = {
  dashboard:
    'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  'box-detail': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  route:
    'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

function NavIcon({ section, className = 'w-5 h-5' }: { section: Section; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[section]} />
    </svg>
  );
}

const itemClass = (isActive: boolean) =>
  `w-full flex items-center gap-3 px-4 py-2 text-left text-sm font-medium transition-colors rounded-3xl ${
    isActive ? 'bg-surface text-brand-dark border border-line' : 'text-ink-muted hover:text-brand-dark'
  }`;

export default function Sidebar({
  active,
  boxes,
  activeBoxId,
}: {
  active: Section;
  boxes: Box[];
  activeBoxId?: string;
}) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [boxesOpen, setBoxesOpen] = useState(active === 'box-detail');

  return (
    <aside className="w-full lg:w-48 lg:shrink-0 bg-surface-muted p-4 lg:p-6 m-3 lg:m-5 rounded-2xl lg:sticky lg:top-5 lg:self-start">
      <div className="flex items-center justify-between gap-2 lg:mb-10">
        <div className="flex items-center gap-2">
          <Image src="/logo-chain.png" width={40} height={40} alt="" className="w-8 h-8 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold">Penyelamat</p>
            <p className="text-sm font-bold">Pangan</p>
          </div>
        </div>

        {/* Mobile: the nav collapses so it does not eat the whole first screen */}
        <button
          onClick={() => setNavOpen((v) => !v)}
          className="lg:hidden p-2 rounded-lg text-ink-muted hover:bg-surface"
          aria-expanded={navOpen}
          aria-label={navOpen ? 'Hide navigation' : 'Show navigation'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={navOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      <nav className={`${navOpen ? 'block' : 'hidden'} lg:block space-y-2 mt-4 lg:mt-0`}>
        <button onClick={() => router.push('/dashboard')} className={itemClass(active === 'dashboard')}>
          <NavIcon section="dashboard" />
          <span>Dashboard</span>
        </button>

        <div>
          <button
            onClick={() => setBoxesOpen((v) => !v)}
            className={itemClass(active === 'box-detail')}
            aria-expanded={boxesOpen}
          >
            <NavIcon section="box-detail" />
            <span>Box Detail</span>
            <svg
              className={`w-4 h-4 ml-auto transition-transform ${boxesOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {boxesOpen && (
            <div className="ml-8 mt-1 space-y-1">
              {boxes.length === 0 && <p className="px-3 py-1.5 text-xs text-ink-faint italic">No boxes yet</p>}
              {boxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => router.push(`/dashboard/box-detail/${box.id}`)}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    activeBoxId === String(box.id)
                      ? 'text-brand-dark font-medium bg-brand-soft'
                      : 'text-ink-muted hover:text-brand-dark hover:bg-surface'
                  }`}
                >
                  Box {box.id}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => router.push('/dashboard')} className={itemClass(active === 'route')}>
          <NavIcon section="route" />
          <span>Route</span>
        </button>

        <button onClick={() => router.push('/dashboard')} className={itemClass(active === 'help')}>
          <NavIcon section="help" />
          <span>Help</span>
        </button>
      </nav>
    </aside>
  );
}
