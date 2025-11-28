import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { QuotationRequest, QuotationRequestStatus, Permission, Task } from '../../types';
import { FilterIcon, ChevronDownIcon, CheckCircleIcon, AlertCircleIcon, ClockIcon, UsersIcon, PhoneIcon, MailIcon, MessageSquareIcon, PlusIcon } from '../icons/Icons';

const QuotationRequests: React.FC = () => {
  const { currentUser, hasPermission, users = [] } = useAuth();
  const {
    quotationRequests = [],
    updateQuotationRequest,
    leads = [],
    tasks = [],
    quotations = [],
    addTask,
    addNotification
  } = useCRM();

  const [statusFilter, setStatusFilter] = useState<QuotationRequestStatus | 'All'>('All');
  const [selectedRequest, setSelectedRequest] = useState<QuotationRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('');

  // Custom tasks state
  const [customTasks, setCustomTasks] = useState<Array<{title: string; description: string; priority: 'Low' | 'Medium' | 'High'; dueDate: string}>>([]);
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', priority: 'Medium' as 'Low' | 'Medium' | 'High', dueDate: '' });

  // Filter quotation requests based on user role and permissions
  const filteredRequests = useMemo(() => {
    return quotationRequests.filter(req => {
      // Status filter
      if (statusFilter !== 'All' && req.status !== statusFilter) return false;

      // Role-based filtering
      if (hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS)) {
        // Sales Coordination Head sees all requests
        return true;
      } else if (hasPermission(Permission.PROCESS_QUOTATION_REQUESTS)) {
        // Sales Coordinator sees only their assigned requests
        return req.assignedToCoordinatorId === currentUser?.id;
      } else if (hasPermission(Permission.CREATE_QUOTATION_REQUESTS)) {
        // Sales Person sees only their created requests
        return req.requestedById === currentUser?.id;
      }

      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [quotationRequests, statusFilter, currentUser, hasPermission]);

  // Get coordinators for assignment
  const coordinators = useMemo(() => {
    return users.filter(u => u.isActive && u.roleId === 'sales_coordinator');
  }, [users]);

  // Enhanced progress calculation across ALL modules
  const calculateProgress = (request: QuotationRequest) => {
    let progress = 0;
    let steps = [];

    // Step 1: Request Created (20%)
    progress += 20;
    steps.push({ name: 'Request Created', completed: true });

    // Step 2: Assigned to Coordinator (20%)
    if (request.assignedToCoordinatorId) {
      progress += 20;
      steps.push({ name: 'Assigned', completed: true });
    } else {
      steps.push({ name: 'Assigned', completed: false });
    }

    // Step 3: Task Created (20%)
    const relatedTask = tasks?.find(t =>
      t.quotationRequestId === request.id &&
      t.title?.includes('Quotation Request')
    );
    if (relatedTask) {
      progress += 20;
      steps.push({ name: 'Task Created', completed: true });
    } else {
      steps.push({ name: 'Task Created', completed: false });
    }

    // Step 4: Quotation Created (20%)
    const relatedLead = leads?.find(l => l.id === request.leadId);
    const relatedQuotation = quotations?.find(q =>
      q.customerId === relatedLead?.convertedToCustomerId
    );
    if (relatedQuotation) {
      progress += 20;
      steps.push({ name: 'Quotation Created', completed: true });
    } else {
      steps.push({ name: 'Quotation Created', completed: false });
    }

    // Step 5: Completed (20%)
    if (request.status === 'Completed') {
      progress = 100;
      steps.push({ name: 'Completed', completed: true });
    } else {
      steps.push({ name: 'Completed', completed: false });
    }

    return { progress: Math.min(progress, 100), steps };
  };

  // Get status color and icon
  const getStatusStyle = (status: QuotationRequestStatus) => {
    switch (status) {
      case 'Pending':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          icon: <ClockIcon className="w-4 h-4" />
        };
      case 'Assigned':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: <UsersIcon className="w-4 h-4" />
        };
      case 'In Progress':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          icon: <AlertCircleIcon className="w-4 h-4" />
        };
      case 'Completed':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: <CheckCircleIcon className="w-4 h-4" />
        };
      case 'Cancelled':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: <AlertCircleIcon className="w-4 h-4" />
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          icon: <ClockIcon className="w-4 h-4" />
        };
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // Add custom task to the list
  const handleAddCustomTask = () => {
    if (!taskFormData.title.trim()) return;

    setCustomTasks([...customTasks, { ...taskFormData }]);
    setTaskFormData({ title: '', description: '', priority: 'Medium', dueDate: '' });
  };

  // Remove custom task
  const handleRemoveCustomTask = (index: number) => {
    setCustomTasks(customTasks.filter((_, i) => i !== index));
  };

  // Handle assignment to coordinator with custom tasks
  const handleAssignToCoordinator = async () => {
    if (!selectedRequest || !selectedCoordinatorId) return;

    const coordinator = users.find(u => u.id === selectedCoordinatorId);
    if (!coordinator) return;

    try {
      // Update quotation request with coordinator assignment
      await updateQuotationRequest(selectedRequest.id, {
        assignedToCoordinatorId: coordinator.id,
        assignedToCoordinatorName: coordinator.name,
        status: 'Assigned' as QuotationRequestStatus,
        updatedAt: new Date().toISOString()
      });

      // Create main quotation request task
      const lead = leads.find(l => l.id === selectedRequest.leadId);
      const mainTaskId = `quotation-task-${Date.now()}`;
      const mainTask: Task = {
        id: mainTaskId,
        title: `Quotation Request: ${selectedRequest.leadTitle}`,
        description: `Process quotation request for ${selectedRequest.customerName}.\n\nEstimated Value: $${selectedRequest.estimatedValue.toLocaleString()}\n\nRequirements: ${selectedRequest.requirements || 'N/A'}\n\nNotes: ${selectedRequest.notes || 'N/A'}`,
        assignedTo: coordinator.id,
        status: 'To Do',
        priority: selectedRequest.priority === 'Urgent' ? 'High' : selectedRequest.priority === 'High' ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdFrom: 'quotation_request',
        leadId: selectedRequest.leadId,
        leadTitle: selectedRequest.leadTitle,
        leadCustomerName: selectedRequest.customerName,
        quotationRequestId: selectedRequest.id
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
          parentTaskId: mainTaskId, // Link to main task
          leadId: selectedRequest.leadId,
          leadTitle: selectedRequest.leadTitle,
          leadCustomerName: selectedRequest.customerName,
          quotationRequestId: selectedRequest.id
        };
        await addTask(subtask);
      }

      // Create notification for the coordinator
      await addNotification({
        type: 'task_assigned',
        title: 'New Quotation Task Assigned',
        message: `You have been assigned to process a quotation request for "${selectedRequest.leadTitle}" (${selectedRequest.customerName}) - ${selectedRequest.priority} Priority${customTasks.length > 0 ? ` with ${customTasks.length} subtask(s)` : ''}`,
        recipientId: coordinator.id,
        recipientName: coordinator.name,
        senderId: currentUser?.id,
        senderName: currentUser?.name,
        relatedId: selectedRequest.leadId,
        relatedType: 'quotation_request',
        actionUrl: 'sales_tasks',
        isRead: false,
      });

      // Update request status to In Progress
      await updateQuotationRequest(selectedRequest.id, {
        status: 'In Progress' as QuotationRequestStatus
      });

      // Reset form
      setIsAssignModalOpen(false);
      setSelectedRequest(null);
      setSelectedCoordinatorId('');
      setCustomTasks([]);
    } catch (error) {
      console.error('Error assigning quotation request:', error);
      alert('Failed to assign quotation request. Please try again.');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (requestId: string, newStatus: QuotationRequestStatus) => {
    try {
      await updateQuotationRequest(requestId, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Communication helpers
  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotation Requests</h1>
          <p className="text-slate-500 text-sm mt-1">
            {hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS)
              ? 'Manage and assign quotation requests to coordinators'
              : hasPermission(Permission.PROCESS_QUOTATION_REQUESTS)
              ? 'Process your assigned quotation requests'
              : 'Track your quotation requests'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuotationRequestStatus | 'All')}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Pending', 'Assigned', 'In Progress', 'Completed'].map(status => {
          const count = quotationRequests.filter(r => r.status === status).length;
          const style = getStatusStyle(status as QuotationRequestStatus);
          return (
            <Card key={status} className="!p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">{status}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                </div>
                <div className={`${style.bg} ${style.text} p-3 rounded-xl`}>
                  {style.icon}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quotation Request Cards - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full">
            <Card className="!p-12 text-center">
              <div className="text-slate-400 text-sm">
                <AlertCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No quotation requests found</p>
                <p className="text-xs mt-1">Quotation requests will appear here when created</p>
              </div>
            </Card>
          </div>
        ) : (
          filteredRequests.map(request => {
            const { progress, steps } = calculateProgress(request);
            const statusStyle = getStatusStyle(request.status);
            const lead = leads.find(l => l.id === request.leadId);

            return (
              <Card key={request.id} className="!p-5 hover:shadow-lg transition-shadow flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {request.leadTitle}
                    </h3>
                    <p className="text-sm text-slate-600 truncate mt-0.5">
                      {request.customerName}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                    {statusStyle.icon}
                    {request.status}
                  </span>
                </div>

                {/* Estimated Value */}
                <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-semibold uppercase">Estimated Value</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">
                    ${request.estimatedValue.toLocaleString()}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Progress</span>
                    <span className="text-xs font-bold text-emerald-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {steps.map((step, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded ${
                          step.completed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {step.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested By:</span>
                    <span className="text-slate-900 font-medium">{request.requestedByName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Assigned To:</span>
                    <span className="text-slate-900 font-medium">
                      {request.assignedToCoordinatorName || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-900">{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Communication Links */}
                {lead && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Quick Actions</p>
                    <div className="flex gap-2">
                      {lead.phone && (
                        <>
                          <button
                            onClick={() => handleWhatsApp(lead.phone!)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-lg transition-colors text-xs font-medium"
                            title="WhatsApp"
                          >
                            <MessageSquareIcon className="w-4 h-4" />
                            WhatsApp
                          </button>
                          <button
                            onClick={() => handleCall(lead.phone!)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors text-xs font-medium"
                            title="Call"
                          >
                            <PhoneIcon className="w-4 h-4" />
                            Call
                          </button>
                        </>
                      )}
                      {lead.email && (
                        <button
                          onClick={() => handleEmail(lead.email!)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors text-xs font-medium"
                          title="Email"
                        >
                          <MailIcon className="w-4 h-4" />
                          Email
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS) &&
                 request.status === 'Pending' && (
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsAssignModalOpen(true);
                      }}
                      className="w-full !py-2 !text-sm"
                    >
                      <UsersIcon className="w-4 h-4 mr-2" />
                      Assign to Coordinator
                    </Button>
                  </div>
                )}

                {hasPermission(Permission.PROCESS_QUOTATION_REQUESTS) &&
                 request.assignedToCoordinatorId === currentUser?.id &&
                 request.status === 'In Progress' && (
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <Button
                      onClick={() => handleStatusUpdate(request.id, 'Completed')}
                      className="w-full !py-2 !text-sm bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Mark as Completed
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Assignment Modal with Custom Tasks */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedRequest(null);
          setSelectedCoordinatorId('');
          setCustomTasks([]);
        }}
        title="Assign Quotation Request"
      >
        {selectedRequest && (
          <div className="space-y-4">
            {/* Request Details */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Request Details</p>
              <div className="space-y-1 text-sm">
                <p className="text-slate-600">
                  <span className="font-medium">Lead:</span> {selectedRequest.leadTitle}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Customer:</span> {selectedRequest.customerName}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Value:</span> ${selectedRequest.estimatedValue.toLocaleString()}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Priority:</span> {selectedRequest.priority}
                </p>
              </div>
            </div>

            {/* Select Coordinator */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase">
                Select Coordinator
              </label>
              <select
                value={selectedCoordinatorId}
                onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option value="">Select a coordinator...</option>
                {coordinators.map(coordinator => (
                  <option key={coordinator.id} value={coordinator.id}>
                    {coordinator.name} ({coordinator.email})
                  </option>
                ))}
              </select>
              {coordinators.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  No coordinators available. Please create users with Sales Coordinator role first.
                </p>
              )}
            </div>

            {/* Custom Tasks Section */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Additional Tasks (Optional)
                </label>
                <span className="text-xs text-slate-500">{customTasks.length} task(s) added</span>
              </div>

              {/* Custom Task Form */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Task title"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <textarea
                  placeholder="Task description (optional)"
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddCustomTask}
                  variant="ghost"
                  className="w-full !py-2 !text-xs"
                  disabled={!taskFormData.title.trim()}
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {/* Custom Tasks List */}
              {customTasks.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customTasks.map((task, index) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-600 truncate">{task.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-slate-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveCustomTask(index)}
                        className="text-slate-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedRequest(null);
                  setSelectedCoordinatorId('');
                  setCustomTasks([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignToCoordinator}
                disabled={!selectedCoordinatorId}
              >
                Assign & Create Task{customTasks.length > 0 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuotationRequests;
