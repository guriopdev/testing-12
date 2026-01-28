
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Star, Target, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function LeaderboardPage() {
  const { user } = useUser();
  const db = useFirestore();

  const leadersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      orderBy('totalStudySeconds', 'desc'),
      limit(20)
    );
  }, [db]);

  const { data: leaders, isLoading } = useCollection(leadersQuery);

  const formatStudyTime = (seconds: number = 0) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRankBadge = (seconds: number = 0) => {
    if (seconds > 36000) return { label: 'Legend', color: 'bg-amber-500/20 text-amber-500' };
    if (seconds > 18000) return { label: 'Master', color: 'bg-purple-500/20 text-purple-500' };
    if (seconds > 3600) return { label: 'Scholar', color: 'bg-blue-500/20 text-blue-500' };
    return { label: 'Novice', color: 'bg-emerald-500/20 text-emerald-500' };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Global Hall of Fame</h1>
        <p className="text-muted-foreground text-lg">Top contributors in the StudyParadox community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Summary Card */}
        <Card className="md:col-span-1 bg-card/40 border-primary/10 backdrop-blur-xl flex flex-col justify-center text-center p-6">
           <CardHeader className="p-0 mb-4">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Your Focus</CardTitle>
           </CardHeader>
           <div className="space-y-2">
             <div className="text-3xl font-bold font-headline">
               {leaders?.find(l => l.id === user?.uid) ? formatStudyTime(leaders.find(l => l.id === user?.uid)?.totalStudySeconds) : '0m'}
             </div>
             <p className="text-xs text-muted-foreground">Keep studying to climb the ranks!</p>
           </div>
        </Card>

        {/* List Section */}
        <div className="md:col-span-2 space-y-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center bg-card/20 rounded-3xl border border-primary/5">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
            </div>
          ) : leaders && leaders.length > 0 ? (
            <div className="grid gap-3">
              {leaders.map((student, index) => {
                const rankInfo = getRankBadge(student.totalStudySeconds);
                const isTopThree = index < 3;
                const isCurrentUser = student.id === user?.uid;

                return (
                  <Card 
                    key={student.id} 
                    className={cn(
                      "transition-all border-primary/10 bg-card/40 backdrop-blur-md overflow-hidden",
                      isCurrentUser && "ring-2 ring-primary border-primary/40 scale-[1.02] z-10",
                      !isCurrentUser && "hover:border-primary/30"
                    )}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex items-center justify-center w-8 text-lg font-bold font-headline text-muted-foreground">
                        {index === 0 ? <Medal className="h-6 w-6 text-amber-500" /> : 
                         index === 1 ? <Medal className="h-6 w-6 text-slate-300" /> : 
                         index === 2 ? <Medal className="h-6 w-6 text-amber-700" /> : 
                         index + 1}
                      </div>

                      <Avatar className={cn("h-12 w-12 border-2", isCurrentUser ? "border-primary" : "border-primary/10")}>
                        <AvatarImage src={student.photoUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate text-foreground">{student.displayName}</p>
                          {isCurrentUser && <Badge className="bg-primary text-primary-foreground text-[8px] h-4">You</Badge>}
                        </div>
                        <p className="text-[10px] text-primary/60 font-mono">@{student.username}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold font-headline">{formatStudyTime(student.totalStudySeconds)}</span>
                        <Badge variant="outline" className={cn("text-[8px] uppercase font-bold tracking-tighter border-none px-2", rankInfo.color)}>
                          {rankInfo.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="py-20 text-center bg-card/20 border-dashed border-primary/20 rounded-3xl">
               <Award className="h-12 w-12 text-primary/20 mx-auto mb-4" />
               <p className="text-muted-foreground">No students have recorded focus time yet. Be the first!</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
