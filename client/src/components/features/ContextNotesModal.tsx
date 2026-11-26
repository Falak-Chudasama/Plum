import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Edit3, Search } from 'lucide-react';
import { api } from '../../lib/api';
import type { ContextNoteItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';
import { Badge } from '../ui/Badge';
import { DynamicIslandModal } from '../ui/DynamicIslandModal';
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

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

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

  const handleClose = () => {
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
        toast.success(`Updated "${title.trim()}"`);
      } else {
        await api.createNote({
          title: title.trim(),
          content: content.trim(),
          tags,
          email: userEmail,
        });
        toast.success(`Saved "${title.trim()}"`);
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
      toast.success(`Deleted "${deleteConfirmNote.title}"`);
      setDeleteConfirmNote(null);
      onNotesChanged();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <>
      <DynamicIslandModal
        isOpen={isOpen}
        onClose={handleClose}
        maxWidthClass="max-w-xl"
        ariaLabelledBy="notes-modal-title"
      >
        {/* Translucent Cherry Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#161714]/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 id="notes-modal-title" className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-white">
              Notes
            </h2>
            <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              {notes.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isEditing && (
              <Button
                variant="primary"
                size="sm"
                onClick={startCreate}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                New
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                playBack();
                handleClose();
              }}
              aria-label="Close"
              className="focus-ring btn-interactive shadow-none flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 scrollbar-clean">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 animate-fade-in">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 dark:text-stone-400">
                  Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Office Hours & Advisor"
                  className="focus-ring w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 px-3.5 text-[13px] font-medium text-stone-900 dark:text-white placeholder-stone-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 dark:text-stone-400">
                  Tags
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Comma separated (optional)"
                  className="focus-ring w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 px-3.5 text-[13px] text-stone-900 dark:text-white placeholder-stone-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 dark:text-stone-400">
                  Content
                </label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Facts, links, or preferences Plum can reference..."
                  className="focus-ring w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 p-3.5 text-[13px] text-stone-900 dark:text-white placeholder-stone-400 leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSaving}
                  isLoading={isSaving}
                >
                  {editingId ? 'Save Changes' : 'Save Note'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <TextField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search notes..."
                icon={<Search />}
              />

              {filteredNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.1] py-10 text-center text-[13px] text-stone-400">
                  {searchQuery ? `No notes matching "${searchQuery}"` : 'No notes saved yet'}
                </div>
              ) : (
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
                  {filteredNotes.map((note) => (
                    <div
                      key={note._id}
                      className="group p-4 space-y-1.5 hover:bg-stone-50 dark:hover:bg-white/[0.03] transition"
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <h3 className="text-[13.5px] font-semibold text-stone-900 dark:text-white truncate">
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(note)}
                            className="focus-ring btn-interactive shadow-none p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playBack();
                              setDeleteConfirmNote(note);
                            }}
                            className="focus-ring btn-interactive shadow-none p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[13px] text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed whitespace-pre-wrap break-words">
                        {note.content}
                      </p>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {note.tags.map((tag) => (
                            <Badge key={tag} variant="neutral" dot={false}>
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
      </DynamicIslandModal>

      <ConfirmationModal
        isOpen={Boolean(deleteConfirmNote)}
        onClose={() => setDeleteConfirmNote(null)}
        onConfirm={confirmDelete}
        title="Delete Note"
        isDestructive
        description={
          <span>
            Delete <strong className="text-stone-900 dark:text-white">"{deleteConfirmNote?.title}"</strong>?
          </span>
        }
      />
    </>
  );
}
