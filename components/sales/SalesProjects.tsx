import React, { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Project, ProjectStatus, Permission } from '../../types';
import { FilterIcon, CalendarIcon, EditIcon, TrashIcon, PlusIcon, MoreVerticalIcon } from '../icons/Icons';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';

const PROJECT_STATUSES: ProjectStatus[] = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

const SalesProjects: React.FC = () => {
  const { currentUser, getRoleForUser, users, hasPermission } = useAuth();
  const { projects, customers, addProject, updateProject, deleteProject } = useCRM();

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState<string>('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  // Modal state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    customerId: '',
    status: 'Not Started' as ProjectStatus,
    startDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    value: '',
    description: '',
    progress: '0'
  });

  const hasGlobalVisibility = useMemo(() => {
    const userRole = currentUser ? getRoleForUser(currentUser) : null;
    return (
      userRole?.id === 'admin' ||
      userRole?.id === 'sales_manager' ||
      userRole?.id === 'assistant_sales_manager'
    );
  }, [currentUser, getRoleForUser]);

  const canManageProjects = hasPermission(Permission.MANAGE_PROJECTS);
  const canViewOwner = hasPermission(Permission.VIEW_ASSIGNED_TO);

  const getOwnerName = (project: Project) => {
    if (project.createdByName) return project.createdByName;
    if (project.createdById) {
      const owner = users.find(u => u.id === project.createdById);
      if (owner) return owner.name;
    }
    return 'Unassigned';
  };

  const ownerOptions = useMemo(() => users.filter(u => u.isActive), [users]);

  const filteredProjects = useMemo(() => {
    if (!currentUser) return [];

    return projects
      .filter(project => {
        // Visibility rules: global roles see all, others see only projects they created/own.
        if (!hasGlobalVisibility) {
          if (project.createdById && project.createdById !== currentUser.id) {
            return false;
          }
        }

        if (hasGlobalVisibility && userFilter !== 'All') {
          if (project.createdById !== userFilter) return false;
        }

        const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
        const projectDate = project.createdAt || project.startDate;
        const matchesDate = !dateFilter || (projectDate && new Date(projectDate) >= new Date(dateFilter));
        return matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startDate).getTime();
        const dateB = new Date(b.createdAt || b.startDate).getTime();
        return dateB - dateA;
      });
  }, [projects, statusFilter, dateFilter, userFilter, currentUser, hasGlobalVisibility]);

  const getStatusStyles = (status: ProjectStatus) => {
    switch (status) {
      case 'Not Started': return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' };
      case 'In Progress': return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' };
      case 'On Hold': return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' };
      case 'Completed': return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-200' };
      case 'Cancelled': return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-500', border: 'border-slate-200' };
    }
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setFormData({
      title: '',
      customerId: '',
      status: 'Not Started',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      value: '',
      description: '',
      progress: '0'
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      customerId: project.customerId,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate,
      value: project.value.toString(),
      description: project.description || '',
      progress: project.progress.toString()
    });
    setIsProjectModalOpen(true);
    setActiveMenuId(null);
  };

  const handleRowClick = (project: Project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
    setActiveMenuId(null);
  };

  const handleStatusChange = (project: Project, status: ProjectStatus) => {
    if (!canManageProjects) return;
    setActiveStatusDropdownId(null);
    updateProject(project.id, { status, progress: status === 'Completed' ? 100 : project.progress });
  };

  const handleDeleteClick = (id: string) => {
    setProjectToDeleteId(id);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDeleteId) return;
    await deleteProject(projectToDeleteId);
    setIsDeleteModalOpen(false);
    setProjectToDeleteId(null);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? selectedCustomer.name : 'Unknown Customer';
    const createdById = editingProject?.createdById || currentUser?.id;
    const createdByName = editingProject?.createdByName || currentUser?.name;
    const createdAt = editingProject?.createdAt || new Date().toISOString();

    const payload = {
      title: formData.title.trim(),
      customerId: formData.customerId,
      customerName,
      status: formData.status,
      startDate: formData.startDate,
      dueDate: formData.dueDate,
      value: parseFloat(formData.value) || 0,
      description: formData.description.trim(),
      progress: parseInt(formData.progress) || 0,
      createdById,
      createdByName,
      createdAt,
    };

    if (editingProject) {
      await updateProject(editingProject.id, payload);
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        ...payload,
      };
      await addProject(newProject);
    }

    setIsProjectModalOpen(false);
  };

  const projectInView = projects.find(p => p.id === selectedProject?.id) || selectedProject;

  return (
    <div className="space-y-6">
      {/* Click outside handler for menus */}
      {activeMenuId && (
        <div
          className="fixed inset-0 z-10 bg-transparent"
          onClick={() => setActiveMenuId(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">Manage active projects with the same flow as Sales Leads.</p>
        </div>
        {canManageProjects && (
          <Button onClick={handleOpenAddModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
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
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'All')}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <option value="All">All Statuses</option>
              {PROJECT_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
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
                <option value="All">All Owners</option>
                {ownerOptions.map(user => (
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

      {/* Projects Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-semibold">Project</th>
                {canViewOwner && <th className="px-6 py-4 font-semibold">Owner</th>}
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Value</th>
                <th className="px-6 py-4 font-semibold">Start / Created</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const statusStyle = getStatusStyles(project.status);
                const ownerName = getOwnerName(project);
                const dateForDisplay = project.createdAt || project.startDate;
                return (
                  <tr
                    key={project.id}
                    className="bg-white hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(project)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{project.title}</td>
                    {canViewOwner && (
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-2">
                            {ownerName.charAt(0)}
                          </div>
                          <span className="text-xs">{ownerName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">{project.customerName}</td>
                    <td className="px-6 py-4 font-medium">AED {project.value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500">{dateForDisplay ? new Date(dateForDisplay).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          disabled={!canManageProjects}
                          onClick={() => canManageProjects && setActiveStatusDropdownId(activeStatusDropdownId === project.id ? null : project.id)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} ${canManageProjects ? 'hover:opacity-80' : 'cursor-default'} transition-opacity`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${statusStyle.dot}`}></span>
                          {project.status}
                        </button>

                        {activeStatusDropdownId === project.id && canManageProjects && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdownId(null)}></div>
                            <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                              {PROJECT_STATUSES.map((s) => {
                                const style = getStatusStyles(s as ProjectStatus);
                                return (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(project, s as ProjectStatus)}
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
                        onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
                      >
                        <MoreVerticalIcon className="w-4 h-4" />
                      </Button>

                      {activeMenuId === project.id && (
                        <div className="absolute right-8 top-8 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                          {canManageProjects && (
                            <button
                              onClick={() => handleOpenEditModal(project)}
                              className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                            >
                              <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                            </button>
                          )}
                          {canManageProjects && (
                            <button
                              onClick={() => handleDeleteClick(project.id)}
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
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={canViewOwner ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title={editingProject ? 'Edit Project' : 'New Project'}
      >
        <form onSubmit={handleProjectSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Project Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="e.g. HQ Renovation"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Customer</label>
            <select
              required
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="" disabled>Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Value (AED)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Progress (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                required
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                {PROJECT_STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Owner</label>
              <input
                type="text"
                readOnly
                value={editingProject ? getOwnerName(editingProject) : (currentUser?.name || 'Unassigned')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              placeholder="Add project notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
          </div>
        </form>
      </Modal>

      {/* Project Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedProject(null);
        }}
        title={projectInView ? projectInView.title : 'Project Details'}
        maxWidth="lg"
      >
        {projectInView && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Customer</p>
                <p className="text-base font-semibold text-slate-900">{projectInView.customerName}</p>
                <p className="text-xs text-slate-500 mt-1">Owner: {getOwnerName(projectInView)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(projectInView.status).bg} ${getStatusStyles(projectInView.status).text} ${getStatusStyles(projectInView.status).border}`}>
                {projectInView.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Timeline</p>
                <p><span className="text-slate-500">Start:</span> {new Date(projectInView.startDate).toLocaleDateString()}</p>
                <p><span className="text-slate-500">Due:</span> {projectInView.dueDate ? new Date(projectInView.dueDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Value & Progress</p>
                <p className="font-semibold text-slate-900">AED {projectInView.value.toLocaleString()}</p>
                <div className="mt-2">
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${projectInView.progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{projectInView.progress}% complete</p>
                </div>
              </div>
            </div>

            {projectInView.description && (
              <div className="p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{projectInView.description}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
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
            <h3 className="text-lg font-medium text-slate-900">Delete Project?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this project? This action cannot be undone.
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
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SalesProjects;
