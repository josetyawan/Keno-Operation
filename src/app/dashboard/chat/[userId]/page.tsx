
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { PrivateMessage, UserProfile, ChatRoom } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';

export default function PrivateChatPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.userId as string;

  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Memoize the chat ID to prevent re-computation on every render
  const chatId = useMemo(() => {
    if (!user || !otherUserId) return null;
    return [user.uid, otherUserId].sort().join('_');
  }, [user, otherUserId]);

  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore])
  );
  
  const { data: otherUserProfile, isLoading: isOtherProfileLoading } = useDoc<UserProfile>(
    useMemoFirebase(() => (otherUserId ? doc(firestore, 'users', otherUserId) : null), [otherUserId, firestore])
  );

  const messagesQuery = useMemoFirebase(() => {
    if (!chatId) return null;
    return query(collection(firestore, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
  }, [firestore, chatId]);

  const { data: messages, isLoading: areMessagesLoading } = useCollection<PrivateMessage>(messagesQuery);
  const chatRoomRef = useMemoFirebase(() => chatId ? doc(firestore, 'chats', chatId) : null, [chatId, firestore]);
  const { data: chatRoom } = useDoc<ChatRoom>(chatRoomRef);

  const threeDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    return date;
  }, []);

  const recentMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => {
      // Show message if it has no timestamp yet (optimistic update)
      if (!msg.createdAt?.toDate) return true;
      // Otherwise, only show if it's within the last 3 days
      return msg.createdAt.toDate() > threeDaysAgo;
    });
  }, [messages, threeDaysAgo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [recentMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !currentUserProfile || !otherUserProfile || !chatId) return;

    const batch = writeBatch(firestore);

    // 1. Create the new message document
    const messageRef = doc(collection(firestore, 'chats', chatId, 'messages'));
    const messageData: Omit<PrivateMessage, 'id'> = {
      text: newMessage.trim(),
      userId: user.uid,
      createdAt: serverTimestamp(),
    };
    batch.set(messageRef, messageData);
    
    // 2. Create or update the chat room metadata
    const chatRoomData: Partial<ChatRoom> = {
      participants: [user.uid, otherUserProfile.id],
      participantNames: {
          [user.uid]: currentUserProfile.displayName || currentUserProfile.email,
          [otherUserProfile.id]: otherUserProfile.displayName || otherUserProfile.email,
      },
      participantAvatars: {
          [user.uid]: currentUserProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.displayName || currentUserProfile.email)}&background=random`,
          [otherUserProfile.id]: otherUserProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserProfile.displayName || otherUserProfile.email)}&background=random`,
      },
      lastMessageText: newMessage.trim(),
      lastMessageTimestamp: serverTimestamp(),
    };

    if (!chatRoom) { // If chat room doesn't exist, create it with ID
        const newChatRoomData: ChatRoom = {
            id: chatId,
            ...chatRoomData
        } as ChatRoom;
        batch.set(chatRoomRef!, newChatRoomData);
    } else { // Otherwise, update it
        batch.update(chatRoomRef!, chatRoomData);
    }

    try {
      await batch.commit();
      setNewMessage('');
    } catch (error) {
      console.error("Error sending private message:", error);
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading || isOtherProfileLoading || areMessagesLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-h-[calc(100vh-100px)]">
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={() => router.push('/dashboard/chat')} variant="outline" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Kembali</span>
        </Button>
         <Avatar>
            <AvatarImage src={otherUserProfile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserProfile?.displayName || otherUserProfile?.email || ' ')}&background=random`} />
            <AvatarFallback>{otherUserProfile?.displayName?.[0] || otherUserProfile?.email?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{otherUserProfile?.displayName || '...'}</h1>
          <p className="text-sm text-muted-foreground">{otherUserProfile?.email || 'Memuat...'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-muted/50 rounded-lg space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        ) : recentMessages && recentMessages.length > 0 ? (
          recentMessages.map((msg) => {
            const isCurrentUser = msg.userId === user?.uid;
            const messageDate = msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'p', { locale: idLocale }) : '';

            return (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', isCurrentUser ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'p-3 rounded-lg max-w-xs md:max-w-md lg:max-w-lg',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-card border rounded-bl-none'
                  )}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                  <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>{messageDate}</p>
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
          placeholder="Ketik pesan pribadi..."
          autoComplete="off"
          disabled={isLoading || !otherUserProfile}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoading || !otherUserProfile}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Kirim</span>
        </Button>
      </form>
    </div>
  );
}
