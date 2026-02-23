
'use client';

import Link from 'next/link';
import { LayoutGrid, Menu, LogOut, Users, Bot, Tags, Home, Network, Search, BarChart3, Map, FolderGit2, Contact, CalendarClock, ClipboardCheck, CalendarOff, UserCircle, Briefcase, Settings, Building, Wrench, CalendarDays, MessageSquare, Upload, Component } from 'lucide-react';
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
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: Home, access: 'public' },
  { href: '/dashboard/chat', label: 'Chat', icon: MessageSquare, access: 'public' },
  { href: '/dashboard/nota', label: 'Laporan Nota', icon: LayoutGrid, access: 'nota' },
  { href: '/dashboard/search-assets', label: 'Network Cek', icon: Search, access: 'allpro' },
  { href: '/dashboard/allpro', label: 'Network Service Area', icon: BarChart3, access: 'allpro' },
  { href: '/dashboard/hr/performance', label: 'Performa Teknisi', icon: BarChart3, access: 'public' },
  { href: '/dashboard/hr/attendance', label: 'Absensi Jaga', icon: ClipboardCheck, access: 'allpro' },
  { href: '/dashboard/alker', label: 'Daftar Pengecekan', icon: ClipboardCheck, access: 'allpro' },
  { href: '/dashboard/alker/new', label: 'Input Pengecekan Alker', icon: Wrench, access: 'allpro' },
  { href: '/dashboard/bots', label: 'Daftar Bot', icon: Bot, access: 'public' },
];

const adminNavGroups = [
  {
    title: 'HR',
    icon: UserCircle,
    links: [
      { href: '/dashboard/admin/users', label: 'Manajemen User', icon: Users, access: 'admin' },
      { href: '/dashboard/admin/hr/schedules', label: 'Manajemen Jadwal', icon: CalendarClock, access: 'korlap' },
      { href: '/dashboard/admin/hr/holidays', label: 'Manajemen Hari Libur', icon: CalendarOff, access: 'admin' },
      { href: '/dashboard/admin/hr/performance', label: 'Impor Performa', icon: Upload, access: 'korlap' },
      { href: '/dashboard/hr/work-schedule', label: 'Jadwal Kerja', icon: CalendarDays, access: 'korlap' },
      { href: '/dashboard/hr/attendance/rekap', label: 'Rekap Absensi', icon: ClipboardCheck, access: 'korlap' },
      { href: '/dashboard/alker/rekap', label: 'Rekap Alker', icon: ClipboardCheck, access: 'korlap' },
      { href: '/dashboard/admin/hr/manual-rekap', label: 'Trigger Rekap Manual', icon: Bot, access: 'korlap' },
    ]
  },
  {
    title: 'FINANCE',
    icon: Briefcase,
    links: [
      { href: '/dashboard/admin/pids', label: 'Manajemen PID', icon: Tags, access: 'admin' },
      { href: '/dashboard/rekap', label: 'Rekap Pembayaran', icon: Bot, access: 'admin' },
    ]
  },
  {
    title: 'NETWORK',
    icon: Network,
    links: [
      { href: '/dashboard/admin/assets', label: 'Manajemen Aset', icon: Settings, access: 'admin' },
      { href: '/dashboard/admin/inventory/orbit', label: 'Inventory Orbit', icon: Component, access: 'admin' },
      { href: '/dashboard/admin/map-links', label: 'Manajemen Peta', icon: Map, access: 'admin' },
      { href: '/dashboard/admin/mancore', label: 'Manajemen Mancore', icon: FolderGit2, access: 'admin' },
    ]
  },
  {
    title: 'OPERATION',
    icon: Building,
    links: [
      { href: '/dashboard/admin/pelanggan', label: 'Data Pelanggan', icon: Contact, access: 'korlap' },
    ]
  }
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

function NavLink({ href, label, icon: Icon, isActive }: { href: string, label: string, icon: React.ElementType, isActive: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
}

function MobileNavLink({ href, label, icon: Icon, isActive }: { href: string, label: string, icon: React.ElementType, isActive: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                isActive && "bg-muted"
            )}
        >
            <Icon className="h-5 w-5" />
            {label}
        </Link>
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
  const [isReady, setIsReady] = useState(false);

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

  useEffect(() => {
    const checkUserStatus = () => {
      // Wait until both auth and profile loading are complete
      if (isUserLoading || isProfileLoading) {
        return; 
      }

      // If there's no authenticated user, redirect to login
      if (!user) {
        router.push('/login');
        return;
      }
      
      // If the user is authenticated but their profile document is missing, sign them out with an error.
      if (!userProfile) {
          handleSignOutAndRedirect('Profil Tidak Ditemukan', 'Data profil Anda tidak dapat ditemukan di database. Hubungi admin.');
          return;
      }

      // If the profile exists but is not approved, sign out with an explanation.
      if (userProfile.registrationStatus !== 'approved') {
          const title = userProfile.registrationStatus === 'pending' ? 'Akun Menunggu Persetujuan' : 'Akses Ditolak';
          const description = userProfile.registrationStatus === 'pending' 
              ? 'Akun Anda sedang menunggu persetujuan dari admin.'
              : `Status akun Anda adalah "${userProfile.registrationStatus}". Silakan hubungi admin.`;
          
          handleSignOutAndRedirect(title, description);
          return;
      }
      
      // If all checks pass, the layout is ready
      setIsReady(true);
    };

    checkUserStatus();

  }, [user, userProfile, isUserLoading, isProfileLoading, router, handleSignOutAndRedirect]);

  if (!isReady) {
    return <DashboardSkeleton />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  const isKorlap = userProfile?.role === 'korlap';

  const getFilteredNavLinks = (isMobile: boolean) => {
    const NavComponent = isMobile ? MobileNavLink : NavLink;
    return navLinks
      .filter(link => {
        const appAccess = userProfile?.appAccess;
        if (isAdmin || isKorlap || link.access === 'public') return true;
        if (appAccess === 'all') return true;
        return link.access === appAccess;
      })
      .map(link => (
        <NavComponent
          key={link.href}
          href={link.href}
          label={link.label}
          icon={link.icon}
          isActive={pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')}
        />
      ));
  };
  
  const getFilteredAdminLinks = (isMobile: boolean) => {
    const NavComponent = isMobile ? MobileNavLink : NavLink;
    return adminNavGroups.map(group => {
        const filteredLinks = group.links.filter(link => {
            if (link.access === 'admin') return isAdmin;
            if (link.access === 'korlap') return isAdmin || isKorlap;
            return false;
        });

        if (filteredLinks.length === 0) return null;

        return (
            <div key={group.title} className="mt-4 first:mt-0">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <group.icon className="h-4 w-4" />
                  {group.title}
                </p>
                {filteredLinks.map(link => (
                    <NavComponent
                        key={link.href}
                        href={link.href}
                        label={link.label}
                        icon={link.icon}
                        isActive={pathname.startsWith(link.href)}
                    />
                ))}
            </div>
        );
    });
  };


  return (
    <div id="main-dashboard-layout" className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-secondary/50 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Logo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start px-2 py-4 text-sm font-medium">
               {getFilteredNavLinks(false)}
               {(isAdmin || isKorlap) && (
                <div className="mt-4 border-t pt-4">
                  {getFilteredAdminLinks(false)}
                </div>
               )}
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
                {getFilteredNavLinks(true)}
                 {(isAdmin || isKorlap) && (
                    <div className="mt-4 border-t pt-4">
                        {getFilteredAdminLinks(true)}
                    </div>
                )}
              </nav>
              <div className="mt-auto">
                  <Card>
                  <CardHeader>
                    <CardTitle>Log Out</CardTitle>
                    <CardDescription>
                      Siap untuk keluar? Klik di bawah untuk keluar dari sesi Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" className="w-full" onClick={() => router.push('/goodbye')}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
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

    