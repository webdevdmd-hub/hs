
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { LogoutIcon, MenuIcon, BellIcon, CheckCircleIcon, XIcon } from '../icons/Icons';
import Button from '../ui/Button';

interface HeaderProps {
    onMenuClick: () => void;
    setCurrentView?: (view: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, setCurrentView }) => {
  const { currentUser, logout, getRoleForUser } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getUnreadNotificationCount } = useCRM();
  const userRole = currentUser ? getRoleForUser(currentUser) : null;

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = getUnreadNotificationCount();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  const handleNotificationClick = async (notificationId: string, actionUrl?: string) => {
    await markNotificationAsRead(notificationId);
    if (actionUrl && setCurrentView) {
      setCurrentView(actionUrl);
      setIsNotificationOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                title="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-semibold text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group ${
                            !notif.isRead ? 'bg-emerald-50/30' : ''
                          }`}
                          onClick={() => handleNotificationClick(notif.id, notif.actionUrl)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.isRead ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                              <p className="text-xs text-slate-400 mt-1">{formatTimeAgo(notif.createdAt)}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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
