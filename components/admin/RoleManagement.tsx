
import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';
import { TrashIcon, ChevronDownIcon } from '../icons/Icons';

const SUPER_ADMIN_ROLE_ID = 'admin';
const SYSTEM_ROLE_IDS = [
    SUPER_ADMIN_ROLE_ID,
    'sales_manager',
    'assistant_sales_manager',
    'sales_executive',
    'sales_coordinator',
    'sales_coordination_head',
    'accountant_head'
];

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
            Permission.CONVERT_LEADS_TO_CUSTOMERS,
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
            Permission.ASSIGN_CUSTOMERS,
        ],
    },
    {
        label: 'Quotation Requests',
        permissions: [
            Permission.VIEW_QUOTATION_REQUESTS,
            Permission.CREATE_QUOTATION_REQUESTS,
            Permission.ASSIGN_QUOTATION_REQUESTS,
            Permission.PROCESS_QUOTATION_REQUESTS,
            Permission.DELETE_QUOTATION_REQUESTS,
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
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const accentColors = ['emerald', 'blue', 'amber', 'violet', 'rose', 'cyan'];

    const handlePermissionChange = async (roleId: string, permission: Permission, checked: boolean) => {
        try {
            await updateRolePermissions(roleId, permission, checked);
        } catch (error) {
            console.error('Failed to update permission:', error);
            const message = error instanceof Error ? error.message : 'Failed to update permission. Please try again.';
            setError(message);
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
        return SYSTEM_ROLE_IDS.includes(roleId);
    };

    const selectedRole = roles.find(r => r.id === selectedRoleId) || null;

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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                {roles.map((role, idx) => {
                    const systemBadge = isSystemRole(role.id) ? 'System' : 'Custom';
                    const accent = accentColors[idx % accentColors.length];
                    const accentBg = {
                        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        blue: 'bg-blue-50 text-blue-700 border-blue-100',
                        amber: 'bg-amber-50 text-amber-700 border-amber-100',
                        violet: 'bg-violet-50 text-violet-700 border-violet-100',
                        rose: 'bg-rose-50 text-rose-700 border-rose-100',
                        cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                    }[accent];
                    return (
                        <Card
                            key={role.id}
                            className="!p-4 flex flex-col justify-between hover:-translate-y-0.5 transition-transform cursor-pointer border border-slate-100 shadow-[0_6px_18px_rgba(15,23,42,0.06)]"
                            onClick={() => setSelectedRoleId(role.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-xl border text-sm font-semibold flex items-center justify-center ${accentBg}`}>
                                    {role.name.charAt(0).toUpperCase()}
                                </div>
                                {!isSystemRole(role.id) && hasPermission(Permission.MANAGE_ROLES) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                                        title="Delete Role"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">{systemBadge}</p>
                                <h3 className="text-lg font-semibold text-slate-900 mt-1 break-words">{role.name}</h3>
                                <p className="text-xs text-slate-500 mt-1">{role.permissions.length} permissions</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm text-emerald-600 font-medium">
                                <span className="inline-flex items-center gap-1">
                                    Open
                                    <ChevronDownIcon className="w-4 h-4" />
                                </span>
                            </div>
                        </Card>
                    );
                })}
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

            <Modal
                isOpen={!!selectedRole}
                onClose={() => setSelectedRoleId(null)}
                title={selectedRole ? `${selectedRole.name} Permissions` : 'Role Permissions'}
                maxWidth="2xl"
            >
                {selectedRole && (
                    <div className="space-y-4">
                        {selectedRole.id === SUPER_ADMIN_ROLE_ID && (
                            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                                Super Admin permissions are fixed and always include every capability. They cannot be edited or removed.
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {PERMISSION_GROUPS.map(group => (
                                <div key={group.label} className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2">
                                        {group.label}
                                    </div>
                                    <div className="space-y-2">
                                        {group.permissions.map(permission => (
                                            <label
                                                key={permission}
                                                className={`flex items-center space-x-2 text-xs text-slate-600 select-none ${(selectedRole.id === SUPER_ADMIN_ROLE_ID) || !hasPermission(Permission.MANAGE_ROLES) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-emerald-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50 w-4 h-4"
                                                    checked={selectedRole.permissions.includes(permission)}
                                                    disabled={selectedRole.id === SUPER_ADMIN_ROLE_ID || !hasPermission(Permission.MANAGE_ROLES)}
                                                    onChange={(e) => handlePermissionChange(selectedRole.id, permission, e.target.checked)}
                                                />
                                                <span>{permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setSelectedRoleId(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RoleManagement;
