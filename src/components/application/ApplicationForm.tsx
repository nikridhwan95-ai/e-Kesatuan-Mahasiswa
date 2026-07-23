// Borang permohonan — cipta permohonan baharu, kemas kini draf atau hantar
// pindaan program yang diluluskan. Keadaan borang dan logik penghantaran
// kekal dalam ApplicationModule (orkestrator).
import React from 'react';
import { AlertTriangle, CheckCircle, Clock, FileText, Upload } from 'lucide-react';
import { Application, PresentationSession } from '../../types';

interface ApplicationFormProps {
  isAmendment: boolean;
  editingApp: Application | null;
  categories: string[];
  openSessions: PresentationSession[];
  academicSessions: string[];
  currentAcademicSession: string;
  currentSemester: string;
  newAppSession: string;
  setNewAppSession: (sessionId: string) => void;
  paperFile: File | null;
  setPaperFile: (file: File | null) => void;
  loading: boolean;
  handleSubmitApplication: (e: React.FormEvent) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export default function ApplicationForm({
  isAmendment,
  editingApp,
  categories,
  openSessions,
  academicSessions,
  currentAcademicSession,
  currentSemester,
  newAppSession,
  setNewAppSession,
  paperFile,
  setPaperFile,
  loading,
  handleSubmitApplication,
  showNotification,
}: ApplicationFormProps) {
  return (
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
              Buat masa sekarang, tiada sesi semakan yang dibuka oleh Kesatuan Mahasiswa. Anda masih
              boleh menghantar permohonan, tetapi ia akan diletakkan dalam senarai menunggu sehingga
              sesi baharu dibuka.
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tajuk Program</label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sesi Akademik</label>
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tarikh Mula</label>
            <input
              type="date"
              name="startDate"
              defaultValue={editingApp?.startDate}
              className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tarikh Tamat</label>
            <input
              type="date"
              name="endDate"
              defaultValue={editingApp?.endDate}
              className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
            <p className="text-xs text-slate-400 mt-1">Biarkan kosong untuk program satu hari.</p>
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
          <label className="block text-sm font-semibold text-slate-700 mb-2">Objektif Utama</label>
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
                <p className="text-sm text-slate-600 font-medium">Klik untuk muat naik fail PDF</p>
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
  );
}
