import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
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
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../ui/ThemeProvider';
import { usePlumStore } from '../../store/usePlumStore';
import plumLogo from '../../assets/plum-icon.svg';

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/sent', label: 'Sent', icon: Send },
  { to: '/drafts', label: 'Drafts', icon: FileText },
  { to: '/chat', label: 'AI Chat', icon: Sparkles },
  { to: '/accounts', label: 'Accounts', icon: Users },
];

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { user, mailboxes, activeMailbox, setActiveMailbox, openComposer, logout } = usePlumStore();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {/* Desktop Floating Navigation Capsule */}
      <header className="sticky top-4 z-40 mx-auto hidden w-full max-w-5xl px-4 sm:block">
        <div className="glass-capsule flex items-center justify-between gap-3 rounded-full px-4 py-2.5 shadow-floating transition-colors duration-200">
          {/* Brand Wordmark & Logo */}
          <Link
            to="/inbox"
            className="focus-ring flex items-center gap-2 rounded-full pr-1.5 transition hover:opacity-90 shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-stone-800 p-1 shadow-2xs border border-black/[0.05] dark:border-white/[0.08]">
              <img src={plumLogo} alt="Plum" className="h-6 w-6 object-contain" />
            </div>
            <span className="font-display text-sm font-black text-stone-900 dark:text-white tracking-tight">
              Plum
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1" aria-label="Primary Desktop Navigation">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-stone-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Quick Compose & Account Switcher */}
          <div className="flex items-center gap-2">
            {/* Compose Button */}
            <button
              type="button"
              onClick={() => openComposer()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-[#B266E6] hover:bg-[#8F40C7] text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span>Compose</span>
            </button>

            {/* Account Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                className="focus-ring flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-stone-800/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] px-2.5 py-1 text-xs transition shadow-2xs"
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
                <ChevronDown className={`h-3 w-3 text-stone-400 transition-transform ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isAccountDropdownOpen && (
                <div className="glass-panel absolute right-0 mt-2.5 w-80 rounded-2xl p-2.5 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Workspace Header */}
                  <div className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-3 border border-black/[0.04] dark:border-white/[0.05]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      Plum Workspace User
                    </div>
                    <div className="mt-0.5 text-xs font-bold text-stone-900 dark:text-white truncate">
                      {user?.name ? `${user.name} ${user.lastName || ''}`.trim() : user?.email}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {user?.email}
                    </div>
                  </div>

                  <div className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                    Connected Gmail Mailboxes
                  </div>

                  <div className="space-y-1">
                    {mailboxes.map((mb) => {
                      const isActive = mb.email === activeMailbox;
                      const isExpired = mb.status !== 'connected';
                      return (
                        <button
                          key={mb.id}
                          type="button"
                          onClick={() => {
                            setActiveMailbox(mb.email);
                            setIsAccountDropdownOpen(false);
                          }}
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
                              <span className="rounded-md bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
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
              onClick={toggleTheme}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-[#B266E6] dark:text-[#DBBFFF] transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 text-[#B266E6] dark:text-[#DBBFFF] transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 px-4 py-3 backdrop-blur-md transition-colors duration-200 sm:hidden">
        <Link to="/inbox" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-stone-800 p-0.5 shadow-2xs border border-black/[0.05] dark:border-white/[0.08]">
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
          <button
            type="button"
            onClick={() => openComposer()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B266E6] text-white shadow-xs"
            aria-label="Compose"
          >
            <PenSquare className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-full text-stone-600 dark:text-stone-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-[#89D66D]" /> : <Moon className="h-3.5 w-3.5 text-stone-600" />}
          </button>
        </div>
      </header>

      {/* Mobile Floating Bottom Dock */}
      <nav
        className="fixed bottom-3 inset-x-3 z-50 flex justify-around rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#181915]/95 py-2 px-1 shadow-lift backdrop-blur-lg transition-colors duration-200 sm:hidden"
        aria-label="Primary Mobile Navigation"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold transition ${
                isActive
                  ? 'text-[#B266E6] dark:text-[#DBBFFF] bg-[#B266E6]/10 font-bold'
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

