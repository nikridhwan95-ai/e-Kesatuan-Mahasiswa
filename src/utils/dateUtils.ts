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
