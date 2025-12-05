import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { QuotationRequest, QuotationRequestStatus, Permission, Task, PREDEFINED_QUOTATION_TAGS, PredefinedQuotationTag } from '../../types';
import { FilterIcon, ChevronDownIcon, CheckCircleIcon, AlertCircleIcon, ClockIcon, UsersIcon, PhoneIcon, MailIcon, MessageSquareIcon, PlusIcon, XIcon, TagIcon, TrashIcon, MoreVerticalIcon, EditIcon } from '../icons/Icons';

const QuotationRequests: React.FC = () => {
  const { currentUser, hasPermission, users = [] } = useAuth();
  const {
    quotationRequests = [],
    updateQuotationRequest,
    deleteQuotationRequest,
    leads = [],
    tasks = [],
    quotations = [],
    addNotification,
    addTask,
    updateTask,
    deleteTask
  } = useCRM();

  const [statusFilter, setStatusFilter] = useState<QuotationRequestStatus | 'All'>('All');
  const [selectedRequest, setSelectedRequest] = useState<QuotationRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [requestToDeleteId, setRequestToDeleteId] = useState<string | null>(null);

  // Multiple coordinators selection - REMOVED (tasks are assigned individually now)

  // Task assignment modal
  const [isTaskAssignModalOpen, setIsTaskAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('');

  // Task edit modal
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskEditData, setTaskEditData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    dueDate: ''
  });

  // Task delete modal
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

  // Predefined tags
  const [selectedPredefinedTags, setSelectedPredefinedTags] = useState<string[]>([]);

  // Custom tasks state
  const [customTasks, setCustomTasks] = useState<Array<{title: string; description: string; priority: 'Low' | 'Medium' | 'High'; dueDate: string}>>([]);
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', priority: 'Medium' as 'Low' | 'Medium' | 'High', dueDate: '' });

  // Auto-create tasks from predefined tags when modal opens
  useEffect(() => {
    if (!isAssignModalOpen || !selectedRequest || !currentUser) return;

    // Only users with ASSIGN_QUOTATION_REQUESTS permission can create tasks
    if (!hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS)) {
      console.log('User does not have permission to create tasks');
      return;
    }

    // Check if this request has predefinedTags from sales personnel
    const requestedTags = selectedRequest.predefinedTags || [];
    if (requestedTags.length === 0) return;

    // Get existing tasks for this quotation request
    const existingTasks = tasks?.filter(t => t.quotationRequestId === selectedRequest.id) || [];

    // Check if there are any tags that need tasks created
    const tagsNeedingTasks = requestedTags.filter(tag =>
      !existingTasks.some(t => t.title.startsWith(tag))
    );

    if (tagsNeedingTasks.length === 0) return;

    // Create tasks for each requested tag that doesn't have a task yet
    const createTasksForRequestedTags = async () => {
      for (let i = 0; i < tagsNeedingTasks.length; i++) {
        const tag = tagsNeedingTasks[i];

        // Small delay between task creation to ensure unique timestamps
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Create the task
        const uniqueId = `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const taskId = `rfq-tag-task-${selectedRequest.id}-${tag.toLowerCase().replace(/\s+/g, '-')}-${uniqueId}`;
        const newTask: Task = {
          id: taskId,
          title: `${tag} - ${selectedRequest.leadTitle}`,
          description: `Complete ${tag} for quotation request: ${selectedRequest.customerName}\n\nEstimated Value: AED ${selectedRequest.estimatedValue.toLocaleString()}\n\nPriority: ${selectedRequest.priority}\n\nNotes: ${selectedRequest.notes || 'N/A'}\n\n⭐ This task was automatically created from sales personnel request.`,
          assignedTo: '', // Unassigned - coordination head will assign
          status: 'To Do',
          priority: selectedRequest.priority === 'Urgent' ? 'High' : selectedRequest.priority === 'High' ? 'High' : 'Medium',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          createdFrom: 'quotation_request',
          leadId: selectedRequest.leadId,
          leadTitle: selectedRequest.leadTitle,
          leadCustomerName: selectedRequest.customerName,
          quotationRequestId: selectedRequest.id
        };

        try {
          await addTask(newTask);
        } catch (error) {
          console.error(`Error creating task for tag "${tag}":`, error);
        }
      }
    };

    createTasksForRequestedTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAssignModalOpen, selectedRequest?.id, currentUser]);

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
        return req.assignedCoordinators?.some(c => c.id === currentUser?.id) ||
               req.assignedToCoordinatorId === currentUser?.id; // Backward compatibility
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

  // Enhanced progress calculation with tags and subtasks
  const calculateProgress = (request: QuotationRequest) => {
    let progress = 0;
    let steps = [];

    // Step 1: Request Created (15%)
    progress += 15;
    steps.push({ name: 'Request Created', completed: true });

    // Step 2: Assigned to Coordinator (15%)
    if (request.assignedCoordinators?.length || request.assignedToCoordinatorId) {
      progress += 15;
      steps.push({ name: 'Assigned', completed: true });
    } else {
      steps.push({ name: 'Assigned', completed: false });
    }

    // Step 3: Tasks Created (30% combined - replaces old tags + tasks steps)
    const relatedTasks = tasks?.filter(t => t.quotationRequestId === request.id) || [];
    if (relatedTasks.length > 0) {
      progress += 30;
      steps.push({ name: `${relatedTasks.length} Task(s) Created`, completed: true });

      // Step 5: Tasks in Progress (15%)
      const inProgressTasks = relatedTasks.filter(t => t.status === 'In Progress' || t.status === 'Review');
      if (inProgressTasks.length > 0) {
        progress += 15;
        steps.push({ name: `${inProgressTasks.length} Task(s) In Progress`, completed: true });
      } else {
        steps.push({ name: 'Tasks In Progress', completed: false });
      }

      // Step 6: Tasks Completed (15%)
      const completedTasks = relatedTasks.filter(t => t.status === 'Done');
      if (completedTasks.length > 0) {
        const completionPercentage = (completedTasks.length / relatedTasks.length) * 15;
        progress += completionPercentage;
        steps.push({ name: `${completedTasks.length}/${relatedTasks.length} Tasks Done`, completed: completedTasks.length === relatedTasks.length });
      } else {
        steps.push({ name: 'Tasks Completed', completed: false });
      }
    } else {
      steps.push({ name: 'Tasks Created', completed: false });
      steps.push({ name: 'Tasks In Progress', completed: false });
      steps.push({ name: 'Tasks Completed', completed: false });
    }

    // Step 7: Quotation Created (10%)
    const relatedLead = leads?.find(l => l.id === request.leadId);
    const relatedQuotation = quotations?.find(q =>
      q.customerId === relatedLead?.convertedToCustomerId
    );
    if (relatedQuotation) {
      progress += 10;
      steps.push({ name: 'Quotation Created', completed: true });
    } else {
      steps.push({ name: 'Quotation Created', completed: false });
    }

    // Step 8: Completed (automatically 100% when marked)
    if (request.status === 'Completed') {
      progress = 100;
      steps = steps.map(s => ({ ...s, completed: true }));
      steps.push({ name: 'Completed', completed: true });
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

  // Create task from predefined tag (instant task creation)
  const handleCreateTaskFromTag = async (tag: string, request: QuotationRequest) => {
    if (!currentUser) return;

    try {
      const taskId = `tag-task-${Date.now()}-${Math.random()}`;
      const newTask: Task = {
        id: taskId,
        title: `${tag} - ${request.leadTitle}`,
        description: `Complete ${tag} for quotation request: ${request.customerName}\n\nEstimated Value: AED ${request.estimatedValue.toLocaleString()}\n\nRequirements: ${request.requirements || 'N/A'}\n\nNotes: ${request.notes || 'N/A'}`,
        assignedTo: '', // Will be assigned manually by clicking the task
        status: 'To Do',
        priority: request.priority === 'Urgent' ? 'High' : request.priority === 'High' ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdFrom: 'quotation_request',
        leadId: request.leadId,
        leadTitle: request.leadTitle,
        leadCustomerName: request.customerName,
        quotationRequestId: request.id
      };

      await addTask(newTask);

      // Add predefined tag to quotation request if not already present
      if (!request.predefinedTags?.includes(tag as PredefinedQuotationTag)) {
        await updateQuotationRequest(request.id, {
          predefinedTags: [...(request.predefinedTags || []), tag] as PredefinedQuotationTag[]
        });
      }
    } catch (error) {
      console.error('Error creating task from tag:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  // Handle task assignment
  const handleAssignTask = async () => {
    if (!selectedTask || !taskAssigneeId) return;

    try {
      const assignee = users.find(u => u.id === taskAssigneeId);
      if (!assignee) return;

      await updateTask(selectedTask.id, {
        assignedTo: assignee.id
      });

      // Send notification to assignee
      await addNotification({
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned: "${selectedTask.title}"`,
        recipientId: assignee.id,
        recipientName: assignee.name,
        senderId: currentUser?.id,
        senderName: currentUser?.name,
        relatedId: selectedTask.leadId,
        relatedType: 'task',
        actionUrl: 'sales_tasks',
        isRead: false,
      });

      setIsTaskAssignModalOpen(false);
      setSelectedTask(null);
      setTaskAssigneeId('');
    } catch (error) {
      console.error('Error assigning task:', error);
      alert('Failed to assign task. Please try again.');
    }
  };

  // REMOVED: Toggle functions for coordinator and tag selection (no longer needed)

  // Add custom task to the list - creates task immediately
  const handleAddCustomTask = async () => {
    if (!taskFormData.title.trim() || !selectedRequest || !currentUser) return;

    // Only users with ASSIGN_QUOTATION_REQUESTS permission can create tasks
    if (!hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS)) {
      alert('You do not have permission to create tasks.');
      return;
    }

    try {
      // Create the task immediately in Firestore
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const taskId = `custom-task-${selectedRequest.id}-${uniqueId}`;
      const newTask: Task = {
        id: taskId,
        title: taskFormData.title.trim(),
        description: taskFormData.description.trim() || `Custom task for quotation request: ${selectedRequest.customerName}`,
        assignedTo: '', // Unassigned - will be assigned by coordination head
        status: 'To Do',
        priority: taskFormData.priority,
        dueDate: taskFormData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        createdFrom: 'quotation_request',
        leadId: selectedRequest.leadId,
        leadTitle: selectedRequest.leadTitle,
        leadCustomerName: selectedRequest.customerName,
        quotationRequestId: selectedRequest.id
      };

      await addTask(newTask);

      // Clear the form
      setTaskFormData({ title: '', description: '', priority: 'Medium', dueDate: '' });
    } catch (error) {
      console.error('Error creating custom task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  // REMOVED: handleRemoveCustomTask and handleAssignToCoordinators (no longer needed with new workflow)

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

  // Handle delete request
  const handleDeleteClick = (id: string) => {
    setRequestToDeleteId(id);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (requestToDeleteId) {
      try {
        await deleteQuotationRequest(requestToDeleteId);
        setIsDeleteModalOpen(false);
        setRequestToDeleteId(null);
      } catch (error) {
        console.error('Error deleting quotation request:', error);
        alert('Failed to delete quotation request. Please try again.');
      }
    }
  };

  // Handle edit task
  const handleEditTaskClick = (task: Task) => {
    setEditingTask(task);
    setTaskEditData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate
    });
    setIsEditTaskModalOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      await updateTask(editingTask.id, {
        title: taskEditData.title,
        description: taskEditData.description,
        priority: taskEditData.priority,
        dueDate: taskEditData.dueDate
      });

      setIsEditTaskModalOpen(false);
      setEditingTask(null);
      setTaskEditData({ title: '', description: '', priority: 'Medium', dueDate: '' });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  // Handle delete task
  const handleDeleteTaskClick = (taskId: string) => {
    setTaskToDeleteId(taskId);
    setIsDeleteTaskModalOpen(true);
  };

  const handleConfirmDeleteTask = async () => {
    if (taskToDeleteId) {
      try {
        await deleteTask(taskToDeleteId);
        setIsDeleteTaskModalOpen(false);
        setTaskToDeleteId(null);
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Backdrop for closing menu */}
      {activeMenuId && (
        <div
          className="fixed inset-0 z-10 bg-transparent"
          onClick={() => setActiveMenuId(null)}
        />
      )}

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
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                    {hasPermission(Permission.DELETE_QUOTATION_REQUESTS) && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          className="!p-1.5 text-slate-400 hover:text-slate-600"
                          onClick={() => setActiveMenuId(activeMenuId === request.id ? null : request.id)}
                        >
                          <MoreVerticalIcon className="w-4 h-4" />
                        </Button>
                        {activeMenuId === request.id && (
                          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden">
                            <button
                              onClick={() => handleDeleteClick(request.id)}
                              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                            >
                              <TrashIcon className="w-4 h-4 mr-2" />
                              Delete Request
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                    AED {request.estimatedValue.toLocaleString()}
                  </p>
                </div>

                {/* Assigned Coordinators */}
                {request.assignedCoordinators && request.assignedCoordinators.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Assigned To</p>
                    <div className="space-y-1">
                      {request.assignedCoordinators.map(coordinator => (
                        <div key={coordinator.id} className="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          <span className="font-medium text-slate-900">{coordinator.name}</span>
                          <span className="text-slate-500 ml-1">({coordinator.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700">Progress</span>
                    <span className="text-xs font-bold text-emerald-600">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {steps.slice(0, 5).map((step, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-0.5 rounded ${
                          step.completed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title={step.name}
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
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-900">{new Date(request.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Communication Links */}
                {lead && (lead.phone || lead.email) && (
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
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                      Manage Tasks
                    </Button>
                  </div>
                )}

                {hasPermission(Permission.PROCESS_QUOTATION_REQUESTS) &&
                 (request.assignedCoordinators?.some(c => c.id === currentUser?.id) || request.assignedToCoordinatorId === currentUser?.id) &&
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

      {/* Enhanced Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedRequest(null);
          setSelectedPredefinedTags([]);
          setCustomTasks([]);
        }}
        title="Manage Tasks & Assignments"
        maxWidth="lg"
      >
        {selectedRequest && (
          <div className="space-y-3">
            {/* Request Details */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase">Quotation Request Details</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <p className="text-slate-600">
                  <span className="font-medium">Lead:</span> {selectedRequest.leadTitle}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Customer:</span> {selectedRequest.customerName}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Value:</span> AED {selectedRequest.estimatedValue.toLocaleString()}
                </p>
                <p className="text-slate-600">
                  <span className="font-medium">Priority:</span> {selectedRequest.priority}
                </p>
              </div>
            </div>

            {/* Existing Tasks - Manage & Assign */}
            {(() => {
              const existingTasks = tasks?.filter(t => t.quotationRequestId === selectedRequest.id) || [];
              if (existingTasks.length > 0) {
                return (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-900 mb-2 uppercase flex items-center gap-1">
                      <TagIcon className="w-3 h-3" />
                      Existing Tasks ({existingTasks.length}) - Click to Assign
                    </p>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {existingTasks.map(task => {
                        const assignee = users.find(u => u.id === task.assignedTo);
                        const isUnassigned = !task.assignedTo;
                        return (
                          <div
                            key={task.id}
                            className={`bg-white rounded px-2 py-1.5 text-xs border transition-all ${
                              isUnassigned ? 'border-amber-300' : 'border-emerald-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setTaskAssigneeId(task.assignedTo || '');
                                  setIsTaskAssignModalOpen(true);
                                }}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="font-medium text-slate-900 flex-1">{task.title}</span>
                                  <span className={`px-1.5 py-0.5 rounded shrink-0 ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className={`${assignee ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {assignee ? `✓ Assigned to ${assignee.name}` : '⚠ Click to assign coordinator'}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditTaskClick(task);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                  title="Edit Task"
                                >
                                  <EditIcon className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTaskClick(task.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                  title="Delete Task"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Predefined Tags - Task Creation Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                Create Additional Tasks from Predefined Tags
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Tasks for requested tags are automatically created when you open this modal. Create additional tasks by clicking tags below.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_QUOTATION_TAGS.map(tag => {
                  // Check if this tag was requested by sales personnel (for reference/display only)
                  const tagWasRequested = selectedRequest?.predefinedTags?.includes(tag as PredefinedQuotationTag);
                  // Check if a task already exists for this tag
                  const existingTasks = tasks?.filter(t => t.quotationRequestId === selectedRequest.id) || [];
                  const taskAlreadyExists = existingTasks.some(t => t.title.startsWith(tag));

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleCreateTaskFromTag(tag, selectedRequest!)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        taskAlreadyExists
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300 cursor-default opacity-60'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm'
                      }`}
                      disabled={taskAlreadyExists}
                      title={taskAlreadyExists ? (tagWasRequested ? 'Task auto-created from sales request' : 'Task already created') : 'Click to create task'}
                    >
                      {taskAlreadyExists && <span className="mr-1">✓</span>}
                      {taskAlreadyExists && tagWasRequested && <span className="mr-1">⭐</span>}
                      {!taskAlreadyExists && <PlusIcon className="w-3 h-3 inline mr-1" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              {selectedRequest?.predefinedTags && selectedRequest.predefinedTags.length > 0 && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <span>✓</span>
                  <span>{selectedRequest.predefinedTags.length} task(s) auto-created from sales request: {selectedRequest.predefinedTags.join(', ')}</span>
                </p>
              )}
            </div>

            {/* Custom Tasks Section */}
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Add Custom Tasks
                </label>
                <span className="text-xs text-slate-500">Tasks will appear in "Existing Tasks" above</span>
              </div>

              {/* Custom Task Form */}
              <div className="bg-slate-50 rounded-lg p-2 space-y-1.5">
                <input
                  type="text"
                  placeholder="Task title (required)"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && taskFormData.title.trim()) {
                      e.preventDefault();
                      handleAddCustomTask();
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    placeholder="Due date (optional)"
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddCustomTask}
                  variant="ghost"
                  className="w-full !py-1.5 !text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                  disabled={!taskFormData.title.trim()}
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1" />
                  Add Task to List
                </Button>
                <p className="text-xs text-slate-500 italic">
                  ℹ️ Task will be created immediately and appear in the "Existing Tasks" section above for assignment.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedRequest(null);
                  setSelectedPredefinedTags([]);
                  setCustomTasks([]);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Task Assignment Modal */}
      <Modal
        isOpen={isTaskAssignModalOpen}
        onClose={() => {
          setIsTaskAssignModalOpen(false);
          setSelectedTask(null);
          setTaskAssigneeId('');
        }}
        title="Assign Task to Coordinator"
        maxWidth="md"
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* Task Details */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase">Task Details</p>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedTask.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{selectedTask.description}</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className={`px-2 py-1 rounded border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority} Priority
                  </span>
                  <span className="px-2 py-1 rounded border bg-slate-100 text-slate-700 border-slate-200">
                    Due: {new Date(selectedTask.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                Select Coordinator to Assign
              </label>
              <select
                value={taskAssigneeId}
                onChange={(e) => setTaskAssigneeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">-- Select Coordinator --</option>
                {coordinators.map(coordinator => (
                  <option key={coordinator.id} value={coordinator.id}>
                    {coordinator.name} ({coordinator.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsTaskAssignModalOpen(false);
                  setSelectedTask(null);
                  setTaskAssigneeId('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTask}
                disabled={!taskAssigneeId}
              >
                Assign Task
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRequestToDeleteId(null);
        }}
        title="Confirm Deletion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <TrashIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-900">Delete Quotation Request?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this quotation request? This action cannot be undone and will also delete all associated tasks.
            </p>
          </div>
          <div className="flex justify-center space-x-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setRequestToDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white shadow-red-200"
            >
              Delete Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setEditingTask(null);
          setTaskEditData({ title: '', description: '', priority: 'Medium', dueDate: '' });
        }}
        title="Edit Task"
        maxWidth="md"
      >
        {editingTask && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Task Title</label>
              <input
                type="text"
                value={taskEditData.title}
                onChange={(e) => setTaskEditData({ ...taskEditData, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="Task title"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
              <textarea
                value={taskEditData.description}
                onChange={(e) => setTaskEditData({ ...taskEditData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                rows={3}
                placeholder="Task description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Priority</label>
                <select
                  value={taskEditData.priority}
                  onChange={(e) => setTaskEditData({ ...taskEditData, priority: e.target.value as 'Low' | 'Medium' | 'High' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Due Date</label>
                <input
                  type="date"
                  value={taskEditData.dueDate}
                  onChange={(e) => setTaskEditData({ ...taskEditData, dueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditTaskModalOpen(false);
                  setEditingTask(null);
                  setTaskEditData({ title: '', description: '', priority: 'Medium', dueDate: '' });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTask}
                disabled={!taskEditData.title.trim()}
              >
                Update Task
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <Modal
        isOpen={isDeleteTaskModalOpen}
        onClose={() => {
          setIsDeleteTaskModalOpen(false);
          setTaskToDeleteId(null);
        }}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <TrashIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-900">Delete Task?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteTaskModalOpen(false);
                setTaskToDeleteId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteTask}
              className="bg-red-600 hover:bg-red-700 text-white shadow-red-200"
            >
              Delete Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuotationRequests;
