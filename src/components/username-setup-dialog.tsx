
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AtSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function UsernameSetupDialog() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || !db) return;

    const checkUserHasUsername = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists() || !userSnap.data().username) {
        setOpen(true);
      }
    };

    checkUserHasUsername();
  }, [user, db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || username.length < 3) return;

    setIsSaving(true);
    const cleanedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    
    try {
      const usernameRef = doc(db, 'usernames', cleanedUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        toast({
          variant: 'destructive',
          title: 'Username Taken',
          description: 'Please choose another unique student handle.',
        });
        setIsSaving(false);
        return;
      }

      // 1. Reserve username
      setDocumentNonBlocking(usernameRef, { userId: user.uid }, { merge: false });
      
      // 2. Update user profile
      const userRef = doc(db, 'users', user.uid);
      setDocumentNonBlocking(userRef, {
        id: user.uid,
        email: user.email,
        displayName: user.displayName || 'Student',
        username: cleanedUsername,
        photoUrl: user.photoURL || '',
      }, { merge: true });

      setOpen(false);
      toast({
        title: 'Welcome to Paradox!',
        description: `Your handle @${cleanedUsername} is now active.`,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] bg-card/95 border-primary/20 backdrop-blur-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl text-foreground">Set Your Handle</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose a unique username so students can find and add you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-bold uppercase tracking-widest text-primary">
              Your Student Username
            </Label>
            <div className="relative group">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                id="username"
                placeholder="student_pro"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                required
                className="pl-10 bg-background/50 border-white/10 focus:border-primary/50 h-12 text-lg"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Min 3 characters. Only letters, numbers, and underscores.</p>
          </div>
          <Button type="submit" disabled={isSaving || username.length < 3} className="w-full h-12 text-lg font-bold bg-primary text-primary-foreground hover:opacity-90">
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Confirm Identity'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
