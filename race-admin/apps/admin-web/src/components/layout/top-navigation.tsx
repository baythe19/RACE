import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronDown,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';

import { getNotifications, getUnreadNotificationCount } from '@race/api';
import { Avatar } from '@race/ui';
import { cn, formatRelativeTime } from '@race/utils';

import { SearchCommand } from './search-command';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, onClose]);
}

export function TopNavigation() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notification-count'],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: () => getNotifications({ page: 1, pageSize: 5 }),
    enabled: notifOpen,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b border-border bg-surface/80 px-4 shadow-header backdrop-blur-md lg:px-6">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-input px-3.5 py-2 text-sm text-muted transition hover:border-primary/30 hover:bg-surface-hover md:flex md:max-w-md lg:max-w-lg"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Search customers, bookings, vendors...</span>
          <kbd className="ml-auto hidden rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted lg:inline">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl p-2.5 text-muted transition hover:bg-surface-hover hover:text-heading"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-xl p-2.5 text-muted transition hover:bg-surface-hover hover:text-heading"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </button>

            {notifOpen ? (
              <div className="race-dropdown absolute right-0 top-full z-50 mt-2 w-80">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-heading">Notifications</p>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-medium text-primary-dark hover:underline"
                  >
                    View all
                  </Link>
                </div>
                <ul className="max-h-72 overflow-y-auto race-scrollbar">
                  {notifications?.items.length ? (
                    notifications.items.map((n) => (
                      <li
                        key={n.id}
                        className="border-b border-border-subtle px-4 py-3 last:border-0 hover:bg-surface-hover"
                      >
                        <p className="text-sm font-medium text-heading">{n.title}</p>
                        {n.message ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-body">{n.message}</p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted">{formatRelativeTime(n.createdAt)}</p>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-8 text-center text-sm text-muted">No notifications</li>
                  )}
                </ul>
              </div>
            ) : null}
          </div>

          <div ref={userRef} className="relative">
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1 pr-2 transition hover:bg-surface-hover"
            >
              <Avatar
                fallback={user?.name?.charAt(0) ?? 'A'}
                alt={user?.name ?? 'Admin'}
                src={user?.avatarUrl}
              />
              <div className="hidden text-left lg:block">
                <p className="text-sm font-semibold leading-tight text-heading">
                  {user?.name ?? 'Admin User'}
                </p>
                <p className="text-[11px] text-muted">Super Admin</p>
              </div>
              <ChevronDown
                className={cn('hidden h-4 w-4 text-muted transition-transform lg:block', userOpen && 'rotate-180')}
              />
            </button>

            {userOpen ? (
              <div className="race-dropdown absolute right-0 top-full z-50 mt-2 w-52 py-1">
                <Link
                  to="/profile"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-surface-hover"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-body hover:bg-surface-hover"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

