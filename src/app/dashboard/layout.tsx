
'use client';

import { CreateRoomDialog } from '@/components/create-room-dialog';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { LayoutDashboard, Users, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'friendRequests'), where('receiverId', '==', user.uid), where('status', '==', 'pending'));
  }, [db, user]);

  const { data: pendingRequests } = useCollection(requestsQuery);

  const navItems = [
    { name: 'Rooms', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Friends', href: '/dashboard/friends', icon: Users, badge: pendingRequests?.length },
    { name: 'Settings', href: '/dashboard/profile', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-primary/10 bg-background/80 px-4 backdrop-blur-xl md:px-6 shadow-sm">
        <nav className="flex w-full items-center gap-4 lg:gap-8">
          <Logo />
          
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all rounded-xl relative",
                  pathname === item.href 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {!!item.badge && (
                  <Badge className="ml-1 h-4 min-w-4 p-1 text-[8px] bg-primary text-primary-foreground border-none">
                    {item.badge}
                  </Badge>
                )}
                {pathname === item.href && (
                  <span className="absolute bottom-[-17px] left-0 right-0 h-1 bg-primary rounded-t-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex-1" />
          
          <div className="flex items-center gap-4">
            <CreateRoomDialog />
            <UserNav />
          </div>
        </nav>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-card/90 backdrop-blur-xl border-t border-primary/10 flex items-center justify-around px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {!!item.badge && (
                <Badge className="absolute -top-1 -right-1 h-3 min-w-3 p-0.5 text-[6px] bg-primary text-primary-foreground">
                  {item.badge}
                </Badge>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
          </Link>
        ))}
      </nav>

      <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
