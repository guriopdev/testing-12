
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Loader2,
  MessageSquare,
  Send,
  Lock,
  ChevronRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  useDoc, 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  deleteDocumentNonBlocking, 
  addDocumentNonBlocking 
} from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function RoomPage({ params }: { params: { id: string } }) {
  const { id: roomId } = params;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // Local UI State
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Firestore Data
  const roomRef = useMemoFirebase(() => doc(db, 'rooms', roomId), [db, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const participantsQuery = useMemoFirebase(() => collection(db, 'rooms', roomId, 'participants'), [db, roomId]);
  const { data: participants } = useCollection(participantsQuery);

  const messagesQuery = useMemoFirebase(() => query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('timestamp', 'asc')
  ), [db, roomId]);
  const { data: messages } = useCollection(messagesQuery);

  // Participant Presence Management (Only if unlocked or no password)
  useEffect(() => {
    if (!user || !db || !roomId || (room?.password && !isUnlocked)) return;

    const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
    setDocumentNonBlocking(participantRef, {
      userId: user.uid,
      name: user.displayName || 'Guest',
      photoUrl: user.photoURL || '',
      isMuted,
      isCameraOff,
      joinedAt: serverTimestamp(),
    }, { merge: true });

    return () => {
      deleteDocumentNonBlocking(participantRef);
    };
  }, [user, db, roomId, isMuted, isCameraOff, room?.password, isUnlocked]);

  // Camera/Mic Hardware Initialization
  useEffect(() => {
    if (room?.password && !isUnlocked) return;

    const getMediaPermission = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        userStream.getVideoTracks().forEach((track) => (track.enabled = false));
        userStream.getAudioTracks().forEach((track) => (track.enabled = false));
      } catch (error) {
        console.error('Error accessing media:', error);
        setHasCameraPermission(false);
      }
    };

    getMediaPermission();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [room?.password, isUnlocked]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user) return;

    addDocumentNonBlocking(collection(db, 'rooms', roomId, 'messages'), {
      text: chatMessage.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Guest',
      timestamp: serverTimestamp(),
    });

    setChatMessage('');
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
  };

  const handleCameraToggle = () => {
    const nextCameraOff = !isCameraOff;
    setIsCameraOff(nextCameraOff);
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === room?.password) {
      setIsUnlocked(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'The password you entered is incorrect. Please try again.',
      });
    }
  };

  if (isRoomLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
        <h2 className="text-3xl font-headline font-bold mb-4 text-foreground">Room Not Found</h2>
        <p className="text-muted-foreground mb-8">This room may have been deleted or the link is invalid.</p>
        <Button asChild className="bg-primary hover:bg-primary/80"><Link href="/dashboard">Return to Dashboard</Link></Button>
      </div>
    );
  }

  // Password Protection Gate
  if (room.password && !isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-2xl border-primary/20 p-8 shadow-2xl relative z-10">
          <div className="text-center space-y-4 mb-8">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-primary/40">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{room.name}</h1>
            <p className="text-muted-foreground">This room is private. Enter the password to join the session.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input 
              type="password" 
              placeholder="Room Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="h-12 bg-background/50 border-white/10 text-lg text-center tracking-widest focus:border-primary/50"
              autoFocus
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              Enter Room
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
              <Link href="/dashboard">Cancel and Go Back</Link>
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 md:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-lg md:text-xl font-bold font-headline truncate max-w-[150px] sm:max-w-md">{room.name}</h1>
          <Badge variant="secondary" className="hidden sm:flex bg-primary/10 text-primary border-primary/20 font-medium">
            {room.topic}
          </Badge>
          {room.password && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              <Lock className="h-3 w-3 text-primary/60" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Private</span>
            </div>
          )}
        </div>
        <Button asChild variant="destructive" size="sm" className="rounded-full px-4 font-semibold shadow-lg shadow-destructive/20 hover:scale-105 transition-transform">
          <Link href="/dashboard">
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave
          </Link>
        </Button>
      </header>

      {/* Main Layout: Video + Sidebar Chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Grid */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
          <div className="mx-auto max-w-7xl grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
            
            {/* My Video Feed */}
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-card/50 border border-white/10 shadow-2xl group">
              <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", isCameraOff && "hidden")} />
              
              { hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 max-w-xs">
                    <AlertTitle className="text-sm font-bold">Permissions Required</AlertTitle>
                    <AlertDescription className="text-xs opacity-80">Please check your browser settings to allow access to camera and microphone.</AlertDescription>
                  </Alert>
                </div>
              )}

              {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/5">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback className="text-4xl bg-primary text-white font-headline">{user?.displayName?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-semibold text-white px-2">You</span>
                <div className="p-1 rounded-full bg-black/40">
                  {isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-primary" />}
                </div>
              </div>
              {!isCameraOff && (
                 <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest drop-shadow-md">Live</span>
                 </div>
              )}
            </div>

            {/* Other Real Participants */}
            {participants?.filter(p => p.userId !== user?.uid).map((p) => (
              <div key={p.id} className="relative aspect-video overflow-hidden rounded-2xl bg-card/50 border border-white/10 shadow-xl transition-all hover:scale-[1.02] hover:shadow-primary/10">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-secondary/40 to-primary/5">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl ring-2 ring-white/5">
                    <AvatarImage src={p.photoUrl} />
                    <AvatarFallback className="text-4xl font-headline bg-card text-primary-foreground">{p.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {!p.isCameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                      <Video className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10">
                  <span className="text-xs font-semibold text-white px-2 truncate">{p.name}</span>
                  <div className="p-1 rounded-full bg-black/40">
                    {p.isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-primary" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Desktop Sidebar Chat */}
        <aside className="hidden lg:flex w-80 flex-col border-l border-white/5 bg-black/40 backdrop-blur-3xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="font-headline font-bold text-sm tracking-wider uppercase">Live Chat</h2>
            </div>
            <Badge className="bg-primary/20 text-primary text-[10px] font-bold">{messages?.length || 0}</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-4">
              {messages?.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      {msg.senderName}
                    </span>
                  </div>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm",
                    msg.senderId === user?.uid 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-white/5 border border-white/10 text-foreground rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-white/5 bg-black/20">
            <form onSubmit={handleSendMessage} className="relative">
              <Input 
                placeholder="Message study group..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="pr-12 bg-background/50 border-white/10 focus:border-primary/40 h-10 rounded-xl"
              />
              <Button 
                type="submit" 
                size="icon" 
                variant="ghost" 
                className="absolute right-1 top-1 h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                disabled={!chatMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </aside>
      </div>

      {/* Controls Footer */}
      <footer className="flex h-24 flex-shrink-0 items-center justify-center border-t border-white/5 bg-black/60 backdrop-blur-2xl px-4 z-20">
        <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isMuted ? 'destructive' : 'secondary'} 
                size="lg" 
                className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg transition-all active:scale-90 hover:scale-105" 
                onClick={handleMuteToggle}
              >
                {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border-primary/20"><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isCameraOff ? 'destructive' : 'secondary'} 
                size="lg" 
                className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg transition-all active:scale-90 hover:scale-105" 
                onClick={handleCameraToggle}
              >
                {isCameraOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground border-primary/20"><p>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 bg-white/10" />

          {/* Chat for Mobile (Sheet) */}
          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg transition-all active:scale-90 hover:scale-105 lg:hidden">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border-primary/20"><p>Chat</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm bg-card/95 backdrop-blur-2xl border-l border-white/10 p-0 flex flex-col" side="right">
              <SheetHeader className="p-4 border-b border-white/5">
                <SheetTitle className="font-headline text-xl flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Study Chat
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{msg.senderName}</span>
                      <div className={cn(
                        "px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words",
                        msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-white/5 border border-white/10 text-foreground"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-white/5 bg-black/40">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input 
                    placeholder="Type a message..." 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="pr-12 bg-background/50 border-white/10 h-12 rounded-xl"
                  />
                  <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 h-10 w-10 text-primary">
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger asChild>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-lg transition-all active:scale-90 hover:scale-105">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border-primary/20"><p>Participants</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm bg-card/95 backdrop-blur-2xl border-l border-white/10" side="right">
              <SheetHeader className="pb-4">
                <SheetTitle className="font-headline text-2xl flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  Study Group ({participants?.length || 0})
                </SheetTitle>
              </SheetHeader>
              <Separator className="bg-white/5 mb-6" />
              <div className="flex flex-col gap-3">
                {participants?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-primary/20">
                        <AvatarImage src={p.photoUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">{p.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {p.userId === user?.uid && <span className="text-[10px] uppercase tracking-wider text-primary font-bold leading-none mt-0.5">You</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 text-muted-foreground/40">
                      {p.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-primary/60" />}
                      {p.isCameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4 text-primary/60" />}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </footer>
      <style jsx global>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
    </TooltipProvider>
  );
}
