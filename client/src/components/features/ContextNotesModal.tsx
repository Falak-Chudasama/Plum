import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Tag,
  Check,
  Brain,
  Clock,
  BookOpen,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { ContextNoteItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Badge } from '../ui/Badge';
import { playBack, playEnter } from '../../lib/sound';

interface ContextNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ContextNoteItem[];
  userEmail?: string;
  onNotesChanged: () => void;
}

export function ContextNotesModal({
  isOpen,
  onClose,
  notes,
  userEmail,
  onNotesChanged,
}: ContextNotesModalProps) {
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<ContextNoteItem | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playBack();
        resetForm();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [notes, searchQuery]);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  const handleClose = () => {
    playBack();
    resetForm();
    onClose();
  };

  const startCreate = () => {
    playEnter();
    resetForm();
    setIsEditing(true);
  };

  const startEdit = (note: ContextNoteItem) => {
    playEnter();
    setIsEditing(true);
    setEditingId(note._id);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput((note.tags || []).join(', '));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.warning('Title and content are required');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    playEnter();
    try {
      if (editingId) {
        await api.updateNote(editingId, {
          title: title.trim(),
          content: content.trim(),
          tags,
          email: userEmail,
        });
        toast.success(`Note "${title}" updated and re-indexed with RAG`);
      } else {
        await api.createNote({
          title: title.trim(),
          content: content.trim(),
          tags,
          email: userEmail,
        });
        toast.success(`Note "${title}" indexed with Basket Vector + BM25 RAG`);
      }
      resetForm();
      onNotesChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmNote) return;
    try {
      await api.deleteNote(deleteConfirmNote._id);
      toast.success(`Deleted note "${deleteConfirmNote.title}"`);
      setDeleteConfirmNote(null);
      onNotesChanged();
    } catch (err: any) {
      toast.error('Failed to delete note');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Dimmed backdrop scrim (Section 2.9: 150ms ease-out) */}
        <div
          className="fixed inset-0 bg-stone-900/45 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Modal Shell (Section 2.9 & 5.8: 32px radius, 180ms cubic-bezier(0.16, 1, 0.3, 1)) */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-modal-title"
          className="relative z-10 flex flex-col w-full max-w-2xl max-h-[88vh] rounded-[2rem] glass-panel border border-black/[0.08] dark:border-white/[0.1] bg-[#F8F9F5] dark:bg-[#121310] shadow-lift overflow-hidden text-stone-900 dark:text-[#F3F4F1] font-sans animate-scale-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-4 bg-white/80 dark:bg-[#181915]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] shadow-2xs">
                <Brain className="h-5 w-5 text-[#B266E6]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="notes-modal-title" className="text-base font-bold text-stone-900 dark:text-white">
                    Context Notes
                  </h2>
                  <span className="rounded-full bg-[#B266E6]/15 text-[#7E36B2] dark:text-[#DBBFFF] px-2 py-0.5 text-[10px] font-bold">
                    Hybrid RAG
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  Persistent personal memory retrieved on demand via Vector + BM25 search.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-clean">
            {isEditing ? (
              <form onSubmit={handleSave} className="rounded-2xl border border-[#B266E6]/30 bg-white dark:bg-[#181915] p-5 shadow-soft space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.05]">
                  <span className="text-xs font-bold text-[#7E36B2] dark:text-[#DBBFFF]">
                    {editingId ? 'Edit Context Note' : 'Create Context Note'}
                  </span>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. My College Major & Advisor, Office Hours Schedule"
                    className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50/70 dark:bg-stone-900/90 px-3.5 py-2 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. academic, schedule, advisor, bio"
                    className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50/70 dark:bg-stone-900/90 px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    Content *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write detailed factual context here that Basket AI can retrieve during email drafting or conversation answering..."
                    className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50/70 dark:bg-stone-900/90 p-3.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6] leading-relaxed resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isSaving}
                    isLoading={isSaving}
                    icon={<Check className="h-3.5 w-3.5" />}
                  >
                    {editingId ? 'Update & Re-Index' : 'Save & Index with RAG'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <TextField
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClear={() => setSearchQuery('')}
                      placeholder="Search memory notes..."
                      icon={<Search />}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={startCreate}
                    icon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Note
                  </Button>
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.1] p-10 text-center text-xs text-stone-400 space-y-2">
                    <BookOpen className="h-8 w-8 mx-auto text-stone-300 dark:text-stone-600" />
                    <p className="font-semibold text-stone-600 dark:text-stone-300">
                      {searchQuery ? `No notes matching "${searchQuery}"` : 'No context notes indexed yet'}
                    </p>
                    <p className="max-w-xs mx-auto text-[10px]">
                      Add personal facts, student ID details, advisor names, or project specs for automatic RAG injection.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotes.map((note) => (
                      <div
                        key={note._id}
                        className="rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-4 shadow-soft space-y-2 transition hover:border-[#B266E6]/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-stone-900 dark:text-white truncate">
                            {note.title}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(note)}
                              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition rounded-lg"
                              title="Edit note"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playBack();
                                setDeleteConfirmNote(note);
                              }}
                              className="p-1 text-stone-400 hover:text-rose-500 transition rounded-lg"
                              title="Delete note"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {note.tags.map((tag) => (
                              <Badge key={tag} variant="neutral">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={Boolean(deleteConfirmNote)}
        onClose={() => setDeleteConfirmNote(null)}
        onConfirm={confirmDelete}
        title="Delete Context Note"
        isDestructive
        description={
          <span>
            Are you sure you want to delete <strong className="text-stone-900 dark:text-white">{deleteConfirmNote?.title}</strong>? It will be removed from your Basket RAG index.
          </span>
        }
      />
    </>
  );
}
