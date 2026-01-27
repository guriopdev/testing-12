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
import { User, Settings, Shield, Bell, Loader2 } from 'lucide-react';
import { updateProfile } from 'firebase/auth';

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
      // Update Firebase Auth Profile
      await updateProfile(user, { displayName });
      
      // Sync with Firestore User document
      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { displayName });

      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not update profile. Please try again.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground text-lg mt-2">Manage your student profile and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <aside className="space-y-2">
          <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10">
            <User className="mr-2 h-4 w-4" />
            General Information
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5">
            <Shield className="mr-2 h-4 w-4" />
            Privacy & Security
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5">
            <Settings className="mr-2 h-4 w-4" />
            System Preferences
          </Button>
        </aside>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-primary/10 bg-card/40 backdrop-blur-sm">
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle className="font-headline text-xl">General Profile</CardTitle>
                <CardDescription>Visible to other students in study rooms.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL || ''} />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{displayName || 'Student'}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={user.email || ''}
                      disabled
                      className="bg-background/20 border-white/5 text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end border-t border-white/5 pt-6">
                <Button type="submit" disabled={isUpdating} className="bg-primary text-primary-foreground">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-destructive">Danger Zone</CardTitle>
              <CardDescription>Permanent actions for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Deleting your account will remove all your data and access to study history.</p>
              <Button variant="destructive">Deactivate Account</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
