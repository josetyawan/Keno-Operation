'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MessageSquare } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ChatHubPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!user) return null;
    // Fetch all approved users, ordering by name. We'll filter the current user on the client.
    return query(
      collection(firestore, 'users'),
      where('registrationStatus', '==', 'approved'),
      orderBy('displayName')
    );
  }, [user, firestore]);

  const { data: allApprovedUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

  // Filter out the current user on the client side
  const users = useMemo(() => {
      if (!allApprovedUsers || !user) return [];
      return allApprovedUsers.filter(u => u.id !== user.uid);
  }, [allApprovedUsers, user]);

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
          </CardHeader>
          <CardContent>
              {isLoading ? (
                  <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                  </div>
              ) : users && users.length > 0 ? (
                  <div className="space-y-2">
                      {users.map((otherUser) => (
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
                  <p className="text-muted-foreground text-center py-4">Tidak ada pengguna lain yang ditemukan.</p>
              )}
          </CardContent>
      </Card>
    </div>
  );
}
