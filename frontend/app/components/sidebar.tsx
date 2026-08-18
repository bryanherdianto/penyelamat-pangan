'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, HelpCircle, LayoutDashboard, Menu, Package, Route, X } from 'lucide-react';

import type { Box } from '../lib/boxes';

type Section = 'dashboard' | 'box-detail' | 'route' | 'help';

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
          {navOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <nav className={`${navOpen ? 'block' : 'hidden'} lg:block space-y-2 mt-4 lg:mt-0`}>
        <button onClick={() => router.push('/dashboard')} className={itemClass(active === 'dashboard')}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <div>
          <button
            onClick={() => setBoxesOpen((v) => !v)}
            className={itemClass(active === 'box-detail')}
            aria-expanded={boxesOpen}
          >
            <Package size={18} />
            <span>Box Detail</span>
            <ChevronRight
              size={16}
              className={`ml-auto transition-transform ${boxesOpen ? 'rotate-90' : ''}`}
            />
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
          <Route size={18} />
          <span>Route</span>
        </button>

        <button onClick={() => router.push('/dashboard')} className={itemClass(active === 'help')}>
          <HelpCircle size={18} />
          <span>Help</span>
        </button>
      </nav>
    </aside>
  );
}
