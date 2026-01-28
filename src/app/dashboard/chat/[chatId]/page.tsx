
'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, where, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DirectChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const unwrappedParams = use(params);
  const chatId = unwrappedParams.chatId;
  const { user } = useUser();
  const db = useFirestore();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatRef = useMemoFirebase(() => doc(db, 'directChats', chatId), [db, chatId]);
  const { data: chat, isLoading: isChatLoading } = useDoc(chatRef);

  const messagesQuery = useMemoFirebase(() => query(
    collection(db, 'directChats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  ), [db, chatId]);
  const { data: messages } = useCollection(messagesQuery);

  // Mark messages as read when they appear
  useEffect(() => {
    if (!user || !messages || messages.length === 0) return;

    const unreadMessages = messages.filter(m => m.senderId !== user.uid && !m.read);
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(msg => {
        updateDocumentNonBlocking(doc(db, 'directChats', chatId, 'messages', msg.id), {
          read: true
        });
      });
    }
  }, [messages, user, db, chatId]);

  // Fetch other participant info for online status
  const otherParticipantId = chat?.participantIds?.find((id: string) => id !== user?.uid);
  const otherUserRef = useMemoFirebase(() => otherParticipantId ? doc(db, 'users', otherParticipantId) : null, [db, otherParticipantId]);
  const { data: otherUserData } = useDoc(otherUserRef);

  const isOnline = otherUserData?.lastActive ? (new Date().getTime() - new Date(otherUserData.lastActive).getTime() < 300000) : false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;

    addDocumentNonBlocking(collection(db, 'directChats', chatId, 'messages'), {
      text: message.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Guest',
      timestamp: serverTimestamp(),
      read: false
    });

    setMessage('');
  };

  if (isChatLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[85vh] flex flex-col animate-fade-in-up">
      <Card className="flex-1 flex flex-col bg-card/40 border-primary/10 backdrop-blur-xl overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-primary/10 flex flex-row items-center gap-4 py-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-primary">
            <Link href="/dashboard/messages"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarImage src={otherUserData?.photoUrl} />
                <AvatarFallback className="bg-primary/20 text-primary">{otherUserData?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                isOnline ? "bg-emerald-500" : "bg-muted-foreground"
              )} />
            </div>
            <div className="flex flex-col">
              <CardTitle className="text-lg font-headline">{otherUserData?.displayName || 'Direct Conversation'}</CardTitle>
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                {isOnline ? 'Online Now' : 'Offline'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {messages?.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[80%]", msg.senderId === user?.uid ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm shadow-lg",
                    msg.senderId === user?.uid 
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                      : "bg-secondary text-foreground border border-primary/5 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                      {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </span>
                    {msg.senderId === user?.uid && (
                      msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-4 sm:p-6 border-t border-primary/10 bg-background/40">
            <form onSubmit={handleSendMessage} className="flex gap-2 relative group">
              <Input 
                placeholder="Type your message..." 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 h-12 bg-background/50 border-primary/20 focus:border-primary rounded-2xl pr-14 transition-all"
              />
              <Button type="submit" size="icon" className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:scale-105 transition-transform" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
