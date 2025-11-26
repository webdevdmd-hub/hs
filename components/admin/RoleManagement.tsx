
import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';
import { TrashIcon } from '../icons/Icons';

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
    {
        label: 'User Management',
        permissions: [
            Permission.VIEW_USERS,
            Permission.CREATE_USERS,
            Permission.EDIT_USERS,
            Permission.DELETE_USERS,
        ],
    },
    {
        label: 'Role Management',
        permissions: [
            Permission.VIEW_ROLES,
            Permission.MANAGE_ROLES,
        ],
    },
    {
        label: 'CRM & Sales',
        permissions: [
            Permission.VIEW_SALES_DASHBOARD,
            Permission.VIEW_LEADS,
            Permission.CREATE_LEADS,
            Permission.EDIT_LEADS,
            Permission.DELETE_LEADS,
            Permission.ASSIGN_LEADS,
            Permission.VIEW_ASSIGNED_TO,
            Permission.MANAGE_PROJECTS,
            Permission.VIEW_TASKS,
            Permission.CREATE_TASKS,
            Permission.EDIT_TASKS,
            Permission.DELETE_TASKS,
            Permission.VIEW_CRM_REPORTS,
        ],
    },
    {
        label: 'Customers',
        permissions: [
            Permission.VIEW_CUSTOMERS,
            Permission.CREATE_CUSTOMERS,
            Permission.EDIT_CUSTOMERS,
            Permission.DELETE_CUSTOMERS,
        ],
    },
    {
        label: 'Quotations',
        permissions: [
            Permission.VIEW_QUOTATIONS,
            Permission.CREATE_QUOTATIONS,
            Permission.EDIT_QUOTATIONS,
            Permission.DELETE_QUOTATIONS,
        ],
    },
    {
        label: 'Invoices',
        permissions: [
            Permission.VIEW_INVOICES,
            Permission.CREATE_INVOICES,
            Permission.EDIT_INVOICES,
            Permission.DELETE_INVOICES,
        ],
    },
    {
        label: 'Calendar Features',
        permissions: [
            Permission.VIEW_CALENDARS,
            Permission.CREATE_CALENDARS,
            Permission.SHARE_CALENDARS,
            Permission.MANAGE_PUBLIC_BOOKING,
            Permission.MANAGE_EVENT_REMINDERS,
            Permission.USE_AVAILABILITY_FINDER,
            Permission.MANAGE_CALENDAR_TASKS,
            Permission.CUSTOMIZE_SCHEDULE,
        ],
    },
    { label: 'Accounts', permissions: [Permission.VIEW_ACCOUNTS] },
    { label: 'Store', permissions: [Permission.VIEW_STORE] },
    { label: 'Procurement', permissions: [Permission.VIEW_PROCUREMENT] },
    { label: 'Logistics', permissions: [Permission.VIEW_LOGISTICS] },
    { label: 'Marketing', permissions: [Permission.VIEW_MARKETING] },
    { label: 'Compliance', permissions: [Permission.VIEW_COMPLIANCE] },
    { label: 'Fleet', permissions: [Permission.VIEW_FLEET] },
];

const RoleManagement: React.FC = () => {
    const { roles, hasPermission, updateRolePermissions, addRole, deleteRole } = useAuth();
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [error, setError] = useState('');

    const handlePermissionChange = async (roleId: string, permission: Permission, checked: boolean) => {
        try {
            await updateRolePermissions(roleId, permission, checked);
        } catch (error) {
            console.error('Failed to update permission:', error);
            setError('Failed to update permission. Please try again.');
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) {
            setError('Role name is required');
            return;
        }
        const id = newRoleName.toLowerCase().trim().replace(/\s+/g, '_');
        if (roles.some(r => r.id === id)) {
             setError('Role already exists');
             return;
        }

        try {
            await addRole(newRoleName);
            setNewRoleName('');
            setError('');
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Failed to create role:', error);
            setError('Failed to create role. Please try again.');
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (window.confirm('Are you sure you want to delete this role? Users assigned to this role may lose access.')) {
            try {
                await deleteRole(roleId);
            } catch (error) {
                console.error('Failed to delete role:', error);
                setError('Failed to delete role. Please try again.');
            }
        }
    };

    const isSystemRole = (roleId: string) => {
        return ['admin', 'sales_manager', 'sales_executive', 'accountant_head'].includes(roleId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Role Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Configure access control and permissions.</p>
                </div>
                {hasPermission(Permission.MANAGE_ROLES) && (
                    <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
                        Create Role
                    </Button>
                )}
            </div>
            <div className="space-y-4">
                {roles.map(role => (
                    <Card key={role.id} className="!p-5">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-lg text-slate-800">{role.name}</h3>
                                {isSystemRole(role.id) ? (
                                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">System</span>
                                ) : (
                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Custom</span>
                                )}
                            </div>
                             <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400">{role.permissions.length} permissions active</span>
                                {!isSystemRole(role.id) && hasPermission(Permission.MANAGE_ROLES) && (
                                    <button 
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                        title="Delete Role"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                             </div>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {PERMISSION_GROUPS.map(group => (
                                    <div key={group.label} className="rounded-lg border border-slate-100 bg-white p-3 shadow-[0_2px_4px_rgba(15,23,42,0.02)]">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">
                                            {group.label}
                                        </div>
                                        <div className="space-y-2">
                                            {group.permissions.map(permission => (
                                                <label
                                                    key={permission}
                                                    className={`flex items-center space-x-2 text-xs text-slate-600 select-none ${!hasPermission(Permission.MANAGE_ROLES) || role.id === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-emerald-700'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50 w-4 h-4"
                                                        checked={role.permissions.includes(permission)}
                                                        disabled={!hasPermission(Permission.MANAGE_ROLES) || role.id === 'admin'}
                                                        onChange={(e) => handlePermissionChange(role.id, permission, e.target.checked)}
                                                    />
                                                    <span>{permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Role"
            >
                <form onSubmit={handleCreateRole} className="space-y-5">
                    {error && (
                        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Role Name</label>
                        <input
                            type="text"
                            required
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="e.g. Logistics Manager"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Role
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RoleManagement;
