import { CreateRoomDialog } from '@/components/create-room-dialog';
import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
        <nav className="flex w-full items-center gap-4">
          <Logo />
          <div className="flex-1" />
          <CreateRoomDialog />
          <UserNav />
        </nav>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
