
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, CheckCircle, Trash2, KeyRound, Edit, Loader2 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


function UserEditForm({ user, onFormSubmit, isSaving }: { user: UserProfile, onFormSubmit: (data: Partial<UserProfile>) => void, isSaving: boolean }) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [nik, setNik] = useState(user.nik || '');
  const [paymentInfo, setPaymentInfo] = useState(user.paymentInfo || '');
  const [jabatan, setJabatan] = useState(user.jabatan || '');
  const [alker, setAlker] = useState(user.alker || '');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFormSubmit({ displayName, nik, paymentInfo, jabatan, alker });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid gap-2">
            <Label htmlFor="edit-displayName">Nama Panggilan</Label>
            <Input id="edit-displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="edit-nik">NIK</Label>
            <Input id="edit-nik" value={nik} onChange={(e) => setNik(e.target.value)} />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="edit-jabatan">Jabatan</Label>
            <Input id="edit-jabatan" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
        </div>
        <div className="grid gap-2">
            <Label htmlFor="edit-paymentInfo">Info Pembayaran</Label>
            <Input id="edit-paymentInfo" value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)} placeholder="e.g., OVO 0812... / BCA 123..."/>
        </div>
        <div className="grid gap-2">
            <Label htmlFor="edit-alker">Alat Kerja (Alker)</Label>
            <Textarea id="edit-alker" value={alker} onChange={(e) => setAlker(e.target.value)} />
        </div>
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
        <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Simpan'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UserActions({ userToManage, currentUserId, onEdit }: { userToManage: UserProfile, currentUserId: string, onEdit: (user: UserProfile) => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<'nota' | 'allpro' | 'all'>('nota');

  const handleUpdate = (data: Partial<UserProfile>) => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    updateDocumentNonBlocking(userDocRef, data);
    toast({
      title: 'User Updated',
      description: `User ${userToManage.email} has been updated.`,
    });
  };
  
  const handleDeleteUser = () => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    deleteDocumentNonBlocking(userDocRef);
     toast({
      title: 'User Document Deleted',
      description: `The profile for ${userToManage.email} has been deleted. Please delete the user from the Firebase Authentication console to fully remove them.`,
      duration: 7000
    });
  }

  const handleApprove = () => {
    handleUpdate({ registrationStatus: 'approved', appAccess: selectedAccess });
    setIsApproveDialogOpen(false);
  }

  const handleChangeAccess = () => {
    handleUpdate({ appAccess: selectedAccess });
    setIsAccessDialogOpen(false);
  }
  
  if (userToManage.id === currentUserId) {
      return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
           <DropdownMenuItem onSelect={() => onEdit(userToManage)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Data HR
            </DropdownMenuItem>
          {userToManage.registrationStatus === 'pending' && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsApproveDialogOpen(true); }}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve User
            </DropdownMenuItem>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="mr-2 h-4 w-4" />
              Set Role
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'admin' })}>Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'korlap' })}>Korlap</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdate({ role: 'teknisi' })}>Teknisi</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
           {userToManage.registrationStatus === 'approved' && (
             <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                setSelectedAccess(userToManage.appAccess || 'nota');
                setIsAccessDialogOpen(true);
             }}>
                <KeyRound className="mr-2 h-4 w-4" />
                Ubah Akses
            </DropdownMenuItem>
           )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action only deletes the user's profile data from the application's database. The user's login account must be deleted manually from the Firebase Authentication console. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Approve User: {userToManage.email}</AlertDialogTitle>
              <AlertDialogDescription>
                  Pilih tingkat akses yang akan diberikan kepada pengguna ini setelah disetujui.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                  <RadioGroup defaultValue="nota" onValueChange={(value: 'nota' | 'allpro' | 'all') => setSelectedAccess(value)}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nota" id="r1-approve" />
                          <Label htmlFor="r1-approve">Hanya Nota (Finance)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="allpro" id="r2-approve" />
                          <Label htmlFor="r2-approve">Hanya Aset (Teknis)</Label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="r3-approve" />
                          <Label htmlFor="r3-approve">Akses Semua (Nota & Aset)</Label>
                      </div>
                  </RadioGroup>
              </div>
              <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Setujui Pengguna</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Ubah Akses untuk: {userToManage.email}</AlertDialogTitle>
              <AlertDialogDescription>
                  Pilih tingkat akses baru untuk pengguna ini.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                  <RadioGroup value={selectedAccess} onValueChange={(value: 'nota' | 'allpro' | 'all') => setSelectedAccess(value)}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nota" id="r1-change" />
                          <Label htmlFor="r1-change">Hanya Nota (Finance)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="allpro" id="r2-change" />
                          <Label htmlFor="r2-change">Hanya Aset (Teknis)</Label>
                      </div>
                       <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="r3-change" />
                          <Label htmlFor="r3-change">Akses Semua (Nota & Aset)</Label>
                      </div>
                  </RadioGroup>
              </div>
              <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleChangeAccess}>Simpan Perubahan</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const usersQuery = useMemoFirebase(() => {
      if (currentUserProfile?.role === 'admin') {
          return query(collection(firestore, 'users'));
      }
      return null;
  }, [firestore, currentUserProfile?.role]);

  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery) return users;

    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(user => 
      user.email?.toLowerCase().includes(lowercasedQuery) ||
      user.nik?.toLowerCase().includes(lowercasedQuery) ||
      user.paymentInfo?.toLowerCase().includes(lowercasedQuery) ||
      user.jabatan?.toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery]);
  
  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
  };
  
  const handleFormSubmit = (data: Partial<UserProfile>) => {
    if (!userToEdit) return;
    setIsSaving(true);
    
    const userDocRef = doc(firestore, 'users', userToEdit.id);
    updateDocumentNonBlocking(userDocRef, data);
    
    toast({
      title: 'User Data Updated',
      description: `Data untuk ${userToEdit.email} telah diperbarui.`,
    });
    
    setIsSaving(false);
    setUserToEdit(null);
  };

  const isLoading = isUserLoading || isProfileLoading || areUsersLoading;

  if (isLoading) {
      return (
          <div>
              <div className="flex items-center justify-between mb-8">
                  <div>
                      <Skeleton className="h-8 w-64 mb-2" />
                      <Skeleton className="h-5 w-80" />
                  </div>
              </div>
              <Card>
                  <CardHeader>
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent className="p-6">
                      <Skeleton className="h-12 w-full mb-4" />
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
            Manajemen User
          </h1>
          <p className="text-muted-foreground mt-1">
            Setujui pengguna baru, kelola peran, dan perbarui data HR di sini.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Semua Pengguna</CardTitle>
          <CardDescription>
            Daftar semua pengguna yang terdaftar di sistem.
          </CardDescription>
           <div className="pt-4">
            <Input
              placeholder="Cari berdasarkan email, NIK, jabatan, atau no. pembayaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Info Pembayaran</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akses App</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.nik || '-'}</TableCell>
                    <TableCell>{u.paymentInfo || '-'}</TableCell>
                     <TableCell className="capitalize">
                      <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'korlap' ? 'secondary' : 'outline'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.jabatan || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.registrationStatus === 'approved' ? 'default' : 'secondary'} className="capitalize">
                        {u.registrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                       {u.registrationStatus === 'approved' && (() => {
                          switch (u.appAccess) {
                              case 'nota':
                                  return <Badge variant="secondary">Nota</Badge>;
                              case 'allpro':
                                  return <Badge variant="outline" className="text-blue-600 border-blue-600">Aset</Badge>;
                              case 'all':
                                  return <Badge variant="default">Semua</Badge>;
                              default:
                                  return null;
                          }
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                       {user && <UserActions userToManage={u} currentUserId={user.uid} onEdit={handleEditUser} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {userToEdit && (
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Edit Data HR: {userToEdit.displayName}</DialogTitle>
                <DialogDescription>
                    Perbarui informasi untuk pengguna {userToEdit.email}.
                </DialogDescription>
                </DialogHeader>
                <UserEditForm user={userToEdit} onFormSubmit={handleFormSubmit} isSaving={isSaving} />
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
