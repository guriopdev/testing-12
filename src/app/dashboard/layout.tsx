
'use client';

import { useState, useEffect } from 'react';
import { CreateRoomDialog } from '@/components/create-room-dialog';
import { UsernameSetupDialog } from '@/components/username-setup-dialog';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { LayoutDashboard, Users, MessageSquare, CheckSquare, Clock, Trophy, Video } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const [lastActiveRoom, setLastActiveRoom] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Check for active session in session storage
    const roomId = sessionStorage.getItem('last_active_room_id');
    const roomName = sessionStorage.getItem('last_active_room_name');
    
    // Only show the resume banner if we're not currently in that room
    if (roomId && !pathname.includes(`/room/${roomId}`)) {
      setLastActiveRoom({ id: roomId, name: roomName || 'Recent Meeting' });
    } else {
      setLastActiveRoom(null);
    }
  }, [pathname]);

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'friendRequests'), where('receiverId', '==', user.uid), where('status', '==', 'pending'));
  }, [db, user]);

  const { data: pendingRequests } = useCollection(requestsQuery);

  const navItems = [
    { name: 'Rooms', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Social', href: '/dashboard/friends', icon: Users, badge: pendingRequests?.length },
    { name: 'Chats', href: '/dashboard/messages', icon: MessageSquare },
    { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Focus', href: '/dashboard/timer', icon: Clock },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <UsernameSetupDialog />
      
      {/* Resume Session Banner */}
      {lastActiveRoom && (
        <div className="bg-primary/20 border-b border-primary/20 py-2 px-4 flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest truncate max-w-[200px]">
              Active Session: {lastActiveRoom.name}
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 border-primary/30 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary hover:text-primary-foreground">
            <Link href={`/room/${lastActiveRoom.id}`}>
              Resume <Video className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

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
                  pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === '/dashboard' : true)
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
              pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === '/dashboard' : true)
                ? "text-primary" 
                : "text-muted-foreground"
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
