
import React, { useMemo } from 'react';
import Card from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { LeadStatus } from '../../types';
import { BoltIcon, CheckCircleIcon, ClockIcon, FolderIcon } from '../icons/Icons';

const SalesDashboard: React.FC = () => {
  const { currentUser, getRoleForUser } = useAuth();
  const { leads, projects, tasks } = useCRM();

  const userRole = currentUser ? getRoleForUser(currentUser) : null;
  // Treat Admin as Manager for dashboard views
  const isManager = userRole?.id === 'sales_manager' || userRole?.id === 'admin';
  const isExecutive = userRole?.id === 'sales_executive';

  const dashboardData = useMemo(() => {
    // 1. Filter Data based on Role
    let filteredLeads = leads;
    let filteredTasks = tasks;
    let filteredProjects = projects;

    if (isExecutive && currentUser) {
        // Executives see only their own leads
        filteredLeads = leads.filter(l => l.createdById === currentUser.id);
        
        // Executives see tasks assigned to them (by name or email for now, based on mock data structure)
        filteredTasks = tasks.filter(t => 
            t.assignedTo === currentUser.name || t.assignedTo === currentUser.email
        );
        
        // Executives might strictly see projects they sold? 
        // For now, we'll keep projects as a team overview for managers, 
        // or maybe filtering by customer relationship could be added later.
        // We will show "My Won Deals" as a proxy for project success for execs.
    }

    // 2. Calculate Metrics
    
    // Metric: New Leads (This Month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newLeadsCount = filteredLeads.filter(l => {
        const d = new Date(l.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const previousMonthLeads = filteredLeads.filter(l => {
        const d = new Date(l.createdAt);
        return d.getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && 
               d.getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear);
    }).length;

    // Metric: Revenue (Won Leads)
    const wonLeads = filteredLeads.filter(l => l.status === 'Won');
    const totalRevenue = wonLeads.reduce((sum, l) => sum + l.value, 0);

    // Metric: Active Tasks / Due Today
    const today = new Date().toISOString().split('T')[0];
    const tasksDueToday = filteredTasks.filter(t => t.dueDate === today && t.status !== 'Done').length;
    const highPriorityTasks = filteredTasks.filter(t => t.priority === 'High' && t.status !== 'Done').length;

    // Metric: Active Projects (Manager View) or Win Rate (Exec View)
    const activeProjectsCount = filteredProjects.filter(p => p.status === 'In Progress').length;
    const winRate = filteredLeads.length > 0 
        ? Math.round((wonLeads.length / filteredLeads.length) * 100) 
        : 0;

    // 3. Recent Activity Stream
    // Combine timeline events from visible leads
    const activities = filteredLeads.flatMap(lead => 
        (lead.timeline || []).map(event => ({
            ...event,
            leadTitle: lead.title,
            leadId: lead.id
        }))
    );
    
    // Sort by date descending
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Take top 5
    const recentActivity = activities.slice(0, 5);

    return {
        newLeadsCount,
        previousMonthLeads,
        totalRevenue,
        tasksDueToday,
        highPriorityTasks,
        activeProjectsCount,
        winRate,
        recentActivity
    };

  }, [leads, projects, tasks, isExecutive, currentUser]);

  const getGrowthPercentage = () => {
      if (dashboardData.previousMonthLeads === 0) return dashboardData.newLeadsCount > 0 ? 100 : 0;
      return Math.round(((dashboardData.newLeadsCount - dashboardData.previousMonthLeads) / dashboardData.previousMonthLeads) * 100);
  };
  
  const growth = getGrowthPercentage();

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {isManager ? 'Team Overview' : 'My Performance'}
                </h1>
                <p className="text-slate-500 mt-1">
                    {isManager 
                        ? "Here's what's happening across the department today." 
                        : "Welcome back, here is your pipeline summary."}
                </p>
            </div>
            <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Leads & Growth */}
            <Card className="!bg-emerald-600 !text-white !border-emerald-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110 duration-500"></div>
                <h3 className="font-medium text-emerald-50 text-sm uppercase tracking-wider relative z-10">
                    {isManager ? 'Total New Leads (Mo)' : 'My New Leads (Mo)'}
                </h3>
                <p className="text-4xl font-bold mt-3 relative z-10">{dashboardData.newLeadsCount}</p>
                <div className="mt-4 text-xs text-emerald-100 bg-white/10 inline-block px-2 py-1 rounded relative z-10">
                    {growth > 0 ? '+' : ''}{growth}% from last month
                </div>
            </Card>

            {/* Card 2: Revenue or Active Projects */}
            <Card className="group hover:border-emerald-200">
                <h3 className="font-medium text-slate-500 text-sm uppercase tracking-wider">
                    {isManager ? 'Total Active Projects' : 'Revenue Generated'}
                </h3>
                <p className="text-4xl font-bold mt-3 text-slate-800 group-hover:text-emerald-600 transition-colors">
                    {isManager 
                        ? dashboardData.activeProjectsCount 
                        : `AED ${dashboardData.totalRevenue.toLocaleString()}`
                    }
                </p>
                <div className="mt-4 text-xs text-slate-400">
                    {isManager 
                        ? 'In Progress' 
                        : `${dashboardData.winRate}% Win Rate`
                    }
                </div>
            </Card>

            {/* Card 3: Tasks */}
            <Card className="group hover:border-orange-200">
                <h3 className="font-medium text-slate-500 text-sm uppercase tracking-wider">
                    {isManager ? 'Team Tasks Due Today' : 'My Tasks Due Today'}
                </h3>
                <p className="text-4xl font-bold mt-3 text-slate-800 group-hover:text-orange-500 transition-colors">
                    {dashboardData.tasksDueToday}
                </p>
                 <div className="mt-4 text-xs text-slate-400">
                    {dashboardData.highPriorityTasks} High Priority Pending
                </div>
            </Card>
        </div>

        <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                {isManager ? 'Recent Team Activity' : 'My Recent Activity'}
            </h2>
            <Card className="!p-0 overflow-hidden border border-slate-200">
                {dashboardData.recentActivity.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {dashboardData.recentActivity.map((activity) => (
                            <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    activity.type === 'created' ? 'bg-blue-100 text-blue-600' :
                                    activity.type === 'status_change' ? 'bg-purple-100 text-purple-600' :
                                    activity.type === 'conversion' ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {activity.type === 'created' && <FolderIcon className="w-4 h-4" />}
                                    {activity.type === 'status_change' && <BoltIcon className="w-4 h-4" />}
                                    {activity.type === 'conversion' && <CheckCircleIcon className="w-4 h-4" />}
                                    {activity.type === 'task' && <ClockIcon className="w-4 h-4" />}
                                    {activity.type === 'note' && <FolderIcon className="w-4 h-4" />}
                                    {activity.type === 'estimation' && <BoltIcon className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{activity.text}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        <span className="font-semibold text-emerald-600">{activity.leadTitle}</span> • {new Date(activity.date).toLocaleString()} • by {activity.user}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        No recent activity to display.
                    </div>
                )}
            </Card>
        </div>
    </div>
  );
};

export default SalesDashboard;
