
export enum Permission {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',

  // Role Management
  VIEW_ROLES = 'VIEW_ROLES',
  MANAGE_ROLES = 'MANAGE_ROLES',

  // Sales Module
  VIEW_SALES_DASHBOARD = 'VIEW_SALES_DASHBOARD',
  
  // Granular Lead Management
  VIEW_LEADS = 'VIEW_LEADS',
  CREATE_LEADS = 'CREATE_LEADS',
  EDIT_LEADS = 'EDIT_LEADS',
  DELETE_LEADS = 'DELETE_LEADS',
  ASSIGN_LEADS = 'ASSIGN_LEADS',

  MANAGE_PROJECTS = 'MANAGE_PROJECTS',

  // Granular Task Management
  VIEW_TASKS = 'VIEW_TASKS',
  CREATE_TASKS = 'CREATE_TASKS',
  EDIT_TASKS = 'EDIT_TASKS',
  DELETE_TASKS = 'DELETE_TASKS',

  // CRM Reports
  VIEW_CRM_REPORTS = 'VIEW_CRM_REPORTS',

  // Assigned To visibility
  VIEW_ASSIGNED_TO = 'VIEW_ASSIGNED_TO',

  // Calendar Management (Granular)
  MANAGE_CRM_CALENDAR = 'MANAGE_CRM_CALENDAR', // Legacy - kept for backward compatibility
  VIEW_CALENDARS = 'VIEW_CALENDARS',
  CREATE_CALENDARS = 'CREATE_CALENDARS',
  SHARE_CALENDARS = 'SHARE_CALENDARS',
  MANAGE_PUBLIC_BOOKING = 'MANAGE_PUBLIC_BOOKING',
  MANAGE_EVENT_REMINDERS = 'MANAGE_EVENT_REMINDERS',
  USE_AVAILABILITY_FINDER = 'USE_AVAILABILITY_FINDER',
  MANAGE_CALENDAR_TASKS = 'MANAGE_CALENDAR_TASKS',
  CUSTOMIZE_SCHEDULE = 'CUSTOMIZE_SCHEDULE',

  // Quotation Management
  VIEW_QUOTATIONS = 'VIEW_QUOTATIONS',
  CREATE_QUOTATIONS = 'CREATE_QUOTATIONS',
  EDIT_QUOTATIONS = 'EDIT_QUOTATIONS',
  DELETE_QUOTATIONS = 'DELETE_QUOTATIONS',

  // Invoice Management
  VIEW_INVOICES = 'VIEW_INVOICES',
  CREATE_INVOICES = 'CREATE_INVOICES',
  EDIT_INVOICES = 'EDIT_INVOICES',
  DELETE_INVOICES = 'DELETE_INVOICES',

  // Quotation Request Management
  VIEW_QUOTATION_REQUESTS = 'VIEW_QUOTATION_REQUESTS',
  CREATE_QUOTATION_REQUESTS = 'CREATE_QUOTATION_REQUESTS',
  ASSIGN_QUOTATION_REQUESTS = 'ASSIGN_QUOTATION_REQUESTS',
  PROCESS_QUOTATION_REQUESTS = 'PROCESS_QUOTATION_REQUESTS',

  // Lead Conversion
  CONVERT_LEADS_TO_CUSTOMERS = 'CONVERT_LEADS_TO_CUSTOMERS',

  // Customer Module
  VIEW_CUSTOMERS = 'VIEW_CUSTOMERS',
  CREATE_CUSTOMERS = 'CREATE_CUSTOMERS',
  EDIT_CUSTOMERS = 'EDIT_CUSTOMERS',
  DELETE_CUSTOMERS = 'DELETE_CUSTOMERS',
  
  // Placeholder Modules
  VIEW_ACCOUNTS = 'VIEW_ACCOUNTS',
  VIEW_STORE = 'VIEW_STORE',
  VIEW_PROCUREMENT = 'VIEW_PROCUREMENT',
  VIEW_LOGISTICS = 'VIEW_LOGISTICS',
  VIEW_MARKETING = 'VIEW_MARKETING',
  VIEW_COMPLIANCE = 'VIEW_COMPLIANCE',
  VIEW_FLEET = 'VIEW_FLEET',
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'From Lead';
  source: string;
  createdAt: string;
  createdById: string;
}

export type LeadStatus = 'New' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface LeadTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TimelineEvent {
  id: string;
  text: string;
  date: string; // ISO string
  type: 'created' | 'status_change' | 'task' | 'note' | 'estimation' | 'conversion' | 'activity' | 'meeting' | 'email' | 'call';
  user?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO start date/time
  endDate?: string; // ISO end date/time
  type: 'meeting' | 'task' | 'follow_up' | 'reminder' | 'booking';
  leadId?: string;
  description?: string;
  owner?: string;
  ownerId?: string;
  calendarId?: string; // Which calendar this event belongs to
  reminders?: EventReminder[];
  linkedTaskId?: string;
  attendees?: string[]; // User IDs
  isAllDay?: boolean;
  recurrence?: EventRecurrence;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Multiple Calendars
export interface Calendar {
  id: string;
  name: string;
  color: string; // Hex color for events
  ownerId: string;
  ownerName: string;
  isDefault: boolean;
  isVisible: boolean;
  createdAt: string;
}

// Calendar Sharing
export type SharePermission = 'view' | 'edit' | 'full';

export interface CalendarShare {
  id: string;
  calendarId: string;
  calendarName: string;
  ownerId: string;
  ownerName: string;
  sharedWithId: string;
  sharedWithName: string;
  sharedWithEmail: string;
  permission: SharePermission;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

// Public Booking Pages
export interface TimeSlot {
  day: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface PublicBookingPage {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  description?: string;
  slug: string; // URL-friendly identifier
  duration: number; // Meeting duration in minutes
  bufferBefore: number; // Buffer time before meeting
  bufferAfter: number; // Buffer time after meeting
  availableSlots: TimeSlot[];
  calendarId: string; // Which calendar to add bookings to
  isActive: boolean;
  customFields?: BookingCustomField[];
  confirmationMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingCustomField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required: boolean;
  options?: string[]; // For select type
}

export interface Booking {
  id: string;
  bookingPageId: string;
  eventId: string; // Created calendar event
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  customFieldValues?: Record<string, string>;
  createdAt: string;
}

// Event Reminders
export type ReminderMethod = 'email' | 'in_app' | 'both';
export type ReminderTiming = 5 | 10 | 15 | 30 | 60 | 120 | 1440; // Minutes before event

export interface EventReminder {
  id: string;
  timing: ReminderTiming;
  method: ReminderMethod;
}

export interface ReminderSettings {
  userId: string;
  defaultReminders: EventReminder[];
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

// Event Recurrence
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface EventRecurrence {
  pattern: RecurrencePattern;
  interval: number; // Every N days/weeks/months/years
  endDate?: string; // When recurrence ends
  occurrences?: number; // Number of occurrences
  daysOfWeek?: number[]; // For weekly: 0-6
  dayOfMonth?: number; // For monthly
}

// User Schedule & Availability
export interface WorkingHours {
  day: number; // 0-6 (Sunday-Saturday)
  isWorkingDay: boolean;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breaks?: { start: string; end: string }[];
}

export interface UserSchedule {
  id: string;
  userId: string;
  userName: string;
  timezone: string;
  workingHours: WorkingHours[];
  bufferBetweenMeetings: number; // Minutes
  minimumNotice: number; // Minimum hours notice for bookings
  blockedDates: string[]; // ISO dates
  updatedAt: string;
}

// Availability Finder
export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  availableUserIds: string[];
}

export interface AvailabilityQuery {
  userIds: string[];
  dateRange: { start: string; end: string };
  duration: number; // Required meeting duration in minutes
}

// Calendar Tasks (Task integration with calendar)
export interface CalendarTask {
  id: string;
  taskId: string; // Reference to Task
  calendarId: string;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number; // Estimated duration in minutes
  showOnCalendar: boolean;
}

export interface Lead {
  id: string;
  title: string;
  customerName: string;
  value: number;
  status: LeadStatus;
  source: string;
  createdAt: string;
  createdById: string;
  assignedTo: string;
  tasks: LeadTask[];
  timeline: TimelineEvent[];
  convertedToCustomerId?: string; // ID of customer if converted, enables Request for Quotation
}

export type ProjectStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  title: string;
  customerId: string;
  customerName: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  value: number;
  description?: string;
  progress: number; // 0-100
}

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done';
export type RecurrenceFrequency = 'None' | 'Daily' | 'Weekly' | 'Monthly';
export type TaskViewMode = 'list' | 'kanban' | 'calendar' | 'gantt' | 'timeline' | 'hierarchy';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // Name or Email
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  projectId?: string; // Optional link to a project
  recurrence?: RecurrenceFrequency;
  completedAt?: string; // ISO timestamp when task was marked as Done
  // Advanced view support fields
  startDate?: string; // For Gantt Chart and Timeline views
  estimatedHours?: number; // For Workload calculations
  parentTaskId?: string; // For Hierarchy/Tree view
  dependencies?: string[]; // Task IDs this task depends on (for Gantt Chart)
  order?: number; // Display order within status column (for Kanban)
  // Origin and association tracking
  createdFrom?: 'manual' | 'lead_calendar' | 'lead_schedule' | 'other'; // How the task was created
  leadId?: string; // Link to Lead if created from a lead
  leadTitle?: string; // Lead title for display
  leadCustomerName?: string; // Customer name from lead for context
}

// Quotation Management
export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  validUntil: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// Invoice Management
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  quotationId?: string;
  projectId?: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

// Quotation Request Management
export type QuotationRequestStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';

export interface QuotationRequest {
  id: string;
  leadId: string;
  leadTitle: string;
  customerName: string;
  estimatedValue: number;
  requestedById: string;
  requestedByName: string;
  assignedToHeadId: string; // Sales Coordination Head user ID
  assignedToHeadName: string;
  assignedToCoordinatorId?: string; // Sales Coordinator user ID (assigned by head)
  assignedToCoordinatorName?: string;
  status: QuotationRequestStatus;
  notes?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  requirements?: string;
  createdAt: string;
  updatedAt: string;
}
