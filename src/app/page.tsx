
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, Loader2, Sparkles, Video, CheckSquare, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
    if (!auth) return;

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (
        error.code === 'auth/popup-closed-by-user' || 
        error.code === 'auth/cancelled-popup-request' ||
        error.code === 'auth/user-cancelled'
      ) {
        return;
      }

      let message = 'Could not complete sign in. Please try again.';
      
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Login blocked: You must add this URL to your "Authorized Domains" in the Firebase Console Settings.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Login blocked: Please allow popups for this site in your browser settings.';
      }

      toast({
        variant: 'destructive',
        title: 'Sign In Help',
        description: message,
      });
      console.error('Auth Error:', error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      title: "Live Study Rooms",
      description: "Dive into real-time video sessions with peers. Share focus and collaborate zero-friction.",
      icon: Video,
      benefit: "Feel like you're studying together, even when miles apart."
    },
    {
      title: "Study Tasks",
      description: "Manage your academic milestones with an integrated to-do list built for students.",
      icon: CheckSquare,
      benefit: "Stay organized and never miss a deadline again."
    },
    {
      title: "Pomodoro Focus",
      description: "Optimize your productivity using our built-in timed study session manager.",
      icon: Clock,
      benefit: "Avoid burnout and master your deep work sessions."
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-xl px-4 md:px-8">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:flex text-sm font-bold text-muted-foreground hover:text-primary transition-colors" onClick={handleGoogleSignIn}>
              About
            </Button>
            <Button onClick={handleGoogleSignIn} className="bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-4">
              <Sparkles className="h-3 w-3" />
              Empowering 10k+ Students
            </div>
            <h1 className="text-5xl md:text-7xl font-headline font-bold tracking-tighter leading-tight bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              Elevate Your Study Game <br className="hidden md:block" /> with StudyParadox
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
              The ultimate collaborative workspace designed to help you stay focused, organized, and connected with your peers.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button onClick={handleGoogleSignIn} size="lg" className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/20 rounded-2xl group">
                <Chrome className="mr-2 h-5 w-5" />
                Sign in with Google
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Verified Student Access
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-primary/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl font-headline font-bold tracking-tight">Everything you need to succeed</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Built by students, for students. Manage your focus, tasks, and social life in one place.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <Card key={i} className="bg-card/40 border-primary/10 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-muted-foreground/80 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 p-3 rounded-lg border border-primary/10">
                      Benefit: {feature.benefit}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-headline font-bold">Ready to ace your exams?</h2>
            <p className="text-muted-foreground">Join the paradox and start studying smarter today.</p>
            <Button onClick={handleGoogleSignIn} size="lg" className="h-14 px-12 bg-white text-black hover:bg-white/90 rounded-2xl font-bold">
              Join StudyParadox Now
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-12 px-4 bg-card/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo />
          <p className="text-xs text-muted-foreground font-medium">
            © 2024 StudyParadox. Built with focus for the next generation of students.
          </p>
          <div className="flex gap-6 text-xs font-bold text-primary uppercase tracking-widest">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Discord</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
