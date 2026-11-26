import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { api } from '../../lib/api';
import type { CategoryItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DynamicIslandModal } from '../ui/DynamicIslandModal';
import { playBack, playEnter, playScroll } from '../../lib/sound';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  userEmail: string;
  onCategoriesChanged: () => void;
}

// Strict 6-color curated palette (no custom color picker)
const CURATED_COLORS = [
  '#7E36B2',
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
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
  const [color, setColor] = useState(CURATED_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<string | null>(null);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(CURATED_COLORS[0]);
    setDeleteConfirmCat(null);
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStartEdit = (cat: CategoryItem) => {
    playEnter();
    setIsEditing(true);
    setEditingId(cat._id || cat.category);
    setName(cat.category);
    setDescription(cat.description || '');
    const matched = CURATED_COLORS.find(
      (hex) => hex.toLowerCase() === (cat.color || '').toLowerCase()
    );
    setColor(matched || CURATED_COLORS[0]);
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
    <DynamicIslandModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidthClass="max-w-md"
      ariaLabelledBy="category-manager-title"
    >
      {/* Translucent Cherry-style Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#161714]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 id="category-manager-title" className="text-[15px] font-semibold tracking-[-0.01em] text-stone-900 dark:text-white">
            Categories
          </h2>
          <span className="rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            {categories.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isEditing && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartCreate}
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5 scrollbar-clean">
        {isEditing && (
          <form onSubmit={handleSave} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 dark:text-stone-400">
                Name
              </label>
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
                  placeholder="e.g. Opportunities"
                  className="focus-ring w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 pl-8 pr-3.5 text-[13px] font-medium text-stone-900 dark:text-white placeholder-stone-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500 dark:text-stone-400">
                Matching Hints
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. job offers, interviews, recruiter emails"
                className="focus-ring w-full h-10 rounded-xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50 dark:bg-stone-900/80 px-3.5 text-[13px] text-stone-900 dark:text-white placeholder-stone-400"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {CURATED_COLORS.map((hex) => {
                  const selected = color.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => {
                        playScroll();
                        setColor(hex);
                      }}
                      className={`btn-interactive shadow-none h-6 w-6 rounded-full flex items-center justify-center ${
                        selected
                          ? 'outline-2 outline-offset-2 outline-stone-900 dark:outline-white opacity-100'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={`Select color ${hex}`}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
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
                  {editingId ? 'Save' : 'Create'}
                </Button>
              </div>
            </div>

            <div className="border-b border-black/[0.06] dark:border-white/[0.08] pt-1" />
          </form>
        )}

        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.1] py-8 text-center text-[13px] text-stone-400">
            No categories yet
          </div>
        ) : (
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06] rounded-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
            {categories.map((cat) => {
              const tagColor = cat.color || '#64748B';
              const isConfirmingDelete = deleteConfirmCat === cat.category;

              return (
                <div
                  key={cat._id || cat.category}
                  className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-white/[0.03] transition"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge customColor={tagColor} className="shrink-0">
                      {cat.category}
                    </Badge>
                    {cat.description && (
                      <span className="text-[12.5px] text-stone-500 dark:text-stone-400 truncate">
                        {cat.description}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 animate-fade-in">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(cat.category)}
                          className="!h-7 !px-2.5 !text-[11px]"
                        >
                          Delete
                        </Button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmCat(null)}
                          className="focus-ring btn-interactive shadow-none text-xs font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-lg px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="focus-ring btn-interactive shadow-none p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playScroll();
                            setDeleteConfirmCat(cat.category);
                          }}
                          className="focus-ring btn-interactive shadow-none p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
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
    </DynamicIslandModal>
  );
}
