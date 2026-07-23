import React, { useEffect, useState } from 'react';
import { Download, ChevronLeft } from 'lucide-react';
import { Application, User as UserType } from '../../types';
import {
  getApplicationById,
  getUserProfile,
  getSetting,
  getFileUrl,
} from '../../services/dataService';

interface ApprovalLetterModuleProps {
  applicationId?: string;
  onBack?: () => void;
}

export default function ApprovalLetterModule({ applicationId, onBack }: ApprovalLetterModuleProps) {
  const [application, setApplication] = useState<Application | null>(null);
  const [applicant, setApplicant] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    organizationName: 'Majlis Perwakilan Pelajar',
    refPrefix: 'UPM/KM/2026/',
    letterheadUrl: '',
    letterBody:
      'Sukacita dimaklumkan bahawa permohonan anda telah diluluskan.\n\nSila patuhi segala peraturan dan garis panduan yang telah ditetapkan oleh pihak universiti sepanjang program berlangsung.',
  });
  // Baldi peribadi: imej kepala surat dipaparkan melalui URL bertandatangan.
  const [letterheadSrc, setLetterheadSrc] = useState('');

  useEffect(() => {
    if (!settings.letterheadUrl) {
      setLetterheadSrc('');
      return;
    }
    getFileUrl(settings.letterheadUrl)
      .then(setLetterheadSrc)
      .catch(() => setLetterheadSrc(''));
  }, [settings.letterheadUrl]);

  useEffect(() => {
    if (applicationId) {
      fetchData();
    }
  }, [applicationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const appData = await getApplicationById(applicationId!);
      setApplication(appData);
      if (appData?.applicantId) {
        const userData = await getUserProfile(appData.applicantId);
        setApplicant(userData);
      }

      const letterSettings = await getSetting<Record<string, string>>('approvalLetter');
      if (letterSettings) {
        setSettings(letterSettings as any);
      }
    } catch (error) {
      console.error('Error fetching data for letter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!application) {
    return <div className="p-12 text-center text-slate-500">Permohonan tidak dijumpai.</div>;
  }

  // Data for the letter
  const letterData = {
    refNumber: `${settings.refPrefix}${application.id.toUpperCase()}`,
    date: new Date().toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    studentName: (applicant as any)?.displayName || applicant?.name || application.applicantId,
    studentId: (applicant as any)?.matricNo || applicant?.matricNumber || '',
    programTitle: application.title,
    programDate: application.startDate
      ? `${new Date(application.startDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}${application.startDate !== application.endDate ? ` - ${new Date(application.endDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}`
      : (application as any).date
        ? new Date((application as any).date).toLocaleDateString('ms-MY', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-',
    programVenue: 'Universiti Putra Malaysia', // Venue should ideally be in the application model
    budget: `RM ${application.budget.toLocaleString()}`,
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-600 hover:text-slate-900 group"
              title="Kembali"
            >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight leading-none">
              Surat Kelulusan
            </h2>
            <p className="text-xs text-slate-500 mt-1">Cetakan surat rasmi program.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20 active:scale-95"
          >
            <Download className="w-4 h-4" /> <span className="text-sm">Cetak / PDF</span>
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="sm:hidden flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-900 transition-all shadow-sm active:scale-95"
            >
              Tutup
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 sm:p-12 rounded-xl sm:rounded-none shadow-sm border border-slate-200 max-w-[210mm] mx-auto min-h-[297mm] relative print:shadow-none print:border-none print:p-0 overflow-x-auto">
        <div className="min-w-[600px] sm:min-w-0">
          {/* Letterhead */}
          {letterheadSrc ? (
            <div className="mb-8">
              <img
                src={letterheadSrc}
                alt="Letterhead"
                className="w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 flex items-center justify-center">
                  <img
                    src="https://lh3.googleusercontent.com/d/1hIr52VEDw71tM5na0jvqjVK6nieJsCd6"
                    alt="Logo UPM"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                    {settings.organizationName}
                  </h1>
                  <p className="text-sm text-slate-600 font-medium">Universiti Putra Malaysia</p>
                  <p className="text-xs text-slate-500 mt-1">
                    43400 UPM Serdang, Selangor Darul Ehsan
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Tel: +603-8946 6000</p>
                <p>Emel: mpp@upm.edu.my</p>
                <p>Web: www.upm.edu.my/mpp</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-6 text-slate-900 text-justify leading-relaxed font-serif">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold">
                  Ruj. Kami: <span className="font-normal">{letterData.refNumber}</span>
                </p>
                <p className="font-bold">
                  Tarikh: <span className="font-normal">{letterData.date}</span>
                </p>
              </div>
            </div>

            <div className="pt-8">
              <p className="font-bold">{letterData.studentName}</p>
              {letterData.studentId && <p>{letterData.studentId}</p>}
              <p>Pengarah Program</p>
              <p>{letterData.programTitle}</p>
            </div>

            <div className="pt-4">
              <p>Saudara/Saudari,</p>
            </div>

            <div>
              <h3 className="font-bold uppercase underline mb-4">
                KELULUSAN PERMOHONAN MENJALANKAN AKTIVITI DAN KELULUSAN KEWANGAN
              </h3>

              {settings.letterBody.split('\n').map((paragraph, index) =>
                paragraph.trim() ? (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ) : (
                  <br key={index} />
                ),
              )}

              <div className="ml-8 mb-6 space-y-2 mt-4">
                <div className="grid grid-cols-3">
                  <span className="font-bold">Nama Program</span>
                  <span className="col-span-2">: {letterData.programTitle}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold">Tarikh</span>
                  <span className="col-span-2">: {letterData.programDate}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold">Tempat</span>
                  <span className="col-span-2">: {letterData.programVenue}</span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="font-bold">Bajet Lulus Sepenuhnya</span>
                  <span className="col-span-2">: {letterData.budget}</span>
                </div>
              </div>

              <p>Sekian, terima kasih.</p>
              <p className="font-bold mt-2">"BERILMU BERBAKTI"</p>
            </div>

            {/* Signature */}
            <div className="pt-12 mt-12">
              <p className="mb-4">Saya yang menjalankan amanah,</p>

              <div className="relative w-48 h-24 mb-2">
                {/* Digital Signature Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-400 text-xs italic">
                  [Tandatangan Digital]
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-12 left-12 right-12 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-sans print:bottom-8">
            <p>Surat ini adalah cetakan komputer dan tidak memerlukan tandatangan fizikal.</p>
            <p>
              ID Cetakan: {application.id} • Tarikh Cetakan: {new Date().toLocaleString('ms-MY')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
