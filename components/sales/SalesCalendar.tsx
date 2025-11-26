import React, { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';
import { CalendarEvent, Calendar, Permission, SharePermission } from '../../types';
import { PlusIcon, SettingsIcon, ShareIcon, UsersIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MenuIcon, XIcon } from '../icons/Icons';

const CALENDAR_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'
];

const SalesCalendar: React.FC = () => {
  const { currentUser, hasPermission, users } = useAuth();
  const {
    calendarEntries, calendars, calendarShares, userSchedules,
    addCalendar, updateCalendar, deleteCalendar,
    addCalendarEntry, updateCalendarEntry, deleteCalendarEntry,
    shareCalendar, deleteCalendarShare, updateCalendarShare,
    getUserSchedule
  } = useCRM();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<Set<string>>(new Set(['default']));

  // View mode state
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'schedule' | '4day'>('month');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    time: '',
    endTime: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    calendarId: 'default',
    location: '',
  });

  // Calendar form state
  const [calendarForm, setCalendarForm] = useState({
    name: '',
    color: CALENDAR_COLORS[0],
  });

  // Share form state
  const [shareForm, setShareForm] = useState({
    userId: '',
    permission: 'view' as SharePermission,
  });

  // Get user's calendars and shared calendars
  const userCalendars = useMemo(() => {
    const owned = calendars.filter(c => c.ownerId === currentUser?.id);
    const shared = calendarShares
      .filter(s => s.sharedWithId === currentUser?.id && s.status === 'accepted')
      .map(s => calendars.find(c => c.id === s.calendarId))
      .filter(Boolean) as Calendar[];

    // Add default calendar if no calendars exist
    if (owned.length === 0) {
      return [{
        id: 'default',
        name: 'My Calendar',
        color: CALENDAR_COLORS[0],
        ownerId: currentUser?.id || '',
        ownerName: currentUser?.name || '',
        isDefault: true,
        isVisible: true,
        createdAt: new Date().toISOString(),
      }, ...shared];
    }
    return [...owned, ...shared];
  }, [calendars, calendarShares, currentUser]);

  // Get all calendar IDs that the user has access to (owned + shared)
  const accessibleCalendarIds = useMemo(() => {
    return new Set(userCalendars.map(c => c.id));
  }, [userCalendars]);

  // Filter calendar entries to show only user's events and events from shared calendars
  const userCalendarEntries = useMemo(() => {
    return calendarEntries.filter(entry => {
      const entryOwnerId = entry.ownerId;
      const entryCalendarId = entry.calendarId || 'default';

      // Critical: For 'default' calendar, MUST check owner matches current user
      // because multiple users can have 'default' calendars (client-side construct)
      if (entryCalendarId === 'default') {
        return entryOwnerId === currentUser?.id;
      }

      // For non-default calendars, check if calendar is in user's accessible list
      // This handles real calendars from database that are owned or shared
      const userCalendar = userCalendars.find(c => c.id === entryCalendarId);
      if (userCalendar) {
        // If it's a shared calendar, verify the event owner is the calendar owner
        // If it's an owned calendar, verify the event owner is current user
        return userCalendar.ownerId === entryOwnerId || userCalendar.ownerId === currentUser?.id;
      }

      // Fallback: Show event only if owned by current user
      return entryOwnerId === currentUser?.id;
    });
  }, [calendarEntries, userCalendars, currentUser]);

  // Calendar calculations
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  // Filter events by visible calendars
  const monthEvents = useMemo(() => {
    return userCalendarEntries.filter(evt => {
      const d = new Date(evt.date);
      const inMonth = d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
      const calendarId = evt.calendarId || 'default';
      const isVisible = visibleCalendarIds.has(calendarId) || visibleCalendarIds.has('default');
      return inMonth && isVisible;
    });
  }, [userCalendarEntries, currentMonth, visibleCalendarIds]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    monthEvents.forEach(evt => {
      const key = new Date(evt.date).toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(evt);
    });
    return map;
  }, [monthEvents]);

  // Generate weeks array
  const weeks: (number | null)[][] = [];
  let day = 1 - startDay;
  while (day <= daysInMonth) {
    const week: (number | null)[] = [];
    for (let i = 0; i < 7; i++) {
      if (day < 1 || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day);
      }
      day++;
    }
    weeks.push(week);
  }

  const formatMonth = (date: Date) =>
    date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const getEventColor = (event: CalendarEvent) => {
    const calendar = userCalendars.find(c => c.id === (event.calendarId || 'default'));
    return calendar?.color || CALENDAR_COLORS[0];
  };

  const typeBadge = (type: CalendarEvent['type'], color: string) => {
    return `bg-opacity-10 border`;
  };

  // Selected date for day/week views
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Hours array for day/week views
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get events for a specific date range
  const getEventsForDateRange = (start: Date, end: Date) => {
    return userCalendarEntries.filter(evt => {
      const evtDate = new Date(evt.date);
      const calendarId = evt.calendarId || 'default';
      const isVisible = visibleCalendarIds.has(calendarId) || visibleCalendarIds.has('default');
      // Filter completed tasks if toggle is off
      if (!showCompletedTasks && evt.type === 'task' && evt.completed) {
        return false;
      }
      return evtDate >= start && evtDate < end && isVisible;
    });
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return getEventsForDateRange(start, end);
  };

  // Get week dates
  const getWeekDates = (date: Date) => {
    const dayOfWeek = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  // Get 4-day dates
  const get4DayDates = (date: Date) => {
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(date);
      d.setDate(date.getDate() + i);
      return d;
    });
  };

  // Format time
  const formatTime = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Navigation functions based on view mode
  const navigatePrev = () => {
    const newDate = new Date(currentMonth);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case '4day':
        newDate.setDate(newDate.getDate() - 4);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        setCurrentMonth(newDate);
        break;
      default:
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentMonth(newDate);
    }
  };

  const navigateNext = () => {
    const newDate = new Date(currentMonth);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case '4day':
        newDate.setDate(newDate.getDate() + 4);
        setSelectedDate(newDate);
        setCurrentMonth(newDate);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        setCurrentMonth(newDate);
        break;
      default:
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentMonth(newDate);
    }
  };

  // Get display title based on view mode
  const getViewTitle = () => {
    switch (viewMode) {
      case 'day':
        return selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case 'week':
        const weekDates = getWeekDates(selectedDate);
        return `${weekDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case '4day':
        const fourDayDates = get4DayDates(selectedDate);
        return `${fourDayDates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${fourDayDates[3].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'year':
        return currentMonth.getFullYear().toString();
      case 'schedule':
        return 'Schedule';
      default:
        return formatMonth(currentMonth);
    }
  };

  // Event handlers
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setEventForm({
      title: '',
      date: new Date().toISOString().slice(0, 10),
      time: '09:00',
      endTime: '10:00',
      type: 'meeting',
      description: '',
      calendarId: userCalendars[0]?.id || 'default',
      location: '',
    });
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    const eventDate = new Date(event.date);
    setEventForm({
      title: event.title,
      date: eventDate.toISOString().slice(0, 10),
      time: eventDate.toTimeString().slice(0, 5),
      endTime: event.endDate ? new Date(event.endDate).toTimeString().slice(0, 5) : '10:00',
      type: event.type,
      description: event.description || '',
      calendarId: event.calendarId || 'default',
      location: event.location || '',
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) return;

    const dateTime = new Date(`${eventForm.date}T${eventForm.time}`);
    const endDateTime = new Date(`${eventForm.date}T${eventForm.endTime}`);

    const eventData = {
      title: eventForm.title,
      date: dateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      type: eventForm.type,
      description: eventForm.description,
      calendarId: eventForm.calendarId,
      location: eventForm.location,
      owner: currentUser?.name,
      ownerId: currentUser?.id,
    };

    if (selectedEvent) {
      await updateCalendarEntry(selectedEvent.id, eventData);
    } else {
      await addCalendarEntry(eventData);
    }

    setIsEventModalOpen(false);
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent && window.confirm('Are you sure you want to delete this event?')) {
      await deleteCalendarEntry(selectedEvent.id);
      setIsEventModalOpen(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!calendarForm.name.trim() || !currentUser) return;

    await addCalendar({
      name: calendarForm.name,
      color: calendarForm.color,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isDefault: false,
      isVisible: true,
    });

    setCalendarForm({ name: '', color: CALENDAR_COLORS[0] });
    setIsCalendarModalOpen(false);
  };

  const handleShareCalendar = async () => {
    if (!selectedCalendarId || !shareForm.userId) return;

    const user = users.find(u => u.id === shareForm.userId);
    if (!user) return;

    await shareCalendar(
      selectedCalendarId,
      user.id,
      user.name,
      user.email,
      shareForm.permission
    );

    setShareForm({ userId: '', permission: 'view' });
    setIsShareModalOpen(false);
  };

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendarIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  // Get pending share invitations
  const pendingShares = calendarShares.filter(
    s => s.sharedWithId === currentUser?.id && s.status === 'pending'
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {hasPermission(Permission.VIEW_CALENDARS) && (
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-64 flex-shrink-0 space-y-4 bg-white lg:bg-transparent
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          p-4 lg:p-0 overflow-y-auto lg:overflow-visible
        `}>
          {/* Close button for mobile */}
          <div className="flex justify-end lg:hidden mb-2">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-600"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Actions */}
          <Card className="!p-4">
            <Button onClick={() => { handleCreateEvent(); setIsSidebarOpen(false); }} className="w-full mb-3">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Task
            </Button>

            <div className="space-y-2">
              {hasPermission(Permission.CREATE_CALENDARS) && (
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1"
                >
                  <PlusIcon className="w-3 h-3" />
                  Create Calendar
                </button>
              )}
              {hasPermission(Permission.CUSTOMIZE_SCHEDULE) && (
                <button className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1">
                  <SettingsIcon className="w-3 h-3" />
                  Schedule Settings
                </button>
              )}
              {hasPermission(Permission.USE_AVAILABILITY_FINDER) && (
                <button className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1">
                  <UsersIcon className="w-3 h-3" />
                  Find Availability
                </button>
              )}
              {hasPermission(Permission.MANAGE_EVENT_REMINDERS) && (
                <button className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1">
                  <AlertCircleIcon className="w-3 h-3" />
                  Manage Reminders
                </button>
              )}
              {hasPermission(Permission.MANAGE_CALENDAR_TASKS) && (
                <button className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  Calendar Tasks
                </button>
              )}
            </div>
          </Card>

          {/* My Calendars */}
          <Card className="!p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              My Calendars
            </h3>
            <div className="space-y-2">
              {userCalendars.map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between group">
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={visibleCalendarIds.has(calendar.id)}
                      onChange={() => toggleCalendarVisibility(calendar.id)}
                      className="rounded border-slate-300"
                      style={{ accentColor: calendar.color }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: calendar.color }}
                    />
                    <span className="text-sm text-slate-700 truncate">{calendar.name}</span>
                  </label>
                  {hasPermission(Permission.SHARE_CALENDARS) && calendar.ownerId === currentUser?.id && (
                    <button
                      onClick={() => {
                        setSelectedCalendarId(calendar.id);
                        setIsShareModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 transition-opacity"
                    >
                      <ShareIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Pending Invitations */}
          {pendingShares.length > 0 && (
            <Card className="!p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Pending Invitations
              </h3>
              <div className="space-y-2">
                {pendingShares.map(share => (
                  <div key={share.id} className="text-sm">
                    <p className="text-slate-700">{share.calendarName}</p>
                    <p className="text-xs text-slate-500">from {share.ownerName}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => updateCalendarShare(share.id, { status: 'accepted' })}
                        className="text-xs text-emerald-600 hover:text-emerald-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateCalendarShare(share.id, { status: 'declined' })}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Mini Features */}
          {hasPermission(Permission.MANAGE_PUBLIC_BOOKING) && (
            <Card className="!p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Public Booking
              </h3>
              <button className="w-full text-left text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-2 py-1">
                <ClockIcon className="w-3 h-3" />
                Manage Booking Pages
              </button>
            </Card>
          )}
        </div>
      )}

      {/* Main Calendar */}
      <div className="flex-1 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              {hasPermission(Permission.VIEW_CALENDARS) && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">CRM Calendar</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1 hidden sm:block">Meetings, follow-ups, and tasks in one place.</p>
              </div>
            </div>

            {/* View Mode Dropdown - Always visible */}
            <div className="relative">
              <button
                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="hidden sm:inline">
                  {viewMode === 'day' && 'Day'}
                  {viewMode === 'week' && 'Week'}
                  {viewMode === 'month' && 'Month'}
                  {viewMode === 'year' && 'Year'}
                  {viewMode === 'schedule' && 'Schedule'}
                  {viewMode === '4day' && '4 Days'}
                </span>
                <span className="sm:hidden">
                  {viewMode === 'day' && 'D'}
                  {viewMode === 'week' && 'W'}
                  {viewMode === 'month' && 'M'}
                  {viewMode === 'year' && 'Y'}
                  {viewMode === 'schedule' && 'S'}
                  {viewMode === '4day' && '4D'}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-slate-400" />
              </button>

              {isViewDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsViewDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">View</div>
                    {[
                      { id: 'day', label: 'Day' },
                      { id: 'week', label: 'Week' },
                      { id: 'month', label: 'Month' },
                      { id: 'year', label: 'Year' },
                      { id: 'schedule', label: 'Schedule' },
                      { id: '4day', label: '4 Days' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setViewMode(option.id as any);
                          setIsViewDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between ${
                          viewMode === option.id ? 'text-emerald-600 font-medium' : 'text-slate-700'
                        }`}
                      >
                        {option.label}
                        {viewMode === option.id && <CheckCircleIcon className="w-4 h-4" />}
                      </button>
                    ))}

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">Display</div>
                      <label className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <span className="text-sm text-slate-700">Completed tasks</span>
                        <input
                          type="checkbox"
                          checked={showCompletedTasks}
                          onChange={(e) => setShowCompletedTasks(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Navigation Row */}
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              onClick={navigatePrev}
              className="p-1.5 sm:p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <div className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold min-w-[120px] sm:min-w-[180px] text-center truncate">
              {getViewTitle()}
            </div>
            <button
              onClick={navigateNext}
              className="p-1.5 sm:p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentMonth(today);
              }}
              className="ml-1 sm:ml-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
          </div>
        </div>

        {/* Day View */}
        {viewMode === 'day' && (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
              {hours.map((hour) => {
                const dayEvents = getEventsForDay(selectedDate).filter(evt => {
                  const evtHour = new Date(evt.date).getHours();
                  return evtHour === hour;
                });
                return (
                  <div key={hour} className="flex min-h-[50px] sm:min-h-[60px]">
                    <div className="w-16 sm:w-20 flex-shrink-0 px-2 sm:px-3 py-2 text-[10px] sm:text-xs text-slate-500 font-medium border-r border-slate-100 bg-slate-50/50">
                      {formatTime(hour)}
                    </div>
                    <div className="flex-1 px-3 py-2 hover:bg-slate-50 cursor-pointer" onClick={() => {
                      const date = new Date(selectedDate);
                      date.setHours(hour, 0, 0, 0);
                      setEventForm(prev => ({ ...prev, date: date.toISOString().slice(0, 10), time: `${hour.toString().padStart(2, '0')}:00` }));
                      handleCreateEvent();
                    }}>
                      {dayEvents.map(evt => {
                        const color = getEventColor(evt);
                        return (
                          <div key={evt.id} onClick={(e) => { e.stopPropagation(); handleEditEvent(evt); }}
                            className="text-sm px-3 py-2 rounded-lg mb-1 cursor-pointer hover:opacity-80"
                            style={{ backgroundColor: `${color}20`, color: color, borderLeft: `3px solid ${color}` }}>
                            <div className="font-medium">{evt.title}</div>
                            <div className="text-xs opacity-75">{new Date(evt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-8 bg-slate-50/80 border-b border-slate-100 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-center border-r border-slate-100"></div>
                  {getWeekDates(selectedDate).map((date, i) => {
                    const isToday = date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={i} className={`px-1 sm:px-2 py-2 sm:py-3 text-center ${isToday ? 'text-emerald-600' : ''}`}>
                        <div>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
                        <div className={`text-sm sm:text-lg font-bold ${isToday ? 'text-emerald-600' : 'text-slate-700'}`}>{date.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {hours.slice(6, 22).map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b border-slate-100 min-h-[40px] sm:min-h-[50px]">
                      <div className="px-1 sm:px-2 py-1 text-[10px] sm:text-xs text-slate-500 font-medium border-r border-slate-100 bg-slate-50/50">
                        {formatTime(hour)}
                      </div>
                  {getWeekDates(selectedDate).map((date, i) => {
                    const dayEvents = getEventsForDay(date).filter(evt => new Date(evt.date).getHours() === hour);
                    return (
                      <div key={i} className="px-1 py-1 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          const d = new Date(date); d.setHours(hour, 0, 0, 0);
                          setEventForm(prev => ({ ...prev, date: d.toISOString().slice(0, 10), time: `${hour.toString().padStart(2, '0')}:00` }));
                          handleCreateEvent();
                        }}>
                        {dayEvents.map(evt => {
                          const color = getEventColor(evt);
                          return (
                            <div key={evt.id} onClick={(e) => { e.stopPropagation(); handleEditEvent(evt); }}
                              className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5"
                              style={{ backgroundColor: `${color}20`, color: color, borderLeft: `2px solid ${color}` }}
                              title={evt.title}>
                              {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-100 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="px-1 sm:px-4 py-2 sm:py-3 text-center">{d}</div>
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {weeks.map((week, idx) => (
                <div key={idx} className="grid grid-cols-7 min-h-[80px] sm:min-h-[110px]">
                  {week.map((dayNum, i) => {
                    const dateKey = dayNum !== null ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum).toISOString().slice(0, 10) : '';
                    const events = dayNum !== null ? eventsByDate[dateKey] || [] : [];
                    const isToday = dayNum !== null && new Date().toISOString().slice(0, 10) === dateKey;
                    return (
                      <div key={i} className={`border-r border-slate-100 last:border-r-0 px-1 sm:px-3 py-1 sm:py-2 hover:bg-slate-50 transition-colors cursor-pointer ${isToday ? 'bg-emerald-50/50' : ''}`}
                        onClick={() => { if (dayNum !== null) { setEventForm(prev => ({ ...prev, date: dateKey })); handleCreateEvent(); } }}>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-500 mb-1 sm:mb-2">
                          <span className={`font-semibold ${dayNum === null ? 'opacity-40' : isToday ? 'text-emerald-600' : 'text-slate-700'}`}>{dayNum || ''}</span>
                          {events.length > 0 && <span className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{events.length}</span>}
                        </div>
                        <div className="space-y-0.5 sm:space-y-1">
                          {events.slice(0, 2).map((evt) => {
                            const color = getEventColor(evt);
                            return (
                              <div key={evt.id} onClick={(e) => { e.stopPropagation(); handleEditEvent(evt); }}
                                className="text-[9px] sm:text-[11px] px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg truncate cursor-pointer hover:opacity-80"
                                style={{ backgroundColor: `${color}20`, color: color, borderLeft: `2px solid ${color}` }} title={evt.title}>
                                <span className="hidden sm:inline">{evt.title}</span>
                                <span className="sm:hidden">{evt.title.slice(0, 8)}{evt.title.length > 8 ? '...' : ''}</span>
                              </div>
                            );
                          })}
                          {events.length > 2 && <div className="text-[9px] sm:text-[11px] text-slate-400">+{events.length - 2} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Year View */}
        {viewMode === 'year' && (
          <Card className="!p-0 overflow-hidden">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
              {Array.from({ length: 12 }, (_, monthIdx) => {
                const monthDate = new Date(currentMonth.getFullYear(), monthIdx, 1);
                const monthName = monthDate.toLocaleDateString(undefined, { month: 'short' });
                const monthEvents = userCalendarEntries.filter(evt => {
                  const d = new Date(evt.date);
                  return d.getMonth() === monthIdx && d.getFullYear() === currentMonth.getFullYear();
                });
                const isCurrentMonth = new Date().getMonth() === monthIdx && new Date().getFullYear() === currentMonth.getFullYear();
                return (
                  <div key={monthIdx} onClick={() => { setCurrentMonth(monthDate); setViewMode('month'); }}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors ${isCurrentMonth ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                    <div className={`font-semibold text-sm mb-2 ${isCurrentMonth ? 'text-emerald-600' : 'text-slate-700'}`}>{monthName}</div>
                    <div className="text-xs text-slate-500">{monthEvents.length} events</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Schedule View */}
        {viewMode === 'schedule' && (
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[400px] sm:max-h-[600px] overflow-y-auto">
              {userCalendarEntries
                .filter(evt => {
                  const calendarId = evt.calendarId || 'default';
                  const isVisible = visibleCalendarIds.has(calendarId) || visibleCalendarIds.has('default');
                  if (!showCompletedTasks && evt.type === 'task' && evt.completed) return false;
                  return isVisible && new Date(evt.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 50)
                .map(evt => {
                  const color = getEventColor(evt);
                  const evtDate = new Date(evt.date);
                  return (
                    <div key={evt.id} onClick={() => handleEditEvent(evt)}
                      className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 hover:bg-slate-50 cursor-pointer">
                      <div className="w-12 sm:w-16 text-center flex-shrink-0">
                        <div className="text-[10px] sm:text-xs text-slate-500">{evtDate.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                        <div className="text-sm sm:text-lg font-bold text-slate-700">{evtDate.getDate()}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">{evtDate.toLocaleDateString(undefined, { month: 'short' })}</div>
                      </div>
                      <div className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg" style={{ backgroundColor: `${color}10`, borderLeft: `3px solid ${color}` }}>
                        <div className="font-medium text-xs sm:text-sm truncate" style={{ color }}>{evt.title}</div>
                        <div className="text-[10px] sm:text-xs text-slate-500">{evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {evt.description && <div className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate hidden sm:block">{evt.description}</div>}
                      </div>
                    </div>
                  );
                })}
              {userCalendarEntries.filter(evt => new Date(evt.date) >= new Date()).length === 0 && (
                <div className="px-4 py-8 sm:py-12 text-center text-slate-400 text-sm">No upcoming events</div>
              )}
            </div>
          </Card>
        )}

        {/* 4 Days View */}
        {viewMode === '4day' && (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[400px]">
                <div className="grid grid-cols-5 bg-slate-50/80 border-b border-slate-100 text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="px-1 sm:px-2 py-2 sm:py-3 text-center border-r border-slate-100"></div>
                  {get4DayDates(selectedDate).map((date, i) => {
                    const isToday = date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                    return (
                      <div key={i} className={`px-1 sm:px-2 py-2 sm:py-3 text-center ${isToday ? 'text-emerald-600' : ''}`}>
                        <div>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}</div>
                        <div className={`text-sm sm:text-lg font-bold ${isToday ? 'text-emerald-600' : 'text-slate-700'}`}>{date.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto">
                  {hours.slice(6, 22).map((hour) => (
                    <div key={hour} className="grid grid-cols-5 border-b border-slate-100 min-h-[40px] sm:min-h-[50px]">
                      <div className="px-1 sm:px-2 py-1 text-[10px] sm:text-xs text-slate-500 font-medium border-r border-slate-100 bg-slate-50/50">
                        {formatTime(hour)}
                      </div>
                  {get4DayDates(selectedDate).map((date, i) => {
                    const dayEvents = getEventsForDay(date).filter(evt => new Date(evt.date).getHours() === hour);
                    return (
                      <div key={i} className="px-1 py-1 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          const d = new Date(date); d.setHours(hour, 0, 0, 0);
                          setEventForm(prev => ({ ...prev, date: d.toISOString().slice(0, 10), time: `${hour.toString().padStart(2, '0')}:00` }));
                          handleCreateEvent();
                        }}>
                        {dayEvents.map(evt => {
                          const color = getEventColor(evt);
                          return (
                            <div key={evt.id} onClick={(e) => { e.stopPropagation(); handleEditEvent(evt); }}
                              className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5"
                              style={{ backgroundColor: `${color}20`, color: color, borderLeft: `2px solid ${color}` }}
                              title={evt.title}>
                              {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={selectedEvent ? 'Edit Task' : 'New Task'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Title</label>
            <input
              type="text"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Date</label>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Type</label>
              <select
                value={eventForm.type}
                onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as CalendarEvent['type'] })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
                <option value="follow_up">Follow-up</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Start Time</label>
              <input
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">End Time</label>
              <input
                type="time"
                value={eventForm.endTime}
                onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {userCalendars.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Calendar</label>
              <select
                value={eventForm.calendarId}
                onChange={(e) => setEventForm({ ...eventForm, calendarId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {userCalendars.map(cal => (
                  <option key={cal.id} value={cal.id}>{cal.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Location</label>
            <input
              type="text"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Location or meeting link"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              rows={3}
              placeholder="Event description"
            />
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {selectedEvent && (
                <Button variant="ghost" onClick={handleDeleteEvent} className="text-red-600 hover:text-red-700">
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setIsEventModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                {selectedEvent ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Calendar Modal */}
      <Modal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="Create Calendar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Name</label>
            <input
              type="text"
              value={calendarForm.name}
              onChange={(e) => setCalendarForm({ ...calendarForm, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Calendar name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Color</label>
            <div className="flex gap-2 flex-wrap">
              {CALENDAR_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setCalendarForm({ ...calendarForm, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    calendarForm.color === color ? 'border-slate-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsCalendarModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCalendar}>
              Create Calendar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Calendar Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Calendar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Share with</label>
            <select
              value={shareForm.userId}
              onChange={(e) => setShareForm({ ...shareForm, userId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="">Select a user</option>
              {users.filter(u => u.id !== currentUser?.id && u.isActive).map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Permission</label>
            <select
              value={shareForm.permission}
              onChange={(e) => setShareForm({ ...shareForm, permission: e.target.value as SharePermission })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
              <option value="full">Full access</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareCalendar}>
              Share Calendar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalesCalendar;
