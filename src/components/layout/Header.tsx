
import React from 'react';
import { MapPin, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import ThemeToggle from '../ThemeToggle';

interface HeaderProps {
  transparent?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ transparent = false, onLogout }) => {
  const { user, profile, signOut } = useAuth();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await signOut();
      }
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className={`w-full py-4 px-6 ${transparent ? 'absolute top-0 left-0 z-10' : 'bg-background border-b'}`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-scout-500" />
          <span className="font-bold text-xl text-foreground">CityScout</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.full_name || "User"} />
                    ) : (
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel>
                  {profile?.full_name || user.email || "My Account"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
