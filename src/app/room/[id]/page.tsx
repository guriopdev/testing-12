
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Trash2,
  MoreVertical,
  UserPlus,
  CheckCircle2,
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
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
import { doc, collection, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.id;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const roomRef = useMemoFirebase(() => doc(db, 'rooms', roomId), [db, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const participantsQuery = useMemoFirebase(() => collection(db, 'rooms', roomId, 'participants'), [db, roomId]);
  const { data: participants } = useCollection(participantsQuery);

  const messagesQuery = useMemoFirebase(() => query(
    collection(db, 'rooms', roomId, 'messages'),
    orderBy('timestamp', 'asc')
  ), [db, roomId]);
  const { data: messages } = useCollection(messagesQuery);

  const requestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'friendRequests'), where('senderId', '==', user.uid));
  }, [user]);
  const { data: sentRequests } = useCollection(requestsQuery);

  const isFull = participants && room && participants.length >= (room.maxParticipants || 10) && !participants.find(p => p.userId === user?.uid);

  useEffect(() => {
    if (!user || !db || !roomId || (room?.password && !isUnlocked) || isFull) return;

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
  }, [user, db, roomId, isMuted, isCameraOff, room?.password, isUnlocked, isFull]);

  useEffect(() => {
    if ((room?.password && !isUnlocked) || isFull) return;

    const getMediaPermission = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        userStream.getVideoTracks().forEach((track) => (track.enabled = !isCameraOff));
        userStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
      } catch (error) {
        console.error('Error accessing media:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Media Access Denied',
          description: 'Please enable camera and microphone permissions in your browser settings.',
        });
      }
    };

    getMediaPermission();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [room?.password, isUnlocked, isFull]);

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
        description: 'Please try again.',
      });
    }
  };

  const handleSendFriendRequest = (participant: any) => {
    if (!user) return;
    
    const isAlreadySent = sentRequests?.find(r => r.receiverId === participant.userId);
    if (isAlreadySent) {
      toast({ title: 'Request already sent' });
      return;
    }

    addDocumentNonBlocking(collection(db, 'friendRequests'), {
      senderId: user.uid,
      senderName: user.displayName || 'Student',
      senderPhoto: user.photoURL || '',
      receiverId: participant.userId,
      receiverName: participant.name,
      receiverPhoto: participant.photoUrl,
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    toast({
      title: 'Friend Request Sent',
      description: `Request sent to ${participant.name}`,
    });
  };

  const handleConfirmDelete = () => {
    if (!room || !user || room.creatorId !== user.uid) return;
    deleteDocumentNonBlocking(roomRef);
    setIsDeleteDialogOpen(false);
    router.push('/dashboard');
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
        <h2 className="text-3xl font-headline font-bold mb-4 text-foreground">Room Closed</h2>
        <p className="text-muted-foreground mb-8">This session has ended.</p>
        <Button asChild className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <Users className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-3xl font-headline font-bold mb-4 text-foreground">Room Full</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          This session has reached its capacity of {room.maxParticipants} students.
        </p>
        <Button asChild className="bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  if (room.password && !isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-3xl border-primary/20 p-8 shadow-2xl relative z-10">
          <div className="text-center space-y-4 mb-8">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-primary/30">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold font-headline text-foreground">{room.name}</h1>
            <p className="text-muted-foreground">This session is password protected.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input 
              type="password" 
              placeholder="Enter Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="h-12 bg-background/50 border-primary/20 text-center tracking-widest text-lg focus:border-primary"
              autoFocus
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              Join Session
            </Button>
            <Button asChild variant="ghost" className="w-full text-muted-foreground hover:text-primary">
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const isCreator = user?.uid === room.creatorId;

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-primary/10 bg-card/60 backdrop-blur-xl px-4 md:px-6 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
             <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180 hover:text-primary transition-colors cursor-pointer" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-bold font-headline truncate max-w-[120px] sm:max-w-md">{room.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest leading-none">{room.topic}</span>
              <Badge variant="outline" className="text-[9px] h-4 border-primary/30 px-1 py-0">{participants?.length}/{room.maxParticipants}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isCreator && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-primary/20 backdrop-blur-3xl">
                <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive cursor-pointer font-bold">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Close Room Forever
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button asChild variant="destructive" size="sm" className="rounded-full px-4 shadow-lg shadow-destructive/20 hover:scale-105 transition-transform">
            <Link href="/dashboard">
              <PhoneOff className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Leave</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-transparent to-primary/5">
          <div className="mx-auto max-w-7xl grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
            {/* My Video Feed */}
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 shadow-2xl group ring-1 ring-primary/5">
              <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", isCameraOff && "hidden")} />
              
              {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground font-headline">
                      {user?.displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2">You</span>
                <div className="flex gap-2">
                  {isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-primary" />}
                </div>
              </div>
            </div>

            {/* Other Participants */}
            {participants?.filter(p => p.userId !== user?.uid).map((p) => (
              <div key={p.id} className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 shadow-lg transition-all hover:border-primary/40 group ring-1 ring-primary/5">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-background to-primary/5">
                  <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl ring-2 ring-primary/10">
                    <AvatarImage src={p.photoUrl} />
                    <AvatarFallback className="text-4xl font-headline bg-primary/10 text-primary">{p.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2 truncate">{p.name}</span>
                  <div className="flex gap-2 items-center">
                    {p.isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4 text-primary" />}
                    {p.isCameraOff ? <VideoOff className="h-4 w-4 text-muted-foreground" /> : <Video className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasCameraPermission === false && (
            <div className="mt-8 max-w-md mx-auto">
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                <AlertTitle className="font-headline font-bold">Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please enable camera and microphone permissions in your browser settings to participate in the video session.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </main>

        {/* Desktop Sidebar Chat */}
        <aside className="hidden lg:flex w-80 flex-col border-l border-primary/10 bg-card/40 backdrop-blur-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary">Live Chat</h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{messages?.length || 0}</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-4">
              {messages?.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{msg.senderName}</span>
                  <div className={cn(
                    "px-3 py-2 rounded-2xl text-sm max-w-[90%] break-words shadow-sm",
                    msg.senderId === user?.uid 
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                      : "bg-secondary text-foreground border border-primary/5 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-primary/10">
            <form onSubmit={handleSendMessage} className="relative">
              <Input 
                placeholder="Send a message..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="pr-12 bg-background border-primary/20 focus:border-primary rounded-xl h-10"
              />
              <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8 text-primary hover:text-primary/80" disabled={!chatMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </aside>
      </div>

      {/* Controls Footer */}
      <footer className="flex h-24 flex-shrink-0 items-center justify-center border-t border-primary/10 bg-card/80 backdrop-blur-2xl px-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-4 px-6 py-3 bg-background/50 rounded-full border border-primary/10 shadow-2xl ring-1 ring-primary/20">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isMuted ? 'destructive' : 'secondary'} 
                size="icon" 
                className={cn(
                  "rounded-full h-12 w-12 transition-all hover:scale-110",
                  !isMuted && "bg-primary text-primary-foreground hover:bg-primary/90"
                )} 
                onClick={handleMuteToggle}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-primary/20"><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={isCameraOff ? 'destructive' : 'secondary'} 
                size="icon" 
                className={cn(
                  "rounded-full h-12 w-12 transition-all hover:scale-110",
                  !isCameraOff && "bg-primary text-primary-foreground hover:bg-primary/90"
                )} 
                onClick={handleCameraToggle}
              >
                {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-card border-primary/20"><p>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-8 bg-primary/10 mx-2" />

          {/* Chat for Mobile (Sheet) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 lg:hidden hover:text-primary transition-colors">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm bg-card/95 border-l border-primary/20 p-0 flex flex-col" side="right">
              <SheetHeader className="p-4 border-b border-primary/10">
                <SheetTitle className="font-headline flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Room Chat
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{msg.senderName}</span>
                      <div className={cn(
                        "px-3 py-2 rounded-2xl text-sm max-w-[85%] break-words shadow-sm",
                        msg.senderId === user?.uid ? "bg-primary text-primary-foreground font-medium" : "bg-secondary text-foreground"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-primary/10 bg-background/50">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input 
                    placeholder="Type a message..." 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="pr-12 h-12 rounded-xl border-primary/20"
                  />
                  <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 h-10 w-10 text-primary">
                    <Send className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>

          {/* Participants Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:text-primary transition-colors">
                <Users className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md bg-card/95 border-l border-primary/20" side="right">
              <SheetHeader className="pb-6">
                <SheetTitle className="font-headline text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Participants ({participants?.length || 0})
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full pr-4">
                <div className="flex flex-col gap-3">
                  {participants?.map((p) => {
                    const isSelf = p.userId === user?.uid;
                    const hasRequest = sentRequests?.find(r => r.receiverId === p.userId);

                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-primary/5 group/p hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-primary/20 group-hover/p:border-primary/50 transition-all">
                            <AvatarImage src={p.photoUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{p.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{p.name}</span>
                            {isSelf && <span className="text-[10px] uppercase font-bold text-primary">You</span>}
                          </div>
                        </div>
                        {!isSelf && (
                          <div className="flex gap-2">
                            {hasRequest ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Requested
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent><p>Request pending</p></TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSendFriendRequest(p)}
                                className="h-8 px-2 text-primary hover:bg-primary hover:text-white rounded-lg"
                              >
                                <UserPlus className="h-4 w-4 mr-1" /> Add
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </footer>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-foreground">End Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently close the room and disconnect all participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background/50 border-primary/10 hover:bg-primary/10 hover:text-primary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:opacity-90 shadow-lg shadow-destructive/20">
              Close Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
