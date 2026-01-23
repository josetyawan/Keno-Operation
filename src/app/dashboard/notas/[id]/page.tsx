'use client';

import { notFound, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { format } from 'date-fns';
import { SummarizeButton } from './summarize-button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Edit, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function NotaDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  const notaRef = useMemoFirebase(() => {
    return doc(firestore, 'notas', params.id);
  }, [firestore, params.id]);

  const { data: nota, isLoading, error } = useDoc<Nota>(notaRef);

  const handleVerify = () => {
    if (!isAdmin || !notaRef) return;
    updateDocumentNonBlocking(notaRef, { status: 'verified' });
    toast({
      title: 'Nota Verified',
      description: 'The nota status has been updated to "verified".',
    });
  };

  if (isLoading) {
      return (
         <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
             <div className="flex items-center gap-4">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-6 w-16 ml-auto rounded-full" />
             </div>
             <Skeleton className="h-96 w-full" />
         </div>
      )
  }

  if (error) {
    console.error(error);
    notFound();
  }

  if (!nota) {
    notFound();
  }

  const dateCreatedDate = nota.dateCreated?.toDate ? nota.dateCreated.toDate() : new Date();
  const isOwner = user?.uid === nota.userId;

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-6">
       <div className="flex items-center gap-4">
         <Link href="/dashboard">
          <Button variant="outline" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
         </Link>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline truncate">
          {nota.title}
        </h1>
        <Badge 
          variant={nota.status === 'verified' ? 'default' : 'secondary'} 
          className="ml-auto sm:ml-0 capitalize"
        >
          {nota.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{nota.title}</CardTitle>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardDescription>
              By {nota.userEmail} on {format(dateCreatedDate, 'PPPPp')}
            </CardDescription>
            <SummarizeButton notaContent={nota.content} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-foreground whitespace-pre-wrap text-sm">
            {nota.content}
          </div>
        </CardContent>
         <CardFooter className="border-t pt-6 flex-col sm:flex-row gap-2">
            <div className="flex-grow text-xs text-muted-foreground">
                Nota ID: {nota.id}
            </div>
            <div className="flex gap-2">
                {(isOwner || isAdmin) && (
                     <Link href={`/dashboard/notas/${params.id}/edit`}>
                        <Button variant="outline">
                            <Edit /> Edit
                        </Button>
                     </Link>
                )}
                {isAdmin && nota.status === 'pending' && (
                    <Button onClick={handleVerify}>
                        <CheckCircle /> Verify Nota
                    </Button>
                )}
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
