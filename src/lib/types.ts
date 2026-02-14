
export type Nota = {
  id: string;
  userId: string;
  userEmail: string;
  tanggal: any; // Using `any` to accommodate Firestore's serverTimestamp
  segmen: string;
  serviceArea: 'SA KUDUS' | 'SA PATI' | 'SA JEPARA' | 'SA PURWODADI' | 'SA BLORA' | 'SA REMBANG';
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
    appAccess?: 'nota' | 'allpro' | 'all';
};

export type ProjectID = {
  id: string;
  projectType: string;
  pid: string;
};

export type NetworkAsset = {
  id: string;
  name: string;
  assetType: 'OLT' | 'ODC' | 'ODP' | 'FTM';
  subType: 'Mini OLT' | 'OLT' | 'EA' | 'OA' | 'N/A';
  serviceArea: 'SA KUDUS' | 'SA PATI' | 'SA JEPARA' | 'SA PURWODADI' | 'SA BLORA' | 'SA REMBANG';
  sto: string;
  coordinates?: string;
  dateAdded: any;
  kapasitas?: string;
  spec?: string;
  // New fields for ODP
  portAvai?: string; // AVAI
  portUsed?: string; // USED
  portRsv?: string; // RSV
  portRsk?: string; // RSK
};

export type MapLink = {
  id: string;
  serviceArea: string;
  url: string;
};
