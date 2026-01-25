
export type Nota = {
  id: string;
  userId: string;
  userEmail: string;
  tanggal: any; // Using `any` to accommodate Firestore's serverTimestamp
  segmen: string;
  noPlatKendaraan?: string;
  kmAwal?: number;
  kmAkhir?: number;
  namaBarang?: string;
  keterangan?: string;
  nominal: number;
  namaPic: string;
  fotoEvidenUrls?: string[];
  dateCreated: any; // Using `any` to accommodate Firestore's serverTimestamp
  status: 'pending' | 'verified';
};

export type UserProfile = {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: 'admin' | 'user';
};
