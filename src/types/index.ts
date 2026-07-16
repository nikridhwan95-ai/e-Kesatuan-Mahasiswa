export type UserRole = 'student' | 'unit_semakan' | 'unit_pembentangan' | 'unit_kertas_kerja' | 'unit_pelaporan' | 'admin' | 'ydp' | 'tnc_hepa';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  faculty?: string;
  association?: string;
  position?: string;
  createdAt: string;
}

export type ApplicationStatus = 
  | 'DRAFT'
  | 'PENDING_REVIEW' // Kesatuan Mahasiswa
  | 'REVISION_REQUIRED'
  | 'PENDING_PRESENTATION' // System Admin (Urus Setia) sets date
  | 'PRESENTATION_SCHEDULED'
  | 'PENDING_YDP_APPROVAL' // YDP MPP
  | 'APPROVED'
  | 'REJECTED';

export interface PresentationSession {
  id: string;
  name: string;
  date: string;
  time: string;
  link?: string;
  status: 'open' | 'closed';
}

export interface Application {
  id: string;
  studentId: string;
  title: string;
  date: string;
  budget: number;
  objective: string;
  status: ApplicationStatus;
  currentStage: string;
  paperUrl: string; // Latest version
  aiSummary?: {
    executiveSummary: string;
    impact: string;
    budgetAnalysis: string;
  };
  presentationDate?: string;
  presentationSession?: string;
  presentationSessionId?: string;
  academicSession?: string;
  semester?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationVersion {
  id: string;
  applicationId: string;
  version: number;
  paperUrl: string;
  uploadedAt: string;
  comments?: string;
}

export interface Review {
  id: string;
  applicationId: string;
  reviewerId: string;
  comments: string;
  status: 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';
  createdAt: string;
}

export interface PostProgramReport {
  id: string;
  applicationId: string;
  studentId: string;
  reportUrl: string;
  receiptsUrl: string[];
  photosUrl: string[];
  aiSentiment?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
