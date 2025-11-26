
import React, { useMemo, useState } from 'react';
import Card from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { FolderIcon, UsersIcon, CheckIcon, TruckIcon, ChevronDownIcon } from '../icons/Icons';

const SalesReports: React.FC = () => {
    const { currentUser, users } = useAuth();
    const { leads, tasks, customers } = useCRM();

    // State for user filter (managers/admins only)
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

    // Check if user is manager or admin (can see all data)
    const isManagerOrAdmin = currentUser?.roleId === 'admin' || currentUser?.roleId === 'sales_manager';

    // Get selected user name for display
    const selectedUserName = useMemo(() => {
        if (selectedUserId === 'all') return 'All Users';
        const user = users.find(u => u.id === selectedUserId);
        return user?.name || 'Unknown User';
    }, [selectedUserId, users]);

    // Filter data based on user role and selection
    const filteredLeads = useMemo(() => {
        if (!isManagerOrAdmin) {
            // Regular users see only their own data
            return leads.filter(lead =>
                lead.createdById === currentUser?.id || lead.assignedTo === currentUser?.id
            );
        }
        // Managers/Admins can filter by selected user
        if (selectedUserId === 'all') return leads;
        return leads.filter(lead =>
            lead.createdById === selectedUserId || lead.assignedTo === selectedUserId
        );
    }, [leads, currentUser?.id, isManagerOrAdmin, selectedUserId]);

    const filteredTasks = useMemo(() => {
        if (!isManagerOrAdmin) {
            return tasks.filter(task => task.assignedTo === currentUser?.id);
        }
        if (selectedUserId === 'all') return tasks;
        return tasks.filter(task => task.assignedTo === selectedUserId);
    }, [tasks, currentUser?.id, isManagerOrAdmin, selectedUserId]);

    const filteredCustomers = useMemo(() => {
        if (!isManagerOrAdmin) {
            return customers.filter(customer => customer.createdById === currentUser?.id);
        }
        if (selectedUserId === 'all') return customers;
        return customers.filter(customer => customer.createdById === selectedUserId);
    }, [customers, currentUser?.id, isManagerOrAdmin, selectedUserId]);

    // Calculate lead metrics
    const leadMetrics = useMemo(() => {
        const total = filteredLeads.length;
        const won = filteredLeads.filter(l => l.status === 'Won').length;
        const lost = filteredLeads.filter(l => l.status === 'Lost').length;
        const active = filteredLeads.filter(l => !['Won', 'Lost'].includes(l.status)).length;
        const totalValue = filteredLeads.reduce((sum, l) => sum + l.value, 0);
        const wonValue = filteredLeads.filter(l => l.status === 'Won').reduce((sum, l) => sum + l.value, 0);
        const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0';

        return { total, won, lost, active, totalValue, wonValue, conversionRate };
    }, [filteredLeads]);

    // Calculate task metrics
    const taskMetrics = useMemo(() => {
        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'Done').length;
        const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
        const todo = filteredTasks.filter(t => t.status === 'To Do').length;
        const review = filteredTasks.filter(t => t.status === 'Review').length;
        const highPriority = filteredTasks.filter(t => t.priority === 'High').length;
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

        return { total, completed, inProgress, todo, review, highPriority, completionRate };
    }, [filteredTasks]);

    // Leads by status
    const leadsByStatus = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        filteredLeads.forEach(lead => {
            statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        });
        return statusCounts;
    }, [filteredLeads]);

    // Leads by source
    const leadsBySource = useMemo(() => {
        const sourceCounts: Record<string, number> = {};
        filteredLeads.forEach(lead => {
            sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
        });
        return sourceCounts;
    }, [filteredLeads]);

    // Tasks by priority
    const tasksByPriority = useMemo(() => {
        const priorityCounts: Record<string, number> = {};
        filteredTasks.forEach(task => {
            priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
        });
        return priorityCounts;
    }, [filteredTasks]);

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    // Get status color
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'New': 'bg-blue-500',
            'Contacted': 'bg-yellow-500',
            'Proposal': 'bg-purple-500',
            'Negotiation': 'bg-orange-500',
            'Won': 'bg-emerald-500',
            'Lost': 'bg-red-500',
        };
        return colors[status] || 'bg-slate-500';
    };

    // Get source color
    const getSourceColor = (source: string) => {
        const colors: Record<string, string> = {
            'Referral': 'bg-emerald-500',
            'LinkedIn': 'bg-blue-600',
            'Website': 'bg-purple-500',
            'Cold Call': 'bg-orange-500',
            'Email Campaign': 'bg-pink-500',
            'Exhibition': 'bg-cyan-500',
            'Other': 'bg-slate-500',
        };
        return colors[source] || 'bg-slate-500';
    };

    // Get priority color
    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            'High': 'bg-red-500',
            'Medium': 'bg-yellow-500',
            'Low': 'bg-emerald-500',
        };
        return colors[priority] || 'bg-slate-500';
    };

    return (
        <div className="space-y-6">
            {/* Click outside handler for dropdown */}
            {isUserDropdownOpen && (
                <div
                    className="fixed inset-0 z-10 bg-transparent"
                    onClick={() => setIsUserDropdownOpen(false)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CRM Reports</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {isManagerOrAdmin
                            ? `Showing metrics for: ${selectedUserName}`
                            : 'Overview of your personal performance and metrics.'}
                    </p>
                </div>

                {/* User Filter Dropdown - Only for Managers/Admins */}
                {isManagerOrAdmin && (
                    <div className="relative">
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <UsersIcon className="w-4 h-4 text-slate-400" />
                            <span>{selectedUserName}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isUserDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20">
                                <div className="p-2 border-b border-slate-100">
                                    <p className="text-xs font-semibold text-slate-500 uppercase px-2">Filter by User</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {/* All Users Option */}
                                    <button
                                        onClick={() => {
                                            setSelectedUserId('all');
                                            setIsUserDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors ${
                                            selectedUserId === 'all' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                                            All
                                        </div>
                                        <div>
                                            <p className="font-medium">All Users</p>
                                            <p className="text-xs text-slate-400">View team totals</p>
                                        </div>
                                    </button>

                                    {/* Individual Users */}
                                    {users.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                setSelectedUserId(user.id);
                                                setIsUserDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors ${
                                                selectedUserId === user.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Leads</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{leadMetrics.total}</p>
                            <p className="text-xs text-slate-400 mt-1">{leadMetrics.active} active</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <FolderIcon className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conversion Rate</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{leadMetrics.conversionRate}%</p>
                            <p className="text-xs text-slate-400 mt-1">{leadMetrics.won} won / {leadMetrics.lost} lost</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <CheckIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue Won</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(leadMetrics.wonValue)}</p>
                            <p className="text-xs text-slate-400 mt-1">Pipeline: {formatCurrency(leadMetrics.totalValue)}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                            <TruckIcon className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customers</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{filteredCustomers.length}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {filteredCustomers.filter(c => c.status === 'Active').length} active
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                            <UsersIcon className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Task Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="!p-5">
                    <h3 className="font-semibold text-slate-800 mb-4">Task Overview</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Total Tasks</span>
                            <span className="font-semibold text-slate-900">{taskMetrics.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Completed</span>
                            <span className="font-semibold text-emerald-600">{taskMetrics.completed}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">In Progress</span>
                            <span className="font-semibold text-blue-600">{taskMetrics.inProgress}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">To Do</span>
                            <span className="font-semibold text-slate-600">{taskMetrics.todo}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">In Review</span>
                            <span className="font-semibold text-purple-600">{taskMetrics.review}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-3 mt-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">Completion Rate</span>
                                <span className="font-bold text-emerald-600">{taskMetrics.completionRate}%</span>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <h3 className="font-semibold text-slate-800 mb-4">Tasks by Priority</h3>
                    <div className="space-y-3">
                        {['High', 'Medium', 'Low'].map(priority => {
                            const count = tasksByPriority[priority] || 0;
                            const percentage = taskMetrics.total > 0 ? (count / taskMetrics.total) * 100 : 0;
                            return (
                                <div key={priority}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-slate-600">{priority}</span>
                                        <span className="text-sm font-medium text-slate-900">{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${getPriorityColor(priority)}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Leads Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="!p-5">
                    <h3 className="font-semibold text-slate-800 mb-4">Leads by Status</h3>
                    <div className="space-y-3">
                        {['New', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(status => {
                            const count = leadsByStatus[status] || 0;
                            const percentage = leadMetrics.total > 0 ? (count / leadMetrics.total) * 100 : 0;
                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-slate-600">{status}</span>
                                        <span className="text-sm font-medium text-slate-900">{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${getStatusColor(status)}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card className="!p-5">
                    <h3 className="font-semibold text-slate-800 mb-4">Leads by Source</h3>
                    <div className="space-y-3">
                        {Object.entries(leadsBySource)
                            .sort((a, b) => b[1] - a[1])
                            .map(([source, count]) => {
                                const percentage = leadMetrics.total > 0 ? (count / leadMetrics.total) * 100 : 0;
                                return (
                                    <div key={source}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-slate-600">{source}</span>
                                            <span className="text-sm font-medium text-slate-900">{count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${getSourceColor(source)}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        {Object.keys(leadsBySource).length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-4">No lead data available</p>
                        )}
                    </div>
                </Card>
            </div>

            {/* User scope indicator */}
            <div className="text-center">
                <p className="text-xs text-slate-400">
                    {isManagerOrAdmin
                        ? selectedUserId === 'all'
                            ? `Showing data for all ${users.length} team members`
                            : `Showing data for ${selectedUserName}`
                        : 'Showing your personal data only'}
                </p>
            </div>
        </div>
    );
};

export default SalesReports;
