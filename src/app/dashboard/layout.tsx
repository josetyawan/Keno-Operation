'use client';

import Link from 'next/link';
import { LayoutGrid, Menu, LogOut, Users, Bot, Tags, Home, Network, Search } from 'lucide-react';
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
import { useEffect, useCallback, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: Home, adminOnly: false, requiresAllAccess: false },
  { href: '/dashboard/nota', label: 'Laporan Nota', icon: LayoutGrid, adminOnly: false, requiresAllAccess: false },
  { href: '/dashboard/search-assets', label: 'Pencarian Aset', icon: Search, adminOnly: false, requiresAllAccess: true },
  { href: '/dashboard/admin/users', label: 'Manajemen User', icon: Users, adminOnly: true, requiresAllAccess: false },
  { href: '/dashboard/admin/pids', label: 'Manajemen PID', icon: Tags, adminOnly: true, requiresAllAccess: false },
  { href: '/dashboard/admin/assets', label: 'Manajemen Aset', icon: Network, adminOnly: true, requiresAllAccess: false },
  { href: '/dashboard/rekap', label: 'Rekap Telegram', icon: Bot, adminOnly: true, requiresAllAccess: false },
];

function DashboardSkeleton() {
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
          <div className="hidden border-r bg-card md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
              <div className="flex h-16 items-center border-b px-6">
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="flex-1 p-4">
                <Skeleton className="h-8 w-full mb-2" />
                 <Skeleton className="h-8 w-full" />
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
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="border rounded-lg p-2">
                  <Skeleton className="h-12 w-full mb-2" />
                  <Skeleton className="h-12 w-full" />
              </div>
            </main>
          </div>
        </div>
      );
}


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
  const [isReady, setIsReady] = useState(false); // New state to control rendering

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const handleSignOutAndRedirect = useCallback((title: string, description: string) => {
    if (auth.currentUser) {
        auth.signOut().then(() => {
            toast({
                title,
                description,
                variant: title.includes('Gagal') ? 'destructive' : 'default',
                duration: 9000,
            });
            if (router) router.push('/login');
        });
    } else if (router) {
        router.push('/login');
    }
  }, [auth, router, toast]);

  // This robust effect ensures all authorization checks are complete before rendering the UI.
  useEffect(() => {
    const checkUserStatus = async () => {
      // 1. Wait for auth and profile data to be definitively loaded.
      if (isUserLoading || isProfileLoading) {
        return; // Still loading, wait for the next run.
      }

      // 2. If no user is authenticated, redirect to login. This is a final state.
      if (!user) {
        router.push('/login');
        return;
      }
      
      // 3. Handle the Super Admin case first. This is a special override.
      const isSuperAdmin = user.email === 'jokowahyusisnaker123@gmail.com';
      if (isSuperAdmin) {
        const needsFixing = !userProfile || userProfile.role !== 'admin' || userProfile.registrationStatus !== 'approved';
        
        if (needsFixing) {
            console.log("Super admin account requires setup or correction. Applying admin privileges...");
            const userToUpgradeRef = doc(firestore, 'users', user.uid);
            try {
                // Use setDoc with merge:true to either create or update the document.
                await setDoc(userToUpgradeRef, { 
                    id: user.uid,
                    email: user.email,
                    role: 'admin', 
                    registrationStatus: 'approved',
                    displayName: user.email?.split('@')[0] || 'Super Admin',
                }, { merge: true });

                toast({
                    title: "Sinkronisasi Akun Admin",
                    description: "Hak akses admin Anda telah dikonfigurasi ulang. Halaman akan dimuat ulang.",
                });
                 // We don't log out the admin. We let the hooks re-fetch the updated profile.
                // The component will re-render with correct permissions.
                // setIsReady(true) will be hit on the next re-render cycle.
            } catch (err) {
                console.error("CRITICAL: Failed to create or promote super admin.", err);
                handleSignOutAndRedirect('Gagal Konfigurasi Admin', 'Gagal mengatur hak akses admin Anda.');
            }
            return; // Important: Return to allow re-running the effect with new profile data.
        }
      } else {
        // 4. Handle regular users.
        if (!userProfile) {
          console.warn(`User profile for ${user.uid} is missing. Creating new default profile.`);
          const newUserDocRef = doc(firestore, 'users', user.uid);
          const newUserProfileData: UserProfile = {
            id: user.uid,
            email: user.email!,
            role: 'user',
            registrationStatus: 'pending',
            appAccess: 'nota',
            displayName: user.email?.split('@')[0] || 'New User',
            firstName: '',
            lastName: '',
            nik: '',
            phone: '',
          };

          try {
            await setDoc(newUserDocRef, newUserProfileData);
            handleSignOutAndRedirect(
              'Profil Baru Dibuat',
              'Profil Anda telah dibuat & menunggu persetujuan. Silakan coba masuk lagi nanti.'
            );
          } catch (err) {
            console.error("CRITICAL: Failed to create missing user profile document.", err);
            handleSignOutAndRedirect('Gagal Membuat Profil', 'Terjadi kesalahan kritis saat membuat akun Anda.');
          }
          return; // Stop further execution.
        }

        if (userProfile.registrationStatus === 'pending') {
          handleSignOutAndRedirect(
            'Akun Menunggu Persetujuan',
            'Akun Anda sedang menunggu persetujuan dari admin.'
          );
          return;
        }
      }
      
      // 5. If all checks have passed, the user is authorized. Mark as ready to render.
      setIsReady(true);
    };

    checkUserStatus();

  }, [user, userProfile, isUserLoading, isProfileLoading, router, firestore, handleSignOutAndRedirect, toast]);

  // This is the primary render guard. It shows a skeleton until the `useEffect` above
  // explicitly sets `isReady` to true, preventing any premature rendering of child components.
  if (!isReady) {
    return <DashboardSkeleton />;
  }

  // If we are ready, we can safely render the dashboard.
  // userProfile is guaranteed to exist and have the correct role at this point.
  return (
    <div id="main-dashboard-layout" className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
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
                const isAdmin = userProfile?.role === 'admin';
                if (link.adminOnly && !isAdmin) return null;
                if (link.requiresAllAccess && !isAdmin && userProfile?.appAccess !== 'all') return null;

                const isActive = link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href);

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
                  const isAdmin = userProfile?.role === 'admin';
                  if (link.adminOnly && !isAdmin) return null;
                  if (link.requiresAllAccess && !isAdmin && userProfile?.appAccess !== 'all') return null;
                  
                  const isActive = link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href);
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
