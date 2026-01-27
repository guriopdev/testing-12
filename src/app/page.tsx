import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl animate-fade-in-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-headline">Join the Community</CardTitle>
          <CardDescription>
            Collaborate, learn, and grow with students from around the world.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Sign in to create or join study rooms. Dive into a focused learning environment tailored for you.
          </p>
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard">
              <Chrome className="mr-2 h-5 w-5" />
              Sign in with Google
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
