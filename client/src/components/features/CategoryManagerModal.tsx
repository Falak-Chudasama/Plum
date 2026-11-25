import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
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
  '#B266E6',
  '#7E36B2',
  '#DBBFFF',
  '#89D66D',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#14B8A6',
  '#64748B',
];

export function CategoryManagerModal({
  isOpen,
  onClose,
  categories,
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
      toast.warning('Category name is required');
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
        toast.success(`Updated "${name.trim()}"`);
      } else {
        await api.createCategory({
          category: name.trim(),
          description: description.trim(),
          color,
          alert: false,
        });
        toast.success(`Created "${name.trim()}"`);
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
      toast.success(`Deleted "${categoryName}"`);
      setDeleteConfirmCat(null);
      onCategoriesChanged();
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div
        className="fixed inset-0 bg-stone-900/45 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
        className="relative z-10 glass-panel w-full max-w-lg rounded-[2rem] p-5 sm:p-6 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl flex flex-col max-h-[82vh] animate-scale-in"
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h2 id="category-manager-title" className="text-base font-bold text-stone-900 dark:text-white">
              Categories
            </h2>
            <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-stone-500 dark:text-stone-400">
              {categories.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isEditing && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartCreate}
                icon={<Plus className="h-3.5 w-3.5" />}
                className="!py-1.5 !px-3 !min-h-[32px]"
              >
                New
              </Button>
            )}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-3 scrollbar-clean">
          {isEditing && (
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] p-4 space-y-3 animate-fade-in"
            >
              {/* Name Input with Integrated Live Color Dot */}
              <div className="relative flex items-center">
                <span
                  className="absolute left-3.5 h-2.5 w-2.5 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: color }}
                />
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name"
                  className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900 pl-8 pr-3.5 py-2 text-sm font-medium text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
              </div>

              {/* Matching Hints */}
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="AI matching hints (e.g. invoices, receipts, deadlines)"
                className="w-full rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-stone-900 px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
              />

              {/* Compact Color Swatches + Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PRESET_COLORS.map((hex) => {
                    const selected = color.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`h-5 w-5 rounded-full flex items-center justify-center transition-transform ${
                          selected ? 'scale-115 ring-2 ring-offset-2 ring-stone-900 dark:ring-white dark:ring-offset-[#181915]' : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Select color ${hex}`}
                      >
                        {selected && <Check className="h-3 w-3 text-white drop-shadow-2xs" />}
                      </button>
                    );
                  })}

                  <label
                    className="ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-black/[0.15] dark:border-white/[0.2] overflow-hidden"
                    title="Custom color"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <Button variant="ghost" size="sm" onClick={resetForm} className="!py-1 !px-2.5 !min-h-[30px]">
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isSaving}
                    isLoading={isSaving}
                    className="!py-1 !px-3.5 !min-h-[30px]"
                  >
                    {editingId ? 'Save' : 'Create'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Category List */}
          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.1] py-8 text-center text-xs text-stone-400">
              No categories yet
            </div>
          ) : (
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-stone-900/50 overflow-hidden">
              {categories.map((cat) => {
                const tagColor = cat.color || '#64748B';
                const isConfirmingDelete = deleteConfirmCat === cat.category;

                return (
                  <div
                    key={cat._id || cat.category}
                    className="group flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge customColor={tagColor} className="shrink-0">
                        {cat.category}
                      </Badge>
                      {cat.description && (
                        <span className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {cat.description}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1 animate-fade-in">
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.category)}
                            className="rounded-full bg-rose-600 text-white px-2.5 py-1 text-[10px] font-bold hover:bg-rose-700 transition"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmCat(null)}
                            className="rounded-full px-2 py-1 text-[10px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playBack();
                              setDeleteConfirmCat(cat.category);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                            title="Delete"
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
    </div>
  );
}
