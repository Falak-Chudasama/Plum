import { useState, useEffect } from 'react';
import { Send, Search, PenSquare } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TokenExpiredBanner } from '../components/features/TokenExpiredBanner';
import { playEnter } from '../lib/sound';

export function SentPage() {
  const { activeMailbox, openComposer } = usePlumStore();
  const [emails, setEmails] = useState<OutboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();
  const [selectedDate] = useState({
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
      title="Sent"
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={handleCompose}
          icon={<PenSquare className="h-3.5 w-3.5" />}
        >
          Compose
        </Button>
      }
    >
      <div className="space-y-3.5">
        <TokenExpiredBanner />
        <div className="max-w-sm">
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search sent..."
            icon={<Search />}
          />
        </div>

        {/* Email List */}
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-2xl border border-black/[0.06] dark:border-white/[0.07] bg-white/70 dark:bg-[#181915]/70 animate-pulse p-4 flex items-center gap-3.5"
              >
                <div className="h-9 w-9 rounded-xl bg-stone-200 dark:bg-stone-800 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
                  <div className="h-2.5 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card radius="3xl" elevation="none" className="p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-stone-900 dark:text-white">
              {searchQuery ? 'No matching sent messages' : 'No sent messages today'}
            </h3>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={handleCompose} icon={<PenSquare className="h-3.5 w-3.5" />}>
                New Message
              </Button>
            </div>
          </Card>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#181915] divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
            {filtered.map((item, idx) => (
              <div
                key={item._id || idx}
                className="row-interactive flex items-start gap-3.5 p-4 hover:bg-stone-50 dark:hover:bg-white/[0.03] min-w-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] mt-0.5">
                  <Send className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[13.5px] font-semibold text-stone-900 dark:text-white truncate">
                      To: {item.to?.join(', ') || 'No recipient'}
                    </span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0 font-medium">
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className="text-[13px] font-medium text-stone-800 dark:text-stone-200 truncate mt-0.5">
                    {item.subject || '(No Subject)'}
                  </div>

                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5 break-words">
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
