
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Loader2, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [newTask, setNewTask] = useState('');

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: tasks, isLoading } = useCollection(tasksQuery);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user) return;

    addDocumentNonBlocking(collection(db, 'users', user.uid, 'tasks'), {
      text: newTask.trim(),
      completed: false,
      createdAt: serverTimestamp(),
    });
    setNewTask('');
  };

  const toggleTask = (taskId: string, completed: boolean) => {
    if (!user) return;
    updateDocumentNonBlocking(doc(db, 'users', user.uid, 'tasks', taskId), {
      completed: !completed
    });
  };

  const deleteTask = (taskId: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'tasks', taskId));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
          <CheckSquare className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline tracking-tight">Study Tasks</h1>
        <p className="text-muted-foreground">Keep track of your academic milestones.</p>
      </div>

      <Card className="bg-card/40 border-primary/10 backdrop-blur-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <Input 
              placeholder="Add a new study task..." 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="bg-background/50 border-primary/20 focus:border-primary"
            />
            <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:scale-105 transition-all">
              <Plus className="h-5 w-5" />
            </Button>
          </form>

          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    task.completed 
                      ? "bg-primary/5 border-primary/10 opacity-60" 
                      : "bg-background/40 border-white/5 hover:border-primary/20"
                  )}
                >
                  <Checkbox 
                    checked={task.completed} 
                    onCheckedChange={() => toggleTask(task.id, task.completed)}
                    className="border-primary/50"
                  />
                  <span className={cn("flex-1 text-sm font-medium", task.completed && "line-through text-muted-foreground")}>
                    {task.text}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => deleteTask(task.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No tasks yet. Start by adding one above!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
