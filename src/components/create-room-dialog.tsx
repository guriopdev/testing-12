
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2, Lock, Users } from 'lucide-react';
import { useState } from 'react';
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function CreateRoomDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be signed in to create a room.' });
      return;
    }
    if (!name || !topic) return;

    setIsSubmitting(true);
    try {
      const roomRef = await addDocumentNonBlocking(collection(db, 'rooms'), {
        name,
        topic,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp(),
        password: password.trim() || null,
        maxParticipants: parseInt(maxParticipants) || 10,
      });
      
      if (roomRef) {
        setOpen(false);
        setName('');
        setTopic('');
        setPassword('');
        setMaxParticipants('10');
        router.push(`/room/${roomRef.id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] border-primary/20 bg-card/95 backdrop-blur-xl">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-foreground">Create Study Room</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Launch a space for collaboration. Set a password or limit capacity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground/80">
                Room Name
              </Label>
              <Input 
                id="name" 
                placeholder="e.g. Finals Week Study Jam" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background/50 border-white/10 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-semibold text-foreground/80">
                Focus Topic
              </Label>
              <Input 
                id="topic" 
                placeholder="e.g. Advanced Thermodynamics" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="bg-background/50 border-white/10 focus:border-primary/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxParticipants" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Users className="h-3 w-3 text-primary" />
                  Max Capacity
                </Label>
                <Input 
                  id="maxParticipants" 
                  type="number"
                  min="2"
                  max="50"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <Lock className="h-3 w-3 text-primary" />
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Optional" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-white/10 focus:border-primary/50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Launch Room'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
