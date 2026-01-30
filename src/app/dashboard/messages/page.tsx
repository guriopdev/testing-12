
'use client';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Loader2, ArrowRight, User, Sparkles, UserPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

function ChatItem({ chat, currentUserId }: { chat: any, currentUserId: string }) {
  const db = useFirestore();
  const otherId = chat.participantIds.find((id: string) => id !== currentUserId);
  const otherUserRef = useMemoFirebase(() => otherId ? doc(db, 'users', otherId) : null, [db, otherId]);
  const { data: otherUser } = useDoc(otherUserRef);

  const isOnline = otherUser?.lastActive ? (new Date().getTime() - new Date(otherUser.lastActive).getTime() < 300000) : false;

  return (
    <div className="flex items-center gap-2 group">
      <Link href={`/dashboard/profile/${otherId}`} className="shrink-0 hover:scale-110 transition-transform">
        <Avatar className="h-12 w-12 border border-primary/10 group-hover:border-primary/30 transition-colors">
          <AvatarImage src={otherUser?.photoUrl} />
          <AvatarFallback className="bg-primary/5 text-primary"><User className="h-6 w-6" /></AvatarFallback>
        </Avatar>
      </Link>
      <Link href={`/dashboard/chat/${chat.id}`} className="flex-1">
        <Card className="bg-card/40 border-primary/10 hover:border-primary/40 transition-all overflow-hidden hover:shadow-lg hover:shadow-primary/5 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-headline">{otherUser?.displayName || 'Private Session'}</CardTitle>
              <CardDescription className="truncate text-[10px] font-medium text-primary/60 uppercase tracking-widest mt-0.5">
                {chat.lastMessage || 'Continue your study discussion'}
              </CardDescription>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

function PartnerItem({ friend, currentUserId, onChat }: { friend: any, currentUserId: string, onChat: (id: string) => void }) {
  const isSender = friend.senderId === currentUserId;
  const friendId = isSender ? friend.receiverId : friend.senderId;
  const friendName = isSender ? friend.receiverName : friend.senderName;
  const friendPhoto = isSender ? friend.receiverPhoto : friend.senderPhoto;
  const friendUsername = isSender ? friend.receiverUsername : friend.senderUsername;

  const db = useFirestore();
  const userRef = useMemoFirebase(() => doc(db, 'users', friendId), [db, friendId]);
  const { data: userData } = useDoc(userRef);

  const isOnline = userData?.lastActive ? (new Date().getTime() - new Date(userData.lastActive).getTime() < 300000) : false;

  return (
    <div className="flex items-center justify-between p-4 border-b border-primary/5 hover:bg-primary/5 transition-colors group">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/profile/${friendId}`} className="relative hover:scale-110 transition-transform">
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarImage src={friendPhoto} />
            <AvatarFallback className="bg-primary/10 text-primary">{friendName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card",
            isOnline ? "bg-emerald-500" : "bg-muted-foreground"
          )} />
        </Link>
        <div className="flex flex-col">
          <Link href={`/dashboard/profile/${friendId}`} className="hover:text-primary transition-colors">
            <span className="text-sm font-bold flex items-center gap-2">
              {friendName}
              {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            </span>
          </Link>
          <span className="text-[10px] text-primary font-mono lowercase">@{friendUsername}</span>
        </div>
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        onClick={() => onChat(friendId)}
        className="h-8 w-8 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  );
}

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

  // Friends Query
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
                <ChatItem key={chat.id} chat={chat} currentUserId={user?.uid || ''} />
              ))}
            </div>
          ) : (
            <Card className="py-16 text-center bg-card/20 rounded-3xl border border-dashed border-primary/20">
              <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-primary/20" />
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                No active conversations yet.
              </p>
              <Link href="/dashboard/friends">
                <Button variant="outline" className="mt-4 border-primary/20 text-primary hover:bg-primary/10">
                  Find Partners
                </Button>
              </Link>
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
                {friends.length > 0 ? friends.map((f) => (
                  <PartnerItem key={f.id} friend={f} currentUserId={user?.uid || ''} onChat={handleStartChat} />
                )) : (
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
