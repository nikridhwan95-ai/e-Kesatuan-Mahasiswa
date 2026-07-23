import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { UserRole, ApplicationStatus, Application, User } from '../../types';
import {
  getApplications,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  uploadFile,
  getCategories,
  updateApplication,
  getUsers,
  getPresentationSessions,
  getUserProfile,
} from '../../services/dataService';
import { PresentationSession } from '../../types';
import ApprovalLetterModule from '../approval/ApprovalLetterModule';
import ApplicationDetail from './ApplicationDetail';
import ApplicationForm from './ApplicationForm';
import ApplicationList from './ApplicationList';
import { useNotification } from '../shared/ToastProvider';
import { useConfirm } from '../shared/ConfirmDialog';
import { isSameOrAfter } from '../../utils/dateUtils';
interface ApplicationModuleProps {
  currentUserRole: UserRole;
  applicantId: string;
}

import {
  getCurrentAcademicSession,
  getCurrentSemester,
  generateAcademicSessions,
} from '../../utils/dateUtils';

export default function ApplicationModule({
  currentUserRole,
  applicantId,
}: ApplicationModuleProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [newAppSession, setNewAppSession] = useState('');
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [showLetter, setShowLetter] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<PresentationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const isStudent = currentUserRole === 'student';
  const isReviewer = ['unit_semakan', 'unit_kertas_kerja'].includes(currentUserRole);
  const isAdmin = currentUserRole === 'admin';

  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [correctionFile, setCorrectionFile] = useState<File | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const { showNotification } = useNotification();
  const confirm = useConfirm();

  useEffect(() => {
    fetchData();
    fetchCategories();
    if (isStudent && applicantId) {
      getUserProfile(applicantId).then(setUserProfile);
    }
  }, [currentUserRole, applicantId]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [appsData, usersData, sessionsData] = await Promise.all([
        getApplications(currentUserRole, applicantId),
        getUsers(),
        getPresentationSessions(),
      ]);
      setApplications(appsData);

      const uMap: Record<string, string> = {};
      usersData.forEach((u) => {
        uMap[u.uid] = (u as any).displayName || u.name;
      });
      setUsersMap(uMap);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaper = async () => {
    if (!selectedApp) return;
    setConfirmModal({
      isOpen: true,
      message:
        'Adakah anda pasti mahu memadam kertas kerja lama? Anda perlu memuat naik kertas kerja baharu.',
      onConfirm: async () => {
        try {
          await updateApplication(selectedApp.id, { paperUrl: '' });
          setSelectedApp({ ...selectedApp, paperUrl: '' });
          showNotification('Kertas kerja lama berjaya dipadam.', 'success');
        } catch (error) {
          console.error('Error deleting paper:', error);
          showNotification('Gagal memadam kertas kerja.', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const handleSubmitCorrection = async () => {
    if (!selectedApp) return;

    if (!correctionFile && !selectedApp.paperUrl) {
      showNotification('Sila muat naik kertas kerja pembetulan.', 'error');
      return;
    }

    setLoading(true);
    try {
      let paperUrl = selectedApp.paperUrl;
      if (correctionFile) {
        const path = `applications/${applicantId}/${Date.now()}_${correctionFile.name}`;
        paperUrl = await uploadFile(path, correctionFile);
      }

      // reviewerComment TIDAK dikosongkan: ia medan kawalan penyemak
      // (trigger DB menyekat pemohon mengubahnya) dan panel catatan hanya
      // dipaparkan semasa status Perlu Pembetulan / Ditolak.
      await updateApplication(selectedApp.id, {
        paperUrl,
        status: 'Menunggu Semakan',
      });

      showNotification('Pembetulan berjaya dihantar!', 'success');
      setCorrectionFile(null);
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      console.error('Error submitting correction:', error);
      showNotification('Gagal menghantar pembetulan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await getApplications(currentUserRole, applicantId);
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = (appId: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Adakah anda pasti mahu membatalkan permohonan ini?',
      onConfirm: async () => {
        try {
          await deleteApplication(appId);
          showNotification('Permohonan berjaya dibatalkan.', 'success');
          if (selectedApp?.id === appId) {
            setSelectedApp(null);
          }
          fetchApplications();
        } catch (error) {
          console.error('Error deleting application:', error);
          showNotification('Gagal membatalkan permohonan.', 'error');
        }
        setConfirmModal(null);
      },
    });
  };

  const applyStatusUpdate = async (appId: string, status: ApplicationStatus, comment: string) => {
    try {
      await updateApplicationStatus(appId, status, comment);
      showNotification(`Status berjaya dikemas kini kepada ${status}.`, 'success');
      fetchApplications();
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, status, reviewerComment: comment });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Gagal mengemaskini status.', 'error');
    }
  };

  const handleUpdateStatus = async (appId: string, status: ApplicationStatus) => {
    if (status === 'Perlu Pembetulan' || status === 'Ditolak') {
      // Dialog textarea menggantikan prompt() asli — sebab diwajibkan.
      const reason = await confirm({
        title: status === 'Perlu Pembetulan' ? 'Minta Pembetulan' : 'Tolak Permohonan',
        message: `Status permohonan akan ditukar kepada "${status}".`,
        confirmLabel: status === 'Ditolak' ? 'Tolak' : 'Hantar',
        tone: status === 'Ditolak' ? 'danger' : 'primary',
        textarea: {
          label: status === 'Perlu Pembetulan' ? 'Pembetulan yang diperlukan' : 'Sebab penolakan',
          placeholder: 'Sila nyatakan sebab...',
        },
      });
      if (typeof reason !== 'string' || reason.length === 0) return;
      await applyStatusUpdate(appId, status, reason);
      return;
    }

    setConfirmModal({
      isOpen: true,
      message: `Adakah anda pasti mahu menukar status kepada ${status}?`,
      onConfirm: async () => {
        await applyStatusUpdate(appId, status, '');
        setConfirmModal(null);
      },
    });
  };

  const openSessions = sessions.filter((s) => s.status === 'Open');

  const [isAmendment, setIsAmendment] = useState(false);

  // Generate academic sessions based on current year
  const academicSessions = generateAcademicSessions(5);
  const currentAcademicSession = getCurrentAcademicSession();
  const currentSemester = getCurrentSemester();

  const handleEditApplication = (app: Application) => {
    setEditingApp(app);
    setNewAppSession(app.presentationSessionId || '');
    setIsAmendment(false);
    setIsFormOpen(true);
  };

  const handleAmendApplication = (app: Application) => {
    setEditingApp(app);
    setNewAppSession(app.presentationSessionId || '');
    setIsAmendment(true);
    setIsFormOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingApp(null);
    setNewAppSession('');
    setPaperFile(null);
    setIsAmendment(false);
    setIsFormOpen(false);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target as HTMLFormElement;
    // submitter boleh null (hantar programatik / Enter) — lalai hantar penuh.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const isDraft = submitter?.value === 'draf';

    if (!isDraft && isStudent) {
      const isProfileComplete =
        userProfile?.matricNumber &&
        userProfile?.phoneNumber &&
        userProfile?.faculty &&
        userProfile?.college;

      if (!isProfileComplete) {
        showNotification(
          'Sila lengkapkan profil anda (No. Matrik, No. Telefon, Fakulti, dan Kolej) sebelum menghantar permohonan.',
          'error',
        );
        setLoading(false);
        return;
      }
    }

    const formData = new FormData(form);

    const applicantPosition = formData.get('applicantPosition') as 'Pengarah' | 'Setiausaha';
    const title = formData.get('title') as string;
    const academicSession = formData.get('academicSession') as string;
    const semester = formData.get('semester') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = (formData.get('endDate') as string) || startDate;
    const venue = formData.get('venue') as string;
    const speaker = formData.get('speaker') as string;
    const budget = formData.get('budget') as string;
    const category = formData.get('category') as string;
    const organizingLevel = formData.get('organizingLevel') as string;
    const jointlyOrganizedWith = formData.get('jointlyOrganizedWith') as string;
    const softSkills = Array.from(formData.getAll('softSkills')) as string[];
    const objective = formData.get('objective') as string;

    if (endDate && startDate && !isSameOrAfter(endDate, startDate)) {
      showNotification('Tarikh tamat mesti pada atau selepas tarikh mula.', 'error');
      setLoading(false);
      return;
    }
    const budgetNum = parseFloat(budget) || 0;
    if (budgetNum < 0) {
      showNotification('Bajet tidak boleh negatif.', 'error');
      setLoading(false);
      return;
    }

    try {
      let paperUrl = editingApp?.paperUrl || '';
      if (paperFile) {
        const path = `applications/${applicantId}/${Date.now()}_${paperFile.name}`;
        paperUrl = await uploadFile(path, paperFile);
      }

      const appData = isAmendment
        ? {
            title,
            startDate,
            endDate,
            venue,
            speaker,
            jointlyOrganizedWith,
            status: 'Menunggu Semakan Pindaan',
          }
        : {
            applicantPosition,
            title,
            startDate,
            endDate,
            venue,
            speaker,
            budget: budgetNum,
            category: category.charAt(0).toUpperCase() + category.slice(1),
            organizingLevel,
            jointlyOrganizedWith,
            softSkills,
            objective,
            academicSession,
            semester,
            paperUrl: paperUrl || undefined,
            presentationSessionId: newAppSession || undefined,
            status: isDraft ? 'Draf' : 'Menunggu Semakan',
          };

      if (editingApp) {
        await updateApplication(editingApp.id, appData as any);
        showNotification(
          `Permohonan berjaya ${isDraft ? 'disimpan sebagai draf' : 'dikemas kini'}!`,
          'success',
        );
      } else {
        const newApp: Omit<Application, 'id' | 'createdAt' | 'updatedAt'> = {
          applicantId: applicantId,
          ...appData,
        } as any;
        await createApplication(newApp);
        showNotification(
          `Permohonan berjaya ${isDraft ? 'disimpan sebagai draf' : 'dihantar'}!`,
          'success',
        );
      }

      handleCancelEdit();
      await fetchApplications(); // Refresh list
    } catch (error: any) {
      console.error('Error saving application:', error);
      showNotification(`Gagal menyimpan permohonan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Paparan pelajar sudah ditapis oleh pertanyaan dataService (applicantId).
  // Carian (tajuk/ID) dan tapisan status dilakukan di sisi klien.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const displayedApps = applications.filter((app) => {
    const matchesQuery =
      normalizedQuery === '' ||
      app.title.toLowerCase().includes(normalizedQuery) ||
      app.id.toLowerCase().includes(normalizedQuery);
    const matchesStatus = filterStatus === '' || app.status === filterStatus;
    return matchesQuery && matchesStatus;
  });

  const overlays = (
    <>
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-lg font-bold text-slate-900">Pengesahan</h3>
            </div>
            <p className="text-slate-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Ya, Teruskan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (showLetter && selectedApp) {
    return (
      <div className="space-y-6">
        {overlays}
        <ApprovalLetterModule applicationId={selectedApp.id} onBack={() => setShowLetter(false)} />
      </div>
    );
  }

  if (selectedApp) {
    return (
      <div className="space-y-6">
        {overlays}
        <ApplicationDetail
          app={selectedApp}
          sessions={sessions}
          usersMap={usersMap}
          isStudent={isStudent}
          isReviewer={isReviewer}
          isAdmin={isAdmin}
          loading={loading}
          correctionFile={correctionFile}
          setCorrectionFile={setCorrectionFile}
          setSelectedApp={setSelectedApp}
          setShowLetter={setShowLetter}
          handleEditApplication={handleEditApplication}
          handleAmendApplication={handleAmendApplication}
          handleDeleteApplication={handleDeleteApplication}
          handleUpdateStatus={handleUpdateStatus}
          handleDeletePaper={handleDeletePaper}
          handleSubmitCorrection={handleSubmitCorrection}
          showNotification={showNotification}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {overlays}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-red-800">
            Gagal memuatkan data. Sila semak sambungan anda.
          </p>
          <button
            onClick={fetchData}
            className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Cuba Semula
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
            {isStudent ? 'Permohonan Saya' : 'Senarai Permohonan Pelajar'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            {isStudent
              ? 'Urus dan pantau status kertas kerja program anda.'
              : 'Pantau dan urus semua permohonan program pelajar.'}
          </p>
        </div>

        {isStudent && (
          <button
            onClick={() => {
              if (isFormOpen) {
                handleCancelEdit();
              } else {
                if (isStudent) {
                  const isProfileComplete =
                    userProfile?.matricNumber &&
                    userProfile?.phoneNumber &&
                    userProfile?.faculty &&
                    userProfile?.college;

                  if (!isProfileComplete) {
                    showNotification(
                      'Sila lengkapkan profil anda (No. Matrik, No. Telefon, Fakulti, dan Kolej) sebelum membuat permohonan.',
                      'error',
                    );
                    return;
                  }
                }
                setIsFormOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md shadow-blue-600/20"
          >
            {isFormOpen ? (
              'Batal'
            ) : (
              <>
                <Plus className="w-5 h-5" /> Mohon Baru
              </>
            )}
          </button>
        )}
      </div>

      {isFormOpen && isStudent && (
        <ApplicationForm
          isAmendment={isAmendment}
          editingApp={editingApp}
          categories={categories}
          openSessions={openSessions}
          academicSessions={academicSessions}
          currentAcademicSession={currentAcademicSession}
          currentSemester={currentSemester}
          newAppSession={newAppSession}
          setNewAppSession={setNewAppSession}
          paperFile={paperFile}
          setPaperFile={setPaperFile}
          loading={loading}
          handleSubmitApplication={handleSubmitApplication}
          showNotification={showNotification}
        />
      )}

      {!isStudent && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari permohonan, nama pelajar atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            <option value="">Semua Status</option>
            <option value="Menunggu Semakan">Menunggu Semakan</option>
            <option value="Lulus Sepenuhnya">Lulus Sepenuhnya</option>
          </select>
        </div>
      )}

      <ApplicationList
        displayedApps={displayedApps}
        usersMap={usersMap}
        isStudent={isStudent}
        setSelectedApp={setSelectedApp}
        setShowLetter={setShowLetter}
        handleEditApplication={handleEditApplication}
        handleAmendApplication={handleAmendApplication}
        handleDeleteApplication={handleDeleteApplication}
      />
    </div>
  );
}
