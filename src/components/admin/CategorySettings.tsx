import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { getCategories, addCategory, deleteCategory } from '../../services/firestoreService';

export default function CategorySettings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setSubmitting(true);
    try {
      await addCategory(newCategory.trim());
      setNewCategory('');
      await fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Gagal menambah kategori.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Adakah anda pasti mahu membuang kategori "${category}"?`)) return;

    try {
      await deleteCategory(category);
      await fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Gagal membuang kategori.");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 font-display flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-600" />
        Pengurusan Kategori Program
      </h3>
      <p className="text-sm text-slate-600 mb-6">Urus senarai kategori yang boleh dipilih oleh pelajar semasa membuat permohonan.</p>
      
      <form onSubmit={handleAddCategory} className="flex gap-4 mb-8">
        <div className="flex-1">
          <input 
            type="text" 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nama Kategori Baru (contoh: Keusahawanan)" 
            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            disabled={submitting}
          />
        </div>
        <button 
          type="submit"
          disabled={submitting || !newCategory.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Tambah
        </button>
      </form>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div key={category} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
            <span className="font-medium text-slate-700">{category}</span>
            <button 
              onClick={() => handleDeleteCategory(category)}
              className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
              title="Buang Kategori"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Tiada kategori dijumpai. Sila tambah kategori baru.
          </div>
        )}
      </div>
    </div>
  );
}
