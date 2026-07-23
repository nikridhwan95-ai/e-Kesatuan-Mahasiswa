import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Upload,
  Calendar,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  DoorOpen,
  Link as LinkIcon,
  ArrowRight,
} from 'lucide-react';
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
import FileLink from '../shared/FileLink';
import { useNotification } from '../shared/ToastProvider';
import { useConfirm } from '../shared/ConfirmDialog';
import { formatTarikh, isSameOrAfter } from '../../utils/dateUtils';

interface ApplicationModuleProps {
  currentUserRole: UserRole;
  applicantId: string;
}

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Draf: {
    label: 'Draf',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <FileText className="w-3 h-3" />,
  },
  'Menunggu Semakan': {
    label: 'Menunggu Semakan',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Clock className="w-3 h-3" />,
  },
  'Perlu Pembetulan': {
    label: 'Perlu Pembetulan',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  'Menunggu Pembentangan': {
    label: 'Menunggu Pembentangan',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <Calendar className="w-3 h-3" />,
  },
  'Menunggu Kelulusan YDP': {
    label: 'Menunggu Kelulusan YDP',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  'Menunggu Kelulusan TNC HEPA': {
    label: 'Menunggu Kelulusan TNC HEPA',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: <Clock className="w-3 h-3" />,
  },
  'Lulus Sepenuhnya': {
    label: 'Lulus Sepenuhnya',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  Ditolak: {
    label: 'Ditolak',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="w-3 h-3" />,
  },
  Dibatalkan: {
    label: 'Dibatalkan',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <XCircle className="w-3 h-3" />,
  },
};

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
  const displayedApps = applications;

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
    const currentStatus = statusMap[selectedApp.status] || statusMap['Draf'];

    return (
      <div className="space-y-6">
        {overlays}
        <button
          onClick={() => setSelectedApp(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
        >
          &larr; Kembali ke Senarai
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                  {selectedApp.id}
                </span>
                {currentStatus && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 ${currentStatus.color}`}
                  >
                    {currentStatus.icon} {currentStatus.label}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                {selectedApp.title}
              </h2>
            </div>
            {isStudent && (
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                {selectedApp.status === 'Perlu Pembetulan' && (
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors">
                    <Upload className="w-4 h-4" /> Muat Naik
                  </button>
                )}
                {(selectedApp.status === 'Draf' || selectedApp.status === 'Menunggu Semakan') && (
                  <>
                    <button
                      onClick={() => {
                        handleEditApplication(selectedApp);
                        setSelectedApp(null);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteApplication(selectedApp.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Batal
                    </button>
                  </>
                )}
              </div>
            )}
            {(isReviewer || isAdmin) && selectedApp.status === 'Menunggu Semakan' && (
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'Ditolak')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Tolak
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'Perlu Pembetulan')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> Pembetulan
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'Menunggu Pembentangan')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <CheckCircle className="w-4 h-4" /> Sokong
                </button>
              </div>
            )}
            {selectedApp.status === 'Lulus Sepenuhnya' && (
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                {isStudent && (
                  <button
                    onClick={() => {
                      handleAmendApplication(selectedApp);
                      setSelectedApp(null);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Pinda
                  </button>
                )}
                <button
                  onClick={() => setShowLetter(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
                >
                  <FileText className="w-4 h-4" /> Surat
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="md:col-span-2 space-y-6 sm:space-y-8">
              <section>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Maklumat Program
                </h3>

                {(selectedApp.status === 'Perlu Pembetulan' ||
                  selectedApp.status === 'Ditolak') && (
                  <div
                    className={`mb-6 ${selectedApp.status === 'Ditolak' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300`}
                  >
                    <h4
                      className={`text-sm font-bold ${selectedApp.status === 'Ditolak' ? 'text-red-900' : 'text-amber-900'} mb-1 flex items-center gap-2`}
                    >
                      {selectedApp.status === 'Ditolak' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      Catatan Kesatuan Mahasiswa:
                    </h4>
                    <p
                      className={`text-sm ${selectedApp.status === 'Ditolak' ? 'text-red-800' : 'text-amber-800'}`}
                    >
                      {selectedApp.reviewerComment || 'Tiada catatan disediakan.'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Jawatan Pemohon
                    </p>
                    <p className="text-slate-900 font-medium">
                      {selectedApp.applicantPosition || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Kategori
                    </p>
                    <p className="text-slate-900 font-medium">{selectedApp.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Peringkat Penganjuran
                    </p>
                    <p className="text-slate-900 font-medium">
                      {selectedApp.organizingLevel || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Tarikh Program
                    </p>
                    <p className="text-slate-900 font-medium flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatTarikh(selectedApp.startDate)}
                      {selectedApp.startDate &&
                        selectedApp.endDate &&
                        selectedApp.startDate !== selectedApp.endDate &&
                        ` - ${formatTarikh(selectedApp.endDate)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Tempat
                    </p>
                    <p className="text-slate-900 font-medium">{selectedApp.venue || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Penceramah
                    </p>
                    <p className="text-slate-900 font-medium">{selectedApp.speaker || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Bajet Dimohon
                    </p>
                    <p className="text-slate-900 font-medium flex items-center gap-1.5">
                      RM {selectedApp.budget.toLocaleString()}
                    </p>
                  </div>
                  {selectedApp.jointlyOrganizedWith && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Anjuran Bersama
                      </p>
                      <p className="text-slate-900 font-medium">
                        {selectedApp.jointlyOrganizedWith}
                      </p>
                    </div>
                  )}
                  {!isStudent && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Pemohon
                      </p>
                      <p className="text-slate-900 font-medium">
                        {usersMap[selectedApp.applicantId] || 'Tiada Rekod'}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Objektif Utama
                </h3>
                <p className="text-slate-700 leading-relaxed">{selectedApp.objective}</p>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Impak Program (Kemahiran Insaniah)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.softSkills && selectedApp.softSkills.length > 0 ? (
                    selectedApp.softSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      Tiada kemahiran insaniah dipilih.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                  Dokumen Sokongan
                </h3>

                {selectedApp.paperUrl ? (
                  <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        Kertas_Kerja_Program.pdf
                      </p>
                      <p className="text-xs text-slate-500">Dokumen PDF</p>
                    </div>
                    <FileLink
                      stored={selectedApp.paperUrl}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold mr-2"
                    >
                      Muat Turun
                    </FileLink>

                    {isStudent && selectedApp.status === 'Perlu Pembetulan' && (
                      <button
                        onClick={handleDeletePaper}
                        className="text-red-600 hover:text-red-800 text-sm font-semibold flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Padam
                      </button>
                    )}
                  </div>
                ) : isStudent && selectedApp.status === 'Perlu Pembetulan' ? (
                  <div
                    className={`border-2 border-dashed ${correctionFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'} rounded-2xl p-8 text-center transition-colors cursor-pointer group`}
                    onClick={() => document.getElementById('correction-upload')?.click()}
                  >
                    <input
                      id="correction-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showNotification('Saiz fail melebihi 5MB', 'error');
                            return;
                          }
                          setCorrectionFile(file);
                        }
                      }}
                    />
                    {correctionFile ? (
                      <div className="animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                        <p className="text-sm text-emerald-700 font-bold">{correctionFile.name}</p>
                        <p className="text-xs text-emerald-500 mt-1">
                          {(correctionFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-xs text-emerald-600 mt-2 font-medium">
                          Klik untuk tukar fail
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                        <p className="text-sm text-slate-600 font-medium">
                          Muat Naik Kertas Kerja Baharu
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PDF, Maksimum 5MB</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Tiada dokumen dilampirkan.</p>
                )}

                {isStudent && selectedApp.status === 'Perlu Pembetulan' && (
                  <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSubmitCorrection}
                      disabled={(!selectedApp.paperUrl && !correctionFile) || loading}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Hantar Pembetulan
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Jejak Status
                </h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
                  {/* Timeline Item 1: Dihantar */}
                  <div className="relative flex items-start gap-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-blue-600 text-white shadow shrink-0 z-10 mt-1">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 text-sm">Dihantar</div>
                        <time className="font-mono text-xs text-slate-500">
                          {formatTarikh(selectedApp.createdAt)}
                        </time>
                      </div>
                      <div className="text-slate-500 text-xs">
                        Permohonan dihantar oleh pemohon.
                      </div>
                    </div>
                  </div>

                  {/* Timeline Item 2: Semakan KM / Semakan */}
                  {[
                    'Menunggu Pembentangan',
                    'Menunggu Kelulusan YDP',
                    'Menunggu Kelulusan TNC HEPA',
                    'Lulus Sepenuhnya',
                  ].includes(selectedApp.status) && (
                    <div className="relative flex items-start gap-4">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${['Menunggu Kelulusan YDP', 'Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(selectedApp.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
                      >
                        {[
                          'Menunggu Kelulusan YDP',
                          'Menunggu Kelulusan TNC HEPA',
                          'Lulus Sepenuhnya',
                        ].includes(selectedApp.status) ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </div>
                      <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900 text-sm">Sesi Semakan KM</div>
                          {[
                            'Menunggu Kelulusan YDP',
                            'Menunggu Kelulusan TNC HEPA',
                            'Lulus Sepenuhnya',
                          ].includes(selectedApp.status) &&
                            selectedApp.presentationDate && (
                              <time className="font-mono text-xs text-slate-500">
                                {formatTarikh(selectedApp.presentationDate)}
                              </time>
                            )}
                        </div>
                        <div className="text-slate-500 text-xs mb-3">
                          {[
                            'Menunggu Kelulusan YDP',
                            'Menunggu Kelulusan TNC HEPA',
                            'Lulus Sepenuhnya',
                          ].includes(selectedApp.status)
                            ? 'Semakan selesai dan disokong oleh KM.'
                            : 'Menunggu sesi semakan bersama KM.'}
                        </div>

                        {selectedApp.status === 'Menunggu Pembentangan' && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Jadual Semakan Rasmi
                              </p>
                            </div>

                            {selectedApp.presentationDate ? (
                              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                        <Calendar className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                          Tarikh
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {new Date(
                                            selectedApp.presentationDate,
                                          ).toLocaleDateString('ms-MY', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                          })}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                        <Clock className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                          Masa
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {sessions.find(
                                            (s) => s.id === selectedApp.presentationSessionId,
                                          )?.time || 'Akan dimaklumkan'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                        <DoorOpen className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                          Bilik / Lokasi
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900">
                                          {selectedApp.presentationRoom
                                            ? `Bilik ${selectedApp.presentationRoom}`
                                            : 'Akan dimaklumkan'}
                                        </p>
                                      </div>
                                    </div>

                                    {sessions.find(
                                      (s) => s.id === selectedApp.presentationSessionId,
                                    )?.link && (
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                          <LinkIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                            Pautan Maya
                                          </p>
                                          <a
                                            href={
                                              sessions.find(
                                                (s) => s.id === selectedApp.presentationSessionId,
                                              )?.link
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
                                          >
                                            Sertai Sesi
                                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-blue-600 p-2 text-center">
                                  <p className="text-[10px] text-white font-medium uppercase tracking-widest">
                                    Sila hadir 10 minit lebih awal
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                                <Clock className="w-5 h-5 opacity-50" />
                                <p className="text-xs font-medium">
                                  Jadual semakan sedang dikemas kini oleh Unit Pembentangan. Sila
                                  semak semula sebentar lagi.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline Item 3: Kelulusan YDP */}
                  {[
                    'Menunggu Kelulusan YDP',
                    'Menunggu Kelulusan TNC HEPA',
                    'Lulus Sepenuhnya',
                  ].includes(selectedApp.status) && (
                    <div className="relative flex items-start gap-4">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(selectedApp.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
                      >
                        {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(
                          selectedApp.status,
                        ) ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </div>
                      <div
                        className={`flex-1 p-4 rounded-xl border ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(selectedApp.status) ? 'border-blue-100 bg-blue-50' : 'border-slate-200 bg-white'} shadow-sm`}
                      >
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div
                            className={`font-bold text-sm ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(selectedApp.status) ? 'text-blue-900' : 'text-slate-900'}`}
                          >
                            Kelulusan YDP MPP
                          </div>
                          {/* Tiada cap masa per-langkah dalam model — tiada tarikh dipapar. */}
                        </div>
                        <div
                          className={`text-xs ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(selectedApp.status) ? 'text-blue-700' : 'text-slate-500'}`}
                        >
                          {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(
                            selectedApp.status,
                          )
                            ? 'Disokong oleh YDP MPP.'
                            : 'Menunggu sokongan YDP MPP.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline Item 4: Kelulusan TNC HEPA */}
                  {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(
                    selectedApp.status,
                  ) && (
                    <div className="relative flex items-start gap-4">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${selectedApp.status === 'Lulus Sepenuhnya' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
                      >
                        {selectedApp.status === 'Lulus Sepenuhnya' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </div>
                      <div
                        className={`flex-1 p-4 rounded-xl border ${selectedApp.status === 'Lulus Sepenuhnya' ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white'} shadow-sm`}
                      >
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div
                            className={`font-bold text-sm ${selectedApp.status === 'Lulus Sepenuhnya' ? 'text-emerald-900' : 'text-slate-900'}`}
                          >
                            Kelulusan Akhir (TNC HEPA)
                          </div>
                          {selectedApp.status === 'Lulus Sepenuhnya' && (
                            <time className="font-mono text-xs text-emerald-600">
                              {formatTarikh(selectedApp.updatedAt)}
                            </time>
                          )}
                        </div>
                        <div
                          className={`text-xs ${selectedApp.status === 'Lulus Sepenuhnya' ? 'text-emerald-700' : 'text-slate-500'}`}
                        >
                          {selectedApp.status === 'Lulus Sepenuhnya'
                            ? 'Permohonan diluluskan sepenuhnya.'
                            : 'Menunggu kelulusan TNC HEPA.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              {isAmendment
                ? 'Pinda Program'
                : editingApp
                  ? 'Kemas Kini Permohonan'
                  : 'Borang Permohonan Baru'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Sila lengkapkan maklumat dan muat naik kertas kerja.
            </p>
          </div>

          {openSessions.length === 0 && (
            <div className="mx-8 mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Tiada Sesi Semakan Dibuka</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Buat masa sekarang, tiada sesi semakan yang dibuka oleh Kesatuan Mahasiswa. Anda
                  masih boleh menghantar permohonan, tetapi ia akan diletakkan dalam senarai
                  menunggu sehingga sesi baharu dibuka.
                </p>
              </div>
            </div>
          )}

          <form className="p-4 sm:p-8 space-y-4 sm:space-y-6" onSubmit={handleSubmitApplication}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Jawatan Pemohon (Deklarasi)
                </label>
                <select
                  name="applicantPosition"
                  defaultValue={editingApp?.applicantPosition}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                >
                  <option value="">Pilih Jawatan...</option>
                  <option value="Pengarah">Pengarah Program</option>
                  <option value="Setiausaha">Setiausaha Program</option>
                </select>
                <p className="text-xs text-slate-500 mt-1 italic">
                  *Hanya Pengarah atau Setiausaha Program sahaja yang dibenarkan untuk menghantar
                  permohonan.
                </p>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tajuk Program
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingApp?.title}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Contoh: Karnival Sukan..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sesi Akademik
                </label>
                <select
                  name="academicSession"
                  defaultValue={editingApp?.academicSession || currentAcademicSession}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={isAmendment}
                >
                  <option value="">Pilih Sesi Akademik...</option>
                  {academicSessions.map((session) => (
                    <option key={session} value={session}>
                      {session}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Semester</label>
                <select
                  name="semester"
                  defaultValue={editingApp?.semester || currentSemester}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={isAmendment}
                >
                  <option value="">Pilih Semester...</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tarikh Mula
                </label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={editingApp?.startDate}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tarikh Tamat
                </label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={editingApp?.endDate}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Biarkan kosong untuk program satu hari.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Anjuran Bersama
                </label>
                <input
                  type="text"
                  name="jointlyOrganizedWith"
                  defaultValue={editingApp?.jointlyOrganizedWith}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Contoh: Kelab Debat (Jika ada)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tempat Program
                </label>
                <input
                  type="text"
                  name="venue"
                  defaultValue={editingApp?.venue}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Contoh: Dewan Besar UPM"
                  required
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Penceramah / Tetamu Jemputan
                </label>
                <input
                  type="text"
                  name="speaker"
                  defaultValue={editingApp?.speaker}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="Contoh: Dr. Ahmad (Jika ada)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Bajet Dimohon (RM)
                </label>
                <input
                  type="number"
                  name="budget"
                  min={0}
                  step="0.01"
                  defaultValue={editingApp?.budget}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="0.00"
                  required
                  disabled={isAmendment}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Peringkat Penganjuran
                </label>
                <select
                  name="organizingLevel"
                  defaultValue={editingApp?.organizingLevel}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={isAmendment}
                >
                  <option value="">Pilih Peringkat...</option>
                  <option value="Antarabangsa">Antarabangsa</option>
                  <option value="Kebangsaan">Kebangsaan</option>
                  <option value="Negeri">Negeri</option>
                  <option value="Universiti">Universiti</option>
                  <option value="Kolej atau Fakulti">Kolej atau Fakulti</option>
                </select>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori</label>
                <select
                  name="category"
                  defaultValue={editingApp?.category?.toLowerCase()}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  required
                  disabled={isAmendment}
                >
                  <option value="">Pilih Kategori...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sesi Semakan (Pilihan)
                </label>
                <select
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                  value={newAppSession}
                  onChange={(e) => setNewAppSession(e.target.value)}
                  disabled={openSessions.length === 0 || isAmendment}
                >
                  <option value="">
                    {openSessions.length === 0 ? 'Tiada Sesi Dibuka' : 'Pilih Sesi Semakan...'}
                  </option>
                  {openSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name} ({session.date} {session.time})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Sila pilih sesi semakan yang dibuka oleh Kesatuan Mahasiswa.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Impak Program (Kemahiran Insaniah)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {[
                  'Kemahiran Berkomunikasi',
                  'Pemikiran Kritis dan Kemahiran Penyelesaian Masalah',
                  'Kemahiran Kerja Berpasukan',
                  'Pembelajaran Berterusan dan Pengurusan Maklumat',
                  'Kemahiran Keusahawanan',
                  'Etika dan Moral Profesional',
                  'Kemahiran Kepimpinan',
                ].map((skill) => (
                  <label key={skill} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="softSkills"
                      value={skill}
                      defaultChecked={editingApp?.softSkills?.includes(skill)}
                      disabled={isAmendment}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                      {skill}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 italic">
                *Sila tandakan kemahiran insaniah yang berkaitan dengan program ini.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Objektif Utama
              </label>
              <textarea
                name="objective"
                defaultValue={editingApp?.objective}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                rows={3}
                placeholder="Nyatakan objektif program..."
                required
                disabled={isAmendment}
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Muat Naik Kertas Kerja (PDF)
              </label>
              <div
                className={`border-2 border-dashed ${paperFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'} rounded-2xl p-10 text-center transition-colors ${isAmendment ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} group relative`}
                onClick={() => !isAmendment && document.getElementById('paper-upload')?.click()}
              >
                <input
                  id="paper-upload"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  disabled={isAmendment}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        showNotification('Saiz fail melebihi 5MB.', 'error');
                        return;
                      }
                      setPaperFile(file);
                    }
                  }}
                />
                {paperFile || editingApp?.paperUrl ? (
                  <>
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm text-emerald-700 font-medium">
                      {paperFile ? paperFile.name : 'Fail sedia ada'}
                    </p>
                    {paperFile && (
                      <p className="text-xs text-emerald-500 mt-1">
                        {(paperFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                    {!paperFile && editingApp?.paperUrl && (
                      <p className="text-xs text-emerald-500 mt-1">Klik untuk tukar fail</p>
                    )}
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                    <p className="text-sm text-slate-600 font-medium">
                      Klik untuk muat naik fail PDF
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Maksimum 5MB</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
              {!isAmendment && (
                <button
                  type="submit"
                  name="action"
                  value="draf"
                  disabled={loading}
                  className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Simpan sebagai Draf
                </button>
              )}
              <button
                type="submit"
                name="action"
                value="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Menghantar...
                  </>
                ) : isAmendment ? (
                  'Hantar Pindaan'
                ) : editingApp ? (
                  'Kemas Kini Permohonan'
                ) : (
                  'Hantar Permohonan'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isStudent && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari permohonan, nama pelajar atau ID..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          <select className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium">
            <option value="">Semua Status</option>
            <option value="pending">Menunggu Semakan</option>
            <option value="approved">Lulus Sepenuhnya</option>
          </select>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {displayedApps.map((app) => (
            <div key={app.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors">
              <div
                className="flex justify-between items-start gap-3"
                onClick={() => setSelectedApp(app)}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{app.title}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                    ID: {app.id}
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                    app.status === 'Lulus Sepenuhnya'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : app.status === 'Menunggu Semakan'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {app.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs" onClick={() => setSelectedApp(app)}>
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{formatTarikh(app.startDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <span className="text-slate-400 font-medium">Bajet:</span>
                  RM {app.budget.toLocaleString()}
                </div>
              </div>

              {!isStudent && (
                <div
                  className="flex items-center gap-2 pt-2 border-t border-slate-100"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {(usersMap[app.applicantId] || 'T').charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-slate-600 truncate">
                    {usersMap[app.applicantId] || 'Tiada Rekod'}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                {(app.status === 'Draf' || app.status === 'Menunggu Semakan') && isStudent && (
                  <>
                    <button
                      onClick={() => handleEditApplication(app)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteApplication(app.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Batal"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                {app.status === 'Lulus Sepenuhnya' && (
                  <>
                    {isStudent && (
                      <button
                        onClick={() => handleAmendApplication(app)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Pinda"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedApp(app);
                        setShowLetter(true);
                      }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Surat"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedApp(app)}
                  className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg"
                >
                  Lihat Butiran
                </button>
              </div>
            </div>
          ))}
          {displayedApps.length === 0 && (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tiada permohonan dijumpai.
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">ID / Tajuk Program</th>
                {!isStudent && <th className="px-6 py-4 font-semibold">Pemohon</th>}
                <th className="px-6 py-4 font-semibold">Tarikh Program</th>
                <th className="px-6 py-4 font-semibold">Bajet</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{app.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5" title={app.id}>
                      ID: {app.id}
                    </div>
                  </td>
                  {!isStudent && (
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">
                        {usersMap[app.applicantId] || 'Tiada Rekod'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatTarikh(app.startDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      RM {app.budget.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        app.status === 'Lulus Sepenuhnya'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : app.status === 'Menunggu Semakan'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {(app.status === 'Draf' || app.status === 'Menunggu Semakan') &&
                        isStudent && (
                          <>
                            <button
                              onClick={() => handleEditApplication(app)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                              title="Kemas Kini Permohonan"
                            >
                              <FileText className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteApplication(app.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                              title="Batal Permohonan"
                            >
                              <XCircle className="w-4 h-4" /> Batal
                            </button>
                          </>
                        )}
                      {app.status === 'Lulus Sepenuhnya' && (
                        <>
                          {isStudent && (
                            <button
                              onClick={() => handleAmendApplication(app)}
                              className="text-amber-600 hover:text-amber-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                              title="Pinda Program"
                            >
                              <FileText className="w-4 h-4" /> Pinda
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowLetter(true);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                            title="Muat Turun Surat Kelulusan"
                          >
                            <FileText className="w-4 h-4" /> Surat
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Lihat
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedApps.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Tiada permohonan dijumpai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
