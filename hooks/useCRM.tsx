
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import {
  Lead, Customer, LeadStatus, TimelineEvent, Project, Task, CalendarEvent, Quotation, Invoice,
  Calendar, CalendarShare, PublicBookingPage, Booking, UserSchedule, SharePermission, QuotationRequest,
  Notification
} from '../types';
import { useAuth } from './useAuth';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Initial Mock Data
const INITIAL_LEADS: Lead[] = [
  { 
    id: 'l1', 
    title: 'Office Expansion Project', 
    customerName: 'GreenScape Solutions', 
    value: 15000, 
    status: 'New', 
    source: 'Referral',
    createdAt: '2023-10-15',
    createdById: 'system_user',
    assignedTo: 'system_user',
    tasks: [
      { id: 't1', text: 'Initial consultation call', completed: true },
      { id: 't2', text: 'Send floor plan requirements', completed: false },
    ],
    timeline: [
      { id: 'tl1', text: 'Lead created.', date: '2023-10-15T09:00:00Z', type: 'created', user: 'System' },
      { id: 'tl2', text: 'Task "Initial consultation call" created.', date: '2023-10-15T10:00:00Z', type: 'task', user: 'Charlie Rep' },
    ]
  },
  { 
    id: 'l2', 
    title: 'Q4 Supplies Contract', 
    customerName: 'EcoBuild Corp', 
    value: 8500, 
    status: 'Negotiation', 
    source: 'LinkedIn',
    createdAt: '2023-09-28',
    createdById: 'system_user',
    assignedTo: 'system_user',
    tasks: [
      { id: 't3', text: 'Draft contract', completed: true },
      { id: 't4', text: 'Review legal terms', completed: false },
      { id: 't5', text: 'Finalize pricing', completed: false },
    ],
    timeline: [
        { id: 'tl3', text: 'Lead created.', date: '2023-09-28T14:30:00Z', type: 'created', user: 'System' },
        { id: 'tl4', text: 'Status changed to Negotiation.', date: '2023-10-01T11:20:00Z', type: 'status_change', user: 'Alice Mgr' },
    ]
  },
  { id: 'l3', title: 'Consulting Service', customerName: 'NatureFirst Inc.', value: 2000, status: 'Lost', source: 'Cold Call', createdAt: '2023-08-10', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
  { id: 'l4', title: 'Fleet Maintenance Deal', customerName: 'Sustainable Structures', value: 12000, status: 'Won', source: 'Website', createdAt: '2023-10-01', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
  { id: 'l5', title: 'Annual Audit Software', customerName: 'TechFlow Systems', value: 5000, status: 'Contacted', source: 'Email Campaign', createdAt: '2023-10-20', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
  { id: 'l6', title: 'Employee Training Program', customerName: 'GrowthWorks', value: 3500, status: 'Proposal', source: 'Referral', createdAt: '2023-10-05', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
  { id: 'l7', title: 'Security Systems Upgrade', customerName: 'SafeGuard', value: 18000, status: 'New', source: 'Exhibition', createdAt: '2023-11-01', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
  { id: 'l8', title: 'Logistics Partnership', customerName: 'FastTrack', value: 25000, status: 'Proposal', source: 'LinkedIn', createdAt: '2023-10-12', createdById: 'system_user', assignedTo: 'system_user', tasks: [], timeline: [] },
];

const INITIAL_CUSTOMERS: Customer[] = [
  { id: '1', name: 'GreenScape Solutions', contactPerson: 'Alice Green', email: 'alice@greenscape.com', phone: '555-0101', status: 'Active', source: 'Referral', createdAt: '2023-05-12', createdById: 'system_user' },
  { id: '2', name: 'EcoBuild Corp', contactPerson: 'Bob Builder', email: 'bob@ecobuild.com', phone: '555-0102', status: 'Active', source: 'LinkedIn', createdAt: '2023-02-20', createdById: 'system_user' },
  { id: '3', name: 'NatureFirst Inc.', contactPerson: 'Carol Woods', email: 'carol@naturefirst.com', phone: '555-0103', status: 'From Lead', source: 'Cold Call', createdAt: '2023-08-01', createdById: 'system_user' },
  { id: '4', name: 'Sustainable Structures', contactPerson: 'David Stone', email: 'david@sustain.com', phone: '555-0104', status: 'Inactive', source: 'Website', createdAt: '2022-11-30', createdById: 'system_user' },
  { id: '5', name: 'TechFlow Systems', contactPerson: 'Sarah Jenkins', email: 'sarah@techflow.com', phone: '555-0105', status: 'Active', source: 'Email Campaign', createdAt: '2023-09-15', createdById: 'system_user' },
  { id: '6', name: 'GrowthWorks', contactPerson: 'Mike Ross', email: 'mike@growthworks.com', phone: '555-0106', status: 'From Lead', source: 'Referral', createdAt: '2023-10-05', createdById: 'system_user' },
  { id: '7', name: 'SafeGuard', contactPerson: 'Emily Blunt', email: 'emily@safeguard.com', phone: '555-0107', status: 'From Lead', source: 'Exhibition', createdAt: '2023-11-01', createdById: 'system_user' },
  { id: '8', name: 'FastTrack Logistics', contactPerson: 'Tom Speed', email: 'tom@fasttrack.com', phone: '555-0108', status: 'Active', source: 'LinkedIn', createdAt: '2023-07-22', createdById: 'system_user' },
  { id: '9', name: 'BlueSky Innovations', contactPerson: 'Jessica Sky', email: 'jessica@bluesky.com', phone: '555-0109', status: 'Inactive', source: 'Other', createdAt: '2023-01-10', createdById: 'system_user' },
  { id: '10', name: 'Urban Developers', contactPerson: 'Gary Steel', email: 'gary@urban.com', phone: '555-0110', status: 'Active', source: 'Website', createdAt: '2023-06-18', createdById: 'system_user' },
];

const INITIAL_PROJECTS: Project[] = [
    { id: 'p1', title: 'HQ Renovation', customerId: '1', customerName: 'GreenScape Solutions', status: 'In Progress', startDate: '2023-11-01', dueDate: '2024-02-28', value: 150000, progress: 35, description: 'Full renovation of the main office block.' },
    { id: 'p2', title: 'Material Supply Phase 1', customerId: '2', customerName: 'EcoBuild Corp', status: 'Not Started', startDate: '2023-12-01', dueDate: '2024-01-15', value: 45000, progress: 0, description: 'Supply of sustainable insulation materials.' },
    { id: 'p3', title: 'Logistics Fleet Setup', customerId: '8', customerName: 'FastTrack Logistics', status: 'Completed', startDate: '2023-08-01', dueDate: '2023-10-30', value: 200000, progress: 100, description: 'Acquisition and branding of 10 delivery trucks.' },
];

const INITIAL_TASKS: Task[] = [
  { id: 'tsk1', title: 'Review Q3 Sales Report', description: 'Analyze the performance of the sales team for Q3.', assignedTo: 'Alice Mgr', status: 'To Do', priority: 'High', dueDate: '2023-11-15' },
  { id: 'tsk2', title: 'Update Client Contact List', description: 'Ensure all phone numbers and emails are current.', assignedTo: 'Charlie Rep', status: 'In Progress', priority: 'Medium', dueDate: '2023-11-10' },
  { id: 'tsk3', title: 'Prepare Presentation for EcoBuild', description: 'Slide deck for the upcoming renovation pitch.', assignedTo: 'Charlie Rep', status: 'Done', priority: 'High', dueDate: '2023-10-30' },
  { id: 'tsk4', title: 'Schedule Team Building Event', description: 'Look for venues for the December outing.', assignedTo: 'Alice Mgr', status: 'To Do', priority: 'Low', dueDate: '2023-11-25' },
];

interface CRMContextType {
  leads: Lead[];
  customers: Customer[];
  projects: Project[];
  tasks: Task[];
  calendarEntries: CalendarEvent[];
  quotations: Quotation[];
  invoices: Invoice[];
  quotationRequests: QuotationRequest[];
  notifications: Notification[];
  // New calendar feature states
  calendars: Calendar[];
  calendarShares: CalendarShare[];
  publicBookingPages: PublicBookingPage[];
  bookings: Booking[];
  userSchedules: UserSchedule[];

  updateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addLead: (lead: Lead) => Promise<void>;
  addLeadTask: (leadId: string, text: string) => Promise<void>;
  toggleLeadTask: (leadId: string, taskId: string) => Promise<void>;
  deleteLeadTask: (leadId: string, taskId: string) => Promise<void>;
  addLeadTimelineEvent: (leadId: string, event: Omit<TimelineEvent, 'id'> & { date?: string }) => Promise<void>;
  addCalendarEntry: (entry: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateCalendarEntry: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEntry: (id: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addQuotation: (quotation: Quotation) => Promise<void>;
  updateQuotation: (id: string, data: Partial<Quotation>) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  addInvoice: (invoice: Invoice) => Promise<void>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // Quotation Request operations
  addQuotationRequest: (request: Omit<QuotationRequest, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateQuotationRequest: (id: string, data: Partial<QuotationRequest>) => Promise<void>;
  deleteQuotationRequest: (id: string) => Promise<void>;
  assignQuotationRequestToCoordinator: (requestId: string, coordinatorId: string, coordinatorName: string) => Promise<void>;
  assignQuotationRequestToMultipleCoordinators: (
    requestId: string,
    coordinators: Array<{ id: string; name: string; email: string }>,
    tags: { predefinedTags: string[]; customTags: string[] },
    customTasks: Array<{ title: string; description: string; priority: 'Low' | 'Medium' | 'High'; dueDate: string }>
  ) => Promise<void>;

  // Calendar operations
  addCalendar: (calendar: Omit<Calendar, 'id' | 'createdAt'>) => Promise<void>;
  updateCalendar: (id: string, data: Partial<Calendar>) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;

  // Calendar sharing operations
  shareCalendar: (calendarId: string, sharedWithId: string, sharedWithName: string, sharedWithEmail: string, permission: SharePermission) => Promise<void>;
  updateCalendarShare: (id: string, data: Partial<CalendarShare>) => Promise<void>;
  deleteCalendarShare: (id: string) => Promise<void>;

  // Public booking page operations
  addPublicBookingPage: (page: Omit<PublicBookingPage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePublicBookingPage: (id: string, data: Partial<PublicBookingPage>) => Promise<void>;
  deletePublicBookingPage: (id: string) => Promise<void>;

  // Booking operations
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<void>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;

  // User schedule operations
  saveUserSchedule: (schedule: Omit<UserSchedule, 'id' | 'updatedAt'>) => Promise<void>;
  getUserSchedule: (userId: string) => UserSchedule | undefined;

  // Notification operations
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getUnreadNotificationCount: () => number;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, users } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEvent[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotationRequests, setQuotationRequests] = useState<QuotationRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // New calendar feature states
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarShares, setCalendarShares] = useState<CalendarShare[]>([]);
  const [publicBookingPages, setPublicBookingPages] = useState<PublicBookingPage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userSchedules, setUserSchedules] = useState<UserSchedule[]>([]);

  // Role-based task filtering: Admins and Sales Managers see all tasks, others see only assigned tasks
  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];

    const userRole = currentUser.roleId;
    const isAdminOrManager = userRole === 'admin' || userRole === 'sales_manager' || userRole === 'assistant_sales_manager' || userRole === 'sales_coordination_head';

    if (isAdminOrManager) {
      return tasks; // Admin and managers see all tasks
    }

    // Other users see only tasks assigned to them
    return tasks.filter(task => task.assignedTo === currentUser.id);
  }, [tasks, currentUser]);

  const CRM_MAIN_DOC = 'main';
  const crmSub = (name: string) => collection(db, 'crm', CRM_MAIN_DOC, name);

  const seedCollection = useCallback(async () => {
    const [leadSnap, custSnap, projSnap, taskSnap] = await Promise.all([
      getDocs(crmSub('crm_leads')),
      getDocs(crmSub('crm_customers')),
      getDocs(crmSub('crm_projects')),
      getDocs(crmSub('crm_tasks')),
    ]);

    const isEmpty = leadSnap.empty && custSnap.empty && projSnap.empty && taskSnap.empty;
    if (!isEmpty) return;

    await Promise.all([
      ...INITIAL_LEADS.map((lead) => setDoc(doc(crmSub('crm_leads'), lead.id), lead)),
      ...INITIAL_CUSTOMERS.map((c) => setDoc(doc(crmSub('crm_customers'), c.id), c)),
      ...INITIAL_PROJECTS.map((p) => setDoc(doc(crmSub('crm_projects'), p.id), p)),
      ...INITIAL_TASKS.map((t) => setDoc(doc(crmSub('crm_tasks'), t.id), t)),
    ]);
  }, []);

  const hydrateFromFirestore = useCallback(async () => {
    try {
      // Seed initial data if collections are empty (one-time check)
      await seedCollection();
    } catch (err) {
      console.error('Error seeding CRM data', err);
    }
  }, [seedCollection]);

  useEffect(() => {
    if (!currentUser) {
      setLeads([]);
      setCustomers([]);
      setProjects([]);
      setTasks([]);
      setCalendarEntries([]);
      setQuotations([]);
      setInvoices([]);
      setQuotationRequests([]);
      setNotifications([]);
      setCalendars([]);
      setCalendarShares([]);
      setPublicBookingPages([]);
      setBookings([]);
      setUserSchedules([]);
      return;
    }

    // Seed initial data
    hydrateFromFirestore();

    // CRITICAL FIX: Set up real-time listeners for all CRM collections
    // This ensures all users see updates immediately across all roles
    console.log('Setting up real-time Firestore listeners for CRM data...');

    const unsubscribeLeads = onSnapshot(crmSub('crm_leads'), (snapshot) => {
      const leadsData = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Lead) }));
      setLeads(leadsData);
      console.log('Real-time update: Leads', leadsData.length);
    }, (error) => {
      console.error('Error in leads listener:', error);
    });

    const unsubscribeCustomers = onSnapshot(crmSub('crm_customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Customer) })));
    });

    const unsubscribeProjects = onSnapshot(crmSub('crm_projects'), (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Project) })));
    });

    const unsubscribeTasks = onSnapshot(crmSub('crm_tasks'), (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Task) })));
    });

    const unsubscribeCalendar = onSnapshot(crmSub('crm_calendar'), (snapshot) => {
      setCalendarEntries(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as CalendarEvent) })));
    });

    const unsubscribeQuotations = onSnapshot(crmSub('crm_quotations'), (snapshot) => {
      setQuotations(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Quotation) })));
    });

    const unsubscribeInvoices = onSnapshot(crmSub('crm_invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Invoice) })));
    });

    const unsubscribeQuotationRequests = onSnapshot(crmSub('crm_quotation_requests'), (snapshot) => {
      setQuotationRequests(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as QuotationRequest) })));
    });

    // Notifications - Only listen to notifications for current user
    const unsubscribeNotifications = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const userNotifications = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as Notification) }))
        .filter(n => n.recipientId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(userNotifications);
    });

    // Calendar feature collections
    const unsubscribeCalendars = onSnapshot(collection(db, 'calendars'), (snapshot) => {
      setCalendars(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Calendar) })));
    });

    const unsubscribeCalendarShares = onSnapshot(collection(db, 'calendar_shares'), (snapshot) => {
      setCalendarShares(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as CalendarShare) })));
    });

    const unsubscribeBookingPages = onSnapshot(collection(db, 'public_booking_pages'), (snapshot) => {
      setPublicBookingPages(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as PublicBookingPage) })));
    });

    const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as Booking) })));
    });

    const unsubscribeSchedules = onSnapshot(collection(db, 'user_schedules'), (snapshot) => {
      setUserSchedules(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as UserSchedule) })));
    });

    // Cleanup function to unsubscribe from all listeners when component unmounts
    // or when currentUser changes
    return () => {
      console.log('Cleaning up real-time Firestore listeners...');
      unsubscribeLeads();
      unsubscribeCustomers();
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeCalendar();
      unsubscribeQuotations();
      unsubscribeInvoices();
      unsubscribeQuotationRequests();
      unsubscribeNotifications();
      unsubscribeCalendars();
      unsubscribeCalendarShares();
      unsubscribeBookingPages();
      unsubscribeBookings();
      unsubscribeSchedules();
    };
  }, [currentUser, hydrateFromFirestore]);

  const addCalendarEntry = async (entry: Omit<CalendarEvent, 'id'>) => {
    const newEntry: CalendarEvent = {
      id: Date.now().toString(),
      ...entry,
      date: entry.date,
      owner: entry.owner || currentUser?.name || 'System',
      ownerId: entry.ownerId || currentUser?.id,
      createdAt: new Date().toISOString(),
    };
    setCalendarEntries(prev => [newEntry, ...prev]);
    await setDoc(doc(crmSub('crm_calendar'), newEntry.id), newEntry);
  };

  const updateCalendarEntry = async (id: string, data: Partial<CalendarEvent>) => {
    setCalendarEntries(prev => prev.map(entry =>
      entry.id === id ? { ...entry, ...data, updatedAt: new Date().toISOString() } : entry
    ));
    await updateDoc(doc(crmSub('crm_calendar'), id), { ...data, updatedAt: new Date().toISOString() });
  };

  const deleteCalendarEntry = async (id: string) => {
    setCalendarEntries(prev => prev.filter(entry => entry.id !== id));
    await deleteDoc(doc(crmSub('crm_calendar'), id));
  };

  const addLeadTimelineEvent = async (leadId: string, event: Omit<TimelineEvent, 'id'> & { date?: string }) => {
    // Generate unique ID with timestamp, random component, and high-precision counter to avoid duplicates
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${performance.now()}`;
    const newEvent: TimelineEvent = {
      id: uniqueId,
      date: event.date || new Date().toISOString(),
      ...event
    };
    let targetLead: Lead | undefined;
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        targetLead = { ...lead, timeline: [newEvent, ...(lead.timeline || [])] };
        return targetLead;
      }
      return lead;
    }));
    if (targetLead) {
      await updateDoc(doc(crmSub('crm_leads'), leadId), { timeline: targetLead.timeline });
    }
  };

  const updateLeadStatus = async (id: string, status: LeadStatus) => {
    let updated: Lead | undefined;
    setLeads(prev => prev.map(lead => {
        if (lead.id === id) {
            if (lead.status !== status) {
                 const statusEvent: TimelineEvent = {
                    id: Date.now().toString(),
                    text: `Status changed from ${lead.status} to ${status}`,
                    date: new Date().toISOString(),
                    type: 'status_change',
                    user: currentUser?.name || 'System'
                 }
                 updated = { ...lead, status, timeline: [statusEvent, ...(lead.timeline || [])] };
                 return updated;
            }
            updated = lead;
            return lead;
        }
        return lead;
    }));
    if (updated) {
      await updateDoc(doc(crmSub('crm_leads'), id), { status: updated.status, timeline: updated.timeline });
    }
  };

  const updateLead = async (id: string, data: Partial<Lead>) => {
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, ...data } : lead
    ));
    await updateDoc(doc(crmSub('crm_leads'), id), data);
  };

  const deleteLead = async (id: string) => {
    setLeads(prev => prev.filter(lead => lead.id !== id));
    await deleteDoc(doc(crmSub('crm_leads'), id));
  };

  const addCustomer = async (customer: Customer) => {
    const newCustomer: Customer = {
      ...customer,
      createdById: currentUser?.id || 'unknown'
    };
    setCustomers(prev => [newCustomer, ...prev]);
    await setDoc(doc(crmSub('crm_customers'), newCustomer.id), newCustomer);
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    setCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, ...data } : customer
    ));
    await updateDoc(doc(crmSub('crm_customers'), id), data);
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(customer => customer.id !== id));
    await deleteDoc(doc(crmSub('crm_customers'), id));
  };

  const addLead = async (lead: Lead) => {
    const newLead: Lead = {
        ...lead,
        createdById: currentUser?.id || 'unknown',
        assignedTo: lead.assignedTo || currentUser?.id || 'unknown',
        tasks: lead.tasks || [],
        timeline: [{ 
            id: Date.now().toString(), 
            text: 'Lead created', 
            date: new Date().toISOString(), 
            type: 'created', 
            user: currentUser?.name || 'System' 
        }]
    };
    setLeads(prev => [newLead as Lead, ...prev]);
    await setDoc(doc(crmSub('crm_leads'), newLead.id), newLead);
  };

  const addLeadTask = async (leadId: string, text: string) => {
    const newTask = { id: Date.now().toString(), text, completed: false };
    const taskEvent: TimelineEvent = {
         id: 'evt-' + Date.now().toString(),
         text: `Task "${text}" created`,
         date: new Date().toISOString(),
         type: 'task',
         user: currentUser?.name || 'System'
    };
    let updatedLead: Lead | undefined;
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        updatedLead = { ...lead, tasks: [...(lead.tasks || []), newTask], timeline: [taskEvent, ...(lead.timeline || [])] };
        return updatedLead;
      }
      return lead;
    }));
    if (updatedLead) {
      await updateDoc(doc(crmSub('crm_leads'), leadId), { tasks: updatedLead.tasks, timeline: updatedLead.timeline });
    }
  };

  const toggleLeadTask = async (leadId: string, taskId: string) => {
    let updatedLead: Lead | undefined;
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        updatedLead = {
          ...lead,
          tasks: lead.tasks.map(task => 
            task.id === taskId ? { ...task, completed: !task.completed } : task
          )
        };
        return updatedLead;
      }
      return lead;
    }));
    if (updatedLead) {
      await updateDoc(doc(crmSub('crm_leads'), leadId), { tasks: updatedLead.tasks });
    }
  };

  const deleteLeadTask = async (leadId: string, taskId: string) => {
    let updatedLead: Lead | undefined;
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        updatedLead = {
          ...lead,
          tasks: lead.tasks.filter(task => task.id !== taskId)
        };
        return updatedLead;
      }
      return lead;
    }));
    if (updatedLead) {
      await updateDoc(doc(crmSub('crm_leads'), leadId), { tasks: updatedLead?.tasks });
    }
  };

  // --- PROJECT ACTIONS ---

  const addProject = async (project: Project) => {
      setProjects(prev => [project, ...prev]);
      await setDoc(doc(crmSub('crm_projects'), project.id), project);
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
      setProjects(prev => prev.map(proj => 
          proj.id === id ? { ...proj, ...data } : proj
      ));
      await updateDoc(doc(crmSub('crm_projects'), id), data);
  };

  const deleteProject = async (id: string) => {
      setProjects(prev => prev.filter(proj => proj.id !== id));
      await deleteDoc(doc(crmSub('crm_projects'), id));
  };

  // --- TASK ACTIONS ---

  const addTask = async (task: Task) => {
      try {
          console.log('addTask called with:', task);

          // Validate required fields (assignedTo can be empty for unassigned tasks)
          if (!task.id || !task.title || task.status === undefined || !task.priority || !task.dueDate) {
              const error = 'Missing required task fields';
              console.error(error, { task });
              throw new Error(error);
          }

          // Update local state optimistically
          setTasks(prev => [task, ...prev]);
          console.log('Task added to local state');

          // Filter out undefined values (Firestore doesn't allow undefined)
          const taskData = Object.fromEntries(
              Object.entries(task).filter(([_, value]) => value !== undefined)
          );
          console.log('Filtered task data for Firestore:', taskData);

          // Write to Firestore
          const taskRef = doc(crmSub('crm_tasks'), task.id);
          await setDoc(taskRef, taskData);
          console.log('Task saved to Firestore successfully:', task.id);
      } catch (error) {
          console.error('Error in addTask:', error);
          // Revert optimistic update on failure
          setTasks(prev => prev.filter(t => t.id !== task.id));
          throw error; // Re-throw to let caller handle it
      }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
      setTasks(prev => prev.map(task =>
          task.id === id ? { ...task, ...data } : task
      ));
      await updateDoc(doc(crmSub('crm_tasks'), id), data);

      // Two-way sync: Update linked calendar entry when task status changes
      if (data.status !== undefined) {
        const linkedCalendarEntry = calendarEntries.find(entry => entry.linkedTaskId === id);
        if (linkedCalendarEntry) {
          // Update calendar entry title to show completion status
          const isCompleted = data.status === 'Done';
          const titlePrefix = isCompleted ? '✓ ' : '';
          const baseTitle = linkedCalendarEntry.title.replace(/^✓ /, ''); // Remove existing checkmark if present

          await updateCalendarEntry(linkedCalendarEntry.id, {
            title: `${titlePrefix}${baseTitle}`,
          });
        }
      }
  };

  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(task => task.id !== id));
      await deleteDoc(doc(crmSub('crm_tasks'), id));
  };

  // --- QUOTATION ACTIONS ---

  const addQuotation = async (quotation: Quotation) => {
      setQuotations(prev => [quotation, ...prev]);
      await setDoc(doc(crmSub('crm_quotations'), quotation.id), quotation);
  };

  const updateQuotation = async (id: string, data: Partial<Quotation>) => {
      setQuotations(prev => prev.map(q =>
          q.id === id ? { ...q, ...data } : q
      ));
      await updateDoc(doc(crmSub('crm_quotations'), id), data);
  };

  const deleteQuotation = async (id: string) => {
      setQuotations(prev => prev.filter(q => q.id !== id));
      await deleteDoc(doc(crmSub('crm_quotations'), id));
  };

  // --- INVOICE ACTIONS ---

  const addInvoice = async (invoice: Invoice) => {
      setInvoices(prev => [invoice, ...prev]);
      await setDoc(doc(crmSub('crm_invoices'), invoice.id), invoice);
  };

  const updateInvoice = async (id: string, data: Partial<Invoice>) => {
      setInvoices(prev => prev.map(inv =>
          inv.id === id ? { ...inv, ...data } : inv
      ));
      await updateDoc(doc(crmSub('crm_invoices'), id), data);
  };

  const deleteInvoice = async (id: string) => {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      await deleteDoc(doc(crmSub('crm_invoices'), id));
  };

  // --- QUOTATION REQUEST ACTIONS ---

  const addQuotationRequest = async (request: Omit<QuotationRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRequest: QuotationRequest = {
      id: Date.now().toString(),
      ...request,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuotationRequests(prev => [newRequest, ...prev]);
    await setDoc(doc(crmSub('crm_quotation_requests'), newRequest.id), newRequest);

    // Automatically notify all Sales Coordination Heads
    const coordinationHeads = users.filter(u =>
      u.isActive && (
        u.roleId === 'sales_coordination_head' ||
        u.roleId === 'sales_manager' ||
        u.roleId === 'assistant_sales_manager' ||
        u.roleId === 'admin'
      )
    );

    for (const head of coordinationHeads) {
      await addNotification({
        type: 'quotation_request',
        title: 'New Quotation Request Received',
        message: `New quotation request from ${request.requestedByName} for "${request.leadTitle}" (${request.customerName}) - AED ${request.estimatedValue.toLocaleString()} - ${request.priority} Priority`,
        recipientId: head.id,
        recipientName: head.name,
        senderId: request.requestedById,
        senderName: request.requestedByName,
        relatedId: request.leadId,
        relatedType: 'quotation_request',
        actionUrl: 'sales_quotation_requests',
        isRead: false,
      });
    }
  };

  const updateQuotationRequest = async (id: string, data: Partial<QuotationRequest>) => {
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    setQuotationRequests(prev => prev.map(req =>
      req.id === id ? { ...req, ...updatedData } : req
    ));
    await updateDoc(doc(crmSub('crm_quotation_requests'), id), updatedData);
  };

  const deleteQuotationRequest = async (id: string) => {
    setQuotationRequests(prev => prev.filter(req => req.id !== id));
    await deleteDoc(doc(crmSub('crm_quotation_requests'), id));
  };

  const assignQuotationRequestToCoordinator = async (requestId: string, coordinatorId: string, coordinatorName: string) => {
    const updatedData = {
      assignedToCoordinatorId: coordinatorId,
      assignedToCoordinatorName: coordinatorName,
      status: 'Assigned' as const,
      updatedAt: new Date().toISOString(),
    };
    setQuotationRequests(prev => prev.map(req =>
      req.id === requestId ? { ...req, ...updatedData } : req
    ));
    await updateDoc(doc(crmSub('crm_quotation_requests'), requestId), updatedData);
  };

  const assignQuotationRequestToMultipleCoordinators = async (
    requestId: string,
    coordinators: Array<{ id: string; name: string; email: string }>,
    tags: { predefinedTags: string[]; customTags: string[] },
    customTasks: Array<{ title: string; description: string; priority: 'Low' | 'Medium' | 'High'; dueDate: string }>
  ) => {
    const request = quotationRequests.find(req => req.id === requestId);
    if (!request) throw new Error('Quotation request not found');

    const lead = leads.find(l => l.id === request.leadId);

    try {
      // Update quotation request with multiple coordinators and tags
      const updatedData = {
        assignedCoordinators: coordinators,
        predefinedTags: tags.predefinedTags,
        customTags: tags.customTags,
        status: 'Assigned' as const,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(crmSub('crm_quotation_requests'), requestId), updatedData);
      setQuotationRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, ...updatedData } : req
      ));

      // Create tasks and notify each coordinator
      for (const coordinator of coordinators) {
        const mainTaskId = `quotation-task-${Date.now()}-${coordinator.id}`;
        const mainTask: Task = {
          id: mainTaskId,
          title: `Quotation Request: ${request.leadTitle}`,
          description: `Process quotation request for ${request.customerName}.\n\nEstimated Value: AED ${request.estimatedValue.toLocaleString()}\n\nRequirements: ${request.requirements || 'N/A'}\n\nNotes: ${request.notes || 'N/A'}\n\nTags: ${[...tags.predefinedTags, ...tags.customTags].join(', ')}`,
          assignedTo: coordinator.id,
          status: 'To Do',
          priority: request.priority === 'Urgent' ? 'High' : request.priority === 'High' ? 'High' : 'Medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdFrom: 'quotation_request',
          leadId: request.leadId,
          leadTitle: request.leadTitle,
          leadCustomerName: request.customerName,
          quotationRequestId: request.id
        };

        await addTask(mainTask);

        // Create custom subtasks
        for (const customTask of customTasks) {
          const subtask: Task = {
            id: `subtask-${Date.now()}-${Math.random()}`,
            title: customTask.title,
            description: customTask.description,
            assignedTo: coordinator.id,
            status: 'To Do',
            priority: customTask.priority,
            dueDate: customTask.dueDate,
            createdFrom: 'quotation_request',
            parentTaskId: mainTaskId,
            leadId: request.leadId,
            leadTitle: request.leadTitle,
            leadCustomerName: request.customerName,
            quotationRequestId: request.id
          };
          await addTask(subtask);
        }

        // Notify coordinator
        await addNotification({
          type: 'task_assigned',
          title: 'New Quotation Task Assigned',
          message: `You have been assigned to process a quotation request for "${request.leadTitle}" (${request.customerName}) - ${request.priority} Priority${customTasks.length > 0 ? ` with ${customTasks.length} subtask(s)` : ''}`,
          recipientId: coordinator.id,
          recipientName: coordinator.name,
          senderId: currentUser?.id,
          senderName: currentUser?.name,
          relatedId: request.leadId,
          relatedType: 'quotation_request',
          actionUrl: 'sales_tasks',
          isRead: false,
        });
      }

      // Notify original requester
      await addNotification({
        type: 'quotation_request',
        title: 'Quotation Request Received',
        message: `Your quotation request for "${request.leadTitle}" has been received and assigned to ${coordinators.length} coordinator(s) by Sales Coordination Head.`,
        recipientId: request.requestedById,
        recipientName: request.requestedByName,
        senderId: currentUser?.id,
        senderName: currentUser?.name,
        relatedId: request.leadId,
        relatedType: 'quotation_request',
        actionUrl: 'sales_quotation_requests',
        isRead: false,
      });

      // Update status to In Progress
      await updateQuotationRequest(requestId, {
        status: 'In Progress' as const
      });
    } catch (error) {
      console.error('Error assigning quotation request to multiple coordinators:', error);
      throw error;
    }
  };

  // --- NOTIFICATION OPERATIONS ---

  const addNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      ...notification,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
    await setDoc(doc(collection(db, 'notifications'), newNotification.id), newNotification);
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(notif =>
      notif.id === id ? { ...notif, isRead: true } : notif
    ));
    await updateDoc(doc(collection(db, 'notifications'), id), { isRead: true });
  };

  const markAllNotificationsAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    await Promise.all(
      unreadNotifications.map(notif =>
        updateDoc(doc(collection(db, 'notifications'), notif.id), { isRead: true })
      )
    );
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    await deleteDoc(doc(collection(db, 'notifications'), id));
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.isRead).length;
  };

  // --- CALENDAR OPERATIONS ---

  const addCalendar = async (calendar: Omit<Calendar, 'id' | 'createdAt'>) => {
    const newCalendar: Calendar = {
      id: Date.now().toString(),
      ...calendar,
      createdAt: new Date().toISOString(),
    };
    setCalendars(prev => [newCalendar, ...prev]);
    await setDoc(doc(collection(db, 'calendars'), newCalendar.id), newCalendar);
  };

  const updateCalendar = async (id: string, data: Partial<Calendar>) => {
    setCalendars(prev => prev.map(cal =>
      cal.id === id ? { ...cal, ...data } : cal
    ));
    await updateDoc(doc(collection(db, 'calendars'), id), data);
  };

  const deleteCalendar = async (id: string) => {
    setCalendars(prev => prev.filter(cal => cal.id !== id));
    await deleteDoc(doc(collection(db, 'calendars'), id));
  };

  // --- CALENDAR SHARING OPERATIONS ---

  const shareCalendar = async (
    calendarId: string,
    sharedWithId: string,
    sharedWithName: string,
    sharedWithEmail: string,
    permission: SharePermission
  ) => {
    const calendar = calendars.find(c => c.id === calendarId);
    if (!calendar || !currentUser) return;

    const newShare: CalendarShare = {
      id: Date.now().toString(),
      calendarId,
      calendarName: calendar.name,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      sharedWithId,
      sharedWithName,
      sharedWithEmail,
      permission,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setCalendarShares(prev => [newShare, ...prev]);
    await setDoc(doc(collection(db, 'calendar_shares'), newShare.id), newShare);
  };

  const updateCalendarShare = async (id: string, data: Partial<CalendarShare>) => {
    setCalendarShares(prev => prev.map(share =>
      share.id === id ? { ...share, ...data } : share
    ));
    await updateDoc(doc(collection(db, 'calendar_shares'), id), data);
  };

  const deleteCalendarShare = async (id: string) => {
    setCalendarShares(prev => prev.filter(share => share.id !== id));
    await deleteDoc(doc(collection(db, 'calendar_shares'), id));
  };

  // --- PUBLIC BOOKING PAGE OPERATIONS ---

  const addPublicBookingPage = async (page: Omit<PublicBookingPage, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPage: PublicBookingPage = {
      id: Date.now().toString(),
      ...page,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPublicBookingPages(prev => [newPage, ...prev]);
    await setDoc(doc(collection(db, 'public_booking_pages'), newPage.id), newPage);
  };

  const updatePublicBookingPage = async (id: string, data: Partial<PublicBookingPage>) => {
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
    setPublicBookingPages(prev => prev.map(page =>
      page.id === id ? { ...page, ...updatedData } : page
    ));
    await updateDoc(doc(collection(db, 'public_booking_pages'), id), updatedData);
  };

  const deletePublicBookingPage = async (id: string) => {
    setPublicBookingPages(prev => prev.filter(page => page.id !== id));
    await deleteDoc(doc(collection(db, 'public_booking_pages'), id));
  };

  // --- BOOKING OPERATIONS ---

  const addBooking = async (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking: Booking = {
      id: Date.now().toString(),
      ...booking,
      createdAt: new Date().toISOString(),
    };
    setBookings(prev => [newBooking, ...prev]);
    await setDoc(doc(collection(db, 'bookings'), newBooking.id), newBooking);
  };

  const updateBooking = async (id: string, data: Partial<Booking>) => {
    setBookings(prev => prev.map(booking =>
      booking.id === id ? { ...booking, ...data } : booking
    ));
    await updateDoc(doc(collection(db, 'bookings'), id), data);
  };

  const deleteBooking = async (id: string) => {
    setBookings(prev => prev.filter(booking => booking.id !== id));
    await deleteDoc(doc(collection(db, 'bookings'), id));
  };

  // --- USER SCHEDULE OPERATIONS ---

  const saveUserSchedule = async (schedule: Omit<UserSchedule, 'id' | 'updatedAt'>) => {
    const existingSchedule = userSchedules.find(s => s.userId === schedule.userId);
    const scheduleData: UserSchedule = {
      id: existingSchedule?.id || schedule.userId,
      ...schedule,
      updatedAt: new Date().toISOString(),
    };

    if (existingSchedule) {
      setUserSchedules(prev => prev.map(s =>
        s.userId === schedule.userId ? scheduleData : s
      ));
      await updateDoc(doc(collection(db, 'user_schedules'), scheduleData.id), scheduleData);
    } else {
      setUserSchedules(prev => [scheduleData, ...prev]);
      await setDoc(doc(collection(db, 'user_schedules'), scheduleData.id), scheduleData);
    }
  };

  const getUserSchedule = (userId: string): UserSchedule | undefined => {
    return userSchedules.find(s => s.userId === userId);
  };

  return (
    <CRMContext.Provider value={{
      leads,
      customers,
      projects,
      tasks: filteredTasks,
      calendarEntries,
      quotations,
      invoices,
      quotationRequests,
      notifications,
      // New calendar feature states
      calendars,
      calendarShares,
      publicBookingPages,
      bookings,
      userSchedules,

      updateLeadStatus,
      updateLead,
      deleteLead,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addLead,
      addLeadTask,
      toggleLeadTask,
      deleteLeadTask,
      addLeadTimelineEvent,
      addCalendarEntry,
      updateCalendarEntry,
      deleteCalendarEntry,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      deleteTask,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      // Quotation request operations
      addQuotationRequest,
      updateQuotationRequest,
      deleteQuotationRequest,
      assignQuotationRequestToCoordinator,
      assignQuotationRequestToMultipleCoordinators,
      // Notification operations
      addNotification,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      getUnreadNotificationCount,
      // Calendar operations
      addCalendar,
      updateCalendar,
      deleteCalendar,
      // Calendar sharing operations
      shareCalendar,
      updateCalendarShare,
      deleteCalendarShare,
      // Public booking page operations
      addPublicBookingPage,
      updatePublicBookingPage,
      deletePublicBookingPage,
      // Booking operations
      addBooking,
      updateBooking,
      deleteBooking,
      // User schedule operations
      saveUserSchedule,
      getUserSchedule,
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
