import { getNotaById } from '@/lib/data';
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

export default async function NotaDetailPage({ params }: { params: { id: string } }) {
  const nota = await getNotaById(params.id);

  if (!nota) {
    notFound();
  }

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
              Created on {format(new Date(nota.createdAt), 'PPPPp')}
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
