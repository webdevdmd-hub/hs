
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Lead, LeadStatus, Customer, Permission, QuotationRequest } from '../../types';
import { FilterIcon, CalendarIcon, EditIcon, TrashIcon, CheckCircleIcon, PlusIcon, XIcon, ChevronDownIcon, MoreVerticalIcon } from '../icons/Icons';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';

const SalesLeads: React.FC = () => {
  const { currentUser, getRoleForUser, users, hasPermission, roles } = useAuth();
  const { leads, updateLeadStatus, updateLead, deleteLead, addLead, addLeadTimelineEvent, addCustomer, addCalendarEntry, addTask, addQuotationRequest, addNotification } = useCRM();
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState<string>('All'); // User filter for privileged roles

  // Active Menus State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  // Lead Modal State (Create & Edit)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadFormData, setLeadFormData] = useState({
    title: '',
    customerName: '',
    value: '',
    status: 'New' as LeadStatus,
    source: '',
    assignedTo: ''
  });
  // Custom Assign Dropdown State
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);

  // Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activityForm, setActivityForm] = useState({
    type: 'call' as 'call' | 'email' | 'meeting' | 'activity',
    note: '',
    dateTime: new Date().toISOString().slice(0, 16),
  });
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    description: '',
    dateTime: new Date().toISOString().slice(0, 16),
  });
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDeleteId, setLeadToDeleteId] = useState<string | null>(null);

  // Log Follow-up Modal State
  const [isLogFollowupModalOpen, setIsLogFollowupModalOpen] = useState(false);

  // Add Task to Calendar Modal State
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Convert to Customer Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertFormData, setConvertFormData] = useState({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      source: ''
  });

  // Quotation Request Modal State
  const [isQuotationRequestModalOpen, setIsQuotationRequestModalOpen] = useState(false);
  const [quotationRequestFormData, setQuotationRequestFormData] = useState({
      priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
      requirements: '',
      notes: ''
  });

  // Quick Actions Menu State
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Filter assignable users (Execs, Managers, and Assistant Managers)
  const assignableUsers = useMemo(() => {
    return users.filter(u => ['sales_executive', 'sales_manager', 'assistant_sales_manager', 'admin'].includes(u.roleId));
  }, [users]);

  // Filter only Sales Persons for the user filter dropdown (for management oversight)
  const salesPersons = useMemo(() => {
    return users.filter(u => u.roleId === 'sales_executive');
  }, [users]);

  // Find Sales Coordination Head users
  const salesCoordinationHeads = useMemo(() => {
    return users.filter(u => u.roleId === 'sales_coordination_head');
  }, [users]);

  const getAssigneeName = (userId: string) => {
    if (userId === 'system_user') return 'System';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unassigned';
  };

  // Check if user can view Assigned To functionality
  const canViewAssignedTo = hasPermission(Permission.VIEW_ASSIGNED_TO);

  // Check if current user has global visibility (Admin, Sales Manager, or Assistant Sales Manager)
  const hasGlobalVisibility = useMemo(() => {
    const userRole = currentUser ? getRoleForUser(currentUser) : null;
    return userRole?.id === 'admin' ||
           userRole?.id === 'sales_manager' ||
           userRole?.id === 'assistant_sales_manager';
  }, [currentUser, getRoleForUser]);

  const filteredLeads = useMemo(() => {
    const userRole = currentUser ? getRoleForUser(currentUser) : null;
    const isSalesExecutive = userRole?.id === 'sales_executive';

    return leads
      .filter(lead => {
        // Permission Filter:
        // Users with global visibility (Admin, Sales Manager, Assistant Sales Manager) see all leads.
        // Sales Executives see only leads created by them OR assigned to them.
        if (!hasGlobalVisibility && isSalesExecutive) {
            if (lead.createdById !== currentUser?.id && lead.assignedTo !== currentUser?.id) {
                return false;
            }
        }

        // User Filter (only for privileged roles with global visibility)
        if (hasGlobalVisibility && userFilter !== 'All') {
          if (lead.assignedTo !== userFilter) {
            return false;
          }
        }

        // Standard Filters
        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
        const matchesDate = !dateFilter || new Date(lead.createdAt) >= new Date(dateFilter);
        return matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        // Sort by creation date descending (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [statusFilter, dateFilter, userFilter, leads, currentUser, getRoleForUser, hasGlobalVisibility]);

  const getStatusStyles = (status: LeadStatus) => {
    switch (status) {
      case 'New': return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-100' };
      case 'Contacted': return { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-100' };
      case 'Proposal': return { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-100' };
      case 'Negotiation': return { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-100' };
      case 'Won': return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' };
      case 'Lost': return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-100' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500', border: 'border-gray-100' };
    }
  };

  // Specialized handler for winning a deal
  const markLeadAsWon = (lead: Lead) => {
    if (!hasPermission(Permission.EDIT_LEADS)) return;

    setSelectedLead(lead);
    updateLeadStatus(lead.id, 'Won');

    // Open Conversion Modal - Auto-fill ALL fields from lead
    setConvertFormData({
        name: lead.customerName,
        contactPerson: lead.customerName, // Auto-fill with customer name
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'Converted'
    });
    setIsConvertModalOpen(true);
  };

  const markLeadAsLost = (lead: Lead) => {
    if (!hasPermission(Permission.EDIT_LEADS)) return;

    if (window.confirm(`Are you sure you want to mark "${lead.title}" as Lost?`)) {
        updateLeadStatus(lead.id, 'Lost');
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLead) return;

      const newCustomer: Customer = {
          id: Date.now().toString(),
          name: convertFormData.name,
          contactPerson: convertFormData.contactPerson || 'Pending',
          email: convertFormData.email || '',
          phone: convertFormData.phone || '',
          status: 'From Lead',
          source: convertFormData.source || 'Converted',
          createdAt: new Date().toISOString(),
          createdById: currentUser?.id || 'system'
      };

      await addCustomer(newCustomer);

      // CRITICAL: Update lead to mark it as converted with customer ID
      // This enables the Request for Quotation button
      await updateLead(selectedLead.id, {
          convertedToCustomerId: newCustomer.id
      });

      setIsConvertModalOpen(false);

      // Add timeline event for conversion
      await addLeadTimelineEvent(selectedLead.id, {
          text: `Converted to Customer: ${newCustomer.name}`,
          type: 'conversion',
          user: currentUser?.name || 'System'
      });
  };

  // Direct Convert to Customer handler (from lead details)
  const handleOpenConvertModal = () => {
    if (!selectedLead) return;
    // Auto-fill ALL fields from lead
    setConvertFormData({
      name: selectedLead.customerName,
      contactPerson: selectedLead.customerName, // Auto-fill with customer name
      email: selectedLead.email || '',
      phone: selectedLead.phone || '',
      source: selectedLead.source || 'Converted'
    });
    setIsConvertModalOpen(true);
  };

  // Open Quotation Request Modal
  const handleOpenQuotationRequestModal = () => {
    if (!selectedLead) return;
    setQuotationRequestFormData({
      priority: 'Medium',
      requirements: '',
      notes: ''
    });
    setIsQuotationRequestModalOpen(true);
  };

  // Submit Quotation Request
  const handleQuotationRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !currentUser) return;

    // CRITICAL: Verify this is an actual RFQ submission, not accidental trigger
    if (!quotationRequestFormData.requirements?.trim()) {
      alert('Please enter requirements for the quotation request.');
      return;
    }

    // Find Sales Coordination Heads - now supports multiple heads
    const coordinationHeadsAvailable = users.filter(u =>
      u.isActive && (
        u.roleId === 'sales_coordination_head' ||
        u.roleId === 'sales_manager' ||
        u.roleId === 'assistant_sales_manager' ||
        u.roleId === 'admin'
      )
    );

    if (coordinationHeadsAvailable.length === 0) {
      alert('No Sales Coordination Head found. Please ensure users with appropriate roles exist.');
      return;
    }

    // Assign to the first available coordination head (or could be enhanced to let user select)
    const assignedHead = coordinationHeadsAvailable[0];

    try {
      // addQuotationRequest now automatically notifies all coordination heads
      await addQuotationRequest({
        leadId: selectedLead.id,
        leadTitle: selectedLead.title,
        customerName: selectedLead.customerName,
        estimatedValue: selectedLead.value,
        requestedById: currentUser.id,
        requestedByName: currentUser.name,
        assignedToHeadId: assignedHead.id,
        assignedToHeadName: assignedHead.name,
        status: 'Pending',
        priority: quotationRequestFormData.priority,
        requirements: quotationRequestFormData.requirements,
        notes: quotationRequestFormData.notes,
      });

      // CRITICAL: Only update status to 'Proposal' after successful RFQ submission
      // This should NEVER be triggered by any other action (customer conversion, clicking names, etc.)
      await updateLeadStatus(selectedLead.id, 'Proposal');

      // Add timeline event
      await addLeadTimelineEvent(selectedLead.id, {
        text: `Quotation request submitted - Priority: ${quotationRequestFormData.priority}`,
        type: 'activity',
        user: currentUser.name
      });

      // Add timeline event for status change
      await addLeadTimelineEvent(selectedLead.id, {
        text: `Status changed to Proposal (Quotation request submitted)`,
        type: 'status_change',
        user: currentUser.name
      });

      setIsQuotationRequestModalOpen(false);
      setQuotationRequestFormData({
        priority: 'Medium',
        requirements: '',
        notes: ''
      });
      alert(`Quotation request submitted successfully! Lead status updated to Proposal. All Sales Coordination Heads have been notified.`);
    } catch (error) {
      console.error('Error submitting quotation request:', error);
      alert('Failed to submit quotation request. Please try again.');
    }
  };

  const handleStatusChange = (lead: Lead, newStatus: LeadStatus) => {
    if (!hasPermission(Permission.EDIT_LEADS)) return;

    setActiveStatusDropdownId(null); // Close dropdown
    
    if (newStatus === 'Won') {
        markLeadAsWon(lead);
    } else if (newStatus === 'Lost') {
        markLeadAsLost(lead);
    } else {
        updateLeadStatus(lead.id, newStatus);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setLeadFormData({ 
      title: '', 
      customerName: '', 
      value: '', 
      status: 'New', 
      source: '',
      assignedTo: currentUser?.id || ''
    });
    setIsLeadModalOpen(true);
    setIsAssignDropdownOpen(false);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setLeadFormData({
      title: lead.title,
      customerName: lead.customerName,
      value: lead.value.toString(),
      status: lead.status,
      source: lead.source || '',
      assignedTo: lead.assignedTo
    });
    setIsLeadModalOpen(true);
    setActiveMenuId(null);
    setIsAssignDropdownOpen(false);
  };

  const handleRowClick = (lead: Lead) => {
      setSelectedLead(lead);
      setActivityForm({
        type: 'call',
        note: '',
        dateTime: new Date().toISOString().slice(0, 16),
      });
      setScheduleForm({
        title: `${lead.title} follow-up`,
        description: '',
        dateTime: new Date().toISOString().slice(0, 16),
      });
      setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (leadId: string) => {
    setLeadToDeleteId(leadId);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = () => {
    if (leadToDeleteId) {
        deleteLead(leadToDeleteId);
        setIsDeleteModalOpen(false);
        setLeadToDeleteId(null);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadData: Lead = {
      id: editingLead ? editingLead.id : Date.now().toString(),
      title: leadFormData.title,
      customerName: leadFormData.customerName,
      value: parseFloat(leadFormData.value),
      status: leadFormData.status,
      source: leadFormData.source,
      createdAt: editingLead ? editingLead.createdAt : new Date().toISOString(),
      createdById: editingLead ? editingLead.createdById : '',
      assignedTo: leadFormData.assignedTo,
      tasks: editingLead ? editingLead.tasks : [],
      timeline: editingLead ? editingLead.timeline : []
    };

    try {
      if (editingLead) {
        await updateLead(editingLead.id, leadData);
      } else {
        await addLead(leadData);
      }
      setIsLeadModalOpen(false);
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleLogActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activityForm.note.trim() || !hasPermission(Permission.EDIT_LEADS)) return;
    const typeLabel =
      activityForm.type === 'call'
        ? 'Call'
        : activityForm.type === 'email'
        ? 'Email'
        : activityForm.type === 'meeting'
        ? 'Meeting'
        : 'Activity';
    addLeadTimelineEvent(selectedLead.id, {
      text: `${typeLabel}: ${activityForm.note.trim()}`,
      type: activityForm.type,
      user: currentUser?.name || 'System',
      date: activityForm.dateTime ? new Date(activityForm.dateTime).toISOString() : undefined,
    });
    setActivityForm((prev) => ({
      ...prev,
      note: '',
    }));
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedLead) {
      console.error('No lead selected');
      alert('Please select a lead first.');
      return;
    }

    if (!scheduleForm.title.trim()) {
      alert('Please enter a task title.');
      return;
    }

    if (!hasPermission(Permission.MANAGE_CRM_CALENDAR)) {
      alert('You do not have permission to create tasks.');
      return;
    }

    if (isSavingTask) return; // Prevent double submission

    setIsSavingTask(true);
    console.log('=== Starting task creation process ===');
    console.log('Form data:', scheduleForm);
    console.log('Selected lead:', selectedLead);

    const isoDate = new Date(scheduleForm.dateTime).toISOString();

    try {
      // Create task description with lead linkage
      const taskDescription = scheduleForm.description.trim()
        ? `${scheduleForm.description.trim()}\n\nLead: ${selectedLead.title} • ${selectedLead.customerName}`
        : `Lead: ${selectedLead.title} • ${selectedLead.customerName}`;

      // Step 1: Create task in main CRM Task module first (so we have the ID for linking)
      console.log('Step 1: Creating CRM task...');
      const taskId = `lead-task-${Date.now()}`;
      const taskData = {
        id: taskId,
        title: scheduleForm.title.trim(),
        description: scheduleForm.description.trim() || undefined,
        assignedTo: currentUser?.id || currentUser?.email || 'System',
        status: 'To Do' as const,
        priority: 'Medium' as const,
        dueDate: isoDate.split('T')[0], // Extract date only
        // Origin and lead association tracking
        createdFrom: 'lead_calendar' as const,
        leadId: selectedLead.id,
        leadTitle: selectedLead.title,
        leadCustomerName: selectedLead.customerName,
      };
      console.log('Task data to save:', taskData);

      await addTask(taskData);
      console.log('✓ CRM task created with ID:', taskId);

      // Step 2: Create calendar entry linked to the task
      console.log('Step 2: Creating calendar entry...');
      await addCalendarEntry({
        title: scheduleForm.title.trim(),
        date: isoDate,
        type: 'task',
        leadId: selectedLead.id,
        description: taskDescription,
        owner: currentUser?.name || 'System',
        ownerId: currentUser?.id,
        calendarId: 'default',
        linkedTaskId: taskId, // Link the calendar entry to the task
      });
      console.log('✓ Calendar entry created and linked to task');

      // Step 3: Add to lead timeline
      console.log('Step 3: Adding to lead timeline...');
      await addLeadTimelineEvent(selectedLead.id, {
        text: `Task scheduled: ${scheduleForm.title.trim()}`,
        type: 'task',
        user: currentUser?.name || 'System',
        date: isoDate,
      });
      console.log('✓ Timeline updated');

      // Success! Reset form
      setScheduleForm({
        title: '',
        description: '',
        dateTime: new Date().toISOString().slice(0, 16),
      });

      console.log('=== Task creation completed successfully ===');
      alert('Task saved successfully!');
    } catch (error) {
      console.error('=== Error in task creation process ===');
      console.error('Error details:', error);

      let errorMessage = 'Failed to save task. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check console for details.';
      }

      alert(errorMessage);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Helper to get fresh lead data for the modal
  const leadInView = leads.find(l => l.id === selectedLead?.id) || selectedLead;

  return (
    <div className="space-y-6">
      {/* Click outside handler for menus */}
      {activeMenuId && (
        <div 
          className="fixed inset-0 z-10 bg-transparent"
          onClick={() => setActiveMenuId(null)}
        />
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Leads</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage potential business opportunities.</p>
        </div>
        {hasPermission(Permission.CREATE_LEADS) && (
            <Button onClick={handleOpenAddModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Lead
            </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'All')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Proposal">Proposal</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          {hasGlobalVisibility && (
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="All">All Sales Persons</option>
                {salesPersons.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="relative flex-1">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none hover:bg-slate-100 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Lead Title</th>
                {canViewAssignedTo && <th className="px-6 py-4 font-semibold">Assigned To</th>}
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Value</th>
                <th className="px-6 py-4 font-semibold">Date Created</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const statusStyle = getStatusStyles(lead.status);
                return (
                  <tr 
                    key={lead.id} 
                    className="bg-white hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(lead)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{lead.title}</td>
                    {canViewAssignedTo && (
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-2">
                            {getAssigneeName(lead.assignedTo).charAt(0)}
                          </div>
                          <span className="text-xs">{getAssigneeName(lead.assignedTo)}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">{lead.customerName}</td>
                    <td className="px-6 py-4 font-medium">AED {lead.value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button 
                          disabled={!hasPermission(Permission.EDIT_LEADS)}
                          onClick={() => hasPermission(Permission.EDIT_LEADS) && setActiveStatusDropdownId(activeStatusDropdownId === lead.id ? null : lead.id)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} ${hasPermission(Permission.EDIT_LEADS) ? 'hover:opacity-80' : 'cursor-default'} transition-opacity`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusStyle.dot}`}></span>
                          {lead.status}
                        </button>
                        
                        {activeStatusDropdownId === lead.id && hasPermission(Permission.EDIT_LEADS) && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdownId(null)}></div>
                            <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                              {['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'].map((s) => {
                                const style = getStatusStyles(s as LeadStatus);
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(lead, s as LeadStatus)}
                                    className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center"
                                  >
                                    <span className={`w-2 h-2 rounded-full mr-2 ${style.dot}`}></span>
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <Button 
                            variant="ghost" 
                            className="!p-2 text-slate-400 hover:text-slate-600"
                            onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                        >
                            <MoreVerticalIcon className="w-4 h-4"/>
                        </Button>

                         {/* Dropdown Menu */}
                        {activeMenuId === lead.id && (
                            <div className="absolute right-8 top-8 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                                {hasPermission(Permission.EDIT_LEADS) && (
                                    <button
                                        onClick={() => handleOpenEditModal(lead)}
                                        className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                    >
                                        <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                    </button>
                                )}
                                {hasPermission(Permission.DELETE_LEADS) && (
                                    <button
                                        onClick={() => handleDeleteClick(lead.id)}
                                        className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4 mr-2 opacity-80" /> Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={canViewAssignedTo ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Lead Modal */}
      <Modal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        title={editingLead ? "Edit Lead" : "Add New Lead"}
      >
        <form onSubmit={handleLeadSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Lead Title</label>
            <input
              type="text"
              required
              value={leadFormData.title}
              onChange={(e) => setLeadFormData({...leadFormData, title: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Office Expansion Project"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Customer Name</label>
            <input
              type="text"
              required
              value={leadFormData.customerName}
              onChange={(e) => setLeadFormData({...leadFormData, customerName: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Value (AED)</label>
              <input
                type="number"
                required
                min="0"
                value={leadFormData.value}
                onChange={(e) => setLeadFormData({...leadFormData, value: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Status</label>
              <select
                value={leadFormData.status}
                onChange={(e) => setLeadFormData({...leadFormData, status: e.target.value as LeadStatus})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>
          {canViewAssignedTo && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Assign To</label>
            {hasPermission(Permission.ASSIGN_LEADS) ? (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    >
                        <div className="flex items-center gap-2">
                            {leadFormData.assignedTo ? (
                                <>
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                        {getAssigneeName(leadFormData.assignedTo).charAt(0)}
                                    </div>
                                    <span className="text-slate-900">{getAssigneeName(leadFormData.assignedTo)}</span>
                                </>
                            ) : (
                                <span className="text-slate-400">Select User</span>
                            )}
                        </div>
                        <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                    </button>

                    {isAssignDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsAssignDropdownOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto custom-scrollbar">
                                {/* Unassigned option */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLeadFormData({...leadFormData, assignedTo: ''});
                                        setIsAssignDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors border-b border-slate-100"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                                        —
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600">Unassigned</p>
                                        <p className="text-xs text-slate-400">No user assigned</p>
                                    </div>
                                    {!leadFormData.assignedTo && (
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 ml-auto" />
                                    )}
                                </button>
                                {assignableUsers.map(user => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        onClick={() => {
                                            setLeadFormData({...leadFormData, assignedTo: user.id});
                                            setIsAssignDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-500 capitalize">{user.roleId.replace('_', ' ')}</p>
                                        </div>
                                        {leadFormData.assignedTo === user.id && (
                                            <CheckCircleIcon className="w-4 h-4 text-emerald-500 ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                // Read-only view for those without assignment permission
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm flex items-center gap-2 cursor-not-allowed">
                     <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">
                        {getAssigneeName(leadFormData.assignedTo || currentUser?.id || '').charAt(0)}
                    </div>
                    <span className="text-slate-600">{getAssigneeName(leadFormData.assignedTo || currentUser?.id || '')}</span>
                </div>
            )}
          </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Lead Source <span className="text-red-500">*</span></label>
            <select
                required
                value={leadFormData.source}
                onChange={(e) => setLeadFormData({...leadFormData, source: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none invalid:text-slate-400"
            >
                <option value="" disabled>Select Source</option>
                <option value="Referral">Referral</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Website">Website</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Email Campaign">Email Campaign</option>
                <option value="Exhibition">Exhibition</option>
                <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsLeadModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingLead ? 'Save Changes' : 'Create Lead'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
                <TrashIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900">Delete Lead?</h3>
                <p className="text-sm text-slate-500 mt-2">
                    Are you sure you want to delete this lead? This action cannot be undone.
                </p>
            </div>
            <div className="flex justify-center space-x-3 mt-6">
                <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleConfirmDelete} 
                    className="bg-red-600 hover:bg-red-700 text-white shadow-red-200"
                >
                    Delete Lead
                </Button>
            </div>
        </div>
      </Modal>

      {/* Convert to Customer Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert to Customer"
      >
          <form onSubmit={handleConvertSubmit} className="space-y-5">
            {/* Info Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircleIcon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Lead information auto-filled</p>
                  <p className="text-xs text-emerald-700 mt-1">All available information from the lead has been automatically populated. Please review and edit if needed, then confirm to create the customer record.</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Company Name</label>
                <input
                    type="text"
                    required
                    value={convertFormData.name}
                    onChange={(e) => setConvertFormData({ ...convertFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Contact Person</label>
                <input
                    type="text"
                    required
                    value={convertFormData.contactPerson}
                    onChange={(e) => setConvertFormData({ ...convertFormData, contactPerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="e.g. John Doe"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Email</label>
                    <input
                        type="email"
                        value={convertFormData.email}
                        onChange={(e) => setConvertFormData({ ...convertFormData, email: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="john@acme.com"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Phone</label>
                    <input
                        type="tel"
                        value={convertFormData.phone}
                        onChange={(e) => setConvertFormData({ ...convertFormData, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="+1 (555) 000-0000"
                    />
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsConvertModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Confirm & Create Customer
                </Button>
            </div>
          </form>
      </Modal>

      {/* Lead Details Modal */}
      {selectedLead && leadInView && (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={() => { setIsDetailModalOpen(false); setIsQuickActionsOpen(false); }}
            style={{ display: isDetailModalOpen ? 'flex' : 'none' }}
        >
            <div
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                 {/* Header */}
                 <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50 flex-shrink-0">
                    <div>
                         <div className="flex items-center gap-3 mb-2">
                             <h2 className="text-2xl font-bold text-slate-900">{leadInView.title}</h2>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyles(leadInView.status).bg} ${getStatusStyles(leadInView.status).text} ${getStatusStyles(leadInView.status).border}`}>
                                 {leadInView.status}
                             </span>
                         </div>
                         <div className="text-slate-500 text-sm flex items-center gap-4 flex-wrap">
                             <span className="flex items-center gap-1">
                                 <span className="font-semibold text-slate-700">{leadInView.customerName}</span>
                             </span>
                             {canViewAssignedTo && (
                             <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                     {getAssigneeName(leadInView.assignedTo).charAt(0)}
                                 </div>
                                 <div className="text-sm">
                                    <span className="text-xs text-slate-500 mr-1">Assigned to:</span>
                                    <span className="font-semibold text-slate-700">{getAssigneeName(leadInView.assignedTo)}</span>
                                 </div>
                             </div>
                             )}
                         </div>
                    </div>
                    <button onClick={() => { setIsDetailModalOpen(false); setIsQuickActionsOpen(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                        <XIcon className="w-6 h-6" />
                    </button>
                 </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {/* Timeline with Lead Details/Assignment on Right */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Timeline (Left Side - 2/3 width) */}
                        <div className="lg:col-span-2">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline</h3>
                            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                                {leadInView.timeline && leadInView.timeline.map((event) => (
                                    <div key={event.id} className="relative pl-6">
                                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                                event.type === 'created' ? 'bg-blue-400' :
                                                event.type === 'status_change' ? 'bg-emerald-400' :
                                                event.type === 'estimation' ? 'bg-indigo-400' :
                                                event.type === 'conversion' ? 'bg-purple-400' :
                                                event.type === 'task' ? 'bg-amber-400' :
                                                event.type === 'meeting' ? 'bg-orange-400' :
                                                event.type === 'email' ? 'bg-cyan-400' :
                                                event.type === 'call' ? 'bg-amber-400' :
                                                event.type === 'activity' ? 'bg-slate-400' :
                                                'bg-slate-300'
                                            }`}></div>
                                        <p className="text-sm text-slate-800 font-medium">{event.text}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(event.date).toLocaleString()} • <span className="text-slate-500">{event.user || 'System'}</span>
                                        </p>
                                    </div>
                                ))}
                                {(!leadInView.timeline || leadInView.timeline.length === 0) && (
                                    <p className="text-xs text-slate-400 italic pl-6">No history recorded.</p>
                                )}
                            </div>
                        </div>

                        {/* Lead Details & Assignment (Right Side - 1/3 width) */}
                        <div className="lg:col-span-1 space-y-4">
                            {/* Lead Details */}
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Lead Details</h3>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Value</span>
                                        <span className="font-semibold">AED {leadInView.value.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Source</span>
                                        <span className="font-semibold">{leadInView.source || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Created</span>
                                        <span className="font-semibold">{new Date(leadInView.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Assignment or Status */}
                            {canViewAssignedTo ? (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Assignment</h3>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Assigned To</span>
                                            <span className="font-semibold flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                                    {getAssigneeName(leadInView.assignedTo).charAt(0)}
                                                </span>
                                                {getAssigneeName(leadInView.assignedTo)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Status</span>
                                            <span className="font-semibold">{leadInView.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Status</h3>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Current Status</span>
                                            <span className="font-semibold">{leadInView.status}</span>
                                        </div>
                                        {leadInView.convertedToCustomerId && (
                                            <div className="mt-3 pt-3 border-t border-emerald-200">
                                                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-xs font-semibold text-emerald-700">Converted to Customer</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>

                {/* Floating Action Button (FAB) with Quick Actions Menu */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <div className="relative">
                    {/* Backdrop for Quick Actions Menu */}
                    {isQuickActionsOpen && (
                        <div
                            className="fixed inset-0 bg-transparent z-40"
                            onClick={() => setIsQuickActionsOpen(false)}
                        />
                    )}

                    {/* Quick Actions Menu */}
                    {isQuickActionsOpen && (
                        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 overflow-hidden z-50" style={{
                            animation: 'slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 15px rgba(0, 0, 0, 0.1)'
                        }}>
                            {/* Menu Header */}
                            <div className="px-3 py-2 border-b border-slate-100/80 bg-gradient-to-r from-emerald-50/50 to-blue-50/50">
                                <h4 className="text-xs font-bold text-slate-700">Quick Actions</h4>
                                <p className="text-[10px] text-slate-500 mt-0.5">Choose an action for this lead</p>
                            </div>

                            <div className="p-2 space-y-1.5">
                                {/* Convert to Customer - ORANGE */}
                                {hasPermission(Permission.CONVERT_LEADS_TO_CUSTOMERS) &&
                                 leadInView.status !== 'Won' &&
                                 !leadInView.convertedToCustomerId && (
                                    <button
                                        onClick={() => {
                                            setIsQuickActionsOpen(false);
                                            handleOpenConvertModal();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100/50 transition-all duration-200 group border border-transparent hover:border-orange-200/50 hover:shadow-md"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
                                            <CheckCircleIcon className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-orange-600 group-hover:text-orange-700 transition-colors">Convert to Customer</div>
                                            <div className="text-[10px] text-orange-500/80 mt-0.5">Create customer record</div>
                                        </div>
                                        <div className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</div>
                                    </button>
                                )}

                                {/* Request for Quotation */}
                                {hasPermission(Permission.CREATE_QUOTATION_REQUESTS) &&
                                 leadInView.status !== 'Won' &&
                                 leadInView.status !== 'Lost' &&
                                 leadInView.convertedToCustomerId && (
                                    <button
                                        onClick={() => {
                                            setIsQuickActionsOpen(false);
                                            handleOpenQuotationRequestModal();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100/50 transition-all duration-200 group border border-transparent hover:border-emerald-200/50 hover:shadow-md"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
                                            <PlusIcon className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-emerald-700 group-hover:text-emerald-800 transition-colors">Request Quotation</div>
                                            <div className="text-[10px] text-emerald-600/80 mt-0.5">Create quote request</div>
                                        </div>
                                        <div className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</div>
                                    </button>
                                )}

                                {/* Log Follow-up */}
                                {hasPermission(Permission.EDIT_LEADS) && (
                                    <button
                                        onClick={() => {
                                            setIsQuickActionsOpen(false);
                                            setIsLogFollowupModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 transition-all duration-200 group border border-transparent hover:border-blue-200/50 hover:shadow-md"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
                                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-blue-700 group-hover:text-blue-800 transition-colors">Log Follow-up</div>
                                            <div className="text-[10px] text-blue-600/80 mt-0.5">Add activity note</div>
                                        </div>
                                        <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</div>
                                    </button>
                                )}

                                {/* Add Task to Calendar */}
                                {hasPermission(Permission.MANAGE_CRM_CALENDAR) && (
                                    <button
                                        onClick={() => {
                                            setIsQuickActionsOpen(false);
                                            setIsAddTaskModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100/50 transition-all duration-200 group border border-transparent hover:border-purple-200/50 hover:shadow-md"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
                                            <CalendarIcon className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm text-purple-700 group-hover:text-purple-800 transition-colors">Add Task to Calendar</div>
                                            <div className="text-[10px] text-purple-600/80 mt-0.5">Schedule a task</div>
                                        </div>
                                        <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FAB Button - Modern Design */}
                    <button
                        onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                        className={`group relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 will-change-transform ${
                            isQuickActionsOpen
                                ? 'bg-gradient-to-br from-slate-600 to-slate-700 rotate-45 shadow-xl'
                                : 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-2xl hover:shadow-emerald-500/50'
                        }`}
                        style={{
                            boxShadow: isQuickActionsOpen
                                ? '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
                                : '0 25px 50px -12px rgba(16, 185, 129, 0.5), 0 10px 20px -5px rgba(16, 185, 129, 0.3)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'translateZ(0)',
                            WebkitTransform: 'translateZ(0)'
                        }}
                        aria-label="Quick Actions"
                    >
                        {/* Icon */}
                        <PlusIcon className="w-7 h-7 text-white relative z-10 transition-transform duration-300" />

                        {/* Subtle glow effect on hover - no animation */}
                        <div className={`absolute -inset-1 rounded-full transition-all duration-500 ${
                            isQuickActionsOpen
                                ? 'opacity-0 scale-100'
                                : 'opacity-0 group-hover:opacity-30 scale-110'
                        }`} style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
                            filter: 'blur(8px)'
                        }}></div>
                    </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Log Follow-up Modal */}
      <Modal
        isOpen={isLogFollowupModalOpen}
        onClose={() => setIsLogFollowupModalOpen(false)}
        title="Log Follow-up"
        maxWidth="md"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          if (selectedLead && activityForm.note.trim() && hasPermission(Permission.EDIT_LEADS)) {
            const typeLabel =
              activityForm.type === 'call'
                ? 'Call'
                : activityForm.type === 'email'
                ? 'Email'
                : activityForm.type === 'meeting'
                ? 'Meeting'
                : 'Activity';
            addLeadTimelineEvent(selectedLead.id, {
              text: `${typeLabel}: ${activityForm.note.trim()}`,
              type: activityForm.type,
              user: currentUser?.name || 'System',
              date: activityForm.dateTime ? new Date(activityForm.dateTime).toISOString() : undefined,
            });
            setActivityForm((prev) => ({
              ...prev,
              note: '',
            }));
            setIsLogFollowupModalOpen(false);
          }
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Type</label>
              <select
                value={activityForm.type}
                onChange={(e) =>
                  setActivityForm((prev) => ({ ...prev, type: e.target.value as any }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="activity">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">When</label>
              <input
                type="datetime-local"
                value={activityForm.dateTime}
                onChange={(e) =>
                  setActivityForm((prev) => ({ ...prev, dateTime: e.target.value }))
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Notes</label>
            <textarea
              required
              value={activityForm.note}
              onChange={(e) =>
                setActivityForm((prev) => ({ ...prev, note: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              placeholder="What happened? e.g. Email sent with proposal"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsLogFollowupModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!activityForm.note.trim()}>
              Log Activity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task to Calendar Modal */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Add Task to Calendar"
        maxWidth="md"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!selectedLead || !scheduleForm.title.trim() || !hasPermission(Permission.MANAGE_CRM_CALENDAR) || isSavingTask) {
            return;
          }

          setIsSavingTask(true);
          try {
            const isoDate = new Date(scheduleForm.dateTime).toISOString();
            const taskDescription = scheduleForm.description.trim()
              ? `${scheduleForm.description.trim()}\n\nLead: ${selectedLead.title} • ${selectedLead.customerName}`
              : `Lead: ${selectedLead.title} • ${selectedLead.customerName}`;

            // Create task first to get the ID
            const taskId = `lead-task-${Date.now()}`;
            const taskData = {
              id: taskId,
              title: scheduleForm.title.trim(),
              description: scheduleForm.description.trim() || undefined,
              assignedTo: currentUser?.id || currentUser?.email || 'System',
              status: 'To Do' as const,
              priority: 'Medium' as const,
              dueDate: isoDate.split('T')[0],
              createdFrom: 'lead_calendar' as const,
              leadId: selectedLead.id,
              leadTitle: selectedLead.title,
              leadCustomerName: selectedLead.customerName,
            };

            await addTask(taskData);

            // Then create calendar entry linked to the task
            await addCalendarEntry({
              title: scheduleForm.title.trim(),
              date: isoDate,
              type: 'task',
              leadId: selectedLead.id,
              description: taskDescription,
              owner: currentUser?.name || 'System',
              ownerId: currentUser?.id,
              calendarId: 'default',
              linkedTaskId: taskId, // Link the calendar entry to the task
            });

            await addLeadTimelineEvent(selectedLead.id, {
              text: `Task scheduled: ${scheduleForm.title.trim()}`,
              type: 'task',
              user: currentUser?.name || 'System',
              date: isoDate,
            });

            setScheduleForm({
              title: '',
              description: '',
              dateTime: new Date().toISOString().slice(0, 16),
            });

            setIsAddTaskModalOpen(false);
            alert('Task saved successfully!');
          } catch (error) {
            console.error('Error in task creation:', error);
            alert('Failed to save task. Please try again.');
          } finally {
            setIsSavingTask(false);
          }
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Task Title</label>
            <input
              required
              type="text"
              value={scheduleForm.title}
              onChange={(e) =>
                setScheduleForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. Follow up with client"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Due Date & Time</label>
            <input
              required
              type="datetime-local"
              value={scheduleForm.dateTime}
              onChange={(e) =>
                setScheduleForm((prev) => ({ ...prev, dateTime: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description (Optional)</label>
            <textarea
              value={scheduleForm.description}
              onChange={(e) =>
                setScheduleForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              placeholder="Add task details..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!scheduleForm.title.trim() || isSavingTask}
            >
              {isSavingTask ? 'Adding...' : 'Add task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quotation Request Modal */}
      <Modal
        isOpen={isQuotationRequestModalOpen}
        onClose={() => setIsQuotationRequestModalOpen(false)}
        title="Request for Quotation"
      >
        <form onSubmit={handleQuotationRequestSubmit} className="space-y-5">
          {selectedLead && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Lead Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Lead:</span>
                  <p className="font-medium text-slate-900">{selectedLead.title}</p>
                </div>
                <div>
                  <span className="text-slate-500">Customer:</span>
                  <p className="font-medium text-slate-900">{selectedLead.customerName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Estimated Value:</span>
                  <p className="font-medium text-slate-900">AED {selectedLead.value.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">Assigned To:</span>
                  <p className="font-medium text-slate-900">
                    {salesCoordinationHeads.length > 0
                      ? salesCoordinationHeads[0].name
                      : <span className="text-red-500">No Sales Coordination Head found</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Priority</label>
            <select
              value={quotationRequestFormData.priority}
              onChange={(e) => setQuotationRequestFormData({
                ...quotationRequestFormData,
                priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent'
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Requirements <span className="text-red-500">*</span></label>
            <textarea
              required
              value={quotationRequestFormData.requirements}
              onChange={(e) => setQuotationRequestFormData({
                ...quotationRequestFormData,
                requirements: e.target.value
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Describe the quotation requirements... (Required)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Additional Notes</label>
            <textarea
              value={quotationRequestFormData.notes}
              onChange={(e) => setQuotationRequestFormData({
                ...quotationRequestFormData,
                notes: e.target.value
              })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Any additional notes for the coordination team..."
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsQuotationRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={salesCoordinationHeads.length === 0}
              className={salesCoordinationHeads.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SalesLeads;
