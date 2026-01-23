export type Nota = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: any; // Using `any` to accommodate Firestore's serverTimestamp
};
