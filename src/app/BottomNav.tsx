import { NavLink } from 'react-router-dom';
import { Camera, ClipboardList, History, Home, User, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: Home },
  { to: '/log', label: 'Log', icon: UtensilsCrossed },
  { to: '/scan', label: 'Scan', icon: Camera },
  { to: '/plan', label: 'Plan', icon: ClipboardList },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
];

export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 border-t border-[color:var(--border)] bg-black-soft/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto flex max-w-app items-stretch justify-between px-1 pt-1">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  // 44px+ touch target on every tab
                  'flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-sm px-1 py-1.5',
                  'text-[10px] font-semibold transition-colors duration-200 ease-out',
                  isActive ? 'text-gold-light' : 'text-gray-soft hover:text-gray',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} aria-hidden="true" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
