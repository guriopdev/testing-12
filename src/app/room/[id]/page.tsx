'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Volume2,
  VolumeX,
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
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

  // Participant Management
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

    return () => {
      deleteDocumentNonBlocking(participantRef);
    };
  }, [user, db, roomId, isMuted, isCameraOff]);

  // Camera/Mic Setup
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(userStream);
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
        
        // Initial state: off
        userStream.getVideoTracks().forEach((track) => (track.enabled = false));
        userStream.getAudioTracks().forEach((track) => (track.enabled = false));

      } catch (error) {
        console.error('Error accessing media:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'Please enable camera and mic permissions to participate.',
        });
      }
    };

    getCameraPermission();
    
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [toast]);
  
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
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <h2 className="text-2xl font-bold mb-4">Room not found</h2>
        <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="dark bg-background text-foreground flex h-screen w-full flex-col font-body">
      <header className="flex h-16 items-center justify-between border-b border-white/5 bg-card/80 backdrop-blur-md px-4 md:px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg md:text-xl font-bold font-headline truncate max-w-[200px] sm:max-w-md">{room.name}</h1>
          <Badge variant="secondary" className="hidden sm:flex bg-primary/10 text-primary border-primary/20">
            {room.topic}
          </Badge>
        </div>
        <Button asChild variant="destructive" size="sm" className="rounded-full px-4 font-semibold shadow-lg shadow-destructive/20">
          <Link href="/dashboard">
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave Room
          </Link>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {/* Own Video */}
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-white/5 shadow-2xl">
            <video ref={videoRef} autoPlay muted playsInline className={cn("h-full w-full object-cover", isCameraOff && "hidden")} />
            { hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/60">
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertTitle>Hardware Access Required</AlertTitle>
                    <AlertDescription>
                      Check browser permissions for camera/mic.
                    </AlertDescription>
                  </Alert>
                </div>
            )}
            {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                        <AvatarImage src={user?.photoURL || ''} />
                        <AvatarFallback className="text-3xl bg-primary text-white">{user?.displayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                </div>
            )}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <span className="font-semibold text-white truncate text-sm">You (Me)</span>
              {isMuted ? (
                <MicOff className="h-4 w-4 text-destructive" />
              ) : (
                <Mic className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>

          {/* Other Participants */}
          {participants?.filter(p => p.userId !== user?.uid).map((p) => (
            <div key={p.id} className="relative aspect-video overflow-hidden rounded-2xl bg-card border border-white/5 shadow-xl transition-transform hover:scale-[1.02]">
              {p.isCameraOff ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-secondary/40 to-primary/10">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                        <AvatarImage src={p.photoUrl} />
                        <AvatarFallback className="text-3xl">{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
              ) : (
                <Image
                  src={`https://picsum.photos/seed/${p.userId}/800/450`}
                  alt={p.name}
                  fill
                  className="object-cover"
                  data-ai-hint="person profile"
                />
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <span className="font-semibold text-white truncate text-sm">{p.name}</span>
                 {p.isMuted ? (
                  <MicOff className="h-4 w-4 text-destructive" />
                ) : (
                  <Mic className="h-4 w-4 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex h-24 flex-shrink-0 items-center justify-center gap-4 sm:gap-8 border-t border-white/5 bg-card/50 backdrop-blur-2xl px-4 md:px-6">
        <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isMuted ? 'destructive' : 'secondary'} size="lg" className="rounded-full h-14 w-14 shadow-lg transition-all active:scale-95" onClick={handleMuteToggle}>
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isCameraOff ? 'destructive' : 'secondary'} size="lg" className="rounded-full h-14 w-14 shadow-lg transition-all active:scale-95" onClick={handleCameraToggle}>
                {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</p></TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-10 bg-white/10" />

          <Sheet>
            <SheetTrigger asChild>
               <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="secondary" size="lg" className="rounded-full h-14 w-14 shadow-lg transition-all active:scale-95">
                          <Users className="h-6 w-6" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Participants List</p></TooltipContent>
              </Tooltip>
            </SheetTrigger>
            <SheetContent className="dark w-full max-w-sm bg-card/95 backdrop-blur-xl border-l-white/10" side="right">
              <SheetHeader>
                <SheetTitle className="font-headline text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  Study Group ({participants?.length || 0})
                </SheetTitle>
              </SheetHeader>
              <Separator className="my-6 bg-white/5" />
              <div className="flex flex-col gap-4">
                {participants?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                          <AvatarImage src={p.photoUrl} />
                          <AvatarFallback className="bg-primary/20 text-primary">{p.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {p.userId === user?.uid && <span className="text-[10px] uppercase tracking-wider text-primary font-bold">You</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {p.isMuted ? <MicOff className="h-4 w-4 text-destructive/60" /> : <Mic className="h-4 w-4 text-primary/60" />}
                      {p.isCameraOff ? <VideoOff className="h-4 w-4 text-muted-foreground/60" /> : <Video className="h-4 w-4 text-primary/60" />}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}