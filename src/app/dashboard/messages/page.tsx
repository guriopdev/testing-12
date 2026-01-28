
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function MessagesPage() {
  const { user } = useUser();
  const db = useFirestore();

  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'directChats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user]);

  const { data: chats, isLoading } = useCollection(chatsQuery);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Conversations</h1>
        <p className="text-muted-foreground">Catch up with your study partners 1-on-1.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : chats && chats.length > 0 ? (
        <div className="grid gap-4">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/dashboard/chat/${chat.id}`}>
              <Card className="bg-card/40 border-primary/10 hover:border-primary/40 transition-all group">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">Private Chat</CardTitle>
                    <CardDescription className="truncate">
                      {chat.lastMessage || 'No messages yet...'}
                    </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-card/20 rounded-2xl border border-dashed border-primary/10">
          <MessageSquare className="h-12 w-12 text-primary/20 mx-auto mb-4" />
          <p className="text-muted-foreground">No active conversations. Start one from your friends list!</p>
          <Link href="/dashboard/friends" className="text-primary font-bold hover:underline mt-2 inline-block">
            Go to Friends
          </Link>
        </div>
      )}
    </div>
  );
}
