
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, UserPlus, UserCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FriendsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const requestsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'friendRequests'), where('receiverId', '==', user.uid), where('status', '==', 'pending'));
  }, [db, user?.uid]);

  const outgoingQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'friendRequests'), where('senderId', '==', user.uid), where('status', '==', 'pending'));
  }, [db, user?.uid]);

  const { data: requests } = useCollection(requestsQuery);
  const { data: outgoing } = useCollection(outgoingQuery);

  const friendsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'friendRequests'),
      where('status', '==', 'accepted'),
      where('receiverId', '==', user.uid)
    );
  }, [db, user?.uid]);

  const friendsQuery2 = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, 'friendRequests'),
      where('status', '==', 'accepted'),
      where('senderId', '==', user.uid)
    );
  }, [db, user?.uid]);

  const { data: friends1 } = useCollection(friendsQuery);
  const { data: friends2 } = useCollection(friendsQuery2);

  const friends = [...(friends1 || []), ...(friends2 || [])];

  const handleAcceptRequest = (requestId: string) => {
    updateDocumentNonBlocking(doc(db, 'friendRequests', requestId), { status: 'accepted' });
  };

  const handleDeclineRequest = (requestId: string) => {
    deleteDocumentNonBlocking(doc(db, 'friendRequests', requestId));
  };

  const handleStartChat = (friendId: string) => {
    if (!user?.uid) return;
    
    const chatId = [user.uid, friendId].sort().join('_');
    const chatRef = doc(db, 'directChats', chatId);
    
    setDocumentNonBlocking(chatRef, {
      participantIds: [user.uid, friendId],
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    router.push(`/dashboard/chat/${chatId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Social Hub</h1>
        <p className="text-muted-foreground">Connect with study partners and chat privately.</p>
      </div>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="bg-secondary/50 border border-primary/10 mb-6">
          <TabsTrigger value="friends" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Friends <Badge className="ml-2 bg-primary/20 text-primary-foreground border-none">{friends.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="requests" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Requests <Badge className="ml-2 bg-primary/20 text-primary-foreground border-none">{requests?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {friends.length > 0 ? friends.map((f) => {
              const isSender = f.senderId === user?.uid;
              const friendName = isSender ? f.receiverName : f.senderName;
              const friendId = isSender ? f.receiverId : f.senderId;
              const friendPhoto = isSender ? f.receiverPhoto : f.senderPhoto;

              return (
                <Card key={f.id} className="bg-card/40 border-primary/10 backdrop-blur-sm group hover:border-primary/40 transition-all">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Link href={`/dashboard/profile/${friendId}`} className="shrink-0 hover:scale-110 transition-transform">
                      <Avatar className="h-12 w-12 border border-primary/20">
                        <AvatarImage src={friendPhoto} />
                        <AvatarFallback className="bg-primary/20 text-primary">{friendName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/profile/${friendId}`} className="hover:text-primary transition-colors">
                        <CardTitle className="text-lg font-headline truncate">{friendName}</CardTitle>
                      </Link>
                      <CardDescription className="text-xs text-primary/60 font-bold uppercase tracking-widest">Connected</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex justify-end gap-2 pt-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleStartChat(friendId)}
                      className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </CardContent>
                </Card>
              );
            }) : (
              <div className="col-span-full py-12 text-center bg-card/20 rounded-2xl border border-dashed border-primary/10">
                <UserPlus className="h-12 w-12 text-primary/20 mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't added any study partners yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Incoming Requests</h3>
            {requests && requests.length > 0 ? requests.map((req) => (
              <Card key={req.id} className="bg-card/40 border-primary/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <Link href={`/dashboard/profile/${req.senderId}`} className="hover:scale-110 transition-transform">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={req.senderPhoto} />
                        <AvatarFallback className="bg-primary/20 text-primary">{req.senderName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div>
                      <Link href={`/dashboard/profile/${req.senderId}`} className="hover:text-primary transition-colors">
                        <p className="font-bold">{req.senderName}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">Wants to be your study partner</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAcceptRequest(req.id)} className="bg-primary text-primary-foreground">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(req.id)} className="text-destructive hover:bg-destructive/10">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <p className="text-center text-muted-foreground py-8">No incoming requests.</p>
            )}

            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mt-8 mb-4">Outgoing Requests</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {outgoing && outgoing.length > 0 ? outgoing.map((req) => (
                <Card key={req.id} className="bg-card/20 border-primary/5 opacity-80">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/dashboard/profile/${req.receiverId}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={req.receiverPhoto} />
                          <AvatarFallback>{req.receiverName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <Link href={`/dashboard/profile/${req.receiverId}`} className="hover:text-primary transition-colors">
                        <p className="text-sm font-medium">{req.receiverName || 'Pending Student'}</p>
                      </Link>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(req.id)} className="text-muted-foreground">
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              )) : (
                <p className="text-muted-foreground text-sm">No pending outgoing requests.</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
