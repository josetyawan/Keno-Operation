export type Nota = {
  id: string;
  userId: string;
  title: string;
  content: string;
  dateCreated: any; // Using `any` to accommodate Firestore's serverTimestamp
};

export type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'user';
};
