import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Sparkles,
  AlertCircle,
  Palette,
} from 'lucide-react';
import { api } from '../../lib/api';
import type { CategoryItem } from '../../lib/api';
import { useToast } from '../ui/ToastProvider';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  userEmail: string;
  onCategoriesChanged: () => void;
}

const PRESET_COLORS = [
  { name: 'Plum Flesh', hex: '#B266E6' },
  { name: 'Lime Leaf', hex: '#89D66D' },
  { name: 'Warm Amber', hex: '#F59E0B' },
  { name: 'Rose Red', hex: '#EF4444' },
  { name: 'Sky Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Fuchsia', hex: '#EC4899' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Slate', hex: '#64748B' },
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

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('#B266E6');
    setDeleteConfirmCat(null);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setIsEditing(true);
    setEditingId(cat._id || cat.category);
    setName(cat.category);
    setDescription(cat.description || '');
    setColor(cat.color || '#B266E6');
  };

  const handleStartCreate = () => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF]">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                Customize Categories
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Create and style custom tags used by Basket AI email classification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-clean">
          {/* Add / Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSave} className="rounded-2xl border border-[#B266E6]/30 bg-[#B266E6]/5 dark:bg-[#B266E6]/10 p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF]">
                  {editingId ? 'Edit Category' : 'Create New Category'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Finance, College, Client Projects"
                  className="w-full rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-stone-900 px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  AI Context Guidelines (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. invoices, tax receipts, bank statements"
                  className="w-full rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-stone-900 px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
                <span className="mt-1 block text-[10px] text-stone-400">
                  Helps the LLM accurately categorize incoming emails under this tag.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                  Tag Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      className="group relative flex h-7 w-7 items-center justify-center rounded-full transition transform hover:scale-110"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {color.toLowerCase() === c.hex.toLowerCase() && (
                        <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />
                      )}
                    </button>
                  ))}
                  {/* Custom Color Input */}
                  <div className="relative flex items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0 overflow-hidden"
                      title="Custom Color"
                    />
                  </div>
                </div>
              </div>

              {/* Tag Preview */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-stone-500">Preview:</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                  style={{
                    backgroundColor: `${color}18`,
                    color: color,
                    borderColor: `${color}40`,
                  }}
                >
                  {name.trim() || 'Sample Tag'}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-4 py-1.5 text-xs font-semibold shadow-xs transition disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{isSaving ? 'Saving...' : editingId ? 'Update Tag' : 'Create Tag'}</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleStartCreate}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#B266E6]/30 hover:border-[#B266E6] bg-[#B266E6]/[0.02] dark:bg-[#B266E6]/[0.04] p-3 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF] transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Category Tag</span>
            </button>
          )}

          {/* Existing Categories List */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Active Category Tags ({categories.length})
            </h3>

            {categories.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">
                No custom categories created yet. Click "Create New Category Tag" above to add your first tag.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => {
                  const tagColor = cat.color || '#64748B';
                  const isConfirmingDelete = deleteConfirmCat === cat.category;

                  return (
                    <div
                      key={cat._id || cat.category}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-stone-900/60 p-3 shadow-2xs transition hover:border-black/[0.12] dark:hover:border-white/[0.15]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-2xs ring-2 ring-black/[0.05] dark:ring-white/[0.1]"
                          style={{ backgroundColor: tagColor }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-900 dark:text-white truncate">
                              {cat.category}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.2 text-[10px] font-semibold border"
                              style={{
                                backgroundColor: `${tagColor}18`,
                                color: tagColor,
                                borderColor: `${tagColor}40`,
                              }}
                            >
                              Sample
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-rose-600 font-semibold">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.category)}
                              className="rounded-lg bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmCat(null)}
                              className="rounded-lg bg-stone-200 dark:bg-stone-700 px-2 py-0.5 text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
                              title="Edit Tag"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmCat(cat.category)}
                              className="rounded-lg p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Delete Tag"
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
    </div>
  );
}

