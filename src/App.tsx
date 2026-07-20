/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, CheckSquare, FileBarChart, LogOut, User, Settings, Clock, LogIn, ChevronDown, ChevronUp, AlertCircle, BarChart2, Menu, X, Radar } from 'lucide-react';
import ApprovalWorkflow from './components/approval/ApprovalWorkflow';
import AnalyticsDashboard from './components/dashboard/AnalyticsDashboard';
import ApplicationModule from './components/application/ApplicationModule';
import ReportModule from './components/report/ReportModule';
import StudentProfile from './components/profile/StudentProfile';
import PresentationModule from './components/presentation/PresentationModule';
import ArchiveModule from './components/archive/ArchiveModule';
import ReviewModule from './components/review/ReviewModule';
import CategorySettings from './components/admin/CategorySettings';
import OrganizationSettings from './components/admin/OrganizationSettings';
import FacultyCollegeSettings from './components/admin/FacultyCollegeSettings';
import LetterSettingsModule from './components/settings/LetterSettingsModule';
import DataAnalyticsModule from './components/admin/DataAnalyticsModule';
import BakatProfile from './components/bakat/BakatProfile';
import TalentSearchModule from './components/bakat/TalentSearchModule';
import { Application, UserRole, User as UserType } from './types';
import { supabase, toAppUser, AppUser, usernameToEmail, PORTAL_USERNAME, PORTAL_ADMIN_EMAIL } from './supabase';
import { getUserProfile, createUserProfile, updateUserProfile, deleteAllApplications, getUsers, getUserByEmail } from './services/dataService';

type Tab = 'dashboard' | 'applications' | 'approvals' | 'reports' | 'settings' | 'profile' | 'presentations' | 'archive' | 'analytics' | 'bakat';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('student');
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [userData, setUserData] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [newRoleEmail, setNewRoleEmail] = useState('');
  const [newRoleValue, setNewRoleValue] = useState<UserRole>('advisor');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('kategori');
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Akaun portal kongsi (ekmupm) + akaun pemilik asal — kedua-duanya master admin.
  const MASTER_ADMIN_EMAILS = [PORTAL_ADMIN_EMAIL, 'nikridhwan95@gmail.com'];

  useEffect(() => {
    // Sesi tempatan semasa (jika ada), kemudian dengar perubahan auth Supabase.
    supabase.auth.getSession().then(({ data }) => {
      const appUser = toAppUser(data.session?.user);
      setUser(appUser);
      if (!appUser) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const appUser = toAppUser(session?.user);
      setUser(appUser);
      if (!appUser) {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Muat / cipta profil pengguna dalam jadual 'users' selepas log masuk.
  const loadProfile = async (currentUser: AppUser) => {
    const isMasterAdmin = MASTER_ADMIN_EMAILS.includes(currentUser.email);
    try {
      let data = await getUserProfile(currentUser.uid);

      if (!data) {
        const emailName = currentUser.email ? currentUser.email.split('@')[0].replace(/\./g, ' ').replace(/\d+/g, '').trim() : 'New User';
        const formattedName = emailName.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        const newProfile: Partial<UserType> = {
          email: currentUser.email || '',
          name: currentUser.email === PORTAL_ADMIN_EMAIL
            ? 'Urus Setia BHEP UPM'
            : currentUser.displayName || formattedName || 'New User',
          role: isMasterAdmin ? 'admin' : 'student',
          uid: currentUser.uid,
          createdAt: new Date().toISOString()
        };
        await createUserProfile(currentUser.uid, newProfile);
        data = await getUserProfile(currentUser.uid);
      }

      if (data) {
        // Paksa peranan master admin jika belum ditetapkan
        if (isMasterAdmin && data.role !== 'admin') {
          await updateUserProfile(currentUser.uid, { role: 'admin' });
          data = { ...data, role: 'admin' as UserRole };
        }
        setUserData(data);
        setCurrentUserRole(data.role);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showNotification('Gagal memuatkan profil. Pastikan supabase/schema.sql telah dijalankan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadProfile(user);
  }, [user?.uid]);

  useEffect(() => {
    if (currentUserRole === 'admin') {
      fetchUsers();
    }
  }, [currentUserRole]);

  const fetchUsers = async () => {
    try {
      const users = await getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;
    setLoggingIn(true);
    setLoginError('');

    const email = usernameToEmail(loginUsername);
    try {
      let { error } = await supabase.auth.signInWithPassword({ email, password: loginPassword });

      // Akaun portal belum wujud di Supabase? Sediakan secara automatik pada
      // log masuk pertama — hanya untuk nama pengguna portal yang sah.
      if (error && loginUsername.trim().toLowerCase() === PORTAL_USERNAME) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: loginPassword,
        });
        if (!signUpError) {
          if (signUpData.session) {
            error = null; // sesi terus aktif (pengesahan e-mel dimatikan)
          } else {
            // Pengesahan e-mel masih aktif — akaun perlu dicipta manual.
            setLoginError(
              'Akaun portal belum diaktifkan. Sila matikan "Confirm email" dalam Supabase Dashboard → Authentication → Sign In / Providers → Email, atau cipta pengguna ' + email + ' secara manual di Authentication → Users (tandakan Auto Confirm).'
            );
            setLoggingIn(false);
            return;
          }
        }
      }

      if (error) {
        setLoginError('Nama pengguna atau kata laluan salah.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError('Log masuk gagal. Sila cuba lagi.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
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
        showNotification(`Pengguna dengan e-mel ${newRoleEmail} tidak dijumpai. Pengguna perlu log masuk sekurang-kurangnya sekali sebelum peranan boleh ditetapkan.`, 'error');
      }
    } catch (error) {
      console.error("Error updating role:", error);
      showNotification('Gagal mengemaskini peranan.', 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const [userToRemove, setUserToRemove] = useState<{uid: string, email: string} | null>(null);

  const handleRemoveRole = async (uid: string, email: string) => {
    if (MASTER_ADMIN_EMAILS.includes(email)) {
      showNotification('Peranan Master Admin tidak boleh dibuang.', 'error');
      return;
    }
    setUserToRemove({uid, email});
  };

  const confirmRemoveRole = async () => {
    if (!userToRemove) return;
    try {
      await updateUserProfile(userToRemove.uid, { role: 'student' });
      setUserToRemove(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error("Error removing role:", error);
      setUserToRemove(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartFresh = async () => {
    setIsDeleting(true);
    try {
      await deleteAllApplications();
      setShowDeleteConfirm(false);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting all applications:", error);
      setIsDeleting(false);
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (user && userData) {
      try {
        await updateUserProfile(user.uid, { role: newRole });
        showNotification(`Peranan anda telah dikemas kini kepada ${newRole}.`, 'success');
        await loadProfile(user);
      } catch (error) {
        console.error("Failed to update role:", error);
        showNotification("Failed to update role. Check console for details.", 'error');
      }
    }
  };

  useEffect(() => {
    setActiveTab('dashboard');
  }, [currentUserRole]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">Portal Aktiviti Pelajar UPM</h1>
          <p className="text-slate-500 mb-2 font-medium">e-Kesatuan Mahasiswa · Radar Bakat</p>
          <p className="text-xs text-slate-400 mb-8">Pengurusan aktiviti pelajar dan kecerdasan bakat dalam satu portal bersepadu</p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Pengguna</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Nama pengguna"
                autoComplete="username"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kata Laluan</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Kata laluan"
                autoComplete="current-password"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !loginUsername || !loginPassword}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" /> {loggingIn ? 'Sedang Log Masuk...' : 'Log Masuk'}
            </button>
          </form>
        </div>
        {notification && (
          <div className={`fixed top-4 right-4 z-[100] max-w-md px-6 py-4 rounded-2xl shadow-2xl border text-sm font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notification.message}
          </div>
        )}
      </div>
    );
  }
  
  const getNavItems = () => {
    const items: { id: Tab; label: string; icon: any }[] = [
      { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard },
    ];

    switch (currentUserRole) {
      case 'student':
        items.push({ id: 'profile', label: 'Profil Saya', icon: User });
        items.push({ id: 'bakat', label: 'Profil Bakat', icon: Radar });
        items.push({ id: 'applications', label: 'Permohonan Saya', icon: FileText });
        items.push({ id: 'reports', label: 'Laporan Pascaprogram', icon: FileBarChart });
        break;
      case 'unit_semakan':
        items.push({ id: 'approvals', label: 'Semakan Kertas Kerja', icon: CheckSquare });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'unit_pembentangan':
        items.push({ id: 'presentations', label: 'Sesi Semakan KM', icon: Clock });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'unit_kertas_kerja':
        items.push({ id: 'approvals', label: 'Semakan Pindaan Kertas Kerja', icon: CheckSquare });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        items.push({ id: 'settings', label: 'Tetapan Surat', icon: Settings });
        break;
      case 'unit_pelaporan':
        items.push({ id: 'reports', label: 'Semakan Laporan', icon: FileBarChart });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'admin':
        items.push({ id: 'analytics', label: 'Analitik Data', icon: BarChart2 });
        items.push({ id: 'bakat', label: 'Radar Bakat', icon: Radar });
        items.push({ id: 'applications', label: 'Semua Permohonan', icon: FileText });
        items.push({ id: 'approvals', label: 'Pengurusan Kelulusan', icon: CheckSquare });
        items.push({ id: 'presentations', label: 'Jadual Semakan', icon: Clock });
        items.push({ id: 'reports', label: 'Arkib Laporan', icon: FileBarChart });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        items.push({ id: 'settings', label: 'Tetapan Sistem', icon: Settings });
        break;
      case 'ydp':
        items.push({ id: 'approvals', label: 'Kelulusan Eksekutif', icon: CheckSquare });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'tnc_hepa':
        items.push({ id: 'approvals', label: 'Kelulusan TNC HEPA', icon: CheckSquare });
        items.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
    }
    return items;
  };

  const navItems = getNavItems();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard currentUserRole={currentUserRole} />;
      case 'profile':
        return <StudentProfile userId={user.uid} />;
      case 'bakat':
        if (currentUserRole === 'student') {
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Profil Bakat</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Radar 16 kompetensi anda — setiap skor diterbitkan daripada bukti program yang disahkan.
                </p>
              </div>
              <BakatProfile
                studentId={user.uid}
                studentName={userData?.displayName || userData?.name || user?.displayName || undefined}
                matricNumber={userData?.matricNumber}
                faculty={userData?.faculty}
                college={userData?.college}
                showHeader
                canDispute
              />
            </div>
          );
        }
        return <TalentSearchModule />;
      case 'applications':
        return <ApplicationModule currentUserRole={currentUserRole} applicantId={user.uid} />;
      case 'approvals':
        return <ReviewModule currentUserRole={currentUserRole} />;
      case 'reports':
        return <ReportModule currentUserRole={currentUserRole} applicantId={user.uid} />;
      case 'presentations':
        return <PresentationModule currentUserRole={currentUserRole} applicantId={user.uid} />;
      case 'archive':
        return <ArchiveModule />;
      case 'analytics':
        return <DataAnalyticsModule />;
      case 'settings':
        if (currentUserRole === 'unit_kertas_kerja') {
          return (
            <div className="space-y-6">
              <LetterSettingsModule />
            </div>
          );
        }
        return currentUserRole === 'admin' ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Tetapan Sistem</h2>
              <p className="text-sm text-slate-500 mt-1">Urus peranan pengguna dan tetapan aplikasi.</p>
            </div>
            
            <div className="space-y-4">
              {/* 1. Pengurusan Kategori Program */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => setOpenAccordion(openAccordion === 'kategori' ? null : 'kategori')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                >
                  <h3 className="text-lg font-bold text-slate-900 font-display">1. Pengurusan Kategori Program</h3>
                  {openAccordion === 'kategori' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
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
                  <h3 className="text-lg font-bold text-slate-900 font-display">2. Pengurusan Fakulti & Kolej</h3>
                  {openAccordion === 'organisasi' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
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
                  <h3 className="text-lg font-bold text-slate-900 font-display">3. Tetapan Surat Kelulusan</h3>
                  {openAccordion === 'surat' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
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
                  <h3 className="text-lg font-bold text-slate-900 font-display">4. Pengurusan Peranan Pengguna</h3>
                  {openAccordion === 'peranan' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                {openAccordion === 'peranan' && (
                  <div className="p-6 border-t border-slate-100">
                    <p className="text-sm text-slate-600 mb-6">Tetapkan peranan kepada alamat e-mel pengguna di sini.</p>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4 items-end">
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat E-mel</label>
                          <input 
                            type="email" 
                            placeholder="contoh@siswa.upm.edu.my" 
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                            value={newRoleEmail}
                            onChange={(e) => setNewRoleEmail(e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Peranan</label>
                          <select 
                            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            value={newRoleValue}
                            onChange={(e) => setNewRoleValue(e.target.value as UserRole)}
                          >
                            <option value="advisor">Penasihat</option>
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
                          {allUsers.filter(u => u.role !== 'student').length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Tiada pentadbir lain ditemui.</p>
                          ) : (
                            allUsers.filter(u => u.role !== 'student').map(adminUser => (
                              <div key={adminUser.uid} className="flex justify-between items-center py-3 border-b border-slate-200 last:border-0">
                                <div>
                                  <p className="font-medium text-slate-900">{adminUser.email}</p>
                                  <p className="text-xs text-slate-500 capitalize">{adminUser.role === 'admin' ? 'System Admin' : adminUser.role.replace('_', ' ')}</p>
                                </div>
                                {!MASTER_ADMIN_EMAILS.includes(adminUser.email) && (
                                  <div className="flex items-center gap-2">
                                    {userToRemove?.uid === adminUser.uid ? (
                                      <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                        <span className="text-xs font-semibold text-red-700">Pasti?</span>
                                        <button onClick={confirmRemoveRole} className="text-xs font-bold text-white bg-red-600 px-2 py-1 rounded hover:bg-red-700">Ya</button>
                                        <button onClick={() => setUserToRemove(null)} className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded hover:bg-slate-300">Batal</button>
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
                  {openAccordion === 'data' ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                {openAccordion === 'data' && (
                  <div className="p-6 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-red-600 mb-4 font-display">Pengurusan Data (Bahaya)</h3>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <p className="text-sm text-red-700 mb-4">Padam semua data permohonan untuk memulakan sesi baharu. Tindakan ini akan memadam semua rekod permohonan secara kekal.</p>
                      {showDeleteConfirm ? (
                        <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                          <p className="text-sm font-bold text-slate-900 mb-3">Adakah anda pasti? Tindakan ini tidak boleh dikembalikan.</p>
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
        ) : (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
            <h3 className="font-bold text-lg mb-2">Akses Ditolak</h3>
            <p>Hanya System Admin yang mempunyai akses ke halaman ini.</p>
          </div>
        );
      default:
        return <AnalyticsDashboard currentUserRole={currentUserRole} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Corporate Navy */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-40 
        transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white leading-tight font-display tracking-tight">
              Portal Aktiviti<br/>
              <span className="text-amber-400 text-xs block">Pelajar UPM</span>
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">e-Kesatuan Mahasiswa · Radar Bakat</span>
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <item.icon className="w-5 h-5" /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full" />
              ) : (
                <User className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userData?.name || user?.displayName || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">
                {currentUserRole === 'admin' ? 'System Admin' : currentUserRole}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 w-full">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 hidden sm:block"></span>
              <span className="truncate max-w-[150px] sm:max-w-none">
                {activeTab === 'dashboard' && 'Papan Pemuka Utama'}
                {activeTab === 'profile' && 'Profil Pelajar'}
                {activeTab === 'bakat' && 'Modul Bakat'}
                {activeTab === 'applications' && 'Modul Permohonan'}
                {activeTab === 'approvals' && 'Modul Kelulusan'}
                {activeTab === 'reports' && 'Modul Pelaporan'}
                {activeTab === 'presentations' && 'Modul Semakan'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {user && MASTER_ADMIN_EMAILS.includes(user.email) && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xs:block">Uji:</label>
                <select 
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-1.5 sm:p-2 font-medium cursor-pointer transition-shadow hover:shadow-sm max-w-[100px] sm:max-w-none"
                  value={currentUserRole}
                  onChange={(e) => setCurrentUserRole(e.target.value as UserRole)}
                >
                  <option value="student">Pelajar</option>
                  <option value="unit_semakan">KM - Semakan</option>
                  <option value="unit_pembentangan">KM - Pembentangan</option>
                  <option value="unit_kertas_kerja">KM - Kertas Kerja</option>
                  <option value="unit_pelaporan">KM - Pelaporan</option>
                  <option value="admin">Admin</option>
                  <option value="ydp">YDP MPP</option>
                  <option value="tnc_hepa">TNC HEPA</option>
                </select>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className={activeTab === 'approvals' ? "w-full" : "max-w-6xl mx-auto"}>
            {renderContent()}
          </div>
        </div>
      </main>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckSquare className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}
