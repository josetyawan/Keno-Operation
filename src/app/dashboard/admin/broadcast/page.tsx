
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, doc, writeBatch, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, ChatRoom, PrivateMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Users, Search, ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function BroadcastPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);

    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
        useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
    );
    
    const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users')), [firestore]);
    const { data: allUsers, isLoading: areUsersLoading } = useCollection<UserProfile>(usersQuery);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user || currentUserProfile?.role !== 'admin') {
                router.push('/dashboard');
            }
        }
    }, [user, currentUserProfile, isUserLoading, isProfileLoading, router]);

    const availableUsers = useMemo(() => {
        if (!allUsers || !user) return [];
        return allUsers.filter(u => u.id !== user.uid && u.registrationStatus === 'approved');
    }, [allUsers, user]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return availableUsers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return availableUsers.filter(u =>
            (u.displayName?.toLowerCase().includes(lowercasedQuery)) ||
            (u.email.toLowerCase().includes(lowercasedQuery))
        );
    }, [availableUsers, searchQuery]);

    const handleSelectUser = (userId: string, isChecked: boolean) => {
        setSelectedUserIds(prev =>
            isChecked ? [...prev, userId] : prev.filter(id => id !== userId)
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };
    
    const handleSendBroadcast = async () => {
        if (!message.trim()) {
            toast({ variant: 'destructive', title: 'Pesan Kosong', description: 'Silakan tulis pesan untuk disiarkan.' });
            return;
        }
        if (selectedUserIds.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak Ada Penerima', description: 'Pilih setidaknya satu pengguna sebagai penerima.' });
            return;
        }
        if (!user || !currentUserProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Pengguna tidak terautentikasi.' });
            return;
        }

        setIsSending(true);

        try {
            const batch = writeBatch(firestore);
            const totalChunks = Math.ceil(selectedUserIds.length / 500);
            let chunksCommitted = 0;

            for (let i = 0; i < selectedUserIds.length; i += 500) {
                const chunk = selectedUserIds.slice(i, i + 500);
                const chunkBatch = writeBatch(firestore);

                for (const targetUserId of chunk) {
                    const targetUser = allUsers?.find(u => u.id === targetUserId);
                    if (!targetUser) continue;

                    const chatId = [user.uid, targetUserId].sort().join('_');
                    const chatRoomRef = doc(firestore, 'chats', chatId);
                    const messagesCollectionRef = collection(firestore, 'chats', chatId, 'messages');

                    const chatRoomData: Partial<ChatRoom> = {
                        id: chatId,
                        participants: [user.uid, targetUserId],
                        participantNames: {
                            [user.uid]: currentUserProfile.displayName || currentUserProfile.email,
                            [targetUserId]: targetUser.displayName || targetUser.email,
                        },
                        participantAvatars: {
                             [user.uid]: currentUserProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.displayName || currentUserProfile.email || ' ')}&background=random`,
                             [targetUserId]: targetUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(targetUser.displayName || targetUser.email || ' ')}&background=random`,
                        },
                        lastMessageText: message,
                        lastMessageTimestamp: serverTimestamp(),
                    };

                    chunkBatch.set(chatRoomRef, chatRoomData, { merge: true });

                    const messageData: Omit<PrivateMessage, 'id'> = {
                        text: message,
                        userId: user.uid,
                        createdAt: serverTimestamp(),
                    };
                    
                    // Firestore auto-generates the ID when using addDoc like this with a batch
                    chunkBatch.set(doc(messagesCollectionRef), messageData);
                }

                await chunkBatch.commit();
                chunksCommitted++;
            }

            toast({
                title: 'Broadcast Terkirim!',
                description: `Pesan Anda telah berhasil dikirim ke ${selectedUserIds.length} pengguna.`,
            });

            setMessage('');
            setSelectedUserIds([]);
            setSearchQuery('');

        } catch (error: any) {
            console.error("Broadcast failed:", error);
            toast({ variant: 'destructive', title: 'Gagal Mengirim Broadcast', description: error.message });
        } finally {
            setIsSending(false);
        }
    };
    
    const isLoading = isUserLoading || isProfileLoading || areUsersLoading;

    return (
        <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-6">
            <div className="flex items-center gap-4">
                 <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Broadcast Pesan</h1>
                    <p className="text-muted-foreground">Kirim pesan ke beberapa pengguna sekaligus.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Pesan Siaran</CardTitle>
                    <CardDescription>Tulis pesan yang ingin Anda kirim. Pesan ini akan muncul sebagai chat pribadi dari Anda ke setiap penerima.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ketik pesan Anda di sini..."
                        rows={5}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users />Pilih Penerima</CardTitle>
                    <div className="pt-2">
                        <Input 
                            placeholder="Cari nama atau email pengguna..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4 p-2 border-b">
                        <Checkbox 
                            id="select-all"
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                            checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                        />
                        <Label htmlFor="select-all" className="font-medium">Pilih Semua ({filteredUsers.length} pengguna)</Label>
                    </div>
                    <ScrollArea className="h-72">
                         {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                                        <Checkbox 
                                            id={`user-${u.id}`}
                                            checked={selectedUserIds.includes(u.id)}
                                            onCheckedChange={(checked) => handleSelectUser(u.id, Boolean(checked))}
                                        />
                                        <Label htmlFor={`user-${u.id}`} className="flex-1 flex items-center gap-3 cursor-pointer">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={u.photoURL} />
                                                <AvatarFallback>{u.displayName?.[0] || u.email[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{u.displayName}</p>
                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                            </div>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 border-t pt-4">
                    <p className="text-sm font-medium">{selectedUserIds.length} pengguna dipilih.</p>
                    <Button 
                        onClick={handleSendBroadcast} 
                        disabled={isSending || !message.trim() || selectedUserIds.length === 0}
                        className="w-full sm:w-auto"
                    >
                        {isSending ? <Loader2 className="mr-2 animate-spin" /> : <Send className="mr-2" />}
                        {isSending ? 'Mengirim...' : `Kirim ke ${selectedUserIds.length} Pengguna`}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
