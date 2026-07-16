import { db, storage } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, addDoc, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Application, Report, PresentationSession, UserRole } from '../types';

// User Profile
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as User;
  } else {
    return null;
  }
};

export const createUserProfile = async (uid: string, data: Partial<User>) => {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    uid,
    createdAt: new Date().toISOString()
  });
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, data);
};

export const getUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as object) } as User));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { uid: querySnapshot.docs[0].id, ...(querySnapshot.docs[0].data() as object) } as User;
  }
  return null;
};

// Applications
export const getApplications = async (role: UserRole, uid: string): Promise<Application[]> => {
  let q;
  if (role === 'student') {
    q = query(collection(db, 'applications'), where('applicantId', '==', uid));
  } else {
    // For reviewers, admins, YDP, fetch all applications or filter by status if needed
    q = query(collection(db, 'applications'), orderBy('createdAt', 'desc'));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Application));
};

export const getApplicationById = async (appId: string): Promise<Application | null> => {
  const docRef = doc(db, 'applications', appId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...(docSnap.data() as object) } as Application;
  }
  return null;
};

export const createApplication = async (application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => {
  // Determine current academic session (e.g., 25/26)
  // Assuming session starts in September (month 8, 0-indexed)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  const sessionStr = `${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}`;
  const prefix = `KM.${sessionStr}.`;

  // Get all applications to find the highest sequence number for this session
  const q = query(collection(db, 'applications'));
  const querySnapshot = await getDocs(q);
  
  let maxSeq = 0;
  querySnapshot.forEach((doc) => {
    const id = doc.id;
    if (id.startsWith(prefix)) {
      const seqStr = id.substring(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const newId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  await setDoc(doc(db, 'applications', newId), {
    ...application,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  return newId;
};

export const updateApplicationStatus = async (appId: string, status: string, comment?: string, approvedAmount?: number) => {
  const docRef = doc(db, 'applications', appId);
  const data: any = { 
    status,
    updatedAt: new Date().toISOString()
  };
  if (comment) {
    data.reviewerComment = comment;
  }
  if (approvedAmount !== undefined) {
    data.approvedAmount = approvedAmount;
  }
  await updateDoc(docRef, data);
};

export const updateApplication = async (appId: string, data: Partial<Application>) => {
  const docRef = doc(db, 'applications', appId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const updateApplicationPresentation = async (appId: string, sessionId: string, date: string, room?: number) => {
  const docRef = doc(db, 'applications', appId);
  await updateDoc(docRef, {
    presentationSessionId: sessionId,
    presentationDate: date,
    presentationRoom: room,
    status: 'Menunggu Pembentangan',
    updatedAt: new Date().toISOString()
  });
};

export const deleteApplication = async (appId: string) => {
  await deleteDoc(doc(db, 'applications', appId));
};

export const deleteAllApplications = async () => {
  const qApps = query(collection(db, 'applications'));
  const appSnapshot = await getDocs(qApps);
  const deleteAppPromises = appSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
  
  const qReports = query(collection(db, 'reports'));
  const reportSnapshot = await getDocs(qReports);
  const deleteReportPromises = reportSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));

  await Promise.all([...deleteAppPromises, ...deleteReportPromises]);
};

// Presentation Sessions
export const getPresentationSessions = async (): Promise<PresentationSession[]> => {
  const q = query(collection(db, 'presentationSessions'), orderBy('date', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as PresentationSession));
};

export const createPresentationSession = async (session: Omit<PresentationSession, 'id'>) => {
  const docRef = await addDoc(collection(db, 'presentationSessions'), session);
  return docRef.id;
};

export const updatePresentationSessionStatus = async (sessionId: string, status: 'Open' | 'Closed') => {
  const docRef = doc(db, 'presentationSessions', sessionId);
  await updateDoc(docRef, { status });
};

export const deletePresentationSession = async (sessionId: string) => {
  await deleteDoc(doc(db, 'presentationSessions', sessionId));
};

// Reports
export const getReports = async (role: UserRole, uid: string): Promise<Report[]> => {
  let q;
  if (role === 'student') {
    q = query(collection(db, 'reports'), where('applicantId', '==', uid));
  } else {
    q = query(collection(db, 'reports'));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Report));
};

export const createReport = async (report: Omit<Report, 'id' | 'submittedAt'>) => {
  const docRef = await addDoc(collection(db, 'reports'), {
    ...report,
    submittedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateReportStatus = async (reportId: string, status: string, comment?: string, additionalData?: Partial<Report>) => {
  const docRef = doc(db, 'reports', reportId);
  const updateData: any = { 
    status,
    reviewedAt: new Date().toISOString(),
    ...additionalData
  };
  if (comment) {
    updateData.reviewerComment = comment;
  }
  await updateDoc(docRef, updateData);
};

// File Upload
export const uploadFile = async (path: string, file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.error("Error uploading file:", error);
    if (error.code === 'storage/unknown') {
      throw new Error("Ralat Storage: Sila pastikan Firebase Storage telah diaktifkan dan CORS telah dikonfigurasi di Firebase Console.");
    }
    throw error;
  }
};

// Categories
export const getCategories = async (): Promise<string[]> => {
  const docRef = doc(db, 'settings', 'categories');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().list || [];
  }
  // Default 8 Teras categories
  return [
    'Kesukarelawanan', 
    'Kepimpinan', 
    'Kebudayaan', 
    'Sukan', 
    'Keusahawanan', 
    'Akademik & Intelektual', 
    'Kerohanian', 
    'Kelestarian & Alam Sekitar'
  ];
};

export const addCategory = async (category: string) => {
  const docRef = doc(db, 'settings', 'categories');
  const docSnap = await getDoc(docRef);
  let list: string[] = [];
  if (docSnap.exists()) {
    list = docSnap.data().list || [];
  }
  if (!list.includes(category)) {
    list.push(category);
    await setDoc(docRef, { list }, { merge: true });
  }
};

export const deleteCategory = async (category: string) => {
  const docRef = doc(db, 'settings', 'categories');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    let list = docSnap.data().list || [];
    list = list.filter((c: string) => c !== category);
    await setDoc(docRef, { list }, { merge: true });
  }
};

// Faculties
export const getFaculties = async (): Promise<string[]> => {
  const docRef = doc(db, 'settings', 'faculties');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().list || [];
  }
  return ['Fakulti Pertanian', 'Fakulti Perhutanan dan Alam Sekitar', 'Fakulti Veterinar', 'Fakulti Ekonomi dan Pengurusan', 'Fakulti Kejuruteraan', 'Fakulti Pengajian Pendidikan', 'Fakulti Sains', 'Fakulti Sains dan Teknologi Makanan', 'Fakulti Reka Bentuk dan Seni Bina', 'Fakulti Bahasa Moden dan Komunikasi', 'Fakulti Perubatan dan Sains Kesihatan', 'Fakulti Sains Komputer dan Teknologi Maklumat', 'Fakulti Bioteknologi dan Sains Biomolekul', 'Fakulti Kemanusiaan, Pengurusan dan Sains', 'Sekolah Perniagaan dan Ekonomi'];
};

export const addFaculty = async (faculty: string) => {
  const docRef = doc(db, 'settings', 'faculties');
  const docSnap = await getDoc(docRef);
  let list: string[] = [];
  if (docSnap.exists()) {
    list = docSnap.data().list || [];
  }
  if (!list.includes(faculty)) {
    list.push(faculty);
    await setDoc(docRef, { list }, { merge: true });
  }
};

export const deleteFaculty = async (faculty: string) => {
  const docRef = doc(db, 'settings', 'faculties');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    let list = docSnap.data().list || [];
    list = list.filter((f: string) => f !== faculty);
    await setDoc(docRef, { list }, { merge: true });
  }
};

// Colleges
export const getColleges = async (): Promise<string[]> => {
  const docRef = doc(db, 'settings', 'colleges');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().list || [];
  }
  return ['Kolej Mohamad Rashid', 'Kolej Kedua', 'Kolej Tun Dr. Ismail', 'Kolej Canselor', 'Kolej Kelima', 'Kolej Keenam', 'Kolej Sultan Alauddin Suleiman Shah', 'Kolej Kelapan', 'Kolej Kesepuluh', 'Kolej Sebelas', 'Kolej Dua Belas', 'Kolej Tiga Belas', 'Kolej Empat Belas', 'Kolej Lima Belas', 'Kolej Enam Belas', 'Kolej Tujuh Belas', 'Kolej Sri Rajang'];
};

export const addCollege = async (college: string) => {
  const docRef = doc(db, 'settings', 'colleges');
  const docSnap = await getDoc(docRef);
  let list: string[] = [];
  if (docSnap.exists()) {
    list = docSnap.data().list || [];
  }
  if (!list.includes(college)) {
    list.push(college);
    await setDoc(docRef, { list }, { merge: true });
  }
};

export const deleteCollege = async (college: string) => {
  const docRef = doc(db, 'settings', 'colleges');
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    let list = docSnap.data().list || [];
    list = list.filter((c: string) => c !== college);
    await setDoc(docRef, { list }, { merge: true });
  }
};
