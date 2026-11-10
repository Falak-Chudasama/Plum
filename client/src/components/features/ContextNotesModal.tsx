import { useState, useMemo } from 'react';
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
  Zap,
  Clock,
  BookOpen,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { ContextNoteItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { ConfirmationModal } from '../ui/ConfirmationModal';

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

  const startCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  const startEdit = (note: ContextNoteItem) => {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          role="dialog"
          aria-modal="true"
          className="relative flex flex-col w-full max-w-2xl max-h-[88vh] rounded-3xl border border-black/[0.08] dark:border-white/[0.1] bg-[#F8F9F5] dark:bg-[#121310] shadow-lift overflow-hidden text-stone-900 dark:text-[#F3F4F1] font-sans antialiased"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] px-6 py-4 bg-white/80 dark:bg-[#181915]/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] shadow-2xs">
                <Brain className="h-5 w-5 text-[#B266E6]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    Context Notes
                  </h2>
                  <span className="rounded-full bg-[#B266E6]/15 text-[#5C207E] dark:text-[#DBBFFF] px-2 py-0.5 text-[10px] font-bold">
                    Hybrid RAG
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Persistent personal memory retrieved on demand via Vector + BM25 search.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 scrollbar-clean">
            {/* Inline Editor Form */}
            {isEditing ? (
              <form
                onSubmit={handleSave}
                className="rounded-3xl border border-[#B266E6]/40 bg-white dark:bg-[#181915] p-5 shadow-soft space-y-4 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF]">
                    <Sparkles className="h-4 w-4 text-[#B266E6]" />
                    <span>{editingId ? 'Edit Context Note' : 'Add New Context Note'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
                      Note Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Boss Email & Preferences, Somaiya Project Info"
                      className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
                      Information / Facts *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={4}
                      placeholder="e.g. 'abc@gmail.com is my boss' email account. He manages company operations and handles project sign-offs. Always keep emails to him concise with bullet points.'"
                      className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] p-3.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6] font-sans leading-relaxed"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-1">
                      Tags (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. contacts, work, boss, priority"
                      className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !title.trim() || !content.trim()}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-2 text-xs font-bold shadow-soft transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Indexing with RAG...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{editingId ? 'Update Note' : 'Save & Index Note'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Search & Action Bar */}
            {!isEditing && (
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notes or tags..."
                    className="w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#181915] pl-9 pr-4 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
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

                <button
                  type="button"
                  onClick={startCreate}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-3.5 py-2 text-xs font-bold shadow-soft transition shrink-0 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Note</span>
                </button>
              </div>
            )}

            {/* Notes List */}
            <div className="space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-8 text-center space-y-3 shadow-soft">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
                    <BookOpen className="h-6 w-6 text-[#B266E6]" />
                  </div>
                  <div className="text-xs font-bold text-stone-900 dark:text-white">
                    {searchQuery ? 'No matching notes found' : 'No Context Notes Yet'}
                  </div>
                  <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                    Add notes about relationships, important emails (e.g. boss, professors), deadlines, or personal writing guidelines. Plum will retrieve only relevant notes when you chat or draft emails.
                  </p>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={startCreate}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-1.5 text-xs font-semibold shadow-xs transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create First Note</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#181915] p-4 sm:p-5 shadow-soft hover:border-[#B266E6]/30 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                          {note.title}
                        </h3>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {note.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:text-stone-300"
                              >
                                <Tag className="h-2.5 w-2.5 text-[#B266E6]" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="rounded-xl p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition"
                          title="Edit note"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmNote(note)}
                          className="rounded-xl p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {note.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-black/[0.04] dark:border-white/[0.05] text-[10px] text-stone-400">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Zap className="h-3 w-3" />
                        <span>RAG Indexed (768d Vector + BM25)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {note.updatedAt
                            ? new Date(note.updatedAt).toLocaleDateString()
                            : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmNote && (
        <ConfirmationModal
          isOpen={Boolean(deleteConfirmNote)}
          title="Delete Context Note"
          message={`Are you sure you want to delete note "${deleteConfirmNote.title}"? Plum AI will no longer use this memory when answering queries or drafting emails.`}
          confirmLabel="Delete Note"
          confirmVariant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirmNote(null)}
        />
      )}
    </>
  );
}
