import { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Sparkles,
  Palette,
  AlertCircle,
  HelpCircle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-lift border border-black/[0.08] dark:border-white/[0.1] bg-white/95 dark:bg-[#181915]/95 backdrop-blur-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#B266E6]/10 text-[#5C207E] dark:text-[#DBBFFF] shadow-2xs">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white">
                Customize Categories
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Design custom tags used by Basket AI to categorize emails and color-code your inbox.
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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-clean">
          {/* Add / Edit Form Card */}
          {isEditing ? (
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-stone-50/80 dark:bg-stone-900/50 p-5 space-y-4 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[#B266E6]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white">
                    {editingId ? 'Edit Category Tag' : 'Design New Category Tag'}
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
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
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    AI Context & Guidelines (Optional)
                  </label>
                  <span className="text-[10px] text-stone-400">Used by Basket inference grammar</span>
                </div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. tuition receipts, exam schedules, grading notices, coursework"
                  className="w-full rounded-xl border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-stone-900/90 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#B266E6]"
                />
                <p className="mt-1 text-[11px] text-stone-400 dark:text-stone-500">
                  Keywords or subject hints provided here help Basket LLM accurately match incoming emails to this tag.
                </p>
              </div>

              {/* Tag Color Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
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
                          isSelected ? 'scale-110 ring-2 ring-offset-2 ring-[#B266E6] dark:ring-offset-[#181915]' : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white drop-shadow-xs" />}
                      </button>
                    );
                  })}

                  {/* Custom Hex Color Picker */}
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
                      className="w-16 bg-transparent text-[11px] font-mono text-stone-700 dark:text-stone-300 focus:outline-none"
                      placeholder="#B266E6"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-stone-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Live Email Tag Preview
                  </span>
                  <div className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Sample Email: "Important Announcement Regarding Upcoming Schedule"
                  </div>
                </div>
                <div className="shrink-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-2xs transition-all"
                    style={{
                      backgroundColor: `${color}18`,
                      color: color,
                      borderColor: `${color}40`,
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    <span>{name.trim() || 'Sample Tag'}</span>
                  </span>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#B266E6] hover:bg-[#8F40C7] text-white px-5 py-2 text-xs font-bold shadow-soft transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{editingId ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleStartCreate}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#B266E6]/40 hover:border-[#B266E6] bg-[#B266E6]/[0.02] hover:bg-[#B266E6]/[0.06] p-3.5 text-xs font-bold text-[#5C207E] dark:text-[#DBBFFF] transition shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Category Tag</span>
            </button>
          )}

          {/* Active Categories List */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Active Category Tags ({categories.length})
              </h3>
              <span className="text-[11px] text-stone-400">
                Click Edit to customize color or guidelines
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
                        {/* Colored Tag Chip */}
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shrink-0 shadow-2xs"
                          style={{
                            backgroundColor: `${tagColor}18`,
                            color: tagColor,
                            borderColor: `${tagColor}40`,
                          }}
                        >
                          <Tag className="h-3 w-3" />
                          <span>{cat.category}</span>
                        </span>

                        {/* Guideline / Description excerpt */}
                        <div className="min-w-0">
                          {cat.description ? (
                            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                              {cat.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-stone-400 italic">No guidelines specified</p>
                          )}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.category)}
                              className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1 text-[11px] font-bold shadow-2xs transition"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmCat(null)}
                              className="rounded-lg text-stone-500 px-2 py-1 text-[11px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition"
                            >
                              Cancel
                            </button>
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
                              onClick={() => setDeleteConfirmCat(cat.category)}
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
        <div className="pt-3 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#B266E6]" />
            Basket email categorization automatically adapts to your custom categories.
          </span>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="font-semibold text-stone-600 dark:text-stone-300 hover:underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
