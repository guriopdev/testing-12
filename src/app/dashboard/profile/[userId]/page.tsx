
'use client';

import { use, useEffect, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MessageSquare, Globe, Trophy, Clock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const unwrappedParams = use(params);
  const targetUserId = unwrappedParams.userId;
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userRef = useMemoFirebase(() => doc(db, 'users', targetUserId), [db, targetUserId]);
  const { data: profileUser, isLoading } = useDoc(userRef);

  const isOwnProfile = currentUser?.uid === targetUserId;

  const formatStudyTime = (seconds: number = 0) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleStartChat = () => {
    if (!currentUser || isOwnProfile) return;
    const chatId = [currentUser.uid, targetUserId].sort().join('_');
    const chatRef = doc(db, 'directChats', chatId);
    
    setDocumentNonBlocking(chatRef, {
      participantIds: [currentUser.uid, targetUserId],
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    router.push(`/dashboard/chat/${chatId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-headline font-bold mb-4">Student not found</h2>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to Workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-primary">
          <Link href="/dashboard/leaderboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        {isOwnProfile && (
          <Button asChild variant="outline" className="border-primary/20 text-primary">
            <Link href="/dashboard/profile">Edit My Profile</Link>
          </Button>
        )}
      </div>

      <Card className="bg-card/40 border-primary/10 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20" />
        <CardContent className="relative pt-0 px-6 sm:px-10 pb-10">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6 -mt-12 mb-8">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-2xl">
              <AvatarImage src={profileUser.photoUrl} />
              <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-bold">
                {profileUser.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h1 className="text-3xl font-bold font-headline text-foreground">{profileUser.displayName}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-primary font-mono text-sm">@{profileUser.username}</span>
                {profileUser.pronouns && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">
                    {profileUser.pronouns}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    profileUser.lastActive && (new Date().getTime() - new Date(profileUser.lastActive).getTime() < 300000) 
                      ? "bg-emerald-500" 
                      : "bg-muted-foreground"
                  )} />
                  {profileUser.lastActive && (new Date().getTime() - new Date(profileUser.lastActive).getTime() < 300000) ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
            {!isOwnProfile && (
              <Button onClick={handleStartChat} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold px-8 h-12 rounded-2xl">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">About Student</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {profileUser.aboutMe || "This student hasn't shared a bio yet. They're likely too focused on their studies!"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {profileUser.country && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                    <div className="flex items-center gap-2 text-primary">
                      <Globe className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Region</span>
                    </div>
                    <p className="font-bold">{profileUser.country}</p>
                  </div>
                )}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                  <div className="flex items-center gap-2 text-primary">
                    <UserIcon className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Role</span>
                  </div>
                  <p className="font-bold">Paradox Scholar</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Academic Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl">
                      <Clock className="h-5 w-5 text-amber-500" />
                    </div>
                    <span className="text-sm font-medium">Focus Time</span>
                  </div>
                  <span className="font-bold font-headline">{formatStudyTime(profileUser.totalStudySeconds)}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl">
                      <Trophy className="h-5 w-5 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium">Global Rank</span>
                  </div>
                  <span className="font-bold font-headline text-primary">Scholarly</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
