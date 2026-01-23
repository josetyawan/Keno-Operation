'use client';

import { notFound } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format } from 'date-fns';
import { SummarizeButton } from './summarize-button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Nota } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotaDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const notaRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid, 'notas', params.id);
  }, [user, firestore, params.id]);

  const { data: nota, isLoading, error } = useDoc<Nota>(notaRef);

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
    // This could be a permissions error, log it and show not found
    console.error(error);
    notFound();
  }

  if (!nota) {
    notFound();
  }

  const createdAtDate = nota.createdAt?.toDate ? nota.createdAt.toDate() : new Date();

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
        <Badge variant="outline" className="ml-auto sm:ml-0">
          Nota
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{nota.title}</CardTitle>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardDescription>
              Created on {format(createdAtDate, 'PPPPp')}
            </CardDescription>
            <SummarizeButton notaContent={nota.content} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-foreground whitespace-pre-wrap text-sm">
            {nota.content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
