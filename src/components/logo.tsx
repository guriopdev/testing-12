import { Feather } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 group">
      <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
        <Feather className="h-6 w-6 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
      </div>
      <h1 className="text-2xl font-bold font-headline text-foreground tracking-tight group-hover:text-primary transition-colors">
        Study<span className="text-primary">Paradox</span>
      </h1>
    </Link>
  );
}