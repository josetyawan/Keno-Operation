export type Nota = {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  content: string;
  dateCreated: any; // Using `any` to accommodate Firestore's serverTimestamp
  status: 'pending' | 'verified';
};

export type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
};
