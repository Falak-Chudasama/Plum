import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Inbox,
  Send,
  FileText,
  Sparkles,
  Users,
  Moon,
  Sun,
  PenSquare,
  ChevronDown,
  Check,
  Plus,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../ui/ThemeProvider';
import { usePlumStore } from '../../store/usePlumStore';
import { api } from '../../lib/api';
import { playEnter, playPageNav, playScroll } from '../../lib/sound';

const plumLogo = 'https://basket.jam/icons/plum-icon.svg';

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/sent', label: 'Sent', icon: Send },
  { to: '/drafts', label: 'Drafts', icon: FileText },
  { to: '/chat', label: 'AI Chat', icon: Sparkles },
  { to: '/accounts', label: 'Accounts', icon: Users },
];

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  const {
    user,
    mailboxes,
    activeMailbox,
    activeChatId,
    setActiveMailbox,
    openComposer,
    logout,
  } = usePlumStore();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);

  const getNavDestination = (to: string) =>
    to === '/chat' && activeChatId ? `/chat?id=${encodeURIComponent(activeChatId)}` : to;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pillStyle, setPillStyle] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  const [isReady, setIsReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Dynamic Sliding Active Pill calculation (Section 2.9: 300ms cubic-bezier(0.2, 0.8, 0.2, 1))
  const updatePill = () => {
    const activeItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    if (activeItem && itemRefs.current[activeItem.to] && navContainerRef.current) {
      const navRect = navContainerRef.current.getBoundingClientRect();
      const elRect = itemRefs.current[activeItem.to]!.getBoundingClientRect();

      setPillStyle({
        left: elRect.left - navRect.left,
        top: elRect.top - navRect.top,
        width: elRect.width,
        height: elRect.height,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  };

  useEffect(() => {
    updatePill();
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);
    window.addEventListener('resize', updatePill);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePill);
    };
  }, [location.pathname]);

  // Keyboard shortcut: Ctrl + Left / Right arrow keys to navigate between primary tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const currentPath = location.pathname;
        const currentIndex = NAV_ITEMS.findIndex((item) => currentPath.startsWith(item.to));
        const activeIdx = currentIndex !== -1 ? currentIndex : 0;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = (activeIdx - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
          playScroll();
          navigate(getNavDestination(NAV_ITEMS[prevIndex].to));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (activeIdx + 1) % NAV_ITEMS.length;
          playScroll();
          navigate(getNavDestination(NAV_ITEMS[nextIndex].to));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate, activeChatId]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAccountObj = mailboxes.find((m) => m.email === activeMailbox);

  const handleNavClick = () => {
    playPageNav();
  };

  const handleCompose = () => {
    playEnter();
    openComposer();
  };

  const handleAccountSelect = (email: string) => {
    playEnter();
    setActiveMailbox(email);
    setIsAccountDropdownOpen(false);
  };

  const handleThemeToggle = () => {
    playEnter();
    toggleTheme();
  };

  return (
    <>
      {/* Desktop Floating Navigation Capsule (Docked fixed at top-3.5, 15px blur, 0.20 fill, stationary during scroll) */}
      <header className="fixed top-3.5 inset-x-0 z-40 mx-auto hidden w-full max-w-5xl px-4 sm:block pointer-events-none">
        <div className="glass-capsule pointer-events-auto flex items-center justify-between gap-3 rounded-full px-4 py-2 shadow-floating transition-colors duration-200">
          {/* Brand Wordmark & Logo */}
          <Link
            to="/inbox"
            onClick={handleNavClick}
            className="focus-ring flex items-center gap-2 rounded-full pr-1.5 transition hover:opacity-90 shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-stone-800 p-1 shadow-none border border-black/[0.06] dark:border-white/[0.08]">
              <img src={plumLogo} alt="Plum" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-display text-sm font-black text-stone-900 dark:text-white tracking-tight">
              Plum
            </span>
          </Link>

          {/* Navigation Links with Smooth Indicator & SFX */}
          <nav className="flex items-center gap-1" aria-label="Primary Desktop Navigation">
            <div ref={navContainerRef} className="relative flex items-center gap-1">
              {/* Dynamic Sliding Active Indicator Pill */}
              <div
                className={`absolute rounded-full bg-stone-900 dark:bg-stone-100 pointer-events-none ${
                  isReady ? 'transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : ''
                }`}
                style={{
                  transform: `translate3d(${pillStyle.left}px, ${pillStyle.top}px, 0)`,
                  width: `${pillStyle.width}px`,
                  height: `${pillStyle.height}px`,
                  opacity: pillStyle.opacity,
                  willChange: 'transform, width',
                }}
                aria-hidden="true"
              />

              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={getNavDestination(to)}
                  ref={(el) => {
                    itemRefs.current[to] = el;
                  }}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `relative z-10 focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
                      isActive
                        ? 'text-white dark:text-stone-900'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Actions: Compose, Accounts, Theme Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Compose Button (100% flat, zero shadow/glow) */}
            <button
              type="button"
              onClick={handleCompose}
              className="focus-ring btn-interactive shadow-none inline-flex items-center gap-1.5 rounded-full bg-[#7E36B2] hover:bg-[#6D2C9C] active:bg-[#5C207E] dark:bg-[#DBBFFF] dark:hover:bg-[#E8D5FF] dark:active:bg-[#C8A6FA] text-white dark:text-[#121310] px-3.5 h-8 text-xs font-semibold"
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span>Compose</span>
            </button>

            {/* Account Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                className="focus-ring btn-interactive shadow-none flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700/70 active:bg-stone-200/70 dark:active:bg-stone-700 px-2.5 h-8 text-xs"
                title={`Active Mailbox: ${activeMailbox || 'None'}`}
              >
                <div className="relative inline-flex shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-[10px] overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
                    {activeAccountObj?.picture ? (
                      <img src={activeAccountObj.picture} alt="" className="h-full w-full object-cover" />
                    ) : (
                      activeMailbox ? activeMailbox[0].toUpperCase() : 'P'
                    )}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-[#181915] z-10 ${
                      activeAccountObj?.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <span className="max-w-[110px] truncate font-semibold text-stone-800 dark:text-stone-200 text-xs">
                  {activeMailbox ? activeMailbox.split('@')[0] : 'Select Account'}
                </span>
                <ChevronDown className={`h-3 w-3 text-stone-400 transition-transform duration-200 ease-out ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isAccountDropdownOpen && (
                <div className="glass-panel absolute right-0 mt-2.5 w-80 rounded-2xl p-2.5 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-xl z-50 animate-scale-in">
                  {/* User Workspace Header */}
                  <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-3 border border-black/[0.04] dark:border-white/[0.05]">
                    <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      {user?.name ? `${user.name} ${user.lastName || ''}`.trim() : user?.email}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {user?.email}
                    </div>
                  </div>

                  <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Mailboxes
                  </div>

                  <div className="space-y-1">
                    {mailboxes.map((mb) => {
                      const isActive = mb.email === activeMailbox;
                      const isExpired = mb.status !== 'connected';
                      return (
                        <button
                          key={mb.id}
                          type="button"
                          onClick={() => handleAccountSelect(mb.email)}
                          className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition border ${
                            isActive
                              ? 'bg-[#B266E6]/10 border-[#B266E6]/30 text-stone-900 dark:text-white font-semibold'
                              : 'border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative inline-flex shrink-0">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B266E6]/20 text-[#5C207E] dark:text-[#DBBFFF] text-[10px] font-bold overflow-hidden border border-black/[0.06] dark:border-white/[0.08]">
                                {mb.picture ? (
                                  <img src={mb.picture} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  mb.email[0].toUpperCase()
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-[#181915] z-10 ${
                                  mb.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold">{mb.email}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                                <span>{mb.isPrimary ? 'Primary Mailbox' : 'Secondary'}</span>
                                <span>•</span>
                                <span className={mb.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                                  {mb.status === 'connected' ? 'Connected' : 'Expired'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isExpired && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  playEnter();
                                  try {
                                    const url = await api.getConnectUrl(mb.email);
                                    if (url) {
                                      window.location.href = url;
                                      return;
                                    }
                                  } catch {}
                                  window.location.href = `https://api.plum.jam/user/mailboxes/connect?mailboxEmail=${encodeURIComponent(mb.email)}`;
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.currentTarget as HTMLElement).click();
                                  }
                                }}
                                className="rounded-lg bg-rose-500/12 border border-rose-500/25 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition"
                              >
                                Reauth
                              </span>
                            )}
                            {isActive && <Check className="h-4 w-4 text-[#B266E6] shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.06] space-y-1">
                    <Link
                      to="/accounts"
                      onClick={() => setIsAccountDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                    >
                      <Plus className="h-3.5 w-3.5 text-stone-400" />
                      <span>Manage & Add Accounts</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-0.5 h-4 w-px bg-stone-200 dark:bg-stone-700" aria-hidden="true" />

            {/* Dark/Light Mode Switcher */}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="focus-ring btn-interactive shadow-none flex h-8 w-8 items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] active:bg-black/[0.09] dark:active:bg-white/[0.12]"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-[#DBBFFF] transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-[#7E36B2] transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header Bar (Fixed at top-0, stationary during scroll) */}
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 px-4 py-3 backdrop-blur-md transition-colors duration-200 sm:hidden">
        <Link to="/inbox" onClick={handleNavClick} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-none border border-black/[0.06] dark:border-white/[0.08]">
            <img src={plumLogo} alt="Plum" className="h-5 w-5 object-contain" />
          </div>
          <span className="font-display text-sm font-extrabold text-stone-900 dark:text-white">Plum</span>
        </Link>

        <div className="flex items-center gap-2">
          {activeMailbox && (
            <span className="rounded-full bg-[#B266E6]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#5C207E] dark:text-[#DBBFFF] truncate max-w-[120px]">
              {activeMailbox.split('@')[0]}
            </span>
          )}
          {/* Quick Compose Button */}
          <button
            type="button"
            onClick={handleCompose}
            className="focus-ring btn-interactive shadow-none flex h-8 w-8 items-center justify-center rounded-full bg-[#7E36B2] hover:bg-[#6D2C9C] active:bg-[#5C207E] dark:bg-[#DBBFFF] dark:hover:bg-[#E8D5FF] dark:active:bg-[#C8A6FA] text-white dark:text-[#121310]"
            aria-label="Compose"
          >
            <PenSquare className="h-4 w-4" />
          </button>
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={handleThemeToggle}
            className="focus-ring btn-interactive shadow-none flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-[#DBBFFF]" /> : <Moon className="h-4 w-4 text-[#7E36B2]" />}
          </button>
        </div>
      </header>

      {/* Mobile Floating Bottom Dock (Section 4.1 & 6.3 - 48dp Touch Targets) */}
      <nav
        className="fixed bottom-3 inset-x-3 z-40 flex justify-around rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 py-1 px-1 shadow-lift backdrop-blur-lg transition-colors duration-200 sm:hidden"
        aria-label="Primary Mobile Navigation"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={getNavDestination(to)}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-semibold transition ${
                isActive
                  ? 'text-[#7E36B2] dark:text-[#DBBFFF] bg-[#B266E6]/10 font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
