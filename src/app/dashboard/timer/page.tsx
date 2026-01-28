
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Coffee, BookOpen, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const MODES = {
  WORK: { label: 'Focus Session', time: 25 * 60, icon: BookOpen },
  SHORT_BREAK: { label: 'Short Break', time: 5 * 60, icon: Coffee },
  LONG_BREAK: { label: 'Long Break', time: 15 * 60, icon: Clock },
};

export default function TimerPage() {
  const [mode, setMode] = useState<keyof typeof MODES>('WORK');
  const [timeLeft, setTimeLeft] = useState(MODES.WORK.time);
  const [isActive, setIsActive] = useState(false);
  const { toast } = useToast();

  const switchMode = useCallback((newMode: keyof typeof MODES) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode].time);
    setIsActive(false);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      toast({
        title: "Timer Finished!",
        description: `Your ${MODES[mode].label.toLowerCase()} is over.`,
        className: "bg-primary text-primary-foreground font-bold border-none"
      });
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((MODES[mode].time - timeLeft) / MODES[mode].time) * 100;
  const CurrentIcon = MODES[mode].icon;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-headline tracking-tight text-foreground">Pomodoro Focus</h1>
        <p className="text-muted-foreground">Maximize your productivity with timed study sessions.</p>
      </div>

      <Card className="bg-card/40 border-primary/10 backdrop-blur-xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>
        
        <CardHeader className="text-center pt-10">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-1 ring-primary/20">
            <CurrentIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline uppercase tracking-widest text-primary">{MODES[mode].label}</CardTitle>
          <CardDescription className="text-5xl font-mono font-bold text-foreground py-4 tracking-tighter">
            {formatTime(timeLeft)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          <div className="flex justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "h-16 w-16 rounded-full shadow-xl transition-all hover:scale-110",
                isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => switchMode(mode)}
              className="h-16 w-16 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary transition-all"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Object.entries(MODES).map(([key, config]) => (
              <Button
                key={key}
                variant="ghost"
                onClick={() => switchMode(key as keyof typeof MODES)}
                className={cn(
                  "flex flex-col gap-1 py-8 h-auto rounded-2xl border transition-all",
                  mode === key 
                    ? "bg-primary/20 border-primary/50 text-primary" 
                    : "bg-background/20 border-white/5 hover:border-primary/20 text-muted-foreground"
                )}
              >
                <config.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{config.label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
