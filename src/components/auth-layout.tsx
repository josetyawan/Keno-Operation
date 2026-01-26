import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const loginBg = PlaceHolderImages.find(p => p.id === 'login-background');

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
             <div className="flex justify-center">
               <Logo className="items-center" />
            </div>
            <h1 className="text-3xl font-bold font-headline mt-4">Aplikasi Pelaporan Nota</h1>
            <p className="text-balance text-muted-foreground">
              Silakan masuk atau daftar untuk melanjutkan.
            </p>
          </div>
          {children}
        </div>
      </div>
      <div className="hidden bg-muted lg:block relative">
        {loginBg && (
          <Image
            src={loginBg.imageUrl}
            alt={loginBg.description}
            data-ai-hint={loginBg.imageHint}
            fill
            sizes="(max-width: 1023px) 0vw, 50vw"
            className="object-cover"
          />
        )}
      </div>
    </div>
  );
}
