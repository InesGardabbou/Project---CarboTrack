import { Wifi, Search, Bell, LogOut, User, Settings, ChevronDown, AlertTriangle, CheckCircle2, Info, Cpu, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { dataService, type ActivityEntry } from '@/services/dataService';
import { useEffect, useState, useRef } from 'react';
import type { Machine } from '@/data/mockData';


interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { searchQuery, setSearchQuery, sidebarCollapsed, machines, setSelectedMachine } = useAppStore();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ActivityEntry[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  // Subscribe to notifications
  useEffect(() => {
    const unsub = dataService.subscribeToActivities((data) => {
      // Sort by most recent and take last 10
      setNotifications(data.slice(-10).reverse());
    });
    return () => unsub();
  }, []);

  // Filter machines based on search input
  const filteredMachines = searchInput.trim()
    ? machines.filter((machine) =>
        machine.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        machine.serialNumber.toLowerCase().includes(searchInput.toLowerCase())
      )
    : [];

  // Handle machine selection
  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachine(machine);
    navigate('/machines');
    setSearchInput('');
    setIsSearchOpen(false);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-lg px-6 transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}
    >
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search machines..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="h-9 w-80 rounded-lg border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Search Results Dropdown */}
          {isSearchOpen && searchInput.trim() && (
            <div className="absolute top-full mt-2 w-[400px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
              {filteredMachines.length > 0 ? (
                <ScrollArea className="max-h-[300px]">
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground px-2 py-1.5">
                      {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
                    </p>
                    {filteredMachines.map((machine) => (
                      <button
                        key={machine.id}
                        onClick={() => handleMachineSelect(machine)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-left"
                      >
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Cpu className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {machine.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{machine.serialNumber}</span>
                            <span>•</span>
                            <span>{machine.department}</span>
                          </div>
                        </div>
                        <Badge
                          variant={machine.status === 'operational' ? 'default' : machine.status === 'maintenance' ? 'secondary' : 'destructive'}
                          className="text-xs capitalize"
                        >
                          {machine.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No machines found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time Filters removed */}

        {/* Notifications */}
        <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <PopoverTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {notifications.length}
                  </Badge>
                </>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {notifications.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {notifications.length} new
                </Badge>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const isAnomaly = notification.action.toLowerCase().includes('anomal') || 
                                     notification.action.toLowerCase().includes('critical');
                    const isSuccess = notification.action.toLowerCase().includes('resolved') || 
                                     notification.action.toLowerCase().includes('success');
                    
                    return (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isAnomaly ? (
                              <div className="p-1.5 rounded-full bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              </div>
                            ) : isSuccess ? (
                              <div className="p-1.5 rounded-full bg-success/10">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                              </div>
                            ) : (
                              <div className="p-1.5 rounded-full bg-primary/10">
                                <Info className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium leading-snug">
                              {notification.action}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">{notification.time}</p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">{notification.user}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate('/settings?section=notifications');
                  }}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Connect Device */}
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
          <Wifi className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Device</span>
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(currentUser?.displayName || currentUser?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{currentUser?.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
