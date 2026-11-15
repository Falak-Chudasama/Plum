import { useState, useEffect } from 'react';
import { FileText, PenSquare, Clock, ArrowRight, Tag } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { playEnter } from '../lib/sound';

export function DraftsPage() {
  const { activeMailbox, openComposer } = usePlumStore();
  const [drafts, setDrafts] = useState<OutboundEmailItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadDrafts() {
      if (!activeMailbox) return;
      setIsLoading(true);
      try {
        const data = await api.fetchDrafts(activeMailbox);
        if (!isCancelled) {
          setDrafts(data);
        }
      } catch (err) {
        console.error('Error fetching drafts:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadDrafts();
    return () => {
      isCancelled = true;
    };
  }, [activeMailbox]);

  const handleEditDraft = (draft: OutboundEmailItem) => {
    playEnter();
    openComposer({
      from: draft.from,
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
      category: draft.category,
      status: 'draft',
    });
  };

  const handleNewDraft = () => {
    playEnter();
    openComposer();
  };

  return (
    <PageShell
      title="Drafts"
      subtitle={`Saved drafts for mailbox: ${activeMailbox || 'No account selected'}`}
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={handleNewDraft}
          icon={<PenSquare className="h-3.5 w-3.5" />}
        >
          New Draft
        </Button>
      }
    >
      <div className="space-y-4">
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
        ) : drafts.length === 0 ? (
          <Card radius="3xl" elevation="soft" className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              No drafts in progress
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
              When you craft an email and save it for later, it will be preserved here across your sessions.
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={handleNewDraft} icon={<PenSquare className="h-3.5 w-3.5" />}>
                Start New Draft
              </Button>
            </div>
          </Card>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => handleEditDraft(draft)}
                className="group row-interactive flex items-start justify-between gap-4 p-4 sm:p-5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 text-xs font-bold">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        To: {draft.to?.length ? draft.to.join(', ') : '(No recipient specified)'}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate mt-0.5">
                      {draft.subject || '(Untitled draft)'}
                    </div>

                    <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {draft.body || 'Empty message body...'}
                    </p>

                    {draft.category && (
                      <div className="mt-2">
                        <Badge variant="academic">
                          {draft.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="self-center shrink-0">
                  <Button variant="secondary" size="sm" iconTrailing={<ArrowRight className="h-3.5 w-3.5" />}>
                    Resume
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
