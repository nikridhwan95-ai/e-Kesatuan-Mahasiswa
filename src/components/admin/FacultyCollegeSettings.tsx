import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, Home, Loader2, AlertCircle } from 'lucide-react';
import { 
  getFaculties, addFaculty, deleteFaculty, 
  getColleges, addCollege, deleteCollege 
} from '../../services/firestoreService';

export default function FacultyCollegeSettings() {
  const [faculties, setFaculties] = useState<string[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [newFaculty, setNewFaculty] = useState('');
  const [newCollege, setNewCollege] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingFaculty, setSubmittingFaculty] = useState(false);
  const [submittingCollege, setSubmittingCollege] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facultyData, collegeData] = await Promise.all([
        getFaculties(),
        getColleges()
      ]);
      setFaculties(facultyData);
      setColleges(collegeData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Gagal memuatkan data. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaculty.trim()) return;

    setSubmittingFaculty(true);
    try {
      await addFaculty(newFaculty.trim());
      setNewFaculty('');
      const data = await getFaculties();
      setFaculties(data);
    } catch (err) {
      console.error("Error adding faculty:", err);
      setError("Gagal menambah fakulti.");
    } finally {
      setSubmittingFaculty(false);
    }
  };

  const handleDeleteFaculty = async (faculty: string) => {
    if (!confirm(`Adakah anda pasti mahu membuang fakulti "${faculty}"?`)) return;

    try {
      await deleteFaculty(faculty);
      const data = await getFaculties();
      setFaculties(data);
    } catch (err) {
      console.error("Error deleting faculty:", err);
      setError("Gagal membuang fakulti.");
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollege.trim()) return;

    setSubmittingCollege(true);
    try {
      await addCollege(newCollege.trim());
      setNewCollege('');
      const data = await getColleges();
      setColleges(data);
    } catch (err) {
      console.error("Error adding college:", err);
      setError("Gagal menambah kolej.");
    } finally {
      setSubmittingCollege(false);
    }
  };

  const handleDeleteCollege = async (college: string) => {
    if (!confirm(`Adakah anda pasti mahu membuang kolej "${college}"?`)) return;

    try {
      await deleteCollege(college);
      const data = await getColleges();
      setColleges(data);
    } catch (err) {
      console.error("Error deleting college:", err);
      setError("Gagal membuang kolej.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold uppercase tracking-wider">Tutup</button>
        </div>
      )}

      {/* Faculty Management */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4 font-display flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Pengurusan Fakulti / Akademi
        </h3>
        <p className="text-sm text-slate-600 mb-6">Urus senarai fakulti atau akademi yang tersedia untuk profil pelajar.</p>
        
        <form onSubmit={handleAddFaculty} className="flex gap-4 mb-8">
          <div className="flex-1">
            <input 
              type="text" 
              value={newFaculty}
              onChange={(e) => setNewFaculty(e.target.value)}
              placeholder="Nama Fakulti/Akademi Baru" 
              className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              disabled={submittingFaculty}
            />
          </div>
          <button 
            type="submit"
            disabled={submittingFaculty || !newFaculty.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submittingFaculty ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {faculties.map((faculty) => (
            <div key={faculty} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
              <span className="font-medium text-slate-700 text-sm">{faculty}</span>
              <button 
                onClick={() => handleDeleteFaculty(faculty)}
                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                title="Buang Fakulti"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {faculties.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
              Tiada fakulti dijumpai. Sila tambah fakulti baru.
            </div>
          )}
        </div>
      </div>

      {/* College Management */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-4 font-display flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-600" />
          Pengurusan Kolej Kediaman
        </h3>
        <p className="text-sm text-slate-600 mb-6">Urus senarai kolej kediaman yang tersedia untuk profil pelajar.</p>
        
        <form onSubmit={handleAddCollege} className="flex gap-4 mb-8">
          <div className="flex-1">
            <input 
              type="text" 
              value={newCollege}
              onChange={(e) => setNewCollege(e.target.value)}
              placeholder="Nama Kolej Kediaman Baru" 
              className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              disabled={submittingCollege}
            />
          </div>
          <button 
            type="submit"
            disabled={submittingCollege || !newCollege.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {submittingCollege ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tambah
          </button>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {colleges.map((college) => (
            <div key={college} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
              <span className="font-medium text-slate-700 text-sm">{college}</span>
              <button 
                onClick={() => handleDeleteCollege(college)}
                className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                title="Buang Kolej"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {colleges.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
              Tiada kolej dijumpai. Sila tambah kolej baru.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
