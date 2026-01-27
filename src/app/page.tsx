'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, Loader2 } from 'lucide-react';
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
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description: error.message || 'Could not complete Google sign in.',
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
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/50 backdrop-blur-xl animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-6">
            <Logo />
          </div>
          <CardTitle className="text-3xl font-headline tracking-tight">Join the Community</CardTitle>
          <CardDescription className="text-base">
            Collaborate, learn, and grow with students from around the world in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground px-4">
            Sign in to access shared study rooms or create your own focused learning environment.
          </p>
          <Button onClick={handleGoogleSignIn} className="w-full h-12 text-lg font-medium" size="lg">
            <Chrome className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>
          <div className="text-center">
            <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Continue as guest (limited features)
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}