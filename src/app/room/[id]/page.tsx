
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
  Instagram,
  Trophy,
  Zap,
  Clock,
  ExternalLink,
  ShieldAlert,
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
import { Progress } from '@/components/ui/progress';
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
import { doc, collection, serverTimestamp, query, orderBy, where, getDoc } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TEST MODE: 4 seconds threshold. Production: 3600 (1 hour).
const STUDY_THRESHOLD = 4; 
const REWARD_DURATION = 10; // 10 seconds for quick testing. Production: 600 (10 mins)

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
  
  // Reward System State
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [rewardTimeLeft, setRewardTimeLeft] = useState(0);
  const [isRewardActive, setIsRewardActive] = useState(false);
  const [isBreakOverdue, setIsBreakOverdue] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rewardWindowRef = useRef<Window | null>(null);

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

  useEffect(() => {
    if (!roomId) return;
    const sessionKey = `room_unlocked_${roomId}`;
    if (sessionStorage.getItem(sessionKey) === 'true') {
      setIsUnlocked(true);
    }
    sessionStorage.setItem('last_active_room_id', roomId);
    if (room?.name) sessionStorage.setItem('last_active_room_name', room.name);
  }, [roomId, room?.name]);

  // TRACKING: Study Cycle and Reward logic
  useEffect(() => {
    if (!user || !db || (room?.password && !isUnlocked) || isFull) return;

    const interval = setInterval(() => {
      if (!isRewardActive) {
        setSessionSeconds((prev) => {
          const next = prev + 1;
          if (next === STUDY_THRESHOLD) {
            setTimeout(() => {
              setIsRewardActive(true);
              setIsBreakOverdue(false);
              setRewardTimeLeft(REWARD_DURATION);
              toast({
                title: "Focus Reward Unlocked! 🏆",
                description: `Deep work complete. Enjoy your break!`,
                className: "bg-primary text-primary-foreground font-bold border-none",
              });
            }, 0);
          }
          return next;
        });
      } else {
        setRewardTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setTimeout(() => {
              // ATTEMPT TO CLOSE WINDOW
              if (rewardWindowRef.current) {
                rewardWindowRef.current.close();
                rewardWindowRef.current = null;
              }
              setIsRewardActive(false);
              setIsBreakOverdue(true); // TRIGGER THE LOCK OVERLAY
              setSessionSeconds(0);
              toast({
                title: "Break Over! 🛑",
                description: "Session re-locked. Resume focus immediately.",
                variant: "destructive",
              });
            }, 0);
            return 0;
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, db, room?.password, isUnlocked, isFull, isRewardActive, toast]);

  // Sync participant status
  useEffect(() => {
    if (!user || !db || !roomId || (room?.password && !isUnlocked) || isFull) return;

    const syncParticipant = async () => {
      const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
      setDocumentNonBlocking(participantRef, {
        userId: user.uid,
        name: user.displayName || 'Guest',
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

  // Media Permissions
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

  // Auto-scroll chat
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

  const handleOpenInstagram = () => {
    const win = window.open('https://instagram.com', '_blank');
    rewardWindowRef.current = win;
  };

  const handleResumeStudy = () => {
    setIsBreakOverdue(false);
    setSessionSeconds(0);
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
        <Button asChild className="bg-primary text-primary-foreground"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-center p-4">
        <Users className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-3xl font-headline font-bold mb-4 text-foreground">Room Full</h2>
        <Button asChild className="bg-primary text-primary-foreground"><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  if (room.password && !isUnlocked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
        <Card className="w-full max-w-md bg-card/60 backdrop-blur-3xl border-primary/20 p-8 shadow-2xl z-10">
          <div className="text-center space-y-4 mb-8">
            <Lock className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-3xl font-bold font-headline text-foreground">{room.name}</h1>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="h-12 w-full bg-background/50 border border-primary/20 rounded-xl text-center tracking-widest text-lg"
              autoFocus
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground">Join Session</Button>
          </form>
        </Card>
      </div>
    );
  }

  const isCreator = user?.uid === room.creatorId;
  const pinnedParticipant = participants?.find(p => p.userId === pinnedId) || (pinnedId === user?.uid ? { userId: user?.uid, name: 'You', photoUrl: user?.photoURL || '' } : null);
  const studyProgress = Math.min((sessionSeconds / STUDY_THRESHOLD) * 100, 100);
  const rewardProgress = Math.max(0, Math.min((rewardTimeLeft / REWARD_DURATION) * 100, 100));

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
      {/* OVERDUE LOCK OVERLAY */}
      {isBreakOverdue && (
        <div className="absolute inset-0 z-[100] bg-background/90 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
           <Card className="max-w-md w-full border-primary/30 bg-card/60 p-10 text-center space-y-8 shadow-[0_0_100px_rgba(var(--primary),0.2)]">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto ring-2 ring-primary/20">
                <ShieldAlert className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-headline font-bold">Focus Mode Locked</h2>
                <p className="text-muted-foreground">Your social break has expired. Access to the study room is locked until you resume your session.</p>
              </div>
              <Button onClick={handleResumeStudy} size="lg" className="w-full h-14 bg-primary text-primary-foreground text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 transition-transform active:scale-95">
                Resume Study Session
              </Button>
           </Card>
        </div>
      )}

      <header className="flex h-16 items-center justify-between border-b border-primary/10 bg-card/60 backdrop-blur-xl px-4 md:px-6 z-30">
        <div className="flex items-center gap-3">
          <Link href="/dashboard"><ChevronRight className="h-5 w-5 text-muted-foreground rotate-180 hover:text-primary transition-colors" /></Link>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-bold font-headline truncate max-w-[120px] sm:max-w-md">{room.name}</h1>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{room.topic}</span>
          </div>
        </div>

        {!isRewardActive && (
          <div className="hidden md:flex flex-col gap-1 w-48 mx-4">
             <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-primary/60">
               <span>Next Reward In</span>
               <span>{Math.max(0, STUDY_THRESHOLD - sessionSeconds)}s</span>
             </div>
             <Progress value={studyProgress} className="h-1.5 bg-primary/10" />
          </div>
        )}

        {isRewardActive && (
          <Badge className="animate-pulse bg-emerald-500 text-white border-none gap-2 px-3 py-1">
            <Instagram className="h-3 w-3" />
            Reward Active: {Math.floor(rewardTimeLeft / 60)}:{(rewardTimeLeft % 60).toString().padStart(2, '0')}
          </Badge>
        )}
        
        <div className="flex items-center gap-2">
          <Button asChild variant="destructive" size="sm" className="rounded-full px-4">
            <Link href="/dashboard"><PhoneOff className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Leave</span></Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-transparent to-primary/5">
          
          {isRewardActive && (
            <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
               <Card className="max-w-3xl w-full border-emerald-500/20 bg-card/40 flex flex-col overflow-hidden shadow-2xl">
                 <div className="p-4 border-b border-white/5 bg-emerald-500/10 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Instagram className="h-6 w-6 text-emerald-400" />
                     <h2 className="text-xl font-headline font-bold text-emerald-400 uppercase tracking-widest">Focus Break Zone</h2>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-xs font-bold text-emerald-400">{Math.floor(rewardTimeLeft / 60)}:{(rewardTimeLeft % 60).toString().padStart(2, '0')} remaining</span>
                     <Progress value={rewardProgress} className="w-32 h-1 bg-white/10" />
                   </div>
                 </div>
                 <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                    <Zap className="h-16 w-16 text-emerald-500 animate-pulse" />
                    <div className="space-y-2">
                      <h3 className="text-3xl font-bold font-headline">Break Time!</h3>
                      <p className="text-muted-foreground">Access your Instagram portal below. This area will automatically <strong>Hard Lock</strong> the study room in {rewardTimeLeft} seconds.</p>
                    </div>
                    <Button onClick={handleOpenInstagram} size="lg" className="h-16 px-10 bg-emerald-500 text-white font-bold text-xl hover:bg-emerald-600 rounded-2xl shadow-xl transition-all active:scale-95">
                       <ExternalLink className="mr-3 h-6 w-6" />
                       Open Instagram Portal
                    </Button>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 italic">Note: If on mobile, the Instagram app will open. Return here when the timer ends to resume focus.</p>
                 </div>
                 <Button variant="ghost" className="m-4 text-emerald-500/60" onClick={() => {
                   if (rewardWindowRef.current) rewardWindowRef.current.close();
                   setIsRewardActive(false);
                 }}>
                   Skip & Return to Study
                 </Button>
               </Card>
            </div>
          )}

          <div className="mx-auto max-w-7xl flex flex-col gap-4">
            {pinnedId && (
              <div className="relative aspect-video max-h-[70vh] w-full overflow-hidden rounded-3xl bg-card border-2 border-primary/30 shadow-2xl">
                {pinnedId === user?.uid ? (
                   <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", isCameraOff && "hidden")} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <Avatar className="h-40 w-40 border-8 border-background">
                      <AvatarImage src={pinnedParticipant?.photoUrl} />
                      <AvatarFallback className="text-7xl font-headline bg-primary/10 text-primary">{pinnedParticipant?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
                <Button size="icon" variant="secondary" className="absolute top-4 right-4 rounded-full" onClick={() => setPinnedId(null)}><PinOff className="h-5 w-5" /></Button>
              </div>
            )}

            <div className={cn("grid gap-4", pinnedId ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 group">
                <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", (isCameraOff || pinnedId === user?.uid) && "hidden")} />
                {(isCameraOff || pinnedId === user?.uid) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    <Avatar className="h-16 w-16 border-2 border-background"><AvatarImage src={user?.photoURL || ''} /><AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback></Avatar>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/40 backdrop-blur-md rounded-lg p-1">
                   <span className="text-[10px] font-bold px-2">You</span>
                   <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPinnedId(user?.uid || '')}><Pin className="h-3 w-3" /></Button>
                </div>
              </div>

              {participants?.filter(p => p.userId !== user?.uid).map((p) => (
                <div key={p.id} className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-primary/10 group">
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    <Avatar className="h-20 w-20 border-4 border-background"><AvatarImage src={p.photoUrl} /><AvatarFallback>{p.name.charAt(0)}</AvatarFallback></Avatar>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-black/40 backdrop-blur-md rounded-lg p-1">
                    <span className="text-[10px] font-bold px-2 truncate">{p.name}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPinnedId(p.userId)}><Pin className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="hidden lg:flex w-80 flex-col border-l border-primary/10 bg-card/40 backdrop-blur-3xl shadow-2xl">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="m-2 bg-background/50">
              <TabsTrigger value="chat" className="flex-1 text-[10px] font-bold uppercase">Chat</TabsTrigger>
              <TabsTrigger value="rewards" className="flex-1 text-[10px] font-bold uppercase">Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === user?.uid ? "items-end" : "items-start")}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{msg.senderName}</span>
                      <div className={cn("px-3 py-2 rounded-2xl text-sm max-w-[90%] break-words", msg.senderId === user?.uid ? "bg-primary text-primary-foreground" : "bg-secondary")}>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-primary/10">
                <form onSubmit={handleSendMessage} className="relative">
                  <Input placeholder="Message..." value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} className="bg-background rounded-xl h-10" />
                  <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8 text-primary" disabled={!chatMessage.trim()}><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="rewards" className="flex-1 m-0 p-4 space-y-6">
               <Card className="bg-background/40 border-primary/10 p-4 space-y-4">
                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Reward Progress</p>
                        <p className="text-xl font-bold font-headline">{studyProgress.toFixed(0)}%</p>
                     </div>
                     <Trophy className={cn("h-8 w-8", sessionSeconds >= STUDY_THRESHOLD ? "text-emerald-500" : "text-muted-foreground/20")} />
                  </div>
                  <Progress value={studyProgress} className="h-2 bg-primary/10" />
               </Card>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <footer className="flex h-20 items-center justify-center border-t border-primary/10 bg-card/80 backdrop-blur-2xl px-4 z-40">
        <div className="flex items-center gap-4">
          <Button variant={isMuted ? 'destructive' : 'secondary'} size="icon" className="rounded-full h-12 w-12" onClick={handleMuteToggle}>
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button variant={isCameraOff ? 'destructive' : 'secondary'} size="icon" className="rounded-full h-12 w-12" onClick={handleCameraToggle}>
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
          <Separator orientation="vertical" className="h-8 bg-primary/10 mx-2" />
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-12 w-12 lg:hidden"><MessageSquare className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent className="bg-card/95"><SheetHeader><SheetTitle>Chat</SheetTitle></SheetHeader></SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-12 w-12"><Users className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent className="bg-card/95"><SheetHeader><SheetTitle>Participants ({participants?.length || 0})</SheetTitle></SheetHeader></SheetContent>
          </Sheet>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}
