'use client';

import { useRouter } from 'next/navigation';
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

export default function NewNotaPage() {
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Here you would typically send the data to your backend API
    // For now, we'll just simulate a success and redirect.
    
    toast({
      title: 'Nota Created!',
      description: 'Your new nota has been saved successfully.',
    });

    // We use a timeout to let the user see the toast before redirecting
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="h-7 w-7">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 font-headline">
            Create a New Nota
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button type="submit">Save Nota</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nota Details</CardTitle>
            <CardDescription>
              Fill in the details for your new nota.
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
                  placeholder="e.g., Q3 Project Kick-off"
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write down your notes here..."
                  className="min-h-72"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-end gap-2 mt-4 md:hidden">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit">Save Nota</Button>
        </div>
      </form>
    </div>
  );
}
