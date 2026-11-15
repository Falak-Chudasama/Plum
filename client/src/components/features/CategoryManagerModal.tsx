import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { CategoryItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { playBack, playEnter } from '../../lib/sound';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  userEmail: string;
  onCategoriesChanged: () => void;
}

const PRESET_COLORS = [
  { name: 'Plum Flesh', hex: '#B266E6' },
  { name: 'Plum Strong', hex: '#7E36B2' },
  { name: 'Plum Pastel', hex: '#DBBFFF' },
  { name: 'Plum Leaf', hex: '#89D66D' },
  { name: 'Warm Amber', hex: '#F59E0B' },
  { name: 'Rose Red', hex: '#EF4444' },
  { name: 'Sky Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Slate Gray', hex: '#64748B' },
];

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
  userEmail,
  onCategoriesChanged,
}: CategoryManagerModalProps) {
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#B266E6');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('#B266E6');
    setDeleteConfirmCat(null);
  };

  const handleClose = () => {
    playBack();
    resetForm();
    onClose();
  };

  const handleStartEdit = (cat: CategoryItem) => {
    playEnter();
    setIsEditing(true);
    setEditingId(cat._id || cat.category);
    setName(cat.category);
    setDescription(cat.description || '');
    setColor(cat.color || '#B266E6');
  };

  const handleStartCreate = () => {
    playEnter();
    resetForm();
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Category name cannot be empty');
      return;
    }

    setIsSaving(true);
    playEnter();
    try {
      if (editingId) {
        await api.editCategory({
          _id: editingId,
          category: name.trim(),
          description: description.trim(),
          color,
          alert: false,
        });
        toast.success(`Category "${name}" updated`);
      } else {
        await api.createCategory({
          category: name.trim(),
          description: description.trim(),
          color,
          alert: false,
        });
        toast.success(`Category "${name}" created`);
      }
      resetForm();
      onCategoriesChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (categoryName: string) => {
    playBack();
    try {
      await api.deleteCategory(categoryName);
      toast.success(`Category "${categoryName}" deleted`);
      setDeleteConfirmCat(null);
      onCategoriesChanged();
    } catch (err: any) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Scrim backdrop (Section 2.9: 150ms ease-out) */}
      <div
        className="fixed inset-0 bg-stone-900/45 dark:bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Shell (Section 2.9 & 5.8: 32px radius, 180ms cubic-bezier(0.16, 1, 0.3, 1)) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
        className="relative z-10 glass-panel w-full max-w-2xl rounded-[2rem] p-6 sm:p-7 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl flex flex-col max-h-[88vh] animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#7E36B2] dark:text-[#DBBFFF] shadow-2xs">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="category-manager-title" className="text-base font-bold text-stone-900 dark:text-white">
                Customize Categories
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Design custom tags used by Basket AI to categorize emails and color-code your inbox.
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-clean">
          {/* Add / Edit Form Card */}
          {isEditing ? (
            <form onSubmit={handleSave} className="rounded-2xl border border-[#B266E6]/30 bg-[#B266E6]/[0.02] p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7E36B2] dark:text-[#DBBFFF]">
                    {editingId ? 'Edit Category' : 'New Custom Category'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                >
                  Cancel
                </button>
              </div>

              {/* Tag Name Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. College, Finance, Client Projects, Urgent Notices"
                  className="w-full rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-stone-900/90 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
              </div>

              {/* AI Classification Guidelines */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    AI Context Hints (Optional)
                  </label>
                  <span className="text-[10px] text-stone-400">Used by Basket grammar</span>
                </div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. tuition receipts, exam schedules, grading notices, coursework"
                  className="w-full rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-stone-900/90 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
              </div>

              {/* Tag Color Picker */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                  Accent Color
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`group relative flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all ${
                          isSelected ? 'scale-110 ring-2 ring-offset-2 ring-[#7E36B2] dark:ring-offset-[#181915]' : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />}
                      </button>
                    );
                  })}

                  <div className="flex items-center gap-1.5 ml-2 border border-black/[0.08] dark:border-white/[0.1] rounded-xl bg-white dark:bg-stone-900 px-2.5 py-1">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0 overflow-hidden"
                      title="Custom Color Picker"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-16 bg-transparent text-[10px] font-mono text-stone-700 dark:text-stone-300 focus:outline-none"
                      placeholder="#B266E6"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-stone-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Tag Preview:
                </span>
                <Badge customColor={color}>
                  {name.trim() || 'Sample Tag'}
                </Badge>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
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
                  {editingId ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={handleStartCreate}
              icon={<Plus className="h-4 w-4 text-[#7E36B2] dark:text-[#DBBFFF]" />}
              className="w-full justify-center"
            >
              Create New Category Tag
            </Button>
          )}

          {/* Active Categories List */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Active Category Tags ({categories.length})
              </h3>
              <span className="text-[10px] text-stone-400">
                Click Edit to customize
              </span>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.1] p-8 text-center text-xs text-stone-400 space-y-2">
                <Tag className="h-6 w-6 mx-auto text-stone-300 dark:text-stone-600" />
                <p>No custom categories created yet. Click above to create your first category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {categories.map((cat) => {
                  const tagColor = cat.color || '#64748B';
                  const isConfirmingDelete = deleteConfirmCat === cat.category;

                  return (
                    <div
                      key={cat._id || cat.category}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-stone-900/70 p-3.5 shadow-2xs hover:shadow-soft transition hover:border-black/[0.12] dark:hover:border-white/[0.14]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge customColor={tagColor}>
                          {cat.category}
                        </Badge>

                        <div className="min-w-0">
                          {cat.description ? (
                            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                              {cat.description}
                            </p>
                          ) : (
                            <p className="text-[10px] text-stone-400 italic">No hints specified</p>
                          )}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(cat.category)}
                              className="text-[10px] py-1 px-2.5 min-h-[30px]"
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmCat(null)}
                              className="text-[10px] py-1 px-2 min-h-[30px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                              title="Edit Category"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playBack();
                                setDeleteConfirmCat(cat.category);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                              title="Delete Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info note */}
        <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#B266E6]" />
            Basket email categorization automatically adapts to your custom categories.
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="font-semibold text-stone-600 dark:text-stone-300 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
