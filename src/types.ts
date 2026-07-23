export type UserRole =
  | 'student'
  | 'unit_semakan'
  | 'unit_pembentangan'
  | 'unit_kertas_kerja'
  | 'unit_pelaporan'
  | 'admin'
  | 'ydp'
  | 'tnc_hepa';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  displayName?: string;
  photoURL?: string;
  matricNumber?: string;
  phoneNumber?: string;
  college?: string;
  faculty?: string;
  studyYear?: string; // tahun pengajian (cth "3")
  programme?: string; // program pengajian
  address?: string;
  positions?: { organization: string; role: string; year: string }[];
  createdAt: string;
}

export type ApplicationStatus =
  | 'Draf'
  | 'Menunggu Semakan'
  | 'Perlu Pembetulan'
  | 'Menunggu Pembentangan'
  | 'Menunggu Kelulusan YDP'
  | 'Menunggu Kelulusan TNC HEPA'
  | 'Lulus Sepenuhnya'
  | 'Ditolak'
  | 'Dibatalkan'
  | 'Menunggu Semakan Pindaan'
  | 'Menunggu Kelulusan YDP (Pindaan)';

export interface Application {
  id: string;
  applicantId: string;
  applicantPosition?: 'Pengarah' | 'Setiausaha';
  title: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  budget: number;
  category: string;
  organizingLevel?: 'Antarabangsa' | 'Kebangsaan' | 'Negeri' | 'Universiti' | 'Kolej atau Fakulti';
  jointlyOrganizedWith?: string;
  softSkills?: string[];
  objective: string;
  academicSession?: string;
  semester?: string;
  venue?: string;
  speaker?: string;
  paperUrl?: string;
  presentationSessionId?: string;
  presentationDate?: string;
  presentationRoom?: number;
  reviewerComment?: string;
  approvedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PresentationSession {
  id: string;
  name: string;
  academicSession?: string;
  roomCount?: number;
  date: string;
  time: string;
  link?: string;
  status: 'Open' | 'Closed';
}

export interface Report {
  id: string;
  applicationId: string;
  applicantId: string;
  status: 'Tertunggak' | 'Dihantar' | 'Disahkan' | 'Perlu Pembetulan';
  reportUrl?: string;
  receiptUrl?: string;
  unionBudgetUsed?: number;
  verifiedBudgetUsed?: number;
  participantCount?: number;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerComment?: string;
}
