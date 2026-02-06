'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile, ProjectID } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

function PIDForm({ pid, onFormSubmit }: { pid?: ProjectID | null, onFormSubmit: (data: { projectType: string, pid: string }) => void }) {
  const [projectType, setProjectType] = useState('');
  const [pidValue, setPidValue] = useState('');

  useEffect(() => {
    if (pid) {
      setProjectType(pid.projectType);
      setPidValue(pid.pid);
    } else {
      setProjectType('');
      setPidValue('');
    }
  }, [pid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFormSubmit({ projectType, pid: pidValue });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="projectType" className="text-right">
          Project Type
        </Label>
        <Input
          id="projectType"
          value={projectType}
          onChange={(e) => setProjectType(e.target.value)}
          className="col-span-3"
          placeholder="e.g. B2B IOAN, PROVISIONING"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="pid" className="text-right">
          Project ID
        </Label>
        <Input
          id="pid"
          value={pidValue}
          onChange={(e) => setPidValue(e.target.value)}
          className="col-span-3"
          placeholder="e.g. TIF-215/2026"
          required
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save changes</Button>
      </DialogFooter>
    </form>
  );
}


export default function AdminPIDsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [pidToEdit, setPidToEdit] = useState<ProjectID | null>(null);
  const [pidToDelete, setPidToDelete] = useState<ProjectID | null>(null);
  const [hasBeenSeeded, setHasBeenSeeded] = useState(false); // Prevent re-seeding

  // Redirect if user is not an admin
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      if (!user || currentUserProfile?.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  // Fetch all PIDs
  const pidsQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'project-ids'));
      }
      return null;
  }, [firestore, currentUserProfile]);

  const { data: pids, isLoading: arePidsLoading } = useCollection<ProjectID>(pidsQuery);

  // Seed initial data if the collection is empty
  useEffect(() => {
    if (firestore && pids?.length === 0 && !arePidsLoading && !hasBeenSeeded && currentUserProfile?.role === 'admin') {
      const initialPids = [
        { projectType: 'B2B IOAN', pid: 'TIF-215/2026' },
        { projectType: 'PROVISIONING', pid: '-' },
        { projectType: 'SPPG', pid: '-' },
        { projectType: 'BBM GENSET', pid: 'Ditagihkan ke Unit Lain' },
        { projectType: 'WAREHOUSE', pid: 'TIF-215/2026' },
        { projectType: 'Lainnya', pid: '-' },
      ];

      const pidsCollection = collection(firestore, 'project-ids');
      initialPids.forEach(pidData => {
        addDocumentNonBlocking(pidsCollection, pidData);
      });
      
      setHasBeenSeeded(true);
      
      toast({
          title: 'Data Awal Ditambahkan',
          description: 'Project ID bawaan telah ditambahkan ke database.',
          duration: 5000,
      });
    }
  }, [pids, arePidsLoading, firestore, hasBeenSeeded, currentUserProfile, toast]);


  const handleCreate = () => {
    setPidToEdit(null);
    setIsFormDialogOpen(true);
  };

  const handleEdit = (pid: ProjectID) => {
    setPidToEdit(pid);
    setIsFormDialogOpen(true);
  };

  const handleDelete = (pid: ProjectID) => {
    setPidToDelete(pid);
  };
  
  const confirmDelete = () => {
    if (!pidToDelete) return;
    const pidDocRef = doc(firestore, 'project-ids', pidToDelete.id);
    deleteDocumentNonBlocking(pidDocRef);
    toast({
      title: 'Project ID Deleted',
      description: `The PID for ${pidToDelete.projectType} has been deleted.`,
    });
    setPidToDelete(null);
  }

  const handleFormSubmit = (data: { projectType: string, pid: string }) => {
    if (pidToEdit) {
      // Update existing PID
      const pidDocRef = doc(firestore, 'project-ids', pidToEdit.id);
      updateDocumentNonBlocking(pidDocRef, data);
      toast({
        title: 'Project ID Updated',
        description: `PID for ${data.projectType} has been updated.`,
      });
    } else {
      // Create new PID
      const pidsCollection = collection(firestore, 'project-ids');
      addDocumentNonBlocking(pidsCollection, data);
      toast({
        title: 'Project ID Created',
        description: `New PID for ${data.projectType} has been created.`,
      });
    }
    setIsFormDialogOpen(false);
    setPidToEdit(null);
  }


  const isLoading = isUserLoading || isProfileLoading || arePidsLoading;

  if (isLoading && (!pids || pids.length === 0)) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-10 w-32" />
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-10 w-full" />
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manajemen Project ID
          </h1>
          <p className="text-muted-foreground mt-1">
            Buat, edit, atau hapus Project ID (PID) untuk laporan.
          </p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreate}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Buat PID Baru
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{pidToEdit ? 'Edit Project ID' : 'Create New Project ID'}</DialogTitle>
                    <DialogDescription>
                        {pidToEdit ? 'Update the details for this PID.' : 'Add a new Project Type and its corresponding ID.'}
                    </DialogDescription>
                </DialogHeader>
                <PIDForm pid={pidToEdit} onFormSubmit={handleFormSubmit} />
            </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Project ID</CardTitle>
          <CardDescription>
            Daftar semua PID yang tersimpan di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Type</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arePidsLoading && pids?.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Memuat data awal...
                    </TableCell>
                </TableRow>
              ) : pids && pids.length > 0 ? (
                pids.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.projectType}</TableCell>
                    <TableCell>{p.pid}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                           <Edit className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p)}>
                           <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Tidak ada Project ID ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
       <AlertDialog open={!!pidToDelete} onOpenChange={(open) => !open && setPidToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the Project ID.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
