'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2, ArrowRight, User, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  const { user } = useUser();
  const db = useFirestore();

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    // Filter by participantIds array-contains to match security rules
    return query(
      collection(db, 'directChats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user?.uid]);

  const { data: chats, isLoading } = useCollection(chatsQuery);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Conversations</h1>
        </div>
        <p className="text-muted-foreground">Private study discussions and partner connections.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <Sparkles className="h-4 w-4 text-accent absolute -top-2 -right-2 animate-pulse" />
          </div>
        </div>
      ) : chats && chats.length > 0 ? (
        <div className="grid gap-4">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/dashboard/chat/${chat.id}`}>
              <Card className="bg-card/40 border-primary/10 hover:border-primary/40 transition-all group overflow-hidden hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-headline">Private Conversation</CardTitle>
                    <CardDescription className="truncate text-[11px] font-mono text-primary/60 uppercase tracking-widest mt-1">
                      {chat.lastMessage || 'Start a conversation now'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    {chat.updatedAt && (
                       <span className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-tighter">
                         {new Date(chat.updatedAt.seconds * 1000).toLocaleDateString()}
                       </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="py-20 text-center bg-card/20 rounded-3xl border border-dashed border-primary/20 flex flex-col items-center justify-center space-y-4">
          <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-2">
            <MessageSquare className="h-10 w-10 text-primary/20" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-headline text-foreground/80">No active conversations</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Connect with study partners in rooms to start private discussions.
            </p>
          </div>
          <Link href="/dashboard/friends">
            <Button variant="outline" className="mt-4 border-primary/20 text-primary hover:bg-primary/10">
              Browse Partners
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
