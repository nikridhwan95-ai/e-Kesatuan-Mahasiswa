import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Building, BookOpen, Award, Camera, Save, RefreshCw } from 'lucide-react';
import { getUserProfile, updateUserProfile, getFaculties, getColleges } from '../../services/firestoreService';
import { auth } from '../../firebase';
import { User } from '../../types';

interface StudentProfileProps {
  userId: string;
}

export default function StudentProfile({ userId }: StudentProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<User | null>(null);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userProfile, facultyList, collegeList] = await Promise.all([
          getUserProfile(userId),
          getFaculties(),
          getColleges()
        ]);
        
        setFaculties(facultyList);
        setColleges(collegeList);
        
        let currentProfile = userProfile;

        // If no profile exists, initialize a new one from Auth
        if (!currentProfile && auth.currentUser) {
           currentProfile = {
             uid: auth.currentUser.uid,
             email: auth.currentUser.email || '',
             name: auth.currentUser.displayName || '',
             displayName: '',
             photoURL: '',
             role: 'student', // Default role
             createdAt: new Date().toISOString()
           };
        }

        // Auto-fill missing details from Google Auth
        if (currentProfile && auth.currentUser) {
          let newDisplayName = currentProfile.displayName;
          let newPhotoURL = currentProfile.photoURL;

          // 1. Try to get from Auth if missing
          if (!newDisplayName) newDisplayName = auth.currentUser.displayName || '';
          if (!newPhotoURL) newPhotoURL = auth.currentUser.photoURL || '';

          // 2. Fallback: Parse from email if still no name
          if (!newDisplayName && auth.currentUser.email) {
            const emailName = auth.currentUser.email.split('@')[0];
            // Remove numbers and replace dots/underscores with spaces
            newDisplayName = emailName.replace(/[0-9]/g, '').replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
          }

          currentProfile = {
            ...currentProfile,
            displayName: newDisplayName,
            photoURL: newPhotoURL
          };
        }

        setProfile(currentProfile);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  const handleExtractFromEmail = () => {
    if (auth.currentUser && profile) {
      let newDisplayName = auth.currentUser.displayName;
      
      // If no display name from Google, try to parse from email
      if (!newDisplayName && auth.currentUser.email) {
        const emailName = auth.currentUser.email.split('@')[0];
        // Remove numbers and replace dots/underscores with spaces
        newDisplayName = emailName.replace(/[0-9]/g, '').replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
      }

      setProfile({
        ...profile,
        displayName: newDisplayName || profile.displayName,
        photoURL: auth.currentUser.photoURL || profile.photoURL,
        email: auth.currentUser.email || profile.email
      });
      alert("Maklumat berjaya diekstrak dari akaun Google.");
    } else {
      alert("Tiada maklumat pengguna ditemui.");
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      await updateUserProfile(userId, profile);
      setIsEditing(false);
      alert("Profil berjaya dikemaskini.");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Gagal mengemaskini profil.");
    }
  };

  const handleAddPosition = () => {
    if (!profile) return;
    const newPosition = { organization: '', role: '', year: '' };
    setProfile({
      ...profile,
      positions: [...(profile.positions || []), newPosition]
    });
  };

  const handleRemovePosition = (index: number) => {
    if (!profile || !profile.positions) return;
    const newPositions = [...profile.positions];
    newPositions.splice(index, 1);
    setProfile({ ...profile, positions: newPositions });
  };

  const handlePositionChange = (index: number, field: string, value: string) => {
    if (!profile || !profile.positions) return;
    const newPositions = [...profile.positions];
    newPositions[index] = { ...newPositions[index], [field]: value };
    setProfile({ ...profile, positions: newPositions });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuatkan profil...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-red-500">Profil tidak dijumpai.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Profil Pemohon</h2>
        <p className="text-sm text-slate-500 mt-1">Kemaskini maklumat peribadi dan jawatan anda.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-slate-400" />
                  )}
                </div>
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow border border-slate-200 text-slate-600 hover:text-blue-600">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleExtractFromEmail}
                  className="flex items-center gap-2 bg-white/90 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-white transition-colors"
                  title="Ambil gambar dan nama dari akaun Google"
                >
                  <RefreshCw className="w-4 h-4" /> Ekstrak dari Google
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <Save className="w-4 h-4" /> Simpan Profil
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-sm transition-colors"
              >
                Kemaskini Profil
              </button>
            )}
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-blue-600" /> Maklumat Peribadi
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nama Penuh</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={profile.displayName || ''}
                      onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium">{profile.displayName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">No. Matrik</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.matricNumber || ''}
                        onChange={(e) => setProfile({...profile, matricNumber: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium">{profile.matricNumber || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">No. Telefon</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={profile.phoneNumber || ''}
                        onChange={(e) => setProfile({...profile, phoneNumber: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-slate-900 font-medium">{profile.phoneNumber || '-'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> E-mel Siswa
                  </label>
                  <p className="text-slate-900 font-medium">{profile.email}</p>
                  {isEditing && <p className="text-xs text-slate-400 mt-1">E-mel siswa tidak boleh diubah.</p>}
                </div>
              </div>
            </div>

            {/* Academic & College Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" /> Maklumat Akademik
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Fakulti / Akademi
                  </label>
                  {isEditing ? (
                    <select 
                      value={profile.faculty || ''}
                      onChange={(e) => setProfile({...profile, faculty: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Pilih Fakulti</option>
                      {faculties.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-900 font-medium">{profile.faculty || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3" /> Kolej Kediaman
                  </label>
                  {isEditing ? (
                    <select 
                      value={profile.college || ''}
                      onChange={(e) => setProfile({...profile, college: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Pilih Kolej</option>
                      {colleges.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Luar Kampus">Luar Kampus</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-medium">{profile.college || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Positions / Involvement */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" /> Senarai Jawatan (Kelab/Persatuan)
              </h3>
              {isEditing && (
                <button 
                  onClick={handleAddPosition}
                  className="text-sm text-blue-600 font-semibold hover:text-blue-700"
                >
                  + Tambah Jawatan
                </button>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Organisasi / Badan Pelajar</th>
                    <th className="p-3 font-semibold">Jawatan</th>
                    <th className="p-3 font-semibold">Sesi Akademik</th>
                    {isEditing && <th className="p-3 font-semibold text-right">Tindakan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profile.positions?.map((pos, index) => (
                    <tr key={index} className="hover:bg-white transition-colors">
                      <td className="p-3 font-medium text-slate-900">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={pos.organization || ''}
                            onChange={(e) => handlePositionChange(index, 'organization', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1"
                            placeholder="Nama Organisasi"
                          />
                        ) : pos.organization}
                      </td>
                      <td className="p-3 text-slate-700">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={pos.role || ''}
                            onChange={(e) => handlePositionChange(index, 'role', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1"
                            placeholder="Jawatan"
                          />
                        ) : pos.role}
                      </td>
                      <td className="p-3 text-slate-600">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={pos.year || ''}
                            onChange={(e) => handlePositionChange(index, 'year', e.target.value)}
                            className="w-full border border-slate-300 rounded p-1"
                            placeholder="Sesi"
                          />
                        ) : pos.year}
                      </td>
                      {isEditing && (
                        <td className="p-3 text-right">
                          <button 
                            onClick={() => handleRemovePosition(index)}
                            className="text-red-500 hover:text-red-700 font-medium text-xs"
                          >
                            Buang
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {(!profile.positions || profile.positions.length === 0) && (
                    <tr>
                      <td colSpan={isEditing ? 4 : 3} className="p-4 text-center text-slate-500 italic">
                        Tiada rekod jawatan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
