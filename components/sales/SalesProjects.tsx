
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Project, ProjectStatus } from '../../types';
import { FilterIcon, PlusIcon, EditIcon, TrashIcon, MoreVerticalIcon, FolderIcon } from '../icons/Icons';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';

const SalesProjects: React.FC = () => {
    const { hasPermission } = useAuth(); // Use if specific permissions for projects are added later
    const { projects, customers, addProject, updateProject, deleteProject } = useCRM();
    
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        customerId: '',
        status: 'Not Started' as ProjectStatus,
        startDate: '',
        dueDate: '',
        value: '',
        description: '',
        progress: '0'
    });

    const filteredProjects = useMemo(() => {
        return projects.filter(proj => statusFilter === 'All' || proj.status === statusFilter);
    }, [projects, statusFilter]);

    const handleOpenModal = () => {
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
        setIsModalOpen(true);
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
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setProjectToDeleteId(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const handleConfirmDelete = () => {
        if (projectToDeleteId) {
            deleteProject(projectToDeleteId);
            setIsDeleteModalOpen(false);
            setProjectToDeleteId(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const selectedCustomer = customers.find(c => c.id === formData.customerId);
        const customerName = selectedCustomer ? selectedCustomer.name : 'Unknown Customer';

        if (editingProject) {
            updateProject(editingProject.id, {
                title: formData.title,
                customerId: formData.customerId,
                customerName: customerName,
                status: formData.status,
                startDate: formData.startDate,
                dueDate: formData.dueDate,
                value: parseFloat(formData.value) || 0,
                description: formData.description,
                progress: parseInt(formData.progress)
            });
        } else {
            const newProject: Project = {
                id: Date.now().toString(),
                title: formData.title,
                customerId: formData.customerId,
                customerName: customerName,
                status: formData.status,
                startDate: formData.startDate,
                dueDate: formData.dueDate,
                value: parseFloat(formData.value) || 0,
                description: formData.description,
                progress: parseInt(formData.progress)
            };
            addProject(newProject);
        }
        setIsModalOpen(false);
    };

    const getStatusStyle = (status: ProjectStatus) => {
        switch (status) {
            case 'Not Started': return 'bg-slate-100 text-slate-600';
            case 'In Progress': return 'bg-blue-50 text-blue-700';
            case 'On Hold': return 'bg-orange-50 text-orange-700';
            case 'Completed': return 'bg-emerald-50 text-emerald-700';
            case 'Cancelled': return 'bg-red-50 text-red-700';
            default: return 'bg-slate-50 text-slate-600';
        }
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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage active jobs and delivery timelines.</p>
                </div>
                <Button onClick={handleOpenModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    New Project
                </Button>
            </div>

             {/* Filter Bar */}
            <Card className="!p-4">
                <div className="flex items-center gap-4">
                     <div className="relative w-full sm:w-64">
                        <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'All')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Project Name</th>
                                <th className="px-6 py-4 font-semibold">Customer</th>
                                <th className="px-6 py-4 font-semibold">Timeline</th>
                                <th className="px-6 py-4 font-semibold">Progress</th>
                                <th className="px-6 py-4 font-semibold">Value</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProjects.map(project => (
                                <tr key={project.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{project.title}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{project.description}</div>
                                    </td>
                                    <td className="px-6 py-4">{project.customerName}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs">
                                            <span className="text-slate-400">Start:</span> {new Date(project.startDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs">
                                            <span className="text-slate-400">Due:</span> {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-slate-100 rounded-full h-1.5">
                                                <div 
                                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                                                    style={{ width: `${project.progress}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-slate-500">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium">AED {project.value.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusStyle(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <Button 
                                            variant="ghost" 
                                            className="!p-2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setActiveMenuId(activeMenuId === project.id ? null : project.id)}
                                        >
                                            <MoreVerticalIcon className="w-4 h-4"/>
                                        </Button>

                                         {/* Dropdown Menu */}
                                        {activeMenuId === project.id && (
                                            <div className="absolute right-8 top-8 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                                                <button
                                                    onClick={() => handleOpenEditModal(project)}
                                                    className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                                >
                                                    <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(project.id)}
                                                    className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4 mr-2 opacity-80" /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredProjects.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No projects found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProject ? "Edit Project" : "New Project"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Project Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="e.g. HQ Renovation"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Customer</label>
                        <select
                            required
                            value={formData.customerId}
                            onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="" disabled>Select Customer</option>
                            {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>{customer.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Start Date</label>
                             <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Due Date</label>
                             <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                             />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Value (AED)</label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={formData.value}
                                onChange={(e) => setFormData({...formData, value: e.target.value})}
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
                                onChange={(e) => setFormData({...formData, progress: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as ProjectStatus})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>

                     <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
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
