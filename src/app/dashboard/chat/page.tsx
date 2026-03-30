
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Adsense } from '@/components/adsense';

export default function ChatHubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const usersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users'));
  }, [user, firestore]);

  const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  const sortedUsers = useMemo(() => {
      if (!allUsers || !user) return [];
      return allUsers
        .filter(u => u.registrationStatus === 'approved' && u.id !== user.uid)
        .sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
  }, [allUsers, user]);

  const filteredUsers = useMemo(() => {
      if (!searchQuery) return sortedUsers;
      const lowercasedQuery = searchQuery.toLowerCase();
      return sortedUsers.filter(u => 
        (u.displayName?.toLowerCase().includes(lowercasedQuery)) ||
        (u.email?.toLowerCase().includes(lowercasedQuery))
      );
  }, [sortedUsers, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage]);

  const isLoading = isUserLoading || areUsersLoading;

  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pilih Obrolan</h1>
          <p className="text-muted-foreground mt-1">Pilih untuk masuk ke group chat atau memulai percakapan pribadi.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/dashboard/chat/group">
          <Card className="hover:border-primary transition-colors">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="p-3 rounded-full bg-primary/10 text-primary"><Users /></div>
              <CardTitle>Group Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Masuk ke ruang obrolan grup untuk semua pengguna.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <Card>
          <CardHeader>
              <CardTitle>Percakapan Pribadi</CardTitle>
              <CardDescription>Pilih pengguna untuk memulai percakapan pribadi.</CardDescription>
              <div className="pt-4">
                  <Label htmlFor="search-user" className="sr-only">Cari Pengguna</Label>
                  <Input 
                      id="search-user"
                      placeholder="Cari nama atau email pengguna..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                  </div>
              ) : paginatedUsers && paginatedUsers.length > 0 ? (
                  <div className="space-y-2">
                      {paginatedUsers.map((otherUser) => (
                          <Link href={`/dashboard/chat/${otherUser.id}`} key={otherUser.id}>
                              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
                                  <Avatar>
                                      <AvatarImage src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.displayName || otherUser.email)}&background=random`} />
                                      <AvatarFallback>{otherUser.displayName?.[0] || otherUser.email[0]}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-grow">
                                      <p className="font-semibold">{otherUser.displayName}</p>
                                      <p className="text-sm text-muted-foreground">{otherUser.email}</p>
                                  </div>
                                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                              </div>
                          </Link>
                      ))}
                  </div>
              ) : (
                  <p className="text-muted-foreground text-center py-4">
                    {searchQuery ? 'Tidak ada pengguna yang cocok dengan pencarian Anda.' : 'Tidak ada pengguna lain yang ditemukan.'}
                  </p>
              )}
          </CardContent>
           {totalPages > 1 && (
            <CardFooter>
                <div className="text-xs text-muted-foreground">
                    Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Sebelumnya
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Berikutnya
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
           )}
      </Card>
        <div className="mt-8 w-full overflow-hidden">
            <Adsense
                data-ad-client="ca-pub-6478281232505590"
                data-ad-slot="5734427659"
                data-ad-format="auto"
                className="block"
                data-full-width-responsive="true"
            />
        </div>
    </div>
  );
}
