
import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Task, TaskStatus, TaskPriority, RecurrenceFrequency, Permission, TaskViewMode } from '../../types';
import { FilterIcon, PlusIcon, EditIcon, TrashIcon, MoreVerticalIcon, ClockIcon, AlertCircleIcon, RepeatIcon, CheckCircleIcon, CircleIcon, ChevronDownIcon, CalendarIcon, UsersIcon } from '../icons/Icons';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';

interface SalesTasksProps {
    setCurrentView?: (view: string) => void;
}

const SalesTasks: React.FC<SalesTasksProps> = ({ setCurrentView }) => {
    const { currentUser, users, hasPermission, getRoleForUser } = useAuth();
    const { tasks, addTask, updateTask, deleteTask } = useCRM();

    // Check if current user can view all tasks (admin/manager) or only their own
    const currentUserRole = currentUser ? getRoleForUser(currentUser) : null;
    const canViewAllTasks = currentUserRole?.id === 'admin' || currentUserRole?.id === 'sales_manager' || currentUserRole?.id === 'assistant_sales_manager' || currentUserRole?.id === 'sales_coordination_head';
    
    // View Mode State - Limited to List, Kanban, and Gantt
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'gantt'>(() => {
        const saved = localStorage.getItem('taskViewMode');
        // Only allow list, kanban, or gantt - default to list for other values
        if (saved === 'list' || saved === 'kanban' || saved === 'gantt') {
            return saved;
        }
        return 'list';
    });

    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');
    const [selectedUserId, setSelectedUserId] = useState<string>('all'); // User filter for managers
    const [showOldTasks, setShowOldTasks] = useState(false); // Default to OFF (hide old tasks)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('taskViewMode', viewMode);
    }, [viewMode]);

    // Table dropdown states
    const [activePriorityDropdownId, setActivePriorityDropdownId] = useState<string | null>(null);
    const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);

    // Dropdown states for form
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Form Data - Enhanced with all view-specific fields
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: '',
        status: 'To Do' as TaskStatus,
        priority: 'Medium' as TaskPriority,
        dueDate: '',
        recurrence: 'None' as RecurrenceFrequency,
        startDate: '',
        estimatedHours: '',
        parentTaskId: '',
        dependencies: [] as string[],
        order: 0,
        projectId: ''
    });

    // Dependency selection state
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

    // Filter assignable users (Execs, Managers, Admins)
    const assignableUsers = useMemo(() => {
        return users.filter(u => ['sales_executive', 'sales_manager', 'admin'].includes(u.roleId));
    }, [users]);

    const getAssigneeName = (idOrName: string) => {
        if (!idOrName) return 'Unassigned';
        // Check if it matches a user ID
        const user = users.find(u => u.id === idOrName);
        // If user found, return name. If not (legacy data or manual entry), return the string as is.
        return user ? user.name : idOrName;
    };

    // Check if user can view Assigned To functionality
    const canViewAssignedTo = hasPermission(Permission.VIEW_ASSIGNED_TO);

    // Helper function to check if a task is "old"
    // "Old tasks" are defined as COMPLETED tasks that were finished more than 7 days ago
    // Uncompleted tasks are ALWAYS visible, regardless of due date
    const isOldTask = (task: Task): boolean => {
        // Only consider completed tasks as potentially "old"
        if (task.status !== 'Done' || !task.completedAt) {
            return false; // Uncompleted tasks are never considered "old"
        }

        // Check if completed more than 7 days ago
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedDate = new Date(task.completedAt);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);

        return completedDate < sevenDaysAgo;
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Security: Only show tasks assigned to current user (unless admin/manager)
            const isOwnTask = task.assignedTo === currentUser?.id;
            const canViewTask = canViewAllTasks || isOwnTask;
            if (!canViewTask) return false;

            // Filter by selected user (managers only)
            if (canViewAllTasks && selectedUserId !== 'all') {
                if (task.assignedTo !== selectedUserId) return false;
            }

            // Filter by status and priority
            const matchStatus = statusFilter === 'All' || task.status === statusFilter;
            const matchPriority = priorityFilter === 'All' || task.priority === priorityFilter;
            if (!matchStatus || !matchPriority) return false;

            // Filter old tasks (if toggle is OFF, hide old tasks)
            if (!showOldTasks && isOldTask(task)) {
                return false;
            }

            return true;
        });
    }, [tasks, statusFilter, priorityFilter, selectedUserId, showOldTasks, currentUser?.id, canViewAllTasks]);

    const handleOpenModal = () => {
        setEditingTask(null);
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            title: '',
            description: '',
            assignedTo: currentUser?.id || '',
            status: 'To Do',
            priority: 'Medium',
            dueDate: today,
            recurrence: 'None',
            startDate: today,
            estimatedHours: '',
            parentTaskId: '',
            dependencies: [],
            order: tasks.length,
            projectId: ''
        });
        setSelectedDependencies([]);
        setIsModalOpen(true);
        setIsPriorityDropdownOpen(false);
        setIsStatusDropdownOpen(false);
    };

    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        setIsPriorityDropdownOpen(false);
        setIsStatusDropdownOpen(false);
        setFormData({
            title: task.title,
            description: task.description || '',
            assignedTo: task.assignedTo,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            recurrence: task.recurrence || 'None',
            startDate: task.startDate || task.dueDate,
            estimatedHours: task.estimatedHours?.toString() || '',
            parentTaskId: task.parentTaskId || '',
            dependencies: task.dependencies || [],
            order: task.order || 0,
            projectId: task.projectId || ''
        });
        setSelectedDependencies(task.dependencies || []);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setTaskToDeleteId(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const handleConfirmDelete = () => {
        if (taskToDeleteId) {
            deleteTask(taskToDeleteId);
            setIsDeleteModalOpen(false);
            setTaskToDeleteId(null);
        }
    };

    const handleToggleStatus = (task: Task) => {
        const newStatus = task.status === 'Done' ? 'To Do' : 'Done';
        const updateData: Partial<Task> = { status: newStatus };

        // Set completedAt timestamp when marking as Done
        if (newStatus === 'Done') {
            updateData.completedAt = new Date().toISOString();
        } else {
            // Clear completedAt when unmarking as Done
            updateData.completedAt = undefined;
        }

        updateTask(task.id, updateData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Determine the assignedTo value
        // If user can't view/assign to others, force assignment to self
        const finalAssignedTo = canViewAssignedTo
            ? formData.assignedTo
            : (currentUser?.id || '');

        if (editingTask) {
            // Only update assignedTo if user has permission to change it
            const updateData: Partial<Task> = {
                title: formData.title,
                description: formData.description,
                status: formData.status,
                priority: formData.priority,
                dueDate: formData.dueDate,
                recurrence: formData.recurrence,
                startDate: formData.startDate || formData.dueDate,
                estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
                parentTaskId: formData.parentTaskId || undefined,
                dependencies: selectedDependencies,
                order: formData.order,
                projectId: formData.projectId || undefined
            };

            // Set completedAt when status changes to 'Done'
            if (formData.status === 'Done' && editingTask.status !== 'Done') {
                updateData.completedAt = new Date().toISOString();
            } else if (formData.status !== 'Done' && editingTask.status === 'Done') {
                // Clear completedAt when status changes from 'Done' to something else
                updateData.completedAt = undefined;
            }

            // Only allow changing assignedTo if user has permission
            if (canViewAssignedTo || canViewAllTasks) {
                updateData.assignedTo = formData.assignedTo;
            }

            updateTask(editingTask.id, updateData);
        } else {
            const newTask: Task = {
                id: Date.now().toString(),
                title: formData.title,
                description: formData.description,
                assignedTo: finalAssignedTo,
                status: formData.status,
                priority: formData.priority,
                dueDate: formData.dueDate,
                recurrence: formData.recurrence,
                startDate: formData.startDate || formData.dueDate,
                estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
                parentTaskId: formData.parentTaskId || undefined,
                dependencies: selectedDependencies,
                order: formData.order,
                projectId: formData.projectId || undefined,
                // Set completedAt if creating a task that's already Done
                completedAt: formData.status === 'Done' ? new Date().toISOString() : undefined
            };
            addTask(newTask);
        }
        setIsModalOpen(false);
    };

    const getStatusStyle = (status: TaskStatus) => {
        switch (status) {
            case 'To Do': return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' };
            case 'In Progress': return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-100' };
            case 'Review': return { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', border: 'border-purple-100' };
            case 'Done': return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' };
        }
    };

    const getPriorityStyle = (priority: TaskPriority) => {
        switch (priority) {
            case 'High': return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-100' };
            case 'Medium': return { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', border: 'border-orange-100' };
            case 'Low': return { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-100' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' };
        }
    };

    // View Mode Icons Component - Limited to List, Kanban, and Gantt
    const viewModeConfig = [
        { mode: 'list' as const, label: 'List', icon: '☰' },
        { mode: 'kanban' as const, label: 'Kanban', icon: '▥' },
        { mode: 'gantt' as const, label: 'Gantt', icon: '📊' }
    ];

    // KANBAN VIEW - Drag and drop board
    const KanbanView = () => {
        const [draggedTask, setDraggedTask] = useState<Task | null>(null);

        const statusColumns: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done'];

        const getTasksForStatus = (status: TaskStatus) => {
            return filteredTasks
                .filter(t => t.status === status)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        };

        const handleDragStart = (task: Task) => {
            setDraggedTask(task);
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
        };

        const handleDrop = (status: TaskStatus) => {
            if (draggedTask && hasPermission(Permission.EDIT_TASKS)) {
                const updateData: Partial<Task> = { status };
                if (status === 'Done' && draggedTask.status !== 'Done') {
                    updateData.completedAt = new Date().toISOString();
                } else if (status !== 'Done' && draggedTask.status === 'Done') {
                    updateData.completedAt = undefined;
                }
                updateTask(draggedTask.id, updateData);
                setDraggedTask(null);
            }
        };

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statusColumns.map(status => {
                    const statusStyle = getStatusStyle(status);
                    const tasksInColumn = getTasksForStatus(status);
                    return (
                        <div key={status} className="flex flex-col">
                            <div className={`px-4 py-3 rounded-t-xl border ${statusStyle.border} ${statusStyle.bg} flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></span>
                                    <h3 className={`font-semibold text-sm ${statusStyle.text}`}>{status}</h3>
                                </div>
                                <span className={`text-xs font-medium ${statusStyle.text} opacity-70`}>
                                    {tasksInColumn.length}
                                </span>
                            </div>
                            <div
                                className="flex-1 bg-slate-50/50 border border-t-0 border-slate-200 rounded-b-xl p-3 min-h-[500px]"
                                onDragOver={handleDragOver}
                                onDrop={() => handleDrop(status)}
                            >
                                <div className="space-y-2">
                                    {tasksInColumn.map(task => (
                                        <div
                                            key={task.id}
                                            draggable={hasPermission(Permission.EDIT_TASKS)}
                                            onDragStart={() => handleDragStart(task)}
                                            className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-move"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-sm text-slate-900">{task.title}</h4>
                                                        {task.createdFrom === 'lead_calendar' && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700" title="Created from Lead Calendar">
                                                                <CalendarIcon className="w-3 h-3" />
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.leadId && task.leadTitle && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (setCurrentView) {
                                                                    setCurrentView('sales_leads');
                                                                }
                                                            }}
                                                            className="text-xs text-purple-600 mb-1 hover:text-purple-700 hover:underline flex items-center gap-1 group"
                                                            title="View Lead Details"
                                                        >
                                                            <span className="font-medium">{task.leadTitle}</span>
                                                            {task.leadCustomerName && <span className="text-slate-500"> • {task.leadCustomerName}</span>}
                                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                                        </button>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="!p-1 text-slate-400 hover:text-slate-600 -mt-1"
                                                    onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                                                >
                                                    <MoreVerticalIcon className="w-4 h-4"/>
                                                </Button>
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{task.description}</p>
                                            )}
                                            <div className="flex items-center justify-between text-xs">
                                                <div className={`px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority).bg} ${getPriorityStyle(task.priority).text}`}>
                                                    {task.priority}
                                                </div>
                                                <div className="text-slate-500 flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                            {canViewAssignedTo && (
                                                <div className="mt-2 flex items-center gap-1">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {getAssigneeName(task.assignedTo).charAt(0)}
                                                    </div>
                                                    <span className="text-xs text-slate-600">{getAssigneeName(task.assignedTo)}</span>
                                                </div>
                                            )}

                                            {activeMenuId === task.id && (
                                                <div className="absolute right-0 mt-1 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left">
                                                    {hasPermission(Permission.EDIT_TASKS) && (
                                                        <button onClick={() => handleOpenEditModal(task)} className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors">
                                                            <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                                        </button>
                                                    )}
                                                    {hasPermission(Permission.DELETE_TASKS) && (
                                                        <button onClick={() => handleDeleteClick(task.id)} className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors">
                                                            <TrashIcon className="w-4 h-4 mr-2 opacity-80" /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Removed: CalendarView, TimelineView, and HierarchyView components
    // Only List, Kanban, and Gantt views are available

    // GANTT CHART VIEW - Timeline with dependencies
    const GanttView = () => {
        const sortedTasks = [...filteredTasks].sort((a, b) => {
            const dateA = new Date(a.startDate || a.dueDate);
            const dateB = new Date(b.startDate || b.dueDate);
            return dateA.getTime() - dateB.getTime();
        });

        const getEarliestDate = () => {
            if (sortedTasks.length === 0) return new Date();
            const dates = sortedTasks.map(t => new Date(t.startDate || t.dueDate));
            return new Date(Math.min(...dates.map(d => d.getTime())));
        };

        const getLatestDate = () => {
            if (sortedTasks.length === 0) return new Date();
            const dates = sortedTasks.map(t => new Date(t.dueDate));
            return new Date(Math.max(...dates.map(d => d.getTime())));
        };

        const earliestDate = getEarliestDate();
        const latestDate = getLatestDate();
        const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const getTaskPosition = (task: Task) => {
            const startDate = new Date(task.startDate || task.dueDate);
            const endDate = new Date(task.dueDate);
            const startDay = Math.ceil((startDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
            const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            return {
                left: `${(startDay / totalDays) * 100}%`,
                width: `${(duration / totalDays) * 100}%`
            };
        };

        return (
            <Card className="!p-0 overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="flex border-b border-slate-200">
                        <div className="w-64 p-4 bg-slate-50 font-semibold text-sm text-slate-700 border-r border-slate-200">
                            Task
                        </div>
                        <div className="flex-1 relative">
                            <div className="flex h-full">
                                {Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
                                    const date = new Date(earliestDate);
                                    date.setDate(earliestDate.getDate() + i);
                                    return (
                                        <div key={i} className="flex-1 border-r border-slate-100 p-2 text-center">
                                            <div className="text-xs text-slate-600">{date.getDate()}</div>
                                            <div className="text-xs text-slate-400">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    {sortedTasks.map(task => {
                        const position = getTaskPosition(task);
                        return (
                            <div key={task.id} className="flex border-b border-slate-100 hover:bg-slate-50/50">
                                <div className="w-64 p-4 border-r border-slate-200">
                                    <div className="font-medium text-sm text-slate-900">{task.title}</div>
                                    {canViewAssignedTo && (
                                        <div className="text-xs text-slate-500 mt-1">{getAssigneeName(task.assignedTo)}</div>
                                    )}
                                    {task.dependencies && task.dependencies.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">Depends on {task.dependencies.length} task(s)</div>
                                    )}
                                </div>
                                <div className="flex-1 relative p-4">
                                    <div
                                        style={position}
                                        className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-lg ${getStatusStyle(task.status).bg} ${getStatusStyle(task.status).border} border flex items-center px-3 cursor-pointer hover:opacity-80`}
                                        onClick={() => handleOpenEditModal(task)}
                                    >
                                        <span className={`text-xs font-medium ${getStatusStyle(task.status).text} truncate`}>
                                            {task.title}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
             {/* Click outside handler for menus */}
            {activeMenuId && (
                <div 
                    className="fixed inset-0 z-10 bg-transparent"
                    onClick={() => setActiveMenuId(null)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage team activities and to-dos.</p>
                </div>
                {hasPermission(Permission.CREATE_TASKS) && (
                    <Button onClick={handleOpenModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Task
                    </Button>
                )}
            </div>

            {/* View Mode Selector */}
            <Card className="!p-2">
                <div className="flex flex-wrap gap-1">
                    {viewModeConfig.map(({ mode, label, icon }) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                viewMode === mode
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <span className="text-base">{icon}</span>
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </Card>

             {/* Filter Bar - Only show for list view */}
            {viewMode === 'list' && (
            <Card className="!p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                     <div className="relative flex-1">
                        <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'All')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Statuses</option>
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review">Review</option>
                            <option value="Done">Done</option>
                        </select>
                    </div>
                    <div className="relative flex-1">
                        <AlertCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'All')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Priorities</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                    {canViewAllTasks && (
                        <div className="relative flex-1">
                            <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <option value="all">All Users</option>
                                {users
                                    .filter(u => u.isActive)
                                    .sort((a, b) => a.name.localeCompare(b.name))
                                    .map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-3 sm:flex-shrink-0 px-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <span className="text-sm font-medium text-slate-600 whitespace-nowrap flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-slate-400" />
                                Show Old Tasks
                            </span>
                            {/* Toggle Switch */}
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={showOldTasks}
                                    onChange={(e) => setShowOldTasks(e.target.checked)}
                                    className="sr-only peer"
                                />
                                {/* Track */}
                                <div className={`
                                    w-11 h-6 rounded-full transition-all duration-200 ease-in-out
                                    ${showOldTasks ? 'bg-emerald-500' : 'bg-slate-300'}
                                    peer-focus:ring-4 peer-focus:ring-emerald-200
                                `}></div>
                                {/* Thumb */}
                                <div className={`
                                    absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5
                                    transition-transform duration-200 ease-in-out shadow-sm
                                    ${showOldTasks ? 'translate-x-5' : 'translate-x-0'}
                                `}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </Card>
            )}

            {/* Conditional View Rendering */}
            {viewMode === 'list' && (
            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Task Title</th>
                                {canViewAssignedTo && <th className="px-6 py-4 font-semibold">Assigned To</th>}
                                <th className="px-6 py-4 font-semibold">Due Date</th>
                                <th className="px-6 py-4 font-semibold">Priority</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTasks.map(task => (
                                <tr key={task.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleStatus(task);
                                                }}
                                                className={`mt-0.5 flex-shrink-0 transition-colors ${
                                                    task.status === 'Done' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'
                                                }`}
                                            >
                                                {task.status === 'Done' ? <CheckCircleIcon className="w-5 h-5" /> : <CircleIcon className="w-5 h-5" />}
                                            </button>
                                            <div>
                                                <div className="font-medium text-slate-900 flex items-center gap-2">
                                                    <span className={task.status === 'Done' ? 'line-through text-slate-500' : ''}>
                                                        {task.title}
                                                    </span>
                                                    {task.recurrence && task.recurrence !== 'None' && (
                                                        <div className="text-emerald-600" title={`Recurring: ${task.recurrence}`}>
                                                            <RepeatIcon className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    {task.createdFrom === 'lead_calendar' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200" title="Created from Lead Calendar">
                                                            <CalendarIcon className="w-3 h-3 mr-1" />
                                                            Lead Task
                                                        </span>
                                                    )}
                                                </div>
                                                {task.description && (
                                                    <div className={`text-xs truncate max-w-[250px] mt-1 ${task.status === 'Done' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {task.description}
                                                    </div>
                                                )}
                                                {task.leadId && task.leadTitle && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (setCurrentView) {
                                                                setCurrentView('sales_leads');
                                                            }
                                                        }}
                                                        className="text-xs mt-1 flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline group"
                                                        title="View Lead Details"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                                        </svg>
                                                        <span className="font-medium">Lead:</span>
                                                        <span>{task.leadTitle}</span>
                                                        {task.leadCustomerName && (
                                                            <>
                                                                <span className="text-slate-400">•</span>
                                                                <span>{task.leadCustomerName}</span>
                                                            </>
                                                        )}
                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">→</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    {canViewAssignedTo && (
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-2">
                                                {getAssigneeName(task.assignedTo).charAt(0)}
                                            </div>
                                            <span>{getAssigneeName(task.assignedTo)}</span>
                                        </div>
                                    </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-slate-500">
                                            <ClockIcon className="w-3 h-3 mr-2" />
                                            {new Date(task.dueDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative">
                                            <button
                                                onClick={() => hasPermission(Permission.EDIT_TASKS) && setActivePriorityDropdownId(activePriorityDropdownId === task.id ? null : task.id)}
                                                className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${hasPermission(Permission.EDIT_TASKS) ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity ${(() => {
                                                    const style = getPriorityStyle(task.priority);
                                                    return `${style.bg} ${style.text} ${style.border}`;
                                                })()}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getPriorityStyle(task.priority).dot}`}></span>
                                                {task.priority}
                                            </button>

                                            {activePriorityDropdownId === task.id && hasPermission(Permission.EDIT_TASKS) && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActivePriorityDropdownId(null)}></div>
                                                    <div className="absolute top-full left-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                                        {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => {
                                                            const style = getPriorityStyle(p);
                                                            return (
                                                                <button
                                                                    key={p}
                                                                    onClick={() => {
                                                                        updateTask(task.id, { priority: p });
                                                                        setActivePriorityDropdownId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center"
                                                                >
                                                                    <span className={`w-2 h-2 rounded-full mr-2 ${style.dot}`}></span>
                                                                    {p}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative">
                                            <button
                                                onClick={() => hasPermission(Permission.EDIT_TASKS) && setActiveStatusDropdownId(activeStatusDropdownId === task.id ? null : task.id)}
                                                className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${hasPermission(Permission.EDIT_TASKS) ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition-opacity ${(() => {
                                                    const style = getStatusStyle(task.status);
                                                    return `${style.bg} ${style.text} ${style.border}`;
                                                })()}`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${getStatusStyle(task.status).dot}`}></span>
                                                {task.status}
                                            </button>

                                            {activeStatusDropdownId === task.id && hasPermission(Permission.EDIT_TASKS) && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdownId(null)}></div>
                                                    <div className="absolute top-full left-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                                        {(['To Do', 'In Progress', 'Review', 'Done'] as TaskStatus[]).map((s) => {
                                                            const style = getStatusStyle(s);
                                                            return (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => {
                                                                        const updateData: Partial<Task> = { status: s };
                                                                        // Set completedAt when changing to 'Done'
                                                                        if (s === 'Done' && task.status !== 'Done') {
                                                                            updateData.completedAt = new Date().toISOString();
                                                                        } else if (s !== 'Done' && task.status === 'Done') {
                                                                            // Clear completedAt when changing from 'Done'
                                                                            updateData.completedAt = undefined;
                                                                        }
                                                                        updateTask(task.id, updateData);
                                                                        setActiveStatusDropdownId(null);
                                                                    }}
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
                                    <td className="px-6 py-4 text-right relative">
                                        <Button 
                                            variant="ghost" 
                                            className="!p-2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                                        >
                                            <MoreVerticalIcon className="w-4 h-4"/>
                                        </Button>

                                         {/* Dropdown Menu */}
                                        {activeMenuId === task.id && (
                                            <div className="absolute right-8 top-8 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                                                {hasPermission(Permission.EDIT_TASKS) && (
                                                    <button
                                                        onClick={() => handleOpenEditModal(task)}
                                                        className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                                    >
                                                        <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                                    </button>
                                                )}
                                                {hasPermission(Permission.DELETE_TASKS) && (
                                                    <button
                                                        onClick={() => handleDeleteClick(task.id)}
                                                        className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                                    >
                                                        <TrashIcon className="w-4 h-4 mr-2 opacity-80" /> Delete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={canViewAssignedTo ? 6 : 5} className="px-6 py-12 text-center text-slate-400">
                                        No tasks found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            )}

            {/* Kanban View */}
            {viewMode === 'kanban' && <KanbanView />}

            {/* Gantt Chart View */}
            {viewMode === 'gantt' && <GanttView />}

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTask ? "Edit Task" : "New Task"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Task Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="e.g. Prepare Monthly Report"
                        />
                    </div>

                    {canViewAssignedTo && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Assigned To</label>
                         <select
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="">Unassigned</option>
                            {assignableUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.name} ({user.roleId.replace('_', ' ')})</option>
                            ))}
                        </select>
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Due Date</label>
                             <input
                                type="date"
                                required
                                value={formData.dueDate}
                                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                             />
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Priority</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${(() => {
                                        const style = getPriorityStyle(formData.priority);
                                        return `${style.bg} ${style.text} ${style.border}`;
                                    })()}`}
                                >
                                    <span className="flex items-center">
                                        <span className={`w-2 h-2 rounded-full mr-2 ${getPriorityStyle(formData.priority).dot}`}></span>
                                        {formData.priority}
                                    </span>
                                    <ChevronDownIcon className="w-4 h-4 opacity-60" />
                                </button>

                                {isPriorityDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsPriorityDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                            {(['Low', 'Medium', 'High'] as TaskPriority[]).map((p) => {
                                                const style = getPriorityStyle(p);
                                                return (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({...formData, priority: p});
                                                            setIsPriorityDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 flex items-center"
                                                    >
                                                        <span className={`w-2 h-2 rounded-full mr-2 ${style.dot}`}></span>
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Status</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${(() => {
                                        const style = getStatusStyle(formData.status);
                                        return `${style.bg} ${style.text} ${style.border}`;
                                    })()}`}
                                >
                                    <span className="flex items-center">
                                        <span className={`w-2 h-2 rounded-full mr-2 ${getStatusStyle(formData.status).dot}`}></span>
                                        {formData.status}
                                    </span>
                                    <ChevronDownIcon className="w-4 h-4 opacity-60" />
                                </button>

                                {isStatusDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                            {(['To Do', 'In Progress', 'Review', 'Done'] as TaskStatus[]).map((s) => {
                                                const style = getStatusStyle(s);
                                                return (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({...formData, status: s});
                                                            setIsStatusDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm font-medium hover:bg-slate-50 flex items-center"
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
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Recurrence</label>
                            <select
                                value={formData.recurrence}
                                onChange={(e) => setFormData({...formData, recurrence: e.target.value as RecurrenceFrequency})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="None">None</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Additional details..."
                        />
                    </div>

                    {/* Advanced Fields Collapsible Section */}
                    <details className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <summary className="cursor-pointer font-semibold text-sm text-slate-700 uppercase">
                            Advanced Options
                        </summary>
                        <div className="mt-4 space-y-4">
                            {/* Start Date & Estimated Hours */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">For Gantt & Timeline views</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Estimated Hours</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.estimatedHours}
                                        onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        placeholder="e.g., 8"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">For Workload view</p>
                                </div>
                            </div>

                            {/* Parent Task - For Hierarchy View */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Parent Task (Optional)</label>
                                <select
                                    value={formData.parentTaskId}
                                    onChange={(e) => setFormData({...formData, parentTaskId: e.target.value})}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    <option value="">None (Top-level task)</option>
                                    {tasks
                                        .filter(t => !editingTask || t.id !== editingTask.id)
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-1">For Hierarchy view</p>
                            </div>

                            {/* Dependencies - For Gantt View */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Dependencies</label>
                                <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-32 overflow-y-auto">
                                    {tasks
                                        .filter(t => !editingTask || t.id !== editingTask.id)
                                        .map(t => (
                                            <label key={t.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 px-2 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDependencies.includes(t.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDependencies([...selectedDependencies, t.id]);
                                                        } else {
                                                            setSelectedDependencies(selectedDependencies.filter(id => id !== t.id));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                                />
                                                <span className="text-sm text-slate-700">{t.title}</span>
                                            </label>
                                        ))}
                                    {tasks.filter(t => !editingTask || t.id !== editingTask.id).length === 0 && (
                                        <p className="text-sm text-slate-400 text-center py-2">No other tasks available</p>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">For Gantt Chart view</p>
                            </div>

                            {/* Project Link */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Link to Project (Optional)</label>
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    <option value="">No project</option>
                                    {useCRM().projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </details>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingTask ? 'Save Changes' : 'Create Task'}</Button>
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
                        <h3 className="text-lg font-medium text-slate-900">Delete Task?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Are you sure you want to delete this task? This action cannot be undone.
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
                            Delete Task
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesTasks;
