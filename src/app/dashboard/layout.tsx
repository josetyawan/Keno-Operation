'use client';

import Link from 'next/link';
import { LayoutGrid, Menu, LogOut, Users, Bot, Tags } from 'lucide-react';
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
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid, adminOnly: false },
  { href: '/dashboard/admin/users', label: 'Manajemen User', icon: Users, adminOnly: true },
  { href: '/dashboard/admin/pids', label: 'Manajemen PID', icon: Tags, adminOnly: true },
  { href: '/dashboard/rekap', label: 'Rekap Telegram', icon: Bot, adminOnly: true },
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

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const handleSignOutAndRedirect = useCallback((title: string, description: string) => {
    // Prevent multiple sign-outs
    if (auth.currentUser) {
        auth.signOut().then(() => {
            toast({
                title,
                description,
                variant: title.includes('Gagal') ? 'destructive' : 'default',
                duration: 9000,
            });
            router.push('/login');
        });
    } else if (router) {
        router.push('/login');
    }
  }, [auth, router, toast]);

  // Combined effect for user state management (redirection, self-healing, promotion)
  useEffect(() => {
    // Wait for all data to be loaded before making any decisions.
    if (isUserLoading || isProfileLoading) {
      return;
    }

    // Case 1: No user, redirect to login.
    if (!user) {
      router.push('/login');
      return;
    }

    // Case 2: User exists, but no profile. Self-heal.
    if (!userProfile) {
        console.warn(`User profile for ${user.uid} is missing. Creating a new default profile.`);
        
        const newUserDocRef = doc(firestore, 'users', user.uid);
        const newUserProfileData: UserProfile = {
            id: user.uid,
            email: user.email!,
            role: 'user',
            registrationStatus: 'pending',
            displayName: user.email?.split('@')[0] || 'New User',
            firstName: '',
            lastName: '',
            nik: '',
            phone: '',
        };

        setDoc(newUserDocRef, newUserProfileData, { merge: true }).catch(err => {
            console.error("CRITICAL: Failed to create missing user profile document.", err);
            handleSignOutAndRedirect(
                'Gagal Membuat Profil',
                'Terjadi kesalahan kritis saat mencoba memperbaiki akun Anda. Hubungi admin.'
            );
        });

        handleSignOutAndRedirect(
            'Profil Baru Dibuat',
            'Profil Anda telah dibuat. Akun Anda kini menunggu persetujuan admin. Silakan coba masuk lagi nanti.'
        );
        return;
    }

    // From this point, we know we have a user and a profile.
    const isSuperAdmin = user.email === 'jokowahyusisnaker123@gmail.com';
    const profileNeedsUpgrade = userProfile.role !== 'admin' || userProfile.registrationStatus !== 'approved';

    // Case 3: Super admin promotion.
    if (isSuperAdmin && profileNeedsUpgrade) {
      console.log("Super admin detected. Upgrading account privileges...");
      const userToUpgradeRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userToUpgradeRef, {
        role: 'admin',
        registrationStatus: 'approved'
      });
      toast({
        title: "Admin Privileges Granted",
        description: "Your account has been automatically upgraded to Admin.",
      });
      // Important: Stop execution here. Do not proceed to other checks.
      // The effect will re-run when the profile is updated.
      return; 
    }

    // Case 4: Regular user is pending.
    // This check will not run for a super admin because of the explicit check and return above.
    if (!isSuperAdmin && userProfile.registrationStatus === 'pending') {
      handleSignOutAndRedirect(
        'Akun Menunggu Persetujuan',
        'Akun Anda telah didaftarkan dan sedang menunggu persetujuan dari admin.'
      );
      return;
    }

    // If we reach here, user is either a fully promoted super admin,
    // or an approved regular user. No action needed.

  }, [user, isUserLoading, userProfile, isProfileLoading, router, firestore, handleSignOutAndRedirect, toast]);


  // Show skeleton while loading auth or profile (if user object exists)
  if (isUserLoading || (user && isProfileLoading)) {
      return <DashboardSkeleton />;
  }

  // Do not render the dashboard if the user is not approved or doesn't exist
  // The useEffect above will handle the redirection or profile creation.
  if (!user || !userProfile || (userProfile.role !== 'admin' && userProfile.registrationStatus !== 'approved')) {
      return <DashboardSkeleton />;
  }

  // If all checks pass, render the dashboard.
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
