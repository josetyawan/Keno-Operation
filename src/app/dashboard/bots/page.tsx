'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Bot, Send, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';


const bots = [
  {
    name: 'Bot Input Progres All Teknisi',
    username: '@B2BLapor_bot',
    description: 'Gunakan bot ini untuk melaporkan progres pekerjaan harian semua teknisi.',
    url: 'https://t.me/B2BLapor_bot',
  },
  {
    name: 'Bot Lembar SA',
    username: '@LembarSA_bot',
    description: 'Bot untuk mencari detail dan service number di dalam ODP khusus untuk area Kudus.',
    url: 'https://t.me/LembarSA_bot',
  }
];

export default function BotsPage() {
  const router = useRouter();

  return (
    <div className="mx-auto grid w-full flex-1 auto-rows-max gap-6">
       <div className="flex items-center gap-4">
        <Button onClick={() => router.back()} variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Daftar Bot Telegram</h1>
            <p className="text-muted-foreground mt-1">Kumpulan bot yang digunakan dalam alur kerja aplikasi.</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bots.map((bot) => (
          <Card key={bot.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                {bot.name}
              </CardTitle>
              <CardDescription>{bot.username}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{bot.description}</p>
              <Button asChild className="w-full">
                <Link href={bot.url} target="_blank" rel="noopener noreferrer">
                  <Send className="mr-2 h-4 w-4" /> Buka Bot
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
