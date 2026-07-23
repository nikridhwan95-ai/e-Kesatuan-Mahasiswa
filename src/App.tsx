/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  FileBarChart,
  LogOut,
  User,
  Settings,
  Clock,
  LogIn,
  BarChart2,
  Menu,
  X,
  Radar,
  FileSpreadsheet,
} from 'lucide-react';
import { UserRole, User as UserType } from './types';
import { supabase, toAppUser, AppUser, usernameToEmail, PORTAL_ADMIN_EMAIL } from './supabase';
import { useNotification } from './components/shared/ToastProvider';
import { getUserProfile, createUserProfile } from './services/dataService';

// Modul tab dimuat malas (React.lazy) — pengguna hanya memuat turun kod
// untuk skrin yang dibuka; recharts/xlsx tidak lagi berada dalam bundle awal.
const AnalyticsDashboard = lazy(() => import('./components/dashboard/AnalyticsDashboard'));
const ApplicationModule = lazy(() => import('./components/application/ApplicationModule'));
const ReportModule = lazy(() => import('./components/report/ReportModule'));
const StudentProfile = lazy(() => import('./components/profile/StudentProfile'));
const PresentationModule = lazy(() => import('./components/presentation/PresentationModule'));
const ArchiveModule = lazy(() => import('./components/archive/ArchiveModule'));
const ReviewModule = lazy(() => import('./components/review/ReviewModule'));
const LetterSettingsModule = lazy(() => import('./components/settings/LetterSettingsModule'));
const SystemSettings = lazy(() => import('./components/settings/SystemSettings'));
const DataAnalyticsModule = lazy(() => import('./components/admin/DataAnalyticsModule'));
const BakatProfile = lazy(() => import('./components/bakat/BakatProfile'));
const TalentSearchModule = lazy(() => import('./components/bakat/TalentSearchModule'));
const StudentDirectoryModule = lazy(() => import('./components/bakat/StudentDirectoryModule'));
const ExcelImportModule = lazy(() => import('./components/import/ExcelImportModule'));

type Tab =
  | 'dashboard'
  | 'applications'
  | 'approvals'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'presentations'
  | 'archive'
  | 'analytics'
  | 'bakat'
  | 'students'
  | 'import';

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

  const { showNotification } = useNotification();

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
  // Peranan datang HANYA daripada baris users dalam DB (dibenih oleh
  // supabase/schema.sql untuk akaun portal) — TIADA paksaan peranan
  // berasaskan e-mel di sisi klien.
  const loadProfile = useCallback(
    async (currentUser: AppUser) => {
      try {
        let data = await getUserProfile(currentUser.uid);

        if (!data) {
          const emailName = currentUser.email
            ? currentUser.email.split('@')[0].replace(/\./g, ' ').replace(/\d+/g, '').trim()
            : 'New User';
          const formattedName = emailName
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          const newProfile: Partial<UserType> = {
            email: currentUser.email || '',
            name:
              currentUser.email === PORTAL_ADMIN_EMAIL
                ? 'Urus Setia BHEP UPM'
                : currentUser.displayName || formattedName || 'New User',
            role: 'student',
            uid: currentUser.uid,
            createdAt: new Date().toISOString(),
          };
          await createUserProfile(currentUser.uid, newProfile);
          data = await getUserProfile(currentUser.uid);
        }

        if (data) {
          setUserData(data);
          setCurrentUserRole(data.role);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        showNotification(
          'Gagal memuatkan profil. Pastikan supabase/schema.sql telah dijalankan.',
          'error',
        );
      } finally {
        setLoading(false);
      }
    },
    [showNotification],
  );

  useEffect(() => {
    if (user) loadProfile(user);
  }, [user, loadProfile]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) return;
    setLoggingIn(true);
    setLoginError('');

    const email = usernameToEmail(loginUsername);
    try {
      // Pendaftaran awam dimatikan dalam Supabase Dashboard; akaun portal
      // dicipta secara manual oleh pemilik (lihat README). Tiada signUp
      // automatik di sini — ia membuka pintu pengambilalihan akaun.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

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
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    setActiveTab('dashboard');
  }, [currentUserRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display">
            Portal Aktiviti Pelajar UPM
          </h1>
          <p className="text-slate-500 mb-2 font-medium">e-Kesatuan Mahasiswa · Radar Bakat</p>
          <p className="text-xs text-slate-400 mb-8">
            Pengurusan aktiviti pelajar dan kecerdasan bakat dalam satu portal bersepadu
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nama Pengguna
              </label>
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
      </div>
    );
  }

  // Navigasi disusun dalam TIGA kumpulan utama:
  // 1. e-Kesatuan Mahasiswa  2. Portal Bakat  3. Tetapan Sistem
  type NavItem = { id: Tab; label: string; icon: any };
  type NavGroup = { label: string; accent: 'blue' | 'indigo'; items: NavItem[] };

  const getNavGroups = (): NavGroup[] => {
    const eKesatuan: NavItem[] = [
      { id: 'dashboard', label: 'Papan Pemuka', icon: LayoutDashboard },
    ];
    const bakat: NavItem[] = [];
    const tetapan: NavItem[] = [];

    switch (currentUserRole) {
      case 'student':
        eKesatuan.push({ id: 'profile', label: 'Profil Saya', icon: User });
        eKesatuan.push({ id: 'applications', label: 'Permohonan Saya', icon: FileText });
        eKesatuan.push({ id: 'reports', label: 'Laporan Pascaprogram', icon: FileBarChart });
        bakat.push({ id: 'bakat', label: 'Profil Bakat', icon: Radar });
        break;
      case 'unit_semakan':
        eKesatuan.push({ id: 'approvals', label: 'Semakan Kertas Kerja', icon: CheckSquare });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'unit_pembentangan':
        eKesatuan.push({ id: 'presentations', label: 'Sesi Semakan KM', icon: Clock });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'unit_kertas_kerja':
        eKesatuan.push({
          id: 'approvals',
          label: 'Semakan Pindaan Kertas Kerja',
          icon: CheckSquare,
        });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        tetapan.push({ id: 'settings', label: 'Tetapan Surat', icon: Settings });
        break;
      case 'unit_pelaporan':
        eKesatuan.push({ id: 'reports', label: 'Semakan Laporan', icon: FileBarChart });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'admin':
        eKesatuan.push({ id: 'analytics', label: 'Analitik Data', icon: BarChart2 });
        eKesatuan.push({ id: 'applications', label: 'Semua Permohonan', icon: FileText });
        eKesatuan.push({ id: 'approvals', label: 'Pengurusan Kelulusan', icon: CheckSquare });
        eKesatuan.push({ id: 'presentations', label: 'Jadual Semakan', icon: Clock });
        eKesatuan.push({ id: 'reports', label: 'Arkib Laporan', icon: FileBarChart });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        bakat.push({ id: 'bakat', label: 'Radar Bakat', icon: Radar });
        bakat.push({ id: 'students', label: 'Profil Pelajar', icon: User });
        tetapan.push({ id: 'import', label: 'Import Data (Excel)', icon: FileSpreadsheet });
        tetapan.push({ id: 'settings', label: 'Tetapan Sistem', icon: Settings });
        break;
      case 'ydp':
        eKesatuan.push({ id: 'approvals', label: 'Kelulusan Eksekutif', icon: CheckSquare });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
      case 'tnc_hepa':
        eKesatuan.push({ id: 'approvals', label: 'Kelulusan TNC HEPA', icon: CheckSquare });
        eKesatuan.push({ id: 'archive', label: 'Kertas Kerja yang Diluluskan', icon: FileText });
        break;
    }

    const groups: NavGroup[] = [
      { label: 'e-Kesatuan Mahasiswa', accent: 'blue', items: eKesatuan },
      { label: 'Portal Bakat', accent: 'indigo', items: bakat },
      { label: 'Tetapan Sistem', accent: 'blue', items: tetapan },
    ];
    return groups.filter((g) => g.items.length > 0);
  };

  const navGroups = getNavGroups();

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
                <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
                  Profil Bakat
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Bakat anda yang terbukti — setiap skor diterbitkan daripada bukti program yang
                  disahkan.
                </p>
              </div>
              <BakatProfile
                studentId={user.uid}
                studentName={
                  userData?.displayName || userData?.name || user?.displayName || undefined
                }
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
      case 'students':
        return currentUserRole === 'admin' ? (
          <StudentDirectoryModule />
        ) : (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
            <h3 className="font-bold text-lg mb-2">Akses Ditolak</h3>
            <p>Hanya System Admin yang mempunyai akses ke halaman ini.</p>
          </div>
        );
      case 'import':
        return currentUserRole === 'admin' ? (
          <ExcelImportModule />
        ) : (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center">
            <h3 className="font-bold text-lg mb-2">Akses Ditolak</h3>
            <p>Hanya System Admin yang mempunyai akses ke halaman ini.</p>
          </div>
        );
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
          <SystemSettings currentUser={user} />
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
      <aside
        className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-40 
        transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white leading-tight font-display tracking-tight">
              Portal Aktiviti
              <br />
              <span className="text-amber-400 text-xs block">Pelajar UPM</span>
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">
                e-Kesatuan Mahasiswa · Radar Bakat
              </span>
            </h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 ${
                      activeTab === item.id
                        ? group.accent === 'indigo'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" /> {item.label}
                  </button>
                ))}
              </div>
            </div>
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
                {activeTab === 'import' && 'Import Data'}
                {activeTab === 'students' && 'Profil Pelajar'}
                {activeTab === 'analytics' && 'Analitik Data'}
                {activeTab === 'archive' && 'Arkib Kertas Kerja'}
                {activeTab === 'settings' && 'Tetapan'}
                {activeTab === 'applications' && 'Modul Permohonan'}
                {activeTab === 'approvals' && 'Modul Kelulusan'}
                {activeTab === 'reports' && 'Modul Pelaporan'}
                {activeTab === 'presentations' && 'Modul Semakan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {userData?.role === 'admin' && (
              <div className="flex items-center gap-2">
                <label className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xs:block">
                  Uji:
                </label>
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
          <div className={activeTab === 'approvals' ? 'w-full' : 'max-w-6xl mx-auto'}>
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                  <p className="text-sm font-medium">Memuatkan modul...</p>
                </div>
              }
            >
              {renderContent()}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
