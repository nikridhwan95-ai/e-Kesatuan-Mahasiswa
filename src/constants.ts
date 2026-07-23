// Pemalar berkongsi seluruh aplikasi — satu sumber kebenaran (sebelum ini
// SEMESTER_BUDGET/SEMESTER_ALLOCATION dan palet kategori diduplikasi dalam
// dua modul analitik dengan nilai/warna yang boleh menyimpang).

// Peruntukan kewangan Kesatuan Mahasiswa per semester (RM).
export const SEMESTER_ALLOCATION = 200000;

// Warna TETAP per kategori 8 Teras — disahkan lulus semakan buta warna
// (deutan ΔE 16.7) dengan scripts validate_palette dataviz. Warna mengikut
// kategori, BUKAN susunan kemunculan, supaya kekal konsisten walau ditapis.
export const CATEGORY_COLORS: Record<string, string> = {
  Kesukarelawanan: '#1d4ed8',
  Kepimpinan: '#d97706',
  Kebudayaan: '#991b1b',
  Sukan: '#0891b2',
  Keusahawanan: '#6d28d9',
  'Akademik & Intelektual': '#ea580c',
  Kerohanian: '#4338ca',
  'Kelestarian & Alam Sekitar': '#4d7c0f',
};

export const FALLBACK_COLOR = '#64748b'; // kategori luar 8 Teras

export const categoryColor = (name: string): string => CATEGORY_COLORS[name] ?? FALLBACK_COLOR;
