
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, ArrowRight, User, Sparkles, UserPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  // Active Chats Query
  const chatsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'directChats'),
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user?.uid]);

  const { data: chats, isLoading: isChatsLoading } = useCollection(chatsQuery);

  // Friends Query (to allow starting new chats)
  const friendsQuery1 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'friendRequests'), where('receiverId', '==', user.uid), where('status', '==', 'accepted'));
  }, [db, user?.uid]);

  const friendsQuery2 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'friendRequests'), where('senderId', '==', user.uid), where('status', '==', 'accepted'));
  }, [db, user?.uid]);

  const { data: friends1 } = useCollection(friendsQuery1);
  const { data: friends2 } = useCollection(friendsQuery2);

  const friends = [...(friends1 || []), ...(friends2 || [])];

  const handleStartChat = (friendId: string) => {
    if (!user) return;
    const chatId = [user.uid, friendId].sort().join('_');
    const chatRef = doc(db, 'directChats', chatId);
    
    setDocumentNonBlocking(chatRef, {
      participantIds: [user.uid, friendId],
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    router.push(`/dashboard/chat/${chatId}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up px-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Student Hub</h1>
        </div>
        <p className="text-muted-foreground ml-1">Connect with your study partners and manage conversations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Conversations */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Active Conversations
          </h3>
          
          {isChatsLoading ? (
            <div className="flex h-64 items-center justify-center bg-card/20 rounded-3xl border border-primary/5">
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            </div>
          ) : chats && chats.length > 0 ? (
            <div className="grid gap-3">
              {chats.map((chat) => (
                <Link key={chat.id} href={`/dashboard/chat/${chat.id}`}>
                  <Card className="bg-card/40 border-primary/10 hover:border-primary/40 transition-all group overflow-hidden hover:shadow-lg hover:shadow-primary/5 backdrop-blur-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover:bg-primary/10 transition-colors">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-headline">Private Session</CardTitle>
                        <CardDescription className="truncate text-[10px] font-medium text-primary/60 uppercase tracking-widest mt-0.5">
                          {chat.lastMessage || 'Continue your study discussion'}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="py-16 text-center bg-card/20 rounded-3xl border border-dashed border-primary/20">
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary/20" />
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                No active conversations yet. Start one by selecting a partner on the right.
              </p>
            </Card>
          )}
        </div>

        {/* Partners Sidebar */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Study Partners
          </h3>
          
          <Card className="bg-card/40 border-primary/10 backdrop-blur-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-primary/10 bg-primary/5">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input 
                    placeholder="Search partners..." 
                    className="w-full bg-background/50 border-primary/10 rounded-lg pl-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {friends.length > 0 ? friends.map((f) => {
                  const isSender = f.senderId === user?.uid;
                  const friendName = isSender ? f.receiverName : f.senderName;
                  const friendId = isSender ? f.receiverId : f.senderId;
                  const friendPhoto = isSender ? f.receiverPhoto : f.senderPhoto;
                  const friendUsername = isSender ? f.receiverUsername : f.senderUsername;

                  return (
                    <div 
                      key={f.id} 
                      className="flex items-center justify-between p-4 border-b border-primary/5 hover:bg-primary/5 transition-colors group cursor-pointer"
                      onClick={() => handleStartChat(friendId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border border-primary/20">
                            <AvatarImage src={friendPhoto} />
                            <AvatarFallback className="bg-primary/10 text-primary">{friendName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-card" title="Active Now" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{friendName}</span>
                          <span className="text-[10px] text-primary font-mono lowercase">@{friendUsername}</span>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground">Add partners in the Social tab to start chatting.</p>
                    <Button asChild variant="link" size="sm" className="mt-2 text-primary font-bold">
                      <Link href="/dashboard/friends">Find Partners</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
