
'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Message, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function GroupChatPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );

  const messagesQuery = useMemoFirebase(() => {
    if (!userProfile || userProfile.registrationStatus !== 'approved') {
        return null;
    }
    return query(collection(firestore, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, userProfile]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userProfile) return;

    const messageData = {
      text: newMessage.trim(),
      userId: user.uid,
      userName: userProfile.displayName || user.email,
      userAvatar: userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || user.email!)}&background=random`,
      createdAt: serverTimestamp(),
    };

    try {
      await addDocumentNonBlocking(collection(firestore, 'messages'), messageData);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || areMessagesLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-h-[calc(100vh-100px)]">
        <div className="flex items-center gap-4 mb-4">
            <Button onClick={() => router.push('/dashboard/chat')} variant="outline" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
            </Button>
            <div>
                <h1 className="text-xl font-bold tracking-tight">Group Chat Internal</h1>
                <p className="text-sm text-muted-foreground">Komunikasi antar tim secara real-time.</p>
            </div>
        </div>

      <div className="flex-1 overflow-y-auto p-4 bg-muted/50 rounded-lg space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg, index) => {
            const isCurrentUser = msg.userId === user?.uid;
            const showAvatarAndName = index === 0 || messages[index - 1]?.userId !== msg.userId;
            const messageDate = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'p', { locale: idLocale }) : '';

            return (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
              >
                {!isCurrentUser && (
                  <div className="w-8 shrink-0">
                    {showAvatarAndName && (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.userAvatar} />
                            <AvatarFallback>{msg.userName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                    )}
                  </div>
                )}
                <div className={cn("max-w-xs md:max-w-md lg:max-w-lg", isCurrentUser && "text-right")}>
                  {showAvatarAndName && !isCurrentUser && (
                    <p className="text-xs text-muted-foreground mb-1">{msg.userName}</p>
                  )}
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      isCurrentUser
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-card border rounded-bl-none'
                    )}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                    <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>{messageDate}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-muted-foreground">Belum ada pesan. Mulai percakapan!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="mt-4 flex items-center gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ketik pesan..."
          autoComplete="off"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoading}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Kirim</span>
        </Button>
      </form>
    </div>
  );
}
