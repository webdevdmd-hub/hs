import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';
import { WorkingHours, UserSchedule } from '../../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

interface ScheduleSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { getUserSchedule, saveUserSchedule } = useCRM();
  const [isSaving, setIsSaving] = useState(false);

  const defaultWorkingHours: WorkingHours[] = DAYS.map((_, index) => ({
    day: index,
    isWorkingDay: index >= 1 && index <= 5, // Mon-Fri
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
  }));

  const [schedule, setSchedule] = useState<{
    timezone: string;
    workingHours: WorkingHours[];
    bufferBetweenMeetings: number;
    minimumNotice: number;
    blockedDates: string[];
  }>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    workingHours: defaultWorkingHours,
    bufferBetweenMeetings: 15,
    minimumNotice: 24,
    blockedDates: [],
  });

  const [newBlockedDate, setNewBlockedDate] = useState('');

  // Load existing schedule
  useEffect(() => {
    if (currentUser && isOpen) {
      const existingSchedule = getUserSchedule(currentUser.id);
      if (existingSchedule) {
        setSchedule({
          timezone: existingSchedule.timezone,
          workingHours: existingSchedule.workingHours,
          bufferBetweenMeetings: existingSchedule.bufferBetweenMeetings,
          minimumNotice: existingSchedule.minimumNotice,
          blockedDates: existingSchedule.blockedDates,
        });
      }
    }
  }, [currentUser, isOpen, getUserSchedule]);

  const handleWorkingDayToggle = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      workingHours: prev.workingHours.map(wh =>
        wh.day === dayIndex ? { ...wh, isWorkingDay: !wh.isWorkingDay } : wh
      ),
    }));
  };

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      workingHours: prev.workingHours.map(wh =>
        wh.day === dayIndex ? { ...wh, [field]: value } : wh
      ),
    }));
  };

  const handleAddBlockedDate = () => {
    if (newBlockedDate && !schedule.blockedDates.includes(newBlockedDate)) {
      setSchedule(prev => ({
        ...prev,
        blockedDates: [...prev.blockedDates, newBlockedDate].sort(),
      }));
      setNewBlockedDate('');
    }
  };

  const handleRemoveBlockedDate = (date: string) => {
    setSchedule(prev => ({
      ...prev,
      blockedDates: prev.blockedDates.filter(d => d !== date),
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      await saveUserSchedule({
        userId: currentUser.id,
        userName: currentUser.name,
        timezone: schedule.timezone,
        workingHours: schedule.workingHours,
        bufferBetweenMeetings: schedule.bufferBetweenMeetings,
        minimumNotice: schedule.minimumNotice,
        blockedDates: schedule.blockedDates,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const applyToAllDays = (startTime: string, endTime: string) => {
    setSchedule(prev => ({
      ...prev,
      workingHours: prev.workingHours.map(wh => ({
        ...wh,
        startTime,
        endTime,
      })),
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Settings">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Timezone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
            Timezone
          </label>
          <select
            value={schedule.timezone}
            onChange={(e) => setSchedule(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Working Hours */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-xs font-semibold text-slate-700 uppercase">
              Working Hours
            </label>
            <button
              onClick={() => applyToAllDays('09:00', '17:00')}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Reset to default
            </button>
          </div>
          <div className="space-y-2">
            {schedule.workingHours.map((wh, index) => (
              <div key={wh.day} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <label className="flex items-center gap-2 w-28">
                  <input
                    type="checkbox"
                    checked={wh.isWorkingDay}
                    onChange={() => handleWorkingDayToggle(index)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className={`text-sm ${wh.isWorkingDay ? 'text-slate-700' : 'text-slate-400'}`}>
                    {DAYS[index].slice(0, 3)}
                  </span>
                </label>

                {wh.isWorkingDay ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={wh.startTime}
                      onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="time"
                      value={wh.endTime}
                      onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 flex-1">Unavailable</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Buffer Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Buffer Between Meetings
            </label>
            <select
              value={schedule.bufferBetweenMeetings}
              onChange={(e) => setSchedule(prev => ({ ...prev, bufferBetweenMeetings: parseInt(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value={0}>No buffer</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Minimum Notice
            </label>
            <select
              value={schedule.minimumNotice}
              onChange={(e) => setSchedule(prev => ({ ...prev, minimumNotice: parseInt(e.target.value) }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value={1}>1 hour</option>
              <option value={2}>2 hours</option>
              <option value={4}>4 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={168}>1 week</option>
            </select>
          </div>
        </div>

        {/* Blocked Dates */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
            Blocked Dates
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <Button onClick={handleAddBlockedDate} variant="secondary">
              Add
            </Button>
          </div>
          {schedule.blockedDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {schedule.blockedDates.map(date => (
                <span
                  key={date}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100"
                >
                  {new Date(date).toLocaleDateString()}
                  <button
                    onClick={() => handleRemoveBlockedDate(date)}
                    className="hover:text-red-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleSettings;
