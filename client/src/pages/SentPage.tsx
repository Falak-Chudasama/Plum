import { useState, useEffect } from 'react';
import { Send, Calendar, Search, Tag, ChevronLeft, ChevronRight, PenSquare, Clock, ArrowRight } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { playEnter, playScroll } from '../lib/sound';

export function SentPage() {
  const { activeMailbox, openComposer } = usePlumStore();
  const [emails, setEmails] = useState<OutboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState({
    day: today.getDate(),
    month: today.toLocaleString('default', { month: 'short' }),
    year: today.getFullYear(),
  });

  useEffect(() => {
    let isCancelled = false;

    async function loadSent() {
      if (!activeMailbox) return;
      setIsLoading(true);
      try {
        const data = await api.fetchOutboundEmailsByDate(
          selectedDate.day,
          selectedDate.month,
          selectedDate.year,
          activeMailbox
        );
        if (!isCancelled) {
          setEmails(data.filter((e) => e.status === 'sent'));
        }
      } catch (err) {
        console.error('Error fetching sent emails:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadSent();
    return () => {
      isCancelled = true;
    };
  }, [activeMailbox, selectedDate]);

  const filtered = emails.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchesSubject = item.subject?.toLowerCase().includes(q);
    const matchesTo = item.to?.some((t) => t.toLowerCase().includes(q));
    const matchesBody = item.body?.toLowerCase().includes(q);
    return matchesSubject || matchesTo || matchesBody;
  });

  const handleCompose = () => {
    playEnter();
    openComposer();
  };

  return (
    <PageShell
      title="Sent Messages"
      subtitle={`Sent correspondence from: ${activeMailbox || 'No account selected'}`}
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={handleCompose}
          icon={<PenSquare className="h-3.5 w-3.5" />}
        >
          New Message
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="max-w-md">
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search sent recipient, subject, or message..."
            icon={<Search />}
          />
        </div>

        {/* Email List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
        ) : filtered.length === 0 ? (
          <Card radius="3xl" elevation="soft" className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
              <Send className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              No sent messages
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
              {searchQuery
                ? `No sent messages match "${searchQuery}".`
                : `No outbound messages sent today from ${activeMailbox}.`}
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={handleCompose} icon={<PenSquare className="h-3.5 w-3.5" />}>
                Compose Email
              </Button>
            </div>
          </Card>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="row-interactive flex items-start gap-3.5 p-4 sm:p-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] text-xs font-bold">
                  <Send className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      To: {item.to?.join(', ') || 'No recipient'}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate mt-0.5">
                    {item.subject || '(No Subject)'}
                  </div>

                  <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {item.body || 'No text preview.'}
                  </p>

                  {item.category && (
                    <div className="mt-2">
                      <Badge variant="academic">
                        {item.category}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
