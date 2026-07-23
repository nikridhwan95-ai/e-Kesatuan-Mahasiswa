// Tetapan Sistem (admin) — diekstrak daripada App.tsx: lima akordion
// (kategori, organisasi, surat, peranan, data) berserta semua keadaan dan
// pengendalinya. App.tsx kini hanya shell auth + navigasi.
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CategorySettings from '../admin/CategorySettings';
import OrganizationSettings from '../admin/OrganizationSettings';
import LetterSettingsModule from './LetterSettingsModule';
import { UserRole, User as UserType } from '../../types';
import { AppUser, PORTAL_ADMIN_EMAIL } from '../../supabase';
import {
  deleteAllApplications,
  getUserByEmail,
  getUsers,
  updateUserProfile,
} from '../../services/dataService';
import { useNotification } from '../shared/ToastProvider';

export default function SystemSettings({ currentUser }: { currentUser: AppUser | null }) {
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleValue, setNewRoleValue] = useState<UserRole>('unit_semakan');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('kategori');
  const [userToRemove, setUserToRemove] = useState<{ uid: string; email: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleEmail) {
      showNotification('Sila masukkan alamat e-mel.', 'error');
      return;
    }

    setIsUpdatingRole(true);
    try {
      const targetUser = await getUserByEmail(newRoleEmail);
      if (targetUser) {
        await updateUserProfile(targetUser.uid, { role: newRoleValue });
        showNotification(`Peranan berjaya dikemas kini untuk ${newRoleEmail}`, 'success');
        setNewRoleEmail('');
        fetchUsers(); // Refresh list
      } else {
        showNotification(
          `Pengguna dengan e-mel ${newRoleEmail} tidak dijumpai. Pengguna perlu log masuk sekurang-kurangnya sekali sebelum peranan boleh ditetapkan.`,
          'error',
        );
      }
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('Gagal mengemaskini peranan.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveRole = async (uid: string, email: string) => {
    // Akaun portal kongsi dan akaun sendiri tidak boleh diturunkan taraf —
    // menghalang penguncian keluar seluruh portal.
    if (email === PORTAL_ADMIN_EMAIL || uid === currentUser?.uid) {
      showNotification('Peranan akaun ini tidak boleh dibuang.', 'error');
      return;
    }
    setUserToRemove({ uid, email });
  };

  const confirmRemoveRole = async () => {
    if (!userToRemove) return;
    try {
      await updateUserProfile(userToRemove.uid, { role: 'student' });
      setUserToRemove(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error removing role:', error);
      setUserToRemove(null);
    }
  };

  const handleStartFresh = async () => {
    setIsDeleting(true);
    try {
      await deleteAllApplications();
      setShowDeleteConfirm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting all applications:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Tetapan Sistem
        </h2>
        <p className="text-sm text-slate-500 mt-1">Urus peranan pengguna dan tetapan aplikasi.</p>
      </div>

      <div className="space-y-4">
        {/* 1. Pengurusan Kategori Program */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === 'kategori' ? null : 'kategori')}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 font-display">
              1. Pengurusan Kategori Program
            </h3>
            {openAccordion === 'kategori' ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {openAccordion === 'kategori' && (
            <div className="p-6 border-t border-slate-100">
              <CategorySettings />
            </div>
          )}
        </div>

        {/* 2. Pengurusan Maklumat Organisasi */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === 'organisasi' ? null : 'organisasi')}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 font-display">
              2. Pengurusan Fakulti & Kolej
            </h3>
            {openAccordion === 'organisasi' ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {openAccordion === 'organisasi' && (
            <div className="p-6 border-t border-slate-100">
              <OrganizationSettings />
            </div>
          )}
        </div>

        {/* 3. Tetapan Surat Kelulusan */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === 'surat' ? null : 'surat')}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 font-display">
              3. Tetapan Surat Kelulusan
            </h3>
            {openAccordion === 'surat' ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {openAccordion === 'surat' && (
            <div className="p-6 border-t border-slate-100">
              <LetterSettingsModule />
            </div>
          )}
        </div>

        {/* 4. Pengurusan Peranan Pengguna */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === 'peranan' ? null : 'peranan')}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 font-display">
              4. Pengurusan Peranan Pengguna
            </h3>
            {openAccordion === 'peranan' ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {openAccordion === 'peranan' && (
            <div className="p-6 border-t border-slate-100">
              <p className="text-sm text-slate-600 mb-6">
                Tetapkan peranan kepada alamat e-mel pengguna di sini.
              </p>

              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Alamat E-mel
                    </label>
                    <input
                      type="email"
                      placeholder="contoh@siswa.upm.edu.my"
                      className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      value={newRoleEmail}
                      onChange={(e) => setNewRoleEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Peranan
                    </label>
                    <select
                      className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                      value={newRoleValue}
                      onChange={(e) => setNewRoleValue(e.target.value as UserRole)}
                    >
                      <option value="unit_semakan">KM - Unit Semakan</option>
                      <option value="unit_pembentangan">KM - Unit Pembentangan</option>
                      <option value="unit_kertas_kerja">KM - Unit Kertas Kerja</option>
                      <option value="unit_pelaporan">KM - Unit Pelaporan</option>
                      <option value="admin">System Admin (Urus Setia)</option>
                      <option value="ydp">YDP MPP</option>
                      <option value="tnc_hepa">TNC HEPA</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddRole}
                    disabled={isUpdatingRole}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isUpdatingRole ? 'Sedang Diproses...' : 'Tambah Peranan'}
                  </button>
                </div>

                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="font-semibold text-slate-900 mb-4">Senarai Pentadbir Semasa</h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 max-h-96 overflow-y-auto">
                    {allUsers.filter((u) => u.role !== 'student').length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Tiada pentadbir lain ditemui.
                      </p>
                    ) : (
                      allUsers
                        .filter((u) => u.role !== 'student')
                        .map((adminUser) => (
                          <div
                            key={adminUser.uid}
                            className="flex justify-between items-center py-3 border-b border-slate-200 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-slate-900">{adminUser.email}</p>
                              <p className="text-xs text-slate-500 capitalize">
                                {adminUser.role === 'admin'
                                  ? 'System Admin'
                                  : adminUser.role.replace('_', ' ')}
                              </p>
                            </div>
                            {!(
                              adminUser.email === PORTAL_ADMIN_EMAIL ||
                              adminUser.uid === currentUser?.uid
                            ) && (
                              <div className="flex items-center gap-2">
                                {userToRemove?.uid === adminUser.uid ? (
                                  <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                    <span className="text-xs font-semibold text-red-700">
                                      Pasti?
                                    </span>
                                    <button
                                      onClick={confirmRemoveRole}
                                      className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                                    >
                                      Ya
                                    </button>
                                    <button
                                      onClick={() => setUserToRemove(null)}
                                      className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleRemoveRole(adminUser.uid, adminUser.email)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    Buang
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Pengurusan Data */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenAccordion(openAccordion === 'data' ? null : 'data')}
            className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
          >
            <h3 className="text-lg font-bold text-slate-900 font-display">5. Pengurusan Data</h3>
            {openAccordion === 'data' ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>
          {openAccordion === 'data' && (
            <div className="p-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-red-600 mb-4 font-display">
                Pengurusan Data (Bahaya)
              </h3>
              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                <p className="text-sm text-red-700 mb-4">
                  Padam semua data permohonan untuk memulakan sesi baharu. Tindakan ini akan memadam
                  semua rekod permohonan secara kekal.
                </p>
                {showDeleteConfirm ? (
                  <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                    <p className="text-sm font-bold text-slate-900 mb-3">
                      Adakah anda pasti? Tindakan ini tidak boleh dikembalikan.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleStartFresh}
                        disabled={isDeleting}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Sedang Memadam...' : 'Ya, Padam Semua'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 transition-colors disabled:opacity-50"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
                  >
                    Padam Semua Permohonan (Mula Semula)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
