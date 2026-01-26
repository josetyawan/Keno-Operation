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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Shield, User, CheckCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function UserActions({ userToManage, currentUserId }: { userToManage: UserProfile, currentUserId: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdate = (data: Partial<UserProfile>) => {
    const userDocRef = doc(firestore, 'users', userToManage.id);
    updateDocumentNonBlocking(userDocRef, data);
    toast({
      title: 'User Updated',
      description: `User ${userToManage.email} has been updated.`,
    });
  };
  
  // An admin cannot demote or change their own status
  if (userToManage.id === currentUserId) {
      return null;
  }

  return (
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
          <DropdownMenuItem onClick={() => handleUpdate({ registrationStatus: 'approved' })}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminUsersPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Redirect if user is not an admin
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  useEffect(() => {
    if (!isUserLoading && !isProfileLoading) {
      const isSuperAdmin = user?.email === 'jokowahyusisnaker123@gmail.com';
      const isAdminByRole = currentUserProfile?.role === 'admin';
      
      if (!user || (!isAdminByRole && !isSuperAdmin)) {
        router.push('/dashboard');
      }
    }
  }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

  // Fetch all users
  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Email</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>No. HP</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map(u => (
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
                    <TableCell className="text-right">
                       {user && <UserActions userToManage={u} currentUserId={user.uid} />}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
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
