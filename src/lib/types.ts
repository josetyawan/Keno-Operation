

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
  assetType: 'OLT' | 'ODC' | 'ODP' | 'FTM' | 'MITRATEL';
  subType: 'Mini OLT' | 'OLT' | 'EA' | 'OA' | 'N/A';
  serviceArea: string;
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
  mitratelSiteId?: string;
  tenantSiteId?: string;
};

export type MapLink = {
  id: string;
  serviceArea: string;
  url: string;
};

export type MancoreLink = {
  id: string;
  serviceArea: string;
  label: string;
  url: string;
};

export type Pelanggan = {
  id: string;
  userId: string;
  userEmail: string;
  namaPelanggan: string;
  alamat?: string;
  nomorTelepon?: string;
  koordinat: string;
  fotoCpUrl?: string;
  serviceArea: string;
  dateAdded: any;
};

export type ServiceAreaStats = {
  olt: { miniOlt: number; olt: number };
  ftm: { ea: number; oa: number };
  odc: { jumlah: number };
  odp: { jumlah: number };
  mitratel: { jumlah: number };
};

export type NetworkStats = {
  id: string;
  lastUpdated: any; // Firestore Timestamp
  statsByServiceArea: {
    [serviceArea: string]: ServiceAreaStats;
  };
};
    
