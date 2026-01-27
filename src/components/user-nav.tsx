'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { User, LayoutDashboard, Settings, LogOut } from 'lucide-react';

export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
        <Link href="/">Sign In</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-primary/20 p-0.5 transition-all hover:scale-110 ring-primary/20 hover:ring-2">
          <Avatar className="h-full w-full">
            <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {user.displayName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-primary/20 bg-card/95 backdrop-blur-3xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none font-headline">{user.displayName || 'Student'}</p>
            <p className="text-[10px] leading-none text-muted-foreground font-mono truncate">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-primary/10" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild className="rounded-md focus:bg-primary/10 focus:text-primary cursor-pointer h-10">
            <Link href="/dashboard" className="flex items-center">
              <LayoutDashboard className="mr-3 h-4 w-4" />
              My Workspace
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="rounded-md focus:bg-primary/10 focus:text-primary cursor-pointer h-10">
            <Link href="/dashboard/profile" className="flex items-center">
              <Settings className="mr-3 h-4 w-4" />
              Account Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-primary/10" />
        <DropdownMenuItem onClick={handleLogout} className="p-3 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-bold h-10">
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}