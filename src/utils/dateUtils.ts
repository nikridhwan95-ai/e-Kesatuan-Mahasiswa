// Huraikan rentetan tarikh sebagai TARIKH TEMPATAN. new Date('YYYY-MM-DD')
// menghurai sebagai UTC tengah malam — tepat untuk MYT (UTC+8) tetapi
// tersasar sehari dalam zon ofset negatif; fungsi ini mengelakkannya.
export const parseTarikh = (s: string | undefined | null): Date | null => {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s); // ISO datetime penuh / datetime-local — huraian asli
  return Number.isNaN(d.getTime()) ? null : d;
};

// Format tarikh paparan ms-MY; '-' untuk nilai kosong/rosak.
export const formatTarikh = (
  s: string | undefined | null,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string => {
  const d = parseTarikh(s);
  return d ? d.toLocaleDateString('ms-MY', opts) : '-';
};

export const isSameOrAfter = (a: string, b: string): boolean => {
  const da = parseTarikh(a);
  const db = parseTarikh(b);
  if (!da || !db) return false;
  return da.getTime() >= db.getTime();
};

export const getCurrentAcademicSession = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // September (9) to August (8)
  if (month >= 9) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

export const getCurrentSemester = (date: Date = new Date()): string => {
  const month = date.getMonth() + 1; // 1-12

  // Semester 1: September to February
  // Semester 2: March to August
  if (month >= 9 || month <= 2) {
    return '1';
  } else {
    return '2';
  }
};

export const generateAcademicSessions = (count: number = 5): string[] => {
  const currentSession = getCurrentAcademicSession();
  const [startYear] = currentSession.split('/').map(Number);

  const sessions = [];
  // Generate 2 years back and (count - 2) years forward
  for (let i = -2; i < count - 2; i++) {
    const year = startYear + i;
    sessions.push(`${year}/${year + 1}`);
  }
  return sessions;
};
