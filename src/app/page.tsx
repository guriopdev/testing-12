'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, Loader2, Sparkles } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      let message = 'Could not complete sign in. Please try again.';
      if (error.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is not enabled in Firebase Console. Please follow instructions provided to enable it.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Popup was blocked by your browser. Please allow popups for this site.';
      }

      toast({
        variant: 'destructive',
        title: 'Sign In Error',
        description: message,
      });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-2xl border-white/5 bg-black/40 backdrop-blur-2xl animate-fade-in-up z-10">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto mb-8 scale-125">
            <Logo />
          </div>
          <CardTitle className="text-4xl font-headline tracking-tighter bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Focus Better Together
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 mt-2 px-2">
            The ultimate collaborative workspace for students worldwide. Real-time video, zero friction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pb-10">
          <div className="flex flex-col gap-4">
            <Button onClick={handleGoogleSignIn} className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 rounded-xl" size="lg">
              <Chrome className="mr-2 h-6 w-6" />
              Sign in with Google
            </Button>
            
            <div className="flex items-center gap-2 justify-center py-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Secure University Portal</span>
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed px-4">
              By joining, you agree to our Study Code of Conduct. Keep it respectful and productive.
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}