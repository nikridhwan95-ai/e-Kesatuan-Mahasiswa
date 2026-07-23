import React, { useState, useEffect } from 'react';
import { Save, FileText, Upload, CheckCircle, XCircle } from 'lucide-react';
import { getSetting, saveSetting, uploadFile, getFileUrl } from '../../services/dataService';

export default function LetterSettingsModule() {
  const [settings, setSettings] = useState({
    organizationName: 'Majlis Perwakilan Pelajar',
    refPrefix: 'UPM/KM/2026/',
    letterheadUrl: '',
    letterBody:
      'Sukacita dimaklumkan bahawa permohonan anda telah diluluskan.\n\nSila patuhi segala peraturan dan garis panduan yang telah ditetapkan oleh pihak universiti sepanjang program berlangsung.',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
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
    const fetchSettings = async () => {
      try {
        const data = await getSetting<Record<string, string>>('approvalLetter');
        if (data) {
          setSettings({
            organizationName: data.organizationName || 'Majlis Perwakilan Pelajar',
            refPrefix: data.refPrefix || 'UPM/KM/2026/',
            letterheadUrl: data.letterheadUrl || '',
            letterBody:
              data.letterBody ||
              'Sukacita dimaklumkan bahawa permohonan anda telah diluluskan.\n\nSila patuhi segala peraturan dan garis panduan yang telah ditetapkan oleh pihak universiti sepanjang program berlangsung.',
          });
        }
      } catch (error) {
        console.error('Error fetching letter settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalLetterheadUrl = settings.letterheadUrl;

      if (imageFile) {
        setUploadingImage(true);
        const path = `settings/letterhead_${Date.now()}_${imageFile.name}`;
        finalLetterheadUrl = await uploadFile(path, imageFile);
        setUploadingImage(false);
      }

      const newSettings = {
        ...settings,
        letterheadUrl: finalLetterheadUrl,
      };

      await saveSetting('approvalLetter', newSettings);
      setSettings(newSettings);
      setImageFile(null);
      setMessage('Tetapan surat kelulusan berjaya disimpan.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving letter settings:', error);
      setMessage('Gagal menyimpan tetapan.');
      setUploadingImage(false);
    } finally {
      setLoading(false);
    }
  };

  const LetterPreview = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={() => setShowPreview(false)}
    >
      <div
        className="bg-white rounded-none shadow-2xl max-w-[210mm] w-full p-12 my-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowPreview(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
          title="Tutup Preview"
        >
          <XCircle className="w-8 h-8" />
        </button>

        <button
          onClick={() => setShowPreview(false)}
          className="absolute -top-10 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-semibold"
        >
          Tutup Preview &times;
        </button>

        {/* Header */}
        {letterheadSrc ? (
          <div className="mb-8">
            <img src={letterheadSrc} alt="Letterhead" className="w-full object-contain" />
          </div>
        ) : (
          <div className="border-b-2 border-slate-900 pb-6 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-400">
                LOGO
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
                  {settings.organizationName}
                </h1>
                <p className="text-sm text-slate-600 font-medium">Universiti Putra Malaysia</p>
              </div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Tel: +603-8946 6000</p>
              <p>Emel: mpp@upm.edu.my</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6 text-slate-900 text-justify leading-relaxed font-serif text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold">
                Ruj. Kami: <span className="font-normal">{settings.refPrefix}APP12345</span>
              </p>
              <p className="font-bold">
                Tarikh:{' '}
                <span className="font-normal">
                  {new Date().toLocaleDateString('ms-MY', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4">
            <p className="font-bold">NAMA PELAJAR</p>
            <p>212345</p>
            <p>Pengarah Program</p>
            <p>NAMA PROGRAM CONTOH</p>
          </div>

          <div className="pt-2">
            <p>Saudara/Saudari,</p>
          </div>

          <div>
            <h3 className="font-bold uppercase underline mb-4">
              KELULUSAN PERMOHONAN MENJALANKAN AKTIVITI DAN KELULUSAN KEWANGAN
            </h3>
            <div className="whitespace-pre-wrap">{settings.letterBody}</div>
          </div>

          <div className="pt-8">
            <p>Sekian, terima kasih.</p>
            <p className="mt-8 font-bold font-display">"BERILMU BERBAKTI"</p>
            <p className="mt-12 font-bold">({settings.organizationName})</p>
            <p>Universiti Putra Malaysia</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
          <button
            onClick={() => setShowPreview(false)}
            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            Tutup Preview
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">Tetapan Surat Kelulusan</h3>
          <p className="text-sm text-slate-500">
            Urus maklumat letterhead, rujukan surat dan kandungan surat.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.includes('Gagal') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Lihat Preview Surat &rarr;
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Muat Naik Letterhead (Header Surat)
          </label>
          <div className="text-xs text-slate-500 mb-3">
            Sila muat naik imej dengan dimensi yang sesuai untuk A4 (contoh: 2480 x 350 piksel).
            Format yang disokong: JPG, PNG.
          </div>
          <div
            className={`border-2 border-dashed ${imageFile || settings.letterheadUrl ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'} rounded-2xl p-6 text-center transition-colors cursor-pointer group relative`}
            onClick={() => document.getElementById('letterhead-upload')?.click()}
          >
            <input
              id="letterhead-upload"
              type="file"
              accept="image/jpeg, image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    alert('Saiz fail melebihi 2MB');
                    return;
                  }
                  setImageFile(file);
                }
              }}
            />
            {imageFile || settings.letterheadUrl ? (
              <div className="flex flex-col items-center">
                {imageFile ? (
                  <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                ) : letterheadSrc ? (
                  <img
                    src={letterheadSrc}
                    alt="Letterhead"
                    className="h-16 object-contain mb-3 border border-slate-200 bg-white p-1"
                  />
                ) : (
                  <FileText className="w-8 h-8 text-slate-300 mb-2" />
                )}
                <p className="text-sm text-emerald-700 font-medium">
                  {imageFile ? imageFile.name : 'Letterhead sedia ada'}
                </p>
                <p className="text-xs text-emerald-500 mt-1">Klik untuk tukar fail</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm text-slate-600 font-medium">Klik untuk muat naik imej</p>
                <p className="text-xs text-slate-400 mt-1">Maksimum 2MB</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Organisasi</label>
          <input
            type="text"
            value={settings.organizationName}
            onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            placeholder="Contoh: Majlis Perwakilan Pelajar"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Awalan No. Rujukan Surat
          </label>
          <input
            type="text"
            value={settings.refPrefix}
            onChange={(e) => setSettings({ ...settings, refPrefix: e.target.value })}
            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            placeholder="Contoh: UPM/KM/2026/"
            required
          />
          <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="font-semibold">Contoh Output:</span> {settings.refPrefix}APP12345
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Kandungan Surat (Body)
          </label>
          <div className="text-xs text-slate-500 mb-2">
            Teks ini akan dipaparkan di bahagian utama surat kelulusan.
          </div>
          <textarea
            value={settings.letterBody}
            onChange={(e) => setSettings({ ...settings, letterBody: e.target.value })}
            className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            rows={6}
            required
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loading || uploadingImage ? 'Menyimpan...' : 'Simpan Tetapan'}
          </button>
        </div>
      </form>

      {showPreview && <LetterPreview />}
    </div>
  );
}
