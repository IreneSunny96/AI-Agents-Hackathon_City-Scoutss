
import React from 'react';
import { MapPin } from 'lucide-react';

interface HeaderProps {
  transparent?: boolean;
}

const Header: React.FC<HeaderProps> = ({ transparent = false }) => {
  return (
    <header className={`w-full py-4 px-6 ${transparent ? 'absolute top-0 left-0 z-10' : 'bg-background border-b'}`}>
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-scout-500" />
          <span className="font-bold text-xl text-foreground">CityScout</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
