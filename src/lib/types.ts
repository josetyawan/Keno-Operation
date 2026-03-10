

import { Timestamp } from 'firebase/firestore';

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
  status: 'pending' | 'verified' | 'rejected' | 'paid' | 'verified-tif';
  tanggalVerifikasi?: any;
  rejectionReason?: string;
  tanggalPembayaran?: any;
};

export type DesignatorEvidence = {
  designator: string;
  notes?: string;
  photoUrls: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
};

export type GamasReport = {
  id: string;
  userId: string;
  userName: string;
  noTiket: string;
  evidences: DesignatorEvidence[];
  createdAt: any; // Timestamp
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
};

export type Pendidikan = {
  institusi?: string;
  jurusan?: string;
  tahunLulus?: string;
};

export type UserProfile = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    photoURL?: string;
    role: 'admin' | 'korlap' | 'teknisi';
    nik?: string; // NIK Karyawan
    paymentInfo?: string;
    jabatan?: string;
    registrationStatus: 'pending' | 'approved' | 'deleted';
    appAccess?: 'nota' | 'allpro' | 'all';
    
    // New HR Fields
    telegramId?: string;
    telegramUsername?: string;
    emailCorporate?: string;
    noHpTsel?: string;
    jobDescHrmista?: string;
    jobDescLapangan?: string;
    alamat?: string;
    nikKtp?: string;
    noSimA?: string;
    noSimC?: string;
    masaBerlakuSimA?: any; // Timestamp for SIM A
    masaBerlakuSimC?: any; // Timestamp for SIM C
    golonganDarah?: string;
    tanggalMasukKerja?: any; // Timestamp
    statusPernikahan?: 'menikah' | 'lajang' | 'duda' | 'janda';
    jumlahAnak?: number;
    tempatLahir?: string;
    tanggalLahir?: any; // Timestamp
    tinggiBadan?: number;
    beratBadan?: number;
    noBpjsKetenagakerjaan?: string;
    noBpjsKesehatan?: string;
    pendidikanTerakhir?: Pendidikan;
    labor?: string;
    ukuranBaju?: string;
    ukuranCelana?: string;
    ukuranSepatu?: string;
    devisi?: string;
    unit?: string;
    psa?: string;
};

export type ProjectID = {
  id: string;
  projectType: string;
  pid: string;
};

export type NetworkAsset = {
  id: string;
  name: string;
  assetType: 'OLT' | 'ODC' | 'ODP' | 'FTM' | 'MITRATEL' | 'NODE-B';
  subType: 'Mini OLT' | 'OLT' | 'EA' | 'OA' | 'N/A';
  serviceArea: string;
  sto: string;
  coordinates?: string;
  dateAdded: any;
  kapasitas?: string;
  spec?: string;
  portAvai?: string;
  portUsed?: string;
  portRsv?: string;
  portRsk?: string;
  mitratelSiteId?: string;
  tenantSiteId?: string;
  qrCodeUrl?: string;

  // Fields for NODE-B
  siteId?: string;
  siteName?: string;
  oltMerk?: string;
  splitterOlt?: string;
  snOnt?: string;
  eqpPort?: string;
  cascade?: string;
  cascadeAt?: string;
  catbts?: string;
  rncBsc?: string;
  routerRan?: string;
  alamat?: string;
};

export type LoanEvent = {
  status: 'borrowed' | 'returned';
  userId: string;
  userName: string;
  date: any; // Timestamp
};

export type OrbitInventory = {
  id: string;
  snOrbit: string;
  snMikrotik?: string;
  noSimCard: string;
  dateAdded: any; // Timestamp
  addedBy: string; // User's email
  status?: 'available' | 'borrowed';
  borrowedByUserId?: string;
  borrowedByName?: string;
  borrowedDate?: any; // Timestamp
  loanHistory?: LoanEvent[];
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
  noService: string;
  namaPelanggan: string;
  alamat?: string;
  nomorTelepon?: string[] | string;
  koordinat: string;
  serviceArea: string;
  sto?: string;
  dateAdded: any;
  odpName?: string;
  odpPort?: string;
  odpQRCodeUrl?: string;
  lastEditedBy?: string;
  lastEditedDate?: any;
};

export type RiwayatGangguan = {
  id: string;
  pelangganId?: string;
  noService: string;
  tanggalLapor: any; // Firestore Timestamp
  noTiket?: string;
  teknisi?: string;
  keterangan?: string;
};

export type ServiceAreaStats = {
  olt: { miniOlt: number; olt: number };
  ftm: { ea: number; oa: number };
  odc: { jumlah: number };
  odp: { jumlah: number };
  mitratel: { jumlah: number };
  nodeB: { jumlah: number };
};

export type NetworkStats = {
  id: string;
  lastUpdated: any; // Firestore Timestamp
  statsByServiceArea: {
    [serviceArea: string]: ServiceAreaStats;
  };
};

export type Holiday = {
    id: string;
    date: any; // Firestore Timestamp
    name: string;
    type: 'national-holiday' | 'collective-leave';
};

export type Schedule = {
    id: string;
    userId: string;
    userEmail: string;
    date: any; // Firestore Timestamp
    shiftType: 'piket-demak' | 'siang-malam' | 'malam' | 'ijin' | 'cuti' | 'weekend-duty' | 'holiday-duty' | 'tukar-jaga' | 'libur-dijadwalkan' | 'h' | 'pu' | 'pb' | 'ptm' | 'pt/bd';
    notes?: string;
    evidenceUrl?: string;
    createdAt: any; // Firestore Timestamp
    swapTargetUserId?: string;
    swapTargetUserName?: string;
};

export type Attendance = {
    id: string;
    userId: string;
    scheduleId: string;
    checkInTime: any; // Firestore Timestamp
    checkInPhotoUrl: string;
    checkInCoordinates: string;
    status: 'present' | 'absent' | 'late' | 'remote-progress';
    reason?: string;
};

export type AlkerTool = {
  toolName: string;
  condition: 'baik' | 'rusak';
  serialNumber?: string;
  brand?: string;
  photoUrl1?: string;
  photoUrl2?: string;
};

export type AlkerChecklist = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userJabatan: string;
  userUnit?: string;
  crewUserId?: string;
  crewUserName?: string;
  dateSubmitted: any; // Timestamp
  tools: AlkerTool[];
};

export type Message = {
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    createdAt: any; // Timestamp
};

export type ChatRoom = {
  id: string;
  participants: string[];
  participantNames: { [key: string]: string };
  participantAvatars: { [key: string]: string };
  lastMessageText?: string;
  lastMessageTimestamp?: any;
};

export type PrivateMessage = {
  id: string;
  text: string;
  userId: string;
  createdAt: any; // Timestamp
};

export type Performance = {
  id: string;
  nik: string;
  userId: string;
  nama: string;
  service: string;
  bulan: number;
  tahun: number;
  nilaiKualitas: string;
  nilaiKontribusi: string;
  nilaiKedisiplinan: string;
  performance1: string;
  performance2: string;
  totalPerformance: string;
  date: any; // Timestamp
};
