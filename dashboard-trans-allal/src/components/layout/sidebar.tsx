'use client';

import {
  AlertTriangle,
  BarChart3,
  Building2,
  LayoutDashboard,
  MapPin,
  Route,
  Settings,
  Truck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '../../lib/utils/cn';

const navItems = [
  { key: 'overview', href: '/', icon: LayoutDashboard },
  { key: 'companies', href: '/companies', icon: Building2 },
  { key: 'drivers', href: '/drivers', icon: Users },
  { key: 'trucks', href: '/trucks', icon: Truck },
  { key: 'trips', href: '/trips', icon: Route },
  { key: 'tracking', href: '/tracking', icon: MapPin },
  { key: 'alerts', href: '/alerts', icon: AlertTriangle },
  { key: 'reports', href: '/reports', icon: BarChart3 },
  { key: 'settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-700 h-full">
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-lg text-blue-600">Trans Allal</span>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ key, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
            >
              <Icon size={18} />
              {t(key as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
