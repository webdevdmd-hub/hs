
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogoutIcon, MenuIcon } from '../icons/Icons';
import Button from '../ui/Button';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout, getRoleForUser } = useAuth();
  const userRole = currentUser ? getRoleForUser(currentUser) : null;

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 px-4 md:px-8">
      <div className="flex items-center justify-between h-full max-w-7xl mx-auto">
        <div className="flex items-center lg:hidden">
            <Button variant="ghost" onClick={onMenuClick} className="!p-2 -ml-2 text-slate-600">
                <MenuIcon className="w-6 h-6" />
            </Button>
        </div>

        <div className="flex-1 flex justify-end items-center space-x-2 md:space-x-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 mt-1">{userRole?.name}</p>
          </div>
          
          <div className="flex items-center gap-3 pl-3 border-l border-slate-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-100 to-emerald-200 flex items-center justify-center font-bold text-emerald-700 shadow-sm ring-2 ring-white">
                {currentUser?.name.charAt(0)}
            </div>
            <Button variant="ghost" onClick={logout} className="!p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Logout">
                <LogoutIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
