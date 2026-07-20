import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Home, Loader2, ChevronRight } from 'lucide-react';
import { 
  getFaculties, addFaculty, deleteFaculty,
  getColleges, addCollege, deleteCollege 
} from '../../services/dataService';

type SettingType = 'faculty' | 'college';

export default function OrganizationSettings() {
  const [activeTab, setActiveTab] = useState<SettingType>('faculty');
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = activeTab === 'faculty' ? await getFaculties() : await getColleges();
      setItems(data);
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    setSubmitting(true);
    try {
      if (activeTab === 'faculty') {
        await addFaculty(newItem.trim());
      } else {
        await addCollege(newItem.trim());
      }
      setNewItem('');
      await fetchItems();
    } catch (error) {
      console.error(`Error adding ${activeTab}:`, error);
      alert(`Gagal menambah ${activeTab === 'faculty' ? 'fakulti' : 'kolej'}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: string) => {
    const label = activeTab === 'faculty' ? 'fakulti' : 'kolej';
    if (!confirm(`Adakah anda pasti mahu membuang ${label} "${item}"?`)) return;

    try {
      if (activeTab === 'faculty') {
        await deleteFaculty(item);
      } else {
        await deleteCollege(item);
      }
      await fetchItems();
    } catch (error) {
      console.error(`Error deleting ${activeTab}:`, error);
      alert(`Gagal membuang ${label}.`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Pengurusan Maklumat Organisasi
          </h3>
          <p className="text-sm text-slate-600">Urus senarai fakulti/akademi dan kolej kediaman untuk profil pelajar.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('faculty')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'faculty' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Building2 className="w-4 h-4" />
            Fakulti / Akademi
          </button>
          <button 
            onClick={() => setActiveTab('college')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'college' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Home className="w-4 h-4" />
            Kolej Kediaman
          </button>
        </div>
      </div>

      <form onSubmit={handleAddItem} className="flex gap-4 mb-8">
        <div className="flex-1">
          <input 
            type="text" 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`Nama ${activeTab === 'faculty' ? 'Fakulti/Akademi' : 'Kolej Kediaman'} Baru`} 
            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            disabled={submitting}
          />
        </div>
        <button 
          type="submit"
          disabled={submitting || !newItem.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Tambah
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 text-slate-400 group-hover:text-blue-500 transition-colors">
                  {activeTab === 'faculty' ? <Building2 className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                </div>
                <span className="font-medium text-slate-700 text-sm">{item}</span>
              </div>
              <button 
                onClick={() => handleDeleteItem(item)}
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                title={`Buang ${activeTab === 'faculty' ? 'Fakulti' : 'Kolej'}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 italic bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              Tiada rekod dijumpai. Sila tambah maklumat baru.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
