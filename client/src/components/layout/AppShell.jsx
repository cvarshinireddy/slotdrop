import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarClock, History, Home, LayoutDashboard, PackagePlus, ScanLine, UserRound, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { BellButton, NotificationsPanel } from './NotificationsPanel';
import { ThemeToggle } from './ThemeToggle';
import { PageTransition } from './PageTransition';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';

const NAV = {
  resident: [{ to: '/', label: 'Home', icon: Home, end: true }, { to: '/history', label: 'History', icon: History }, { to: '/account', label: 'Account', icon: UserRound }],
  guard: [
    { to: '/guard/log', label: 'Log parcel', icon: PackagePlus }, { to: '/guard/handover', label: 'Handover', icon: ScanLine },
    { to: '/guard/schedule', label: 'Today', icon: CalendarClock }, { to: '/account', label: 'Account', icon: UserRound },
  ],
  admin: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }, { to: '/admin/users', label: 'People', icon: Users }, { to: '/account', label: 'Account', icon: UserRound }],
};

// Desktop sidebar (>= lg) and mobile bottom tabs share one nav config, so they can never drift apart.
export function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const items = NAV[user.role];
  const fullBleed = pathname === '/guard/handover'; // scanner screen takes the whole viewport on mobile

  return (
    <NotificationsProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface p-4 lg:flex">
          <Logo className="px-2 py-3" />
          <nav aria-label="Main" className="mt-6 flex flex-1 flex-col gap-1">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex min-h-tap items-center gap-3 rounded-2xl px-3 text-sm font-medium transition-colors', isActive ? 'bg-primary-soft text-primary-soft-foreground' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground')}>
                <Icon className="size-5" aria-hidden />{label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{user.role}{user.flatId ? ` · ${user.flatId.number}` : ''}</p>
            </div>
            <BellButton />
          </div>
        </aside>

        <div className="min-w-0">
          <header className={cn('sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2 backdrop-blur lg:hidden', fullBleed && 'hidden')}>
            <Logo />
            <BellButton />
          </header>
          <main className={cn('mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:max-w-4xl lg:pb-12 lg:pt-10', fullBleed && 'px-0 pb-20 pt-0 lg:px-6 lg:pt-10')}>
            <PageTransition key={pathname}><Outlet /></PageTransition>
          </main>
        </div>

        <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {({ isActive }) => (<><Icon className={cn('size-5', isActive && 'stroke-[2.5]')} aria-hidden />{label}</>)}
            </NavLink>
          ))}
        </nav>
      </div>
      <NotificationsPanel />
    </NotificationsProvider>
  );
}

export { ThemeToggle };
