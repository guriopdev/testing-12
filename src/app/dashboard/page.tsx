'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Loader2, Plus } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

function RoomCard({ room }: { room: any }) {
  return (
    <Card className="flex flex-col border-primary/10 bg-card/40 backdrop-blur-sm transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="font-headline tracking-tight text-xl">{room.name}</CardTitle>
        <CardDescription className="flex items-center gap-2 pt-1 font-medium text-primary/80">
            <BookOpen className="h-4 w-4" />
            {room.topic}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Created by {room.creatorName || 'Anonymous'}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full group">
          <Link href={`/room/${room.id}`}>
            Join Room
            <Plus className="ml-2 h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function DashboardPage() {
  const db = useFirestore();

  const roomsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: rooms, isLoading } = useCollection(roomsQuery);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Active Study Rooms</h1>
          <p className="text-muted-foreground text-lg mt-2">
            Find a peer group or dive into a focused session.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : rooms && rooms.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 border-dashed bg-transparent">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold font-headline mb-2">No active rooms</h3>
          <p className="text-muted-foreground text-center max-w-xs mb-6">
            Be the first to create a study space for others to join!
          </p>
        </Card>
      )}
    </div>
  );
}