
export type Nota = {
  id: string;
  userId: string;
  userEmail: string;
  tanggal: any; // Using `any` to accommodate Firestore's serverTimestamp
  segmen: string;
  serviceArea: string;
  noPlatKendaraan?: string;
  kmAwal?: number;
  kmAkhir?: number;
  namaBarang?: string;
  keterangan?: string;
  nominal: number;
  namaPic: string;
  fotoEvidenUrls?: (string | null)[];
  dateCreated: any; // Using `any` to accommodate Firestore's serverTimestamp
  status: 'pending' | 'verified' | 'rejected' | 'paid';
  tanggalVerifikasi?: any;
  rejectionReason?: string;
  tanggalPembayaran?: any;
};

export type UserProfile = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    role: 'admin' | 'user';
    nik?: string;
    phone?: string;
    registrationStatus: 'pending' | 'approved';
};

export type ProjectID = {
  id: string;
  projectType: string;
  pid: string;
};
