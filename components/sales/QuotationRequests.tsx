import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { QuotationRequest, QuotationRequestStatus, Permission, Task } from '../../types';
import { FilterIcon, ChevronDownIcon, CheckCircleIcon, AlertCircleIcon, ClockIcon, UsersIcon } from '../icons/Icons';

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

  // Get coordinators for assignment (users with PROCESS_QUOTATION_REQUESTS permission)
  const coordinators = useMemo(() => {
    return users.filter(u => u.isActive && u.roleId === 'sales_coordinator');
  }, [users]);

  // Calculate progress for a quotation request
  const calculateProgress = (request: QuotationRequest) => {
    let progress = 0;

    // Step 1: Request Created (20%)
    progress += 20;

    // Step 2: Assigned to Coordinator (40%)
    if (request.assignedToCoordinatorId) {
      progress += 20;
    }

    // Step 3: Task Created (60%)
    const relatedTask = tasks?.find(t =>
      t.leadId === request.leadId &&
      t.title?.includes('Quotation Request')
    );
    if (relatedTask) {
      progress += 20;
    }

    // Step 4: Quotation Created (80%)
    const relatedLead = leads?.find(l => l.id === request.leadId);
    const relatedQuotation = quotations?.find(q =>
      q.customerId === relatedLead?.convertedToCustomerId
    );
    if (relatedQuotation) {
      progress += 20;
    }

    // Step 5: Completed (100%)
    if (request.status === 'Completed') {
      progress = 100;
    }

    return Math.min(progress, 100);
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

  // Handle assignment to coordinator
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

      // Create task for the coordinator
      const lead = leads.find(l => l.id === selectedRequest.leadId);
      const newTask: Task = {
        id: `quotation-task-${Date.now()}`,
        title: `Quotation Request: ${selectedRequest.leadTitle}`,
        description: `Process quotation request for ${selectedRequest.customerName}.\n\nEstimated Value: $${selectedRequest.estimatedValue.toLocaleString()}\n\nRequirements: ${selectedRequest.requirements || 'N/A'}\n\nNotes: ${selectedRequest.notes || 'N/A'}`,
        assignedTo: coordinator.id,
        status: 'To Do',
        priority: selectedRequest.priority === 'Urgent' ? 'High' : selectedRequest.priority === 'High' ? 'High' : 'Medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        createdFrom: 'other',
        leadId: selectedRequest.leadId,
        leadTitle: selectedRequest.leadTitle,
        leadCustomerName: selectedRequest.customerName
      };

      await addTask(newTask);

      // Create notification for the coordinator
      await addNotification({
        type: 'task_assigned',
        title: 'New Quotation Task Assigned',
        message: `You have been assigned to process a quotation request for "${selectedRequest.leadTitle}" (${selectedRequest.customerName}) - ${selectedRequest.priority} Priority`,
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

      setIsAssignModalOpen(false);
      setSelectedRequest(null);
      setSelectedCoordinatorId('');
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

      {/* Quotation Request Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length === 0 ? (
          <Card className="!p-12 text-center">
            <div className="text-slate-400 text-sm">
              <AlertCircleIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No quotation requests found</p>
              <p className="text-xs mt-1">Quotation requests will appear here when created</p>
            </div>
          </Card>
        ) : (
          filteredRequests.map(request => {
            const progress = calculateProgress(request);
            const statusStyle = getStatusStyle(request.status);
            const lead = leads.find(l => l.id === request.leadId);

            return (
              <Card key={request.id} className="!p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {request.leadTitle}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {statusStyle.icon}
                          {request.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 text-sm">
                        <span className="font-medium">Customer:</span> {request.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        ${request.estimatedValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">Estimated Value</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700">Progress</span>
                      <span className="text-xs font-bold text-emerald-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>Created • {new Date(request.createdAt).toLocaleDateString()}</span>
                      <span>Updated • {new Date(request.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Requested By</p>
                      <p className="text-sm text-slate-900">{request.requestedByName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Assigned To</p>
                      <p className="text-sm text-slate-900">
                        {request.assignedToCoordinatorName || 'Not assigned yet'}
                      </p>
                    </div>
                    {request.requirements && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Requirements</p>
                        <p className="text-sm text-slate-700">{request.requirements}</p>
                      </div>
                    )}
                    {request.notes && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
                        <p className="text-sm text-slate-700">{request.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {hasPermission(Permission.ASSIGN_QUOTATION_REQUESTS) &&
                   request.status === 'Pending' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsAssignModalOpen(true);
                        }}
                        className="flex-1"
                      >
                        <UsersIcon className="w-4 h-4 mr-2" />
                        Assign to Coordinator
                      </Button>
                    </div>
                  )}

                  {hasPermission(Permission.PROCESS_QUOTATION_REQUESTS) &&
                   request.assignedToCoordinatorId === currentUser?.id &&
                   request.status === 'In Progress' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <Button
                        onClick={() => handleStatusUpdate(request.id, 'Completed')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Mark as Completed
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedRequest(null);
          setSelectedCoordinatorId('');
        }}
        title="Assign to Coordinator"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm font-semibold text-slate-700 mb-2">Request Details</p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Lead:</span> {selectedRequest.leadTitle}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Customer:</span> {selectedRequest.customerName}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Value:</span> ${selectedRequest.estimatedValue.toLocaleString()}
              </p>
            </div>

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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setSelectedRequest(null);
                  setSelectedCoordinatorId('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignToCoordinator}
                disabled={!selectedCoordinatorId}
              >
                Assign & Create Task
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuotationRequests;
