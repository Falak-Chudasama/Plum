import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Inbox,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  Tag,
  Paperclip,
  CheckCircle2,
  Mail,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  KeyRound,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { InboundEmailItem, CategoryItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { EmailDetailModal } from '../components/features/EmailDetailModal';
import { CategoryManagerModal } from '../components/features/CategoryManagerModal';

export function InboxPage() {
  const { activeMailbox, mailboxes, user } = usePlumStore();
  const toast = useToast();

  const activeMailboxObj = mailboxes.find((m) => m.email === activeMailbox);
  const isMailboxExpired = activeMailboxObj?.status === 'expired';

  const [emails, setEmails] = useState<InboundEmailItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmailItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // Real Date instance state for reliable navigation & clamping
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Check if selected date is today (do not allow navigating into future)
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getDate() === today.getDate()
    );
  }, [currentDate]);

  const handlePrevDay = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (next > today) {
        return prev;
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl + Left / Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevDay();
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextDay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevDay, handleNextDay]);

  // Load custom categories for user
  const loadCategories = useCallback(async () => {
    if (!user?.email) return;
    try {
      const cats = await api.getCategories(user.email);
      if (Array.isArray(cats)) {
        setCategories(cats);
      }
    } catch (e) {
      // non-fatal
    }
  }, [user?.email]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load emails when activeMailbox or date changes
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!activeMailbox) return;
      setIsLoading(true);
      try {
        const day = currentDate.getDate();
        const month = currentDate.toLocaleString('default', { month: 'long' }); // e.g. "November"
        const year = currentDate.getFullYear();

        const data = await api.fetchEmailsByDate(day, month, year, activeMailbox);

        if (!isCancelled) {
          setEmails(data || []);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error fetching emails:', err);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [activeMailbox, currentDate]);

  // Sync live from Gmail
  const handleLiveSync = async () => {
    if (!activeMailbox) return;
    setIsSyncing(true);
    try {
      toast.info(`Fetching latest correspondence for ${activeMailbox}...`);
      const newEmails = await api.fetchLiveGmail(activeMailbox, 15);
      toast.success(`Synced ${newEmails.length} new email${newEmails.length === 1 ? '' : 's'}`);

      // Reload current date view
      const day = currentDate.getDate();
      const month = currentDate.toLocaleString('default', { month: 'long' });
      const year = currentDate.getFullYear();
      const updated = await api.fetchEmailsByDate(day, month, year, activeMailbox);
      setEmails(updated || []);
    } catch (err: any) {
      toast.error('Failed to sync live with Gmail. Check mailbox credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter emails by category and search query
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const itemCategories = item.categories || [];
        const hasMatch = itemCategories.some(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase()
        );
        if (!hasMatch) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = item.subject?.toLowerCase().includes(query);
        const matchesSender = (item.senderName || item.senderEmail)?.toLowerCase().includes(query);
        const matchesSnippet = item.snippet?.toLowerCase().includes(query);
        return matchesSubject || matchesSender || matchesSnippet;
      }
      return true;
    });
  }, [emails, selectedCategory, searchQuery]);

  const handleSelectEmail = async (email: InboundEmailItem) => {
    setSelectedEmail(email);
    if (!email.isViewed) {
      try {
        await api.markEmailAsViewed(email.id);
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isViewed: true } : e))
        );
      } catch (e) {}
    }
  };

  // Dynamic Category color resolver mapping custom user colors to email tags
  const getCategoryColor = (cat: string) => {
    const found = categories.find(
      (c) => c.category.toLowerCase() === cat.toLowerCase()
    );
    if (found?.color) {
      return {
        bg: `${found.color}18`,
        text: found.color,
        border: `${found.color}40`,
      };
    }
    // Harmonious fallback palette for tags without explicit custom color
    switch (cat.toLowerCase()) {
      case 'session':
        return { bg: '#89D66D18', text: '#2E7D32', border: '#89D66D40' };
      case 'academic':
      case 'study':
        return { bg: '#B266E618', text: '#5C207E', border: '#B266E640' };
      case 'deadline':
      case 'urgent':
        return { bg: '#EF444418', text: '#DC2626', border: '#EF444440' };
      case 'opportunity':
        return { bg: '#10B98118', text: '#059669', border: '#10B98140' };
      case 'holiday':
        return { bg: '#F59E0B18', text: '#D97706', border: '#F59E0B40' };
      default:
        return { bg: '#64748B18', text: '#475569', border: '#64748B30' };
    }
  };

  return (
    <PageShell
      title="Inbox"
      subtitle={`Browsing mailbox: ${activeMailbox || 'No account selected'}`}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLiveSync}
            disabled={isSyncing}
            className="focus-ring inline-flex items-center gap-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] shadow-soft transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#B266E6] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Gmail'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Token Expiration Banner */}
        {isMailboxExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Authorization Required:</strong> Google tokens for <strong>{activeMailbox}</strong> have expired. Live sync and email sending require renewal.
              </span>
            </div>
            <Link
              to="/accounts"
              className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white font-semibold px-3.5 py-1.5 text-xs transition shadow-2xs"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Renew in Accounts</span>
            </Link>
          </div>
        )}

        {/* Prominent Date Navigation Bar (Apple-grade Quiet Utility, Host Grotesk font) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-black/[0.07] dark:border-white/[0.09] bg-white dark:bg-[#181915] p-4 sm:p-5 shadow-soft transition-colors duration-200">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] shadow-2xs shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {currentDate.toLocaleDateString('default', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {isToday && (
                  <span className="rounded-full bg-[#B266E6] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                    Today
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handlePrevDay}
              className="focus-ring flex items-center gap-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 shadow-2xs transition active:scale-95"
              title="Previous Day (Ctrl + Left Arrow)"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={isToday}
              className="focus-ring flex items-center gap-1.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 shadow-2xs transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              title={isToday ? "Cannot advance beyond today" : "Next Day (Ctrl + Right Arrow)"}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Controls Bar: Search Input */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, subject, or content..."
              className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] pl-9 pr-4 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 shadow-soft focus-ring font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills & Custom Categories Management Button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-clean">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`focus-ring shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] text-stone-600 dark:text-stone-300 hover:bg-black/[0.04]'
              }`}
            >
              All Emails ({emails.length})
            </button>

            {/* Custom User Categories */}
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.category.toLowerCase();
              const colorObj = getCategoryColor(cat.category);

              return (
                <button
                  key={cat._id || cat.category}
                  type="button"
                  onClick={() => setSelectedCategory(cat.category)}
                  className="focus-ring shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition shadow-2xs"
                  style={{
                    backgroundColor: isSelected ? (cat.color || '#B266E6') : colorObj.bg,
                    color: isSelected ? '#FFFFFF' : colorObj.text,
                    borderColor: isSelected ? (cat.color || '#B266E6') : colorObj.border,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : (cat.color || '#B266E6') }}
                  />
                  <span>{cat.category}</span>
                </button>
              );
            })}
          </div>

          {/* Manage Categories Action Button */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="focus-ring shrink-0 inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#B266E6]/40 hover:border-[#B266E6] bg-[#B266E6]/5 hover:bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
            title="Create, edit or delete custom categories and customize tag colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Customize Tags</span>
          </button>
        </div>

        {/* Email List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white/60 dark:bg-[#181915]/60 animate-pulse p-4 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="h-3 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-12 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              No emails found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {searchQuery
                ? `No emails match "${searchQuery}". Try adjusting your keywords or category filter.`
                : `No correspondence saved for ${currentDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })} in ${activeMailbox}.`}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleLiveSync}
                disabled={isSyncing}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync Latest Gmail</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {filteredEmails.map((item) => {
              const sender = item.senderName || item.senderEmail;
              const hasAttachments = Boolean(item.attachments && item.attachments.length > 0);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectEmail(item)}
                  className={`group flex items-start gap-3.5 p-4 sm:p-5 transition cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
                    !item.isViewed ? 'bg-[#B266E6]/[0.02] dark:bg-[#B266E6]/[0.03]' : ''
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] text-stone-700 dark:text-stone-200 text-xs font-bold">
                    {sender ? sender[0].toUpperCase() : 'M'}
                    {!item.isViewed && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#B266E6] ring-2 ring-white dark:ring-[#181915]" />
                    )}
                  </div>

                  {/* Mail Content Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs truncate ${
                          !item.isViewed
                            ? 'font-black text-stone-900 dark:text-white'
                            : 'font-semibold text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {sender}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0">
                        {item.parsedDate?.time || ''}
                      </span>
                    </div>

                    <div
                      className={`text-xs truncate mt-0.5 ${
                        !item.isViewed
                          ? 'font-bold text-stone-900 dark:text-white'
                          : 'font-medium text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      {item.subject || 'No Subject'}
                    </div>

                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {item.snippet || 'No preview available.'}
                    </p>

                    {/* Custom Colored Tags & Attachments */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.categories?.map((cat) => {
                        const colorObj = getCategoryColor(cat);
                        return (
                          <span
                            key={cat}
                            className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shadow-2xs"
                            style={{
                              backgroundColor: colorObj.bg,
                              color: colorObj.text,
                              borderColor: colorObj.border,
                            }}
                          >
                            {cat}
                          </span>
                        );
                      })}

                      {hasAttachments && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] text-stone-600 dark:text-stone-400 font-medium">
                          <Paperclip className="h-2.5 w-2.5" />
                          <span>{item.attachments?.length}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail View Modal */}
      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          categories={categories}
          onClose={() => setSelectedEmail(null)}
        />
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        userEmail={user?.email || ''}
        onCategoriesChanged={loadCategories}
      />
    </PageShell>
  );
}
