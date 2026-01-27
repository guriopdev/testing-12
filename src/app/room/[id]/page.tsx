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
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';

export default function RoomPage({ params }: { params: { id: string } }) {
  const { id: roomId } = params;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Firestore Data
  const roomRef = useMemoFirebase(() => doc(db, 'rooms', roomId), [db, roomId]);
  const { data: room, isLoading: isRoomLoading } = useDoc(roomRef);

  const participantsQuery = useMemoFirebase(() => collection(db, 'rooms', roomId, 'participants'), [db, roomId]);
  const { data: participants } = useCollection(participantsQuery);

  // Participant Presence Management
  useEffect(() => {
    if (!user || !db || !roomId) return;

    const participantRef = doc(db, 'rooms', roomId, 'participants', user.uid);
    setDocumentNonBlocking(participantRef, {
      userId: user.uid,
      name: user.displayName || 'Guest',
      photoUrl: user.photoURL || '',
      isMuted,
      isCameraOff,
      joinedAt: serverTimestamp(),
    }, { merge: true });

    // Remove presence on leave
    return () => {
      deleteDocumentNonBlocking(participantRef);
    };
  }, [user, db, roomId, isMuted, isCameraOff]);

  // Camera/Mic Hardware Initialization
  useEffect(() => {
    const getMediaPermission = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        
        // Default to disabled tracks initially
        userStream.getVideoTracks().forEach((track) => (track.enabled = false));
        userStream.getAudioTracks().forEach((track) => (track.enabled = false));
      } catch (error) {
        console.error('Error accessing media:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Media Access Error',
          description: 'Please ensure camera and microphone are connected and allowed in browser settings.',
        });
      }
    };

    getMediaPermission();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);
  
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
        <h2 className="text-3xl font-headline font-bold mb-4">Room Not Found</h2>
        <p className="text-muted-foreground mb-8">This room may have been deleted or the link is invalid.</p>
        <Button asChild className="bg-primary hover:bg-primary/80"><Link href="/dashboard">Return to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="flex h-screen w-full flex-col bg-background font-body text-foreground overflow-hidden">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 md:px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-lg md:text-xl font-bold font-headline truncate max-w-[200px] sm:max-w-md">{room.name}</h1>
          <Badge variant="secondary" className="hidden sm:flex bg-primary/10 text-primary border-primary/20 font-medium">
            {room.topic}
          </Badge>
        </div>
        <Button asChild variant="destructive" size="sm" className="rounded-full px-4 font-semibold shadow-lg shadow-destructive/20 hover:scale-105 transition-transform">
          <Link href="/dashboard">
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave
          </Link>
        </Button>
      </header>

      {/* Video Grid */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <div className="mx-auto max-w-7xl grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
          
          {/* My Video Feed */}
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-card/50 border border-white/10 shadow-2xl group">
            <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover mirror", isCameraOff && "hidden")} />
            
            { hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                  <AlertTitle className="text-sm font-bold">Permissions Required</AlertTitle>
                  <AlertDescription className="text-xs opacity-80">Check browser settings for camera/mic.</AlertDescription>
                </Alert>
              </div>
            )}

            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/5">
                <Avatar className="h-24 w-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
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
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-white/5">
                  <AvatarImage src={p.photoUrl} />
                  <AvatarFallback className="text-4xl font-headline bg-card text-primary-foreground">{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {/* Note: In a real WebRTC app, this is where the remote video stream would go */}
                {!p.isCameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <Video className="h-12 w-12 text-primary/40" />
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

          {/* Empty State for Remote Peers */}
          {participants && participants.length === 1 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center animate-fade-in-up">
              <div className="p-4 rounded-full bg-primary/10 mb-4 ring-1 ring-primary/20">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-headline font-bold mb-2">You're the first one here!</h3>
              <p className="text-muted-foreground text-sm max-w-xs">Share the room URL with study partners to start collaborating.</p>
            </div>
          )}
        </div>
      </main>

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
            <SheetContent className="w-full max-w-sm bg-card/95 backdrop-blur-2xl border-l border-white/10" side="right">
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
                    <div className="flex gap-2">
                      {p.isMuted ? <MicOff className="h-4 w-4 text-destructive/50" /> : <Mic className="h-4 w-4 text-primary/50" />}
                      {p.isCameraOff ? <VideoOff className="h-4 w-4 text-muted-foreground/30" /> : <Video className="h-4 w-4 text-primary/50" />}
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