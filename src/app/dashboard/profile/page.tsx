'use client';

import { useState } from 'react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Settings, Shield, Bell, Loader2, ArrowLeft } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      await updateProfile(user, { displayName });
      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { displayName });

      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Please try again later.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-primary">
          <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your student account and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="space-y-2 col-span-1">
          <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10">
            <User className="mr-2 h-4 w-4" />
            General
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-primary/5 hover:text-primary">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-primary/5 hover:text-primary">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-primary/5 hover:text-primary">
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </Button>
        </aside>

        <div className="md:col-span-3 space-y-6">
          <Card className="border-primary/10 bg-card/40 backdrop-blur-sm">
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Personal Information</CardTitle>
                <CardDescription>Update your public-facing student profile.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-primary/20 transition-all group-hover:border-primary">
                      <AvatarImage src={user.photoURL || ''} />
                      <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                        {displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{displayName || 'Anonymous Student'}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-background/50 border-primary/10 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-background/20 border-white/5 text-muted-foreground cursor-not-allowed opacity-50"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-6 border-t border-primary/10">
                <Button type="submit" disabled={isUpdating} className="bg-primary text-primary-foreground hover:opacity-90">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-destructive">Account Management</CardTitle>
              <CardDescription>Irreversible actions for your student workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="font-bold">Deactivate Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}