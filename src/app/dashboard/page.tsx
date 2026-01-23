'use client';

import Link from 'next/link';
import type { Nota, UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, PlusCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, collectionGroup, query, orderBy, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

function NotaCard({ nota, isAdmin }: { nota: Nota, isAdmin: boolean }) {
  const dateCreatedDate = nota.dateCreated?.toDate ? nota.dateCreated.toDate() : new Date();
  
  return (
    <Card className="flex flex-col transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">{nota.title}</CardTitle>
        <CardDescription>
          {isAdmin && <span className="text-xs block truncate mb-1">User: {nota.userId}</span>}
          Created on {format(dateCreatedDate, 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {nota.content}
        </p>
      </CardContent>
      <CardFooter>
        <Link href={`/dashboard/notas/${nota.id}`} className="w-full">
          <Button variant="outline" className="w-full">
            View Nota
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = userProfile?.role === 'admin';

  const notasQuery = useMemoFirebase(() => {
    if (!user || isProfileLoading) return null;

    if (isAdmin) {
      return query(collectionGroup(firestore, 'notas'), orderBy('dateCreated', 'desc'));
    }
    
    return query(collection(firestore, 'users', user.uid, 'notas'), orderBy('dateCreated', 'desc'));
  }, [user, firestore, isProfileLoading, isAdmin]);

  const { data: notas, isLoading: areNotasLoading } = useCollection<Nota>(notasQuery);

  const isLoading = isProfileLoading || areNotasLoading;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold md:text-3xl font-headline">
                {isAdmin ? "All User Notas" : "Your Notas"}
            </h1>
            {isAdmin && <ShieldCheck className="h-6 w-6 text-primary" />}
        </div>
        <Link href="/dashboard/new">
            <Button className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4"/>
              New Nota
            </Button>
          </Link>
      </div>
      {isLoading && (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {!isLoading && notas && notas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {notas.map((nota) => (
            <NotaCard key={nota.id} nota={nota} isAdmin={isAdmin} />
          ))}
        </div>
      ) : (
        !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 p-12 text-center h-[400px]">
          <h3 className="text-xl font-semibold tracking-tight">
            {isAdmin ? "No notas found across all users." : "You have no notas yet."}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by creating a new one.
          </p>
          <Link href="/dashboard/new">
            <Button>Create Nota</Button>
          </Link>
        </div>
        )
      )}
    </>
  );
}
