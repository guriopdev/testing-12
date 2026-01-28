
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Settings, Shield, Bell, Loader2, ArrowLeft, Globe, UserCircle } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userData, isLoading: isUserDocLoading } = useDoc(userDocRef);

  const [formData, setFormData] = useState({
    displayName: '',
    pronouns: '',
    country: '',
    aboutMe: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || user?.displayName || '',
        pronouns: userData.pronouns || '',
        country: userData.country || '',
        aboutMe: userData.aboutMe || ''
      });
    }
  }, [userData, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    try {
      // Update Firebase Auth Profile (limited to displayName)
      await updateProfile(user, { displayName: formData.displayName });
      
      // Update Firestore Profile with extra fields
      const userRef = doc(db, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { 
        displayName: formData.displayName,
        pronouns: formData.pronouns,
        country: formData.country,
        aboutMe: formData.aboutMe
      });

      toast({
        title: 'Profile Updated',
        description: 'Your student handle and bio have been saved.',
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

  if (!user || isUserDocLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 text-primary">
          <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight">@{userData?.username || 'handle'}</h1>
          <p className="text-muted-foreground">Manage your student persona and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="space-y-2 col-span-1">
          <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10">
            <UserIcon className="mr-2 h-4 w-4" />
            Workspace
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-primary/5 hover:text-primary">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-primary/5 hover:text-primary">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
          </Button>
        </aside>

        <div className="md:col-span-3 space-y-6">
          <Card className="border-primary/10 bg-card/40 backdrop-blur-sm">
            <form onSubmit={handleUpdateProfile}>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Student Identity</CardTitle>
                <CardDescription>How other students see you in rooms and chats.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6 pb-4 border-b border-primary/5">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL || ''} />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {formData.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">@{userData?.username}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      className="bg-background/50 border-primary/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Input
                      id="pronouns"
                      placeholder="e.g. they/them"
                      value={formData.pronouns}
                      onChange={(e) => setFormData({...formData, pronouns: e.target.value})}
                      className="bg-background/50 border-primary/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary/60" />
                    Country / Region
                  </Label>
                  <Input
                    id="country"
                    placeholder="Where are you studying from?"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    className="bg-background/50 border-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aboutMe" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-primary/60" />
                    About Me
                  </Label>
                  <Textarea
                    id="aboutMe"
                    placeholder="Tell other students about your focus areas, interests, or goals..."
                    value={formData.aboutMe}
                    onChange={(e) => setFormData({...formData, aboutMe: e.target.value})}
                    className="bg-background/50 border-primary/10 min-h-[120px]"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-6 border-t border-primary/10">
                <Button type="submit" disabled={isUpdating} className="bg-primary text-primary-foreground">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Identity
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-destructive">Account Control</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="font-bold">Deactivate Handle</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
