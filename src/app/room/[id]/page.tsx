
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/navigation';
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
  Pin,
  PinOff,
  Instagram,
  Trophy,
  Zap,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  History,
  Timer,
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
import { TooltipProvider } from '@/components/ui/tooltip';
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
  addDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy, where, getDoc, increment } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TEST MODE: 4 seconds threshold. Production: 3600 (1 hour).
const STUDY_THRESHOLD = 4; 
const REWARD_DURATION = 10; // 10 seconds for quick testing.
const PENALTY_GRACE_PERIOD = 5; // Seconds to return before penalty kicks in

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.id;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  
  // Reward & Lockdown State
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [rewardTimeLeft, setRewardTimeLeft] = useState(0);
  const [isRewardActive, setIsRewardActive] = useState(false);
  const [isBreakOverdue, setIsBreakOverdue] = useState(false);
  const [penaltyTime, setPenaltyTime] = useState(0);
  
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

  useEffect(() => {
    if (!roomId) return;
    const sessionKey = `room_unlocked_${roomId}`;
    if (sessionStorage.getItem(sessionKey) === 'true') {
      setIsUnlocked(true);
    }
    sessionStorage.setItem('last_active_room_id', roomId);
    if (room?.name) sessionStorage.setItem('last_active_room_name', room.name);
  }, [roomId, room?.name]);

  // CORE ENGINE: Study Tracking, Rewards, and Penalty Logic
  useEffect(() => {
    if (!user || !db || (room?.password && !isUnlocked)) return;

    const interval = setInterval(() => {
      // 1. NORMAL STUDY MODE
      if (!isRewardActive && !isBreakOverdue) {
        setSessionSeconds((prev) => {
          const next = prev + 1;
          
          // Every 60 seconds of study, update the global leaderboard
          if (next % 60 === 0) {
            updateDocumentNonBlocking(doc(db, 'users', user.uid), {
              totalStudySeconds: increment(60)
            });
          }

          if (next >= STUDY_THRESHOLD) {
            setIsRewardActive(true);
            setRewardTimeLeft(REWARD_DURATION);
            toast({
              title: "Break Zone Unlocked!",
              description: `Enjoy your earned social break. Protocol active.`,
              className: "bg-emerald-500 text-white font-bold border-none",
            });
          }
          return next;
        });
      } 
      // 2. REWARD BREAK MODE
      else if (isRewardActive) {
        setRewardTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsRewardActive(false);
            setIsBreakOverdue(true);
            setPenaltyTime(0);
            
            // Visual notification in the background
            document.title = "⚠️ RETURN TO FOCUS";
            
            toast({
              title: "BREAK EXPIRED!",
              description: "Room is now LOCKED. Return immediately.",
              variant: "destructive",
            });
            return 0;
          }
          return next;
        });
      }
      // 3. PENALTY / OVERDUE MODE
      else if (isBreakOverdue) {
        setPenaltyTime((prev) => {
          const next = prev + 1;
          // If they haven't returned for more than the grace period, punish their leaderboard stats
          if (next > PENALTY_GRACE_PERIOD) {
             updateDocumentNonBlocking(doc(db, 'users', user.uid), {
               totalStudySeconds: increment(-5) // Deduct time for distraction
             });
          }
          return next;
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      document.title = "StudyParadox";
    };
  }, [user, db, room?.password, isUnlocked, isRewardActive, isBreakOverdue, toast]);

  // Sync participant status
  useEffect(() => {
    if (!user || !db || !roomId || (room?.password && !isUnlocked)) return;

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
  }, [user, db, roomId, isMuted, isCameraOff, room?.password, isUnlocked]);

  // Media Permissions
  useEffect(() => {
    if ((room?.password && !isUnlocked)) return;

    const getMediaPermission = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        userStream.getVideoTracks().forEach((track) => (track.enabled = !isCameraOff));
        userStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
      } catch (error) {
        console.error('Error accessing media:', error);
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
    setPenaltyTime(0);
    document.title = "StudyParadox";
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

  const pinnedParticipant = participants?.find(p => p.userId === pinnedId) || (pinnedId === user?.uid ? { userId: user?.uid, name: 'You', photoUrl: user?.photoURL || '' } : null);
  const studyProgress = Math.min((sessionSeconds / STUDY_THRESHOLD) * 100, 100);
  const rewardProgress = Math.max(0, Math.min((rewardTimeLeft / REWARD_DURATION) * 100, 100));

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
      
      {/* 🛑 HARD LOCKDOWN PROTOCOL (Active when break ends) */}
      {isBreakOverdue && (
        <div className={cn(
          "fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500",
          penaltyTime > PENALTY_GRACE_PERIOD ? "bg-red-950/95" : "bg-black/95 backdrop-blur-3xl"
        )}>
           <Card className={cn(
             "max-w-md w-full border-2 p-10 text-center space-y-8 shadow-2xl transition-colors",
             penaltyTime > PENALTY_GRACE_PERIOD ? "border-red-500 bg-red-950/40" : "border-primary/40 bg-card/60"
           )}>
              <div className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center mx-auto ring-4 animate-pulse",
                penaltyTime > PENALTY_GRACE_PERIOD ? "bg-red-500/20 ring-red-500/40" : "bg-primary/10 ring-primary/20"
              )}>
                {penaltyTime > PENALTY_GRACE_PERIOD ? (
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                ) : (
                  <ShieldAlert className="h-12 w-12 text-primary" />
                )}
              </div>
              
              <div className="space-y-3">
                <h2 className={cn(
                  "text-4xl font-headline font-bold",
                  penaltyTime > PENALTY_GRACE_PERIOD ? "text-red-500" : "text-foreground"
                )}>
                  {penaltyTime > PENALTY_GRACE_PERIOD ? "PENALTY ACTIVE" : "LOCKDOWN"}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {penaltyTime > PENALTY_GRACE_PERIOD 
                    ? "Your study streak is now BLEEDING. Every second away from focus is reducing your leaderboard rank." 
                    : "Your break has officially expired. Return to focus immediately to protect your streak."}
                </p>
                {penaltyTime > PENALTY_GRACE_PERIOD && (
                  <div className="flex items-center justify-center gap-2 text-red-500 font-bold animate-pulse">
                    <History className="h-4 w-4" />
                    <span>Deducting Study Seconds...</span>
                  </div>
                )}
              </div>

              <Button onClick={handleResumeStudy} size="lg" className={cn(
                "w-full h-16 text-xl font-bold rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95",
                penaltyTime > PENALTY_GRACE_PERIOD ? "bg-red-500 text-white hover:bg-red-600" : "bg-primary text-primary-foreground"
              )}>
                Stop Penalty & Resume
              </Button>
           </Card>
        </div>
      )}

      {/* 🎁 REWARD PORTAL (Social Break Active) */}
      {isRewardActive && (
        <div className="fixed inset-0 z-[90] bg-background/90 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <Card className="max-w-4xl w-full border-emerald-500/30 bg-card/80 flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Instagram className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-emerald-400 uppercase tracking-widest">Social Break Zone</h2>
                    <p className="text-xs text-emerald-400/60 font-medium">Paradox Protocol Level 2 Unlocked</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                    <Timer className="h-4 w-4" />
                    {Math.floor(rewardTimeLeft / 60)}:{(rewardTimeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <Progress value={rewardProgress} className="w-40 h-2 bg-white/10" />
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-10">
                <div className="space-y-4 max-w-xl">
                  <h3 className="text-4xl font-bold font-headline">Break Authorized</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    You have earned this window of distraction. Use the link below to access Instagram. 
                    <br/><br/>
                    <span className="text-red-400 font-bold uppercase tracking-tighter text-sm">
                      Note: Fail to return within {rewardTimeLeft}s and your study rank will be penalized.
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                  <Button onClick={handleOpenInstagram} size="lg" className="h-20 px-12 bg-emerald-500 text-white font-bold text-2xl hover:bg-emerald-600 rounded-3xl shadow-2xl shadow-emerald-500/20 transition-all hover:scale-105 group">
                    <ExternalLink className="mr-3 h-7 w-7 transition-transform group-hover:rotate-12" />
                    Open Instagram
                  </Button>
                  
                  <Button variant="outline" size="lg" className="h-20 px-10 border-white/10 hover:bg-white/5 text-muted-foreground font-bold rounded-3xl" onClick={() => setIsRewardActive(false)}>
                    End Early
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-black/40 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
                  Secured Workspace • {room.name}
                </p>
              </div>
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

        {!isRewardActive && !isBreakOverdue && (
          <div className="hidden md:flex flex-col gap-1 w-48 mx-4">
             <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-primary/60">
               <span>Next Reward In</span>
               <span>{Math.max(0, STUDY_THRESHOLD - sessionSeconds)}s</span>
             </div>
             <Progress value={studyProgress} className="h-1.5 bg-primary/10" />
          </div>
        )}

        {isRewardActive && (
          <Badge className="animate-pulse bg-emerald-500 text-white border-none gap-2 px-3 py-1 font-bold">
            <Instagram className="h-3 w-3" />
            Social Break: {Math.floor(rewardTimeLeft / 60)}:{(rewardTimeLeft % 60).toString().padStart(2, '0')}
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
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Focus Streak</p>
                        <p className="text-xl font-bold font-headline">{studyProgress.toFixed(0)}%</p>
                     </div>
                     <Trophy className={cn("h-8 w-8", sessionSeconds >= STUDY_THRESHOLD ? "text-emerald-500" : "text-muted-foreground/20")} />
                  </div>
                  <Progress value={studyProgress} className="h-2 bg-primary/10" />
                  <p className="text-[10px] text-muted-foreground">Complete 1 hour of deep work to unlock the Social Break Zone.</p>
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

