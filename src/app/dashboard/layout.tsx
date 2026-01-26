'use client';

import Link from 'next/link';
import {
  LayoutGrid,
  Menu,
  LogOut,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
    // Wait until loading is complete and not in the process of signing out
    if (isLoading || isSigningOut) {
      return;
    }

    // Case 1: No user is logged in. Redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }
    
    const handleSignOutAndRedirect = (title: string, description: string) => {
        setIsSigningOut(true); // Prevent this from running again
        auth.signOut().then(() => {
            toast({
                title,
                description,
                variant: title.includes('Gagal') ? 'destructive' : 'default',
                duration: 5000,
            });
            router.push('/login');
        });
    };

    // Case 2: A user is logged in, but their profile document doesn't exist.
    if (!userProfile) {
        handleSignOutAndRedirect(
            'Gagal Memuat Profil',
            'Tidak dapat menemukan data pengguna. Silakan login kembali.'
        );
        return;
    }

    // Case 3: The user's registration is still pending.
    if (userProfile.registrationStatus === 'pending') {
      handleSignOutAndRedirect(
        'Akun Menunggu Persetujuan',
        'Akun Anda telah didaftarkan dan sedang menunggu persetujuan dari admin.'
      );
    }
  }, [user, userProfile, isLoading, isSigningOut, router, auth, toast]);

  const showDashboard = !isLoading && userProfile?.registrationStatus === 'approved';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, adminOnly: false },
    { href: '/dashboard/admin/users', label: 'Manajemen User', icon: Users, adminOnly: true },
  ];

  // If the user is fully approved, render the dashboard.
  if (showDashboard) {
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-secondary/50 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-16 items-center border-b px-6">
              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                <Logo />
              </Link>
            </div>
            <div className="flex-1">
              <nav className="grid items-start px-4 py-4 text-sm font-medium">
                {navLinks.map(link => {
                  if (link.adminOnly && userProfile?.role !== 'admin') return null;
                  const isActive = pathname.startsWith(link.href) && (link.href === '/dashboard' ? pathname === link.href : true);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <nav className="grid gap-2 text-lg font-medium">
                  <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold mb-4"
                  >
                    <Logo />
                  </Link>
                  {navLinks.map(link => {
                    if (link.adminOnly && userProfile?.role !== 'admin') return null;
                    const isActive = pathname.startsWith(link.href);
                    return (
                       <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                          isActive && "bg-muted"
                        )}
                      >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="mt-auto">
                   <Card>
                    <CardHeader>
                      <CardTitle>Log Out</CardTitle>
                      <CardDescription>
                        Ready to leave? Click below to sign out.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button size="sm" className="w-full" onClick={() => auth.signOut()}>
                         <LogOut className="mr-2 h-4 w-4" />
                         Logout
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
            <div className="w-full flex-1">
              {/* Can add a search bar here if needed */}
            </div>
            <UserNav />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // In ALL other cases (loading, signing out, redirecting, etc.), render the skeleton layout.
  // This prevents the blank screen from ever appearing.
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
             <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-8 w-full mb-2" />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Skeleton className="h-8 w-8 md:hidden" />
          <div className="w-full flex-1">
           {/* Search */}
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="border rounded-lg p-2">
              <Skeleton className="h-12 w-full mb-2" />
              <Skeleton className="h-12 w-full" />
          </div>
        </main>
      </div>
    </div>
  );
}
