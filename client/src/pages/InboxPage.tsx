import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Inbox,
  RefreshCw,
  Search,
  Calendar,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  KeyRound,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { InboundEmailItem, CategoryItem } from '../lib/api';
import { useToast } from '../components/ui/ToastProvider';
import { EmailDetailModal } from '../components/features/EmailDetailModal';
import { CategoryManagerModal } from '../components/features/CategoryManagerModal';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { playEnter, playScroll } from '../lib/sound';

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
  const [isRecategorizing, setIsRecategorizing] = useState<boolean>(false);
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
    playScroll();
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    playScroll();
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

  // Keyboard shortcut: Shift + Left / Right arrow keys to navigate dates
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
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevDay();
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextDay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevDay, handleNextDay]);

  // Keyboard shortcut: Alt + Left / Right arrow keys to navigate category tabs
  useEffect(() => {
    const handleCategoryKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const catList = ['ALL', ...categories.map((c) => c.category)];
        const currentIdx = catList.findIndex(
          (c) => c.toLowerCase() === selectedCategory.toLowerCase()
        );
        const activeIdx = currentIdx !== -1 ? currentIdx : 0;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = (activeIdx - 1 + catList.length) % catList.length;
          playScroll();
          setSelectedCategory(catList[prev]);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = (activeIdx + 1) % catList.length;
          playScroll();
          setSelectedCategory(catList[next]);
        }
      }
    };
    window.addEventListener('keydown', handleCategoryKeys);
    return () => window.removeEventListener('keydown', handleCategoryKeys);
  }, [categories, selectedCategory]);

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
        const month = currentDate.toLocaleString('default', { month: 'long' });
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

  // Sync live from Gmail with enhanced headroom (up to 50 emails)
  const handleLiveSync = async () => {
    if (!activeMailbox) return;
    setIsSyncing(true);
    playEnter();
    try {
      toast.info(`Fetching latest correspondence for ${activeMailbox} (50 headroom)...`);
      const newEmails = await api.fetchLiveGmail(activeMailbox, 50);
      toast.success(`Synced ${newEmails.length} new email${newEmails.length === 1 ? '' : 's'}`);

      // Reload current date view
      const day = currentDate.getDate();
      const month = currentDate.toLocaleString('default', { month: 'long' });
      const year = currentDate.getFullYear();
      const updated = await api.fetchEmailsByDate(day, month, year, activeMailbox);
      setEmails(updated || []);
      loadCategories();
    } catch (err: any) {
      toast.error('Failed to sync live with Gmail. Check mailbox credentials.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Re-run AI categorization pipeline on existing correspondence
  const handleRecategorize = async () => {
    if (!activeMailbox) return;
    setIsRecategorizing(true);
    playEnter();
    try {
      toast.info('Running AI categorization pipeline via Basket LLM...');
      const res = await api.recategorizeEmails(activeMailbox);
      if (res.count > 0) {
        toast.success(`Successfully classified ${res.count} email${res.count === 1 ? '' : 's'} into smart categories!`);
      } else {
        toast.info('Emails are already categorized.');
      }
      // Reload current date view and categories
      const day = currentDate.getDate();
      const month = currentDate.toLocaleString('default', { month: 'long' });
      const year = currentDate.getFullYear();
      const updated = await api.fetchEmailsByDate(day, month, year, activeMailbox);
      setEmails(updated || []);
      loadCategories();
    } catch (err: any) {
      toast.error('AI categorization pipeline error. Ensure Basket service is online.');
    } finally {
      setIsRecategorizing(false);
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
    playEnter();
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

  const handleCategorySelect = (catName: string) => {
    playScroll();
    setSelectedCategory(catName);
  };

  const getCategoryColor = (cat: string) => {
    const found = categories.find(
      (c) => c.category.toLowerCase() === cat.toLowerCase()
    );
    if (found?.color) {
      return found.color;
    }
    switch (cat.toLowerCase()) {
      case 'session':
        return '#89D66D';
      case 'academic':
      case 'study':
        return '#B266E6';
      case 'deadline':
      case 'urgent':
        return '#EF4444';
      case 'opportunity':
        return '#10B981';
      case 'holiday':
        return '#F59E0B';
      default:
        return '#64748B';
    }
  };

  return (
    <PageShell
      title="Inbox"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecategorize}
            disabled={isRecategorizing || isSyncing}
            isLoading={isRecategorizing}
            icon={<Sparkles className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />}
            title="Auto-categorize emails"
          >
            Categorize
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLiveSync}
            disabled={isSyncing}
            isLoading={isSyncing}
            icon={<RefreshCw className={`h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF] ${isSyncing ? 'animate-spin' : ''}`} />}
            title="Sync Gmail"
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* Token Expiration Banner */}
        {isMailboxExpired && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Google token expired for <strong>{activeMailbox}</strong>.
              </span>
            </div>
            <Link to="/accounts" onClick={() => playEnter()}>
              <Button variant="primary" size="sm" icon={<KeyRound className="h-3.5 w-3.5" />}>
                Renew
              </Button>
            </Link>
          </div>
        )}

        {/* Unified Controls Row: Search + Compact Date Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-sm">
            <TextField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search inbox..."
              icon={<Search />}
              className="!min-h-[40px] !py-2"
            />
          </div>

          <div className="glass-card inline-flex items-center justify-between sm:justify-start gap-1 rounded-full border border-black/[0.07] dark:border-white/[0.09] px-1.5 py-1 shadow-2xs self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrevDay}
              className="focus-ring btn-interactive flex h-7 w-7 items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
              title="Previous Day (Shift + Left)"
              aria-label="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-stone-800 dark:text-stone-200 select-none">
              <Calendar className="h-3.5 w-3.5 text-[#7E36B2] dark:text-[#DBBFFF]" />
              <span>
                {currentDate.toLocaleDateString('default', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {isToday && (
                <span className="rounded-full bg-[#7E36B2] text-white px-2 py-0.5 text-[10px] font-bold">
                  Today
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={isToday}
              className="focus-ring btn-interactive flex h-7 w-7 items-center justify-center rounded-full text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed"
              title={isToday ? 'Today' : 'Next Day (Shift + Right)'}
              aria-label="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills & Manage Tags */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-clean">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleCategorySelect('ALL')}
              className={`focus-ring shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === 'ALL'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] text-stone-600 dark:text-stone-300 hover:bg-black/[0.04]'
              }`}
            >
              All ({emails.length})
            </button>

            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.category.toLowerCase();
              const catColor = getCategoryColor(cat.category);

              return (
                <button
                  key={cat._id || cat.category}
                  type="button"
                  onClick={() => handleCategorySelect(cat.category)}
                  className={`focus-ring shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition ${
                    isSelected ? 'shadow-xs' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? catColor : `${catColor}15`,
                    color: isSelected ? '#FFFFFF' : catColor,
                    borderColor: isSelected ? catColor : `${catColor}40`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : catColor }}
                  />
                  <span>{cat.category}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              playEnter();
              setIsCategoryModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
            className="text-[#7E36B2] dark:text-[#DBBFFF] hover:bg-[#B266E6]/10 shrink-0 font-semibold !py-1 !px-2.5 !min-h-[30px]"
            title="Manage categories"
          >
            Tags
          </Button>
        </div>

        {/* Email List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-18 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white/60 dark:bg-[#181915]/60 animate-pulse p-4 flex items-center gap-3.5"
              >
                <div className="h-9 w-9 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="h-2.5 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <Card radius="3xl" elevation="soft" className="p-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
              <Inbox className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              {searchQuery ? 'No matching emails' : 'No emails for this date'}
            </h3>
            <div className="mt-4 flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLiveSync}
                disabled={isSyncing}
                icon={<RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
              >
                Sync Gmail
              </Button>
            </div>
          </Card>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {filteredEmails.map((item) => {
              const sender = item.senderName || item.senderEmail;
              const hasAttachments = Boolean(item.attachments && item.attachments.length > 0);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectEmail(item)}
                  className={`group row-interactive flex items-start gap-3.5 p-4 sm:p-5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
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
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
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

                    <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {item.snippet || 'No preview available.'}
                    </p>

                    {/* Custom Colored Tags & Attachments */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {item.categories?.map((cat) => {
                        const col = getCategoryColor(cat);
                        return (
                          <Badge key={cat} customColor={col}>
                            {cat}
                          </Badge>
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
