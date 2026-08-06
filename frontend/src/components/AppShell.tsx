'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/app/i18n/context';
import { isAuthenticated, logout } from '@/services/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { cn } from '@/lib/cn';

interface NavChild {
  href: string;
  icon: string;
  labelKey: string;
}

interface NavItem {
  href: string;
  icon: string;
  labelKey: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    labelKey: 'common.dashboard',
  },
  {
    href: '/brands',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    labelKey: 'common.brands',
  },
  {
    href: '/content',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    labelKey: 'common.content',
  },
  {
    href: '/analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    labelKey: 'common.analytics',
    children: [
      {
        href: '/analytics/competitors',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        labelKey: 'common.competitors',
      },
    ],
  },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [isLg, setIsLg] = useState(true);
  const [isMd, setIsMd] = useState(false);

  // Breakpoint detection: ≥1024px = lg, 768-1023px = md, <768px = sm
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lgQuery = window.matchMedia('(min-width: 1024px)');
    const mdQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');

    const handleResize = () => {
      setIsLg(lgQuery.matches);
      setIsMd(mdQuery.matches);
    };
    handleResize();
    lgQuery.addEventListener('change', handleResize);
    mdQuery.addEventListener('change', handleResize);
    return () => {
      lgQuery.removeEventListener('change', handleResize);
      mdQuery.removeEventListener('change', handleResize);
    };
  }, []);

  // localStorage persistence for collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed') === 'true';
      setCollapsed(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // md screen: expanded on hover; lg screen: expanded unless user collapsed
  const sidebarExpanded = isMd ? hoverExpanded : !collapsed;

  const isActive = (href: string): boolean => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/brands') return pathname.startsWith('/brands');
    if (href === '/content') return pathname.startsWith('/content');
    if (href === '/analytics') return pathname.startsWith('/analytics');
    if (href === '/subscription') return pathname === '/subscription';
    if (href === '/team') return pathname === '/team';
    if (href === '/billing') return pathname === '/billing';
    if (href === '/api-keys') return pathname === '/api-keys';
    if (href === '/white-label') return pathname === '/white-label';
    return pathname === href;
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile hamburger button — QA-5: 44x44px touch area. Only on sm (<768px) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-40 md:hidden flex items-center justify-center w-11 h-11 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay — only on sm (<768px) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — three breakpoints:
          lg (≥1024px): relative, user-controlled collapse
          md (768-1023px): relative, auto-collapsed icons, hover to expand
          sm (<768px): hidden, hamburger overlay */}
      <aside
        onMouseEnter={() => isMd && setHoverExpanded(true)}
        onMouseLeave={() => isMd && setHoverExpanded(false)}
        className={cn(
          'flex flex-col bg-white border-r border-gray-200 transition-all duration-200',
          // sm: fixed overlay, hidden unless mobileOpen
          'fixed top-0 bottom-0 left-0 z-50',
          // md: relative, always visible (collapsed icons)
          isMd && 'relative z-auto',
          // lg: relative, always visible
          isLg && 'relative z-auto',
          // sm: translate controlled by mobileOpen
          !isMd && !isLg && (mobileOpen ? 'translate-x-0' : '-translate-x-full'),
          // md/lg: always visible
          (isMd || isLg) && 'translate-x-0',
          // Width: expanded (w-56) or collapsed (w-16)
          sidebarExpanded ? 'w-56' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          {sidebarExpanded ? (
            <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">G</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">GeoRank</span>
            </Link>
          ) : (
            <Link href="/dashboard" className="mx-auto" onClick={() => setMobileOpen(false)}>
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">G</span>
              </div>
            </Link>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  !sidebarExpanded && 'justify-center'
                )}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {sidebarExpanded && <span>{t(item.labelKey)}</span>}
              </Link>
              {/* Children */}
              {item.children && sidebarExpanded && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                        isActive(child.href)
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      )}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={child.icon} />
                      </svg>
                      <span>{t(child.labelKey)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          <Link
            href="/team"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/team')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              !sidebarExpanded && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {sidebarExpanded && <span>{t('nav.team')}</span>}
          </Link>
          <Link
            href="/billing"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/billing')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              !sidebarExpanded && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {sidebarExpanded && <span>{t('nav.billing')}</span>}
          </Link>
          <Link
            href="/api-keys"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/api-keys')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              !sidebarExpanded && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            {sidebarExpanded && <span>{t('nav.apiKeys')}</span>}
          </Link>
          <Link
            href="/white-label"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/white-label')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              !sidebarExpanded && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            {sidebarExpanded && <span>{t('nav.whiteLabel')}</span>}
          </Link>
          <Link
            href="/subscription"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/subscription')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              !sidebarExpanded && 'justify-center'
            )}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {sidebarExpanded && <span>{t('nav.subscription')}</span>}
          </Link>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors',
              !sidebarExpanded && 'justify-center'
            )}
            title={!sidebarExpanded ? t('common.signOut') : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarExpanded && <span>{t('common.signOut')}</span>}
          </button>
        </div>

        {/* Collapse Toggle — lg only (≥1024px). Not shown on md where sidebar auto-collapses */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-16 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors z-10 hidden lg:flex"
        >
          <svg
            className={cn('w-3.5 h-3.5 transition-transform', collapsed && 'rotate-180')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-200',
          // lg: margin based on sidebar width
          isLg && (sidebarExpanded ? 'ml-56' : 'ml-16'),
          // md: margin based on sidebar width
          isMd && (sidebarExpanded ? 'ml-56' : 'ml-16'),
          // sm: no margin (sidebar is overlay)
          !isMd && !isLg && 'ml-0'
        )}
      >
        {/* Top Bar with Language Switcher */}
        <div className="h-14 flex items-center justify-end px-4 border-b border-gray-100 bg-white">
          <LanguageSwitcher />
        </div>

        {/* Page Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
