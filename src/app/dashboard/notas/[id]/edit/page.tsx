'use client';

import { notFound, useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Nota, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditNotaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get user profile to check for admin role
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';

  // Get the nota document
  const notaRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'notas', id);
  }, [firestore, id]);

  const { data: nota, isLoading: isNotaLoading } = useDoc<Nota>(notaRef);

  // Populate form when nota data is loaded
  useEffect(() => {
    if (nota) {
      setTitle(nota.title);
      setContent(nota.content);
    }
  }, [nota]);
  
  // Security check: ensure user is owner or admin
  useEffect(() => {
    if (!isNotaLoading && nota) {
        const isOwner = user?.uid === nota.userId;
        if (!isOwner && !isAdmin) {
            toast({
                variant: 'destructive',
                title: 'Unauthorized',
                description: "You don't have permission to edit this nota.",
            });
            router.push('/dashboard');
        }
    }
  }, [isNotaLoading, nota, user, isAdmin, router, toast]);


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notaRef) return;
    
    setIsSaving(true);

    const updatedData = {
        title,
        content,
    };
    
    updateDocumentNonBlocking(notaRef, updatedData);

    toast({
      title: 'Nota Updated!',
      description: 'Your nota has been saved successfully.',
    });
    
    // Redirect immediately, optimistic update
    router.push(`/dashboard/notas/${id}`);
  }
  
  if (isNotaLoading || !nota) {
     return (
        <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-7 w-7" />
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
                    <Skeleton className="h-6 w-48" />
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6">
                        <div className="grid gap-3">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid gap-3">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-72 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Link href={`/dashboard/notas/${id}`}>
            <Button variant="outline" size="icon" className="h-7 w-7" type="button">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Edit Nota
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href={`/dashboard/notas/${id}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Edit Nota Details</CardTitle>
            <CardDescription>
              Make changes to your nota below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  className="w-full"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  className="min-h-72"
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Link href={`/dashboard/notas/${id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </div>
  );
}
