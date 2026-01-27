'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  Volume2,
  VolumeX,
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
import { mockParticipants, mockRooms } from '@/lib/mock-data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function RoomPage({ params }: { params: { id: string } }) {
  const room = mockRooms.find((r) => r.id === params.id) || mockRooms[0];
  const participants = mockParticipants;
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(false);

  return (
    <TooltipProvider>
    <div className="dark bg-background text-foreground flex h-screen w-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold font-headline">{room.name}</h1>
          <p className="text-sm text-muted-foreground">{participants.length} participants</p>
        </div>
        <Button asChild variant="destructive">
          <Link href="/dashboard">
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave Room
          </Link>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {participants.map((participant) => {
            const videoPlaceholder = PlaceHolderImages.find(p => p.id === participant.avatar);
            const isCurrentUser = participant.id === '1';
            const cameraOff = isCurrentUser ? isCameraOff : participant.isCameraOff;
            const muted = isCurrentUser ? isMuted : participant.isMuted;

            return (
              <div key={participant.id} className="relative aspect-video overflow-hidden rounded-lg bg-card shadow-lg">
                <Image
                  src={videoPlaceholder?.imageUrl || ''}
                  alt={participant.name}
                  fill
                  className={cn("object-cover transition-all", cameraOff && "blur-xl scale-110")}
                  data-ai-hint={videoPlaceholder?.imageHint}
                />
                {cameraOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Avatar className="h-24 w-24 border-2 border-background">
                            <AvatarImage src={PlaceHolderImages.find(p => p.id === 'user-avatar')?.imageUrl} />
                            <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="font-medium text-white">{participant.name}</span>
                   {muted ? (
                    <MicOff className="h-5 w-5 text-white" />
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="flex h-20 flex-shrink-0 items-center justify-center gap-2 sm:gap-4 border-t border-border bg-card px-4 md:px-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={isMuted ? 'destructive' : 'secondary'} size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff /> : <Mic />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{isMuted ? 'Unmute' : 'Mute'}</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={isCameraOff ? 'destructive' : 'secondary'} size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14" onClick={() => setIsCameraOff(!isCameraOff)}>
              {isCameraOff ? <VideoOff /> : <Video />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>{isCameraOff ? 'Start Camera' : 'Stop Camera'}</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14">
              <ScreenShare />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Share Screen</p></TooltipContent>
        </Tooltip>

        <Sheet>
          <SheetTrigger asChild>
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="secondary" size="lg" className="rounded-full h-12 w-12 sm:h-14 sm:w-14">
                        <Users />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Participants</p></TooltipContent>
            </Tooltip>
          </SheetTrigger>
          <SheetContent className="dark w-full max-w-sm" side="right">
            <SheetHeader>
              <SheetTitle className="font-headline">Participants ({participants.length})</SheetTitle>
            </SheetHeader>
            <Separator className="my-4" />
            <div className="flex flex-col gap-4">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={PlaceHolderImages.find(img => img.id === 'user-avatar')?.imageUrl} />
                        <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{p.name}</span>
                    {p.id === '1' && <Badge variant="secondary">You</Badge>}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {p.isMuted ? <VolumeX className="h-5 w-5 text-muted-foreground" /> : <Volume2 className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p>Mute {p.name}</p></TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </footer>
    </div>
    </TooltipProvider>
  );
}
