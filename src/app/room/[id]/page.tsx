
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
  Globe,
  UserCircle,
  Pin,
  PinOff,
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
import { doc, collection, serverTimestamp, query, orderBy, where, getDoc, updateDoc, increment } from 'firebase/firestore';
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
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  
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

  const selectedUserRef = useMemoFirebase(() => {
    if (!db || !selectedParticipant) return null;
    return doc(db, 'users', selectedParticipant.userId);
  }, [db, selectedParticipant]);
  const { data: selectedUserData } = useDoc(selectedUserRef);

  const isFull = participants && room && participants.length >= (room.maxParticipants || 10) && !participants.find(p => p.userId === user?.uid);

  // Persistence logic for passwords and active status
  useEffect(() => {
    if (!roomId) return;
    
    // Check session storage for existing unlock
    const sessionKey = `room_unlocked_${roomId}`;
    if (sessionStorage.getItem(sessionKey) === 'true') {
      setIsUnlocked(true);
    }
    
    // Mark as the current active session for the layout banner
    sessionStorage.setItem('last_active_room_id', roomId);
    if (room?.name) sessionStorage.setItem('last_active_room_name', room.name);

    return () => {
      // Clear active room ID when leaving (it survives navigation but can be cleared if needed)
      // We keep it so the dashboard banner can show "Resume Session"
    };
  }, [roomId, room?.name]);

  // STUDY TIME TRACKER: Increment user study time every 60 seconds
  useEffect(() => {
    if (!user || !db || (room?.password && !isUnlocked) || isFull) return;

    const interval = setInterval(() => {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        totalStudySeconds: increment(60)
      }).catch(err => console.error("Failed to update study time:", err));
    }, 60000);

    return () => clearInterval(interval);
  }, [user, db, room?.password, isUnlocked, isFull]);

  useEffect(() => {
    if (!user || !db || !roomId || (room?.password && !isUnlocked) || isFull) return;

    const syncParticipant = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
      setDocumentNonBlocking(participantRef, {
        userId: user.uid,
        name: user.displayName || 'Guest',
        username: userData?.username || 'anonymous',
        photoUrl: user.photoURL || '',
        isMuted,
        isCameraOff,
        joinedAt: serverTimestamp(),
      }, { merge: true });
    };

    syncParticipant();

    return () => {
      const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user) return;

    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const userData = userSnap.data();

    addDocumentNonBlocking(collection(db, 'rooms', roomId, 'messages'), {
      text: chatMessage.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Guest',
      senderUsername: userData?.username || 'student',
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
      sessionStorage.setItem(`room_unlocked_${roomId}`, 'true');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'Please try again.',
      });
    }
  };

  const handleSendFriendRequest = async (participant: any) => {
    if (!user) return;
    
    const isAlreadySent = sentRequests?.find(r => r.receiverId === participant.userId);
    if (isAlreadySent) {
      toast({ title: 'Request already sent' });
      return;
    }

    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const myData = userSnap.data();

    addDocumentNonBlocking(collection(db, 'friendRequests'), {
      senderId: user.uid,
      senderName: user.displayName || 'Student',
      senderUsername: myData?.username || 'student',
      senderPhoto: user.photoURL || '',
      receiverId: participant.userId,
      receiverName: participant.name,
      receiverUsername: participant.username,
      receiverPhoto: participant.photoUrl,
      status: 'pending',
      timestamp: serverTimestamp(),
    });

    toast({
      title: 'Friend Request Sent',
      description: `Request sent to @${participant.username}`,
    });
  };

  const handleConfirmDelete = () => {
    if (!room || !user || room.creatorId !== user.uid) return;
    deleteDocumentNonBlocking(roomRef);
    setIsDeleteDialogOpen(false);
    sessionStorage.removeItem(`room_unlocked_${roomId}`);
    sessionStorage.removeItem('last_active_room_id');
    router.push('/dashboard');
  };

  const handleTogglePin = (id: string) => {
    setPinnedId(pinnedId === id ? null : id);
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
  const pinnedParticipant = participants?.find(p => p.userId === pinnedId) || (pinnedId === user?.uid ? { userId: user?.uid, name: 'You', photoUrl: user?.photoURL || '' } : null);

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
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
          <div className="mx-auto max-w-7xl flex flex-col gap-4">
            {pinnedId && (
              <div className="relative aspect-video max-h-[70vh] w-full overflow-hidden rounded-3xl bg-card border-2 border-primary/30 shadow-2xl ring-4 ring-primary/5 animate-fade-in-up">
                {pinnedId === user?.uid ? (
                   <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", isCameraOff && "hidden")} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-background to-primary/10">
                    <Avatar className="h-40 w-40 border-8 border-background shadow-2xl">
                      <AvatarImage src={pinnedParticipant?.photoUrl} />
                      <AvatarFallback className="text-7xl font-headline bg-primary/10 text-primary">{pinnedParticipant?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                
                {pinnedId === user?.uid && isCameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
                    <Avatar className="h-40 w-40 border-8 border-background shadow-2xl">
                      <AvatarImage src={user?.photoURL || ''} />
                      <AvatarFallback className="text-7xl bg-primary text-primary-foreground font-headline">
                        {user?.displayName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="icon" variant="secondary" className="rounded-full bg-black/40 backdrop-blur-md border-white/10 hover:bg-black/60" onClick={() => setPinnedId(null)}>
                    <PinOff className="h-5 w-5" />
                  </Button>
                </div>

                <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <span className="text-lg font-bold text-white tracking-wide uppercase px-2">{pinnedParticipant?.name}</span>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-none text-xs">Pinned Session</Badge>
                </div>
              </div>
            )}

            <div className={cn(
              "grid gap-4 content-start",
              pinnedId ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}>
              <div className={cn(
                "relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 shadow-lg group transition-all hover:border-primary/40",
                pinnedId === user?.uid && "ring-2 ring-primary border-primary/40"
              )}>
                <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", (isCameraOff || pinnedId === user?.uid) && "hidden")} />
                
                {(isCameraOff || pinnedId === user?.uid) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
                    <Avatar className="h-16 w-16 border-2 border-background shadow-xl">
                      <AvatarImage src={user?.photoURL || ''} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground font-headline">
                        {user?.displayName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {pinnedId === user?.uid && <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px]"><Pin className="h-8 w-8 text-white animate-pulse" /></div>}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2">You</span>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-primary" onClick={() => handleTogglePin(user?.uid || '')}>
                      <Pin className={cn("h-3.5 w-3.5", pinnedId === user?.uid && "fill-primary")} />
                    </Button>
                    {!isMuted && <div className="h-2 w-2 rounded-full bg-primary animate-ping" />}
                    {isMuted ? <MicOff className="h-3 w-3 text-destructive" /> : <Mic className="h-3 w-3 text-primary" />}
                  </div>
                </div>
              </div>

              {participants?.filter(p => p.userId !== user?.uid).map((p) => (
                <div key={p.id} className={cn(
                  "relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 shadow-lg transition-all hover:border-primary/40 group ring-1 ring-primary/5",
                  pinnedId === p.userId && "ring-2 ring-primary border-primary/40"
                )}>
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-background to-primary/5">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl ring-2 ring-primary/10 transition-transform group-hover:scale-105">
                      <AvatarImage src={p.photoUrl} />
                      <AvatarFallback className="text-4xl font-headline bg-primary/10 text-primary">{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {pinnedId === p.userId && <div className="absolute inset-0 bg-black/20 flex items-center justify-center backdrop-blur-[2px]"><Pin className="h-8 w-8 text-white animate-pulse" /></div>}
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-xl p-2 border border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2 truncate cursor-pointer" onClick={() => setSelectedParticipant(p)}>{p.name}</span>
                      <span className="text-[8px] text-primary font-mono px-2">@{p.username}</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      {!p.isMuted && <div className="h-2 w-2 rounded-full bg-primary animate-ping" />}
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:text-primary" onClick={() => handleTogglePin(p.userId)}>
                        <Pin className={cn("h-3 w-3", pinnedId === p.userId && "fill-primary")} />
                      </Button>
                      {p.isMuted ? <MicOff className="h-3.5 w-3.5 text-destructive" /> : <Mic className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

        <aside className="hidden lg:flex w-80 flex-col border-l border-primary/10 bg-card/40 backdrop-blur-3xl shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <h2 className="font-headline font-bold text-xs tracking-widest uppercase text-primary">Live Chat</h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{messages?.length || 0}</Badge>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-4">
              {messages?.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{msg.senderName}</span>
                    <span className="text-[8px] text-primary/40 font-mono lowercase">@{msg.senderUsername}</span>
                  </div>
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
                  {participants?.map((p) => (
                      <div 
                        key={p.id} 
                        className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-primary/5 group/p hover:bg-primary/5 transition-all cursor-pointer"
                        onClick={() => setSelectedParticipant(p)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-primary/20 group-hover/p:border-primary/50 transition-all">
                            <AvatarImage src={p.photoUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{p.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{p.name}</span>
                              {p.userId === room.creatorId && <Badge variant="outline" className="text-[8px] h-3 px-1 border-primary/40 text-primary">Creator</Badge>}
                            </div>
                            <span className="text-[10px] text-primary font-mono lowercase">@{p.username}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover/p:opacity-100 transition-all" />
                      </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedParticipant && (
                <div className="absolute inset-0 bg-card z-50 animate-in slide-in-from-right duration-300 flex flex-col p-6 overflow-hidden">
                  <Button variant="ghost" size="sm" className="w-fit mb-6 text-muted-foreground hover:text-primary" onClick={() => setSelectedParticipant(null)}>
                    <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                    Back to List
                  </Button>
                  
                  <div className="flex flex-col items-center text-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-primary/20 shadow-xl ring-2 ring-primary/5">
                      <AvatarImage src={selectedParticipant.photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-3xl font-headline">{selectedParticipant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold font-headline text-foreground">{selectedParticipant.name}</h3>
                      <p className="text-primary font-mono lowercase text-sm">@{selectedParticipant.username}</p>
                      {selectedUserData?.pronouns && (
                        <Badge variant="outline" className="mt-1 bg-primary/5 border-primary/20 text-[10px] font-bold uppercase tracking-wider">{selectedUserData.pronouns}</Badge>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6 bg-primary/10" />

                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-6">
                      {selectedUserData?.country && (
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-primary/60 flex items-center gap-1">
                            <Globe className="h-3 w-3" /> Country / Region
                          </p>
                          <p className="text-sm font-medium">{selectedUserData.country}</p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-primary/60 flex items-center gap-1">
                          <UserCircle className="h-3 w-3" /> Student Bio
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground italic">
                          {selectedUserData?.aboutMe || "This student hasn't added a bio to their workspace yet."}
                        </p>
                      </div>
                      
                      {!user || selectedParticipant.userId === user.uid ? null : (
                        <div className="pt-4 space-y-3">
                          <Button className="w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => handleTogglePin(selectedParticipant.userId)}>
                            <Pin className="h-4 w-4 mr-2" />
                            {pinnedId === selectedParticipant.userId ? 'Unpin Video' : 'Pin to Focus'}
                          </Button>

                          {sentRequests?.find(r => r.receiverId === selectedParticipant.userId) ? (
                            <Button disabled className="w-full bg-secondary text-muted-foreground border border-white/5">
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Partner Request Pending
                            </Button>
                          ) : (
                            <Button className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold" onClick={() => handleSendFriendRequest(selectedParticipant)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Study Partner
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
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
