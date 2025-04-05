
import React from 'react';
import { MapPin, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  transparent?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ transparent = false, onLogout }) => {
  return (
    <header className={`w-full py-4 px-6 ${transparent ? 'absolute top-0 left-0 z-10' : 'bg-background border-b'}`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-scout-500" />
          <span className="font-bold text-xl text-foreground">CityScout</span>
        </div>
        
        {onLogout && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </header>
  );
};

export default Header;
