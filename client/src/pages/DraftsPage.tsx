import { useState, useEffect } from 'react';
import { FileText, PenSquare, Clock, ArrowRight, Tag } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { usePlumStore } from '../store/usePlumStore';
import { api } from '../lib/api';
import type { OutboundEmailItem } from '../lib/api';

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

  return (
    <PageShell
      title="Drafts"
      subtitle={`Saved drafts for mailbox: ${activeMailbox || 'No account selected'}`}
      action={
        <button
          type="button"
          onClick={() => openComposer()}
          className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-2 text-xs font-semibold shadow-soft transition"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>New Draft</span>
        </button>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl border border-black/[0.05] dark:border-white/[0.06] bg-white/60 dark:bg-[#181915]/60 animate-pulse p-4"
              />
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-12 text-center shadow-soft">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-stone-900 dark:text-white">
              No saved drafts
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
              You haven't saved any drafts for {activeMailbox} yet.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => openComposer()}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 transition"
              >
                <PenSquare className="h-3.5 w-3.5" />
                <span>Create a Draft</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] shadow-soft divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
            {drafts.map((draft, idx) => (
              <div
                key={draft._id || idx}
                onClick={() => handleEditDraft(draft)}
                className="group flex items-start gap-3.5 p-4 sm:px-5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] cursor-pointer transition"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] font-bold text-xs mt-0.5">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
                      {draft.to && draft.to.length > 0 ? `To: ${draft.to.join(', ')}` : 'Draft (No recipient)'}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate mt-0.5">
                    {draft.subject || 'Untitled Draft'}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {draft.body || 'Empty draft.'}
                  </p>
                  {draft.category && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#B266E6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#5C207E] dark:text-[#DBBFFF]">
                        <Tag className="h-2.5 w-2.5" />
                        {draft.category}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center self-center text-xs font-semibold text-[#B266E6] group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
