import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatbotAssistant } from '@/components/ChatbotAssistant';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title={title} subtitle={subtitle} />
      <main
        className={cn(
          'p-6 transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <div className="animate-fade-in">{children}</div>
      </main>
      <ChatbotAssistant />
    </div>
  );
}
