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
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, CheckCircle, Trash2, KeyRound } from 'lucide-react';
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

function UserActions({ userToManage, currentUserId }: { userToManage: UserProfile, currentUserId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<'nota' | 'all'>('nota');

  const handleUpdate = (data: Partial<UserProfile>) => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    updateDocumentNonBlocking(userDocRef, data);
    toast({
      title: 'User Updated',
      description: `User ${userToManage.email} has been updated.`,
    });
  };
  
  const handleDeleteUser = () => {
    // Note: This only deletes the Firestore document.
    // The Auth user needs to be deleted from the Firebase Console.
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
  
  // An admin cannot demote or change their own status
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
          {userToManage.registrationStatus === 'pending' && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsApproveDialogOpen(true); }}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve User
            </DropdownMenuItem>
          )}
          {userToManage.role !== 'admin' ? (
            <DropdownMenuItem onClick={() => handleUpdate({ role: 'admin' })}>
              <Shield className="mr-2 h-4 w-4" />
              Make Admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleUpdate({ role: 'user' })}>
              <User className="mr-2 h-4 w-4" />
              Make User
            </DropdownMenuItem>
          )}
           {userToManage.registrationStatus === 'approved' && (
             <DropdownMenuItem onClick={() => handleUpdate({ appAccess: userToManage.appAccess === 'all' ? 'nota' : 'all' })}>
                <KeyRound className="mr-2 h-4 w-4" />
                {userToManage.appAccess === 'all' ? 'Batasi ke Nota' : 'Beri Akses Penuh'}
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
                  <RadioGroup defaultValue="nota" value={selectedAccess} onValueChange={(value: 'nota' | 'all') => setSelectedAccess(value)}>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nota" id="r1" />
                          <Label htmlFor="r1">Akses Aplikasi Nota Saja</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all" id="r2" />
                          <Label htmlFor="r2">Akses Semua Aplikasi (Nota & Pencarian Aset)</Label>
                      </div>
                  </RadioGroup>
              </div>
              <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Setujui Pengguna</AlertDialogAction>
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch all users
  const usersQuery = useMemoFirebase(() => {
      // Only attempt to query if the user profile is loaded and they are an admin
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
      user.phone?.toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery]);


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
            Setujui pengguna baru dan kelola peran di sini.
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
              placeholder="Cari berdasarkan email, NIK, atau no. pembayaran..."
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
                <TableHead>No. Pembayaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Akses Aplikasi</TableHead>
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
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={u.registrationStatus === 'approved' ? 'default' : 'secondary'} className="capitalize">
                        {u.registrationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      <Badge variant={u.role === 'admin' ? 'destructive' : 'outline'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {u.appAccess && u.registrationStatus === 'approved' && (
                        <Badge variant={u.appAccess === 'all' ? 'default' : 'secondary'}>
                          {u.appAccess === 'all' ? 'Semua' : 'Nota'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {user && <UserActions userToManage={u} currentUserId={user.uid} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Tidak ada pengguna ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
