import { useState, useEffect } from 'react';
import { FileText, PenSquare, Clock, ArrowRight } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TokenExpiredBanner } from '../components/features/TokenExpiredBanner';
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
      <div className="space-y-3.5">
        <TokenExpiredBanner />
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
        ) : drafts.length === 0 ? (
          <Card radius="3xl" elevation="none" className="p-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF]">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-stone-900 dark:text-white">
              No saved drafts
            </h3>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={handleNewDraft} icon={<PenSquare className="h-3.5 w-3.5" />}>
                Start Draft
              </Button>
            </div>
          </Card>
        ) : (
          <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#181915] divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
            {drafts.map((draft, idx) => (
              <div
                key={draft._id || (draft as any).id || idx}
                onClick={() => handleEditDraft(draft)}
                className="group row-interactive flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.03] min-w-0"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[13.5px] font-semibold text-stone-900 dark:text-white truncate">
                        To: {draft.to?.length ? draft.to.join(', ') : 'No recipient'}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 shrink-0 flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3" />
                        {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="text-[13px] font-medium text-stone-800 dark:text-stone-200 truncate mt-0.5">
                      {draft.subject || '(Untitled draft)'}
                    </div>

                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5 break-words">
                      {draft.body || 'Empty draft'}
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

                <ArrowRight className="h-4 w-4 text-stone-400 group-hover:text-[#7E36B2] dark:group-hover:text-[#DBBFFF] group-hover:translate-x-0.5 transition shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
