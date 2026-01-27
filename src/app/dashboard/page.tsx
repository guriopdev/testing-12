import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { mockRooms, type Room } from '@/lib/mock-data';
import { Users, BookOpen } from 'lucide-react';

function RoomCard({ room }: { room: Room }) {
  return (
    <Card className="flex flex-col transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="font-headline tracking-tight">{room.name}</CardTitle>
        <CardDescription className="flex items-center gap-2 pt-1">
            <BookOpen className="h-4 w-4" />
            {room.topic}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{room.participants} / {room.maxParticipants} participants</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/room/${room.id}`}>Join Room</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function DashboardPage() {
  const rooms = mockRooms;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">Active Rooms</h1>
        <p className="text-muted-foreground">
          Find a study group that fits your needs or create your own.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </>
  );
}
