
import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { MoreVerticalIcon, EditIcon, TrashIcon, PowerIcon } from '../icons/Icons';
import { Permission, User } from '../../types';
import Modal from '../ui/Modal';
import { db } from '../../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const UserManagement: React.FC = () => {
  const { users, roles, getRoleForUser, hasPermission, adminCreateUser, updateUser, deleteUser, toggleUserStatus } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Active Dropdown State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: ''
  });

  // Delete Confirmation State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    user: User | null;
    hasData: boolean;
    dataDetails: string[];
    isChecking: boolean;
  }>({
    isOpen: false,
    user: null,
    hasData: false,
    dataDetails: [],
    isChecking: false
  });

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      roleId: roles[0]?.id || ''
    });
    setError('');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.roleId
    });
    setError('');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const checkUserAssociatedData = async (userId: string, userName: string): Promise<{ hasData: boolean; details: string[] }> => {
    const dataDetails: string[] = [];

    try {
      // Check Leads (assignedTo or createdById)
      const leadsAssignedQuery = query(
        collection(db, 'crm', 'main', 'leads'),
        where('assignedTo', '==', userName),
        limit(1)
      );
      const leadsAssignedSnapshot = await getDocs(leadsAssignedQuery);
      if (!leadsAssignedSnapshot.empty) {
        dataDetails.push(`Leads assigned to this user`);
      }

      const leadsCreatedQuery = query(
        collection(db, 'crm', 'main', 'leads'),
        where('createdById', '==', userId),
        limit(1)
      );
      const leadsCreatedSnapshot = await getDocs(leadsCreatedQuery);
      if (!leadsCreatedSnapshot.empty) {
        dataDetails.push(`Leads created by this user`);
      }

      // Check Tasks (assignedTo)
      const tasksQuery = query(
        collection(db, 'crm', 'main', 'tasks'),
        where('assignedTo', '==', userName),
        limit(1)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
      if (!tasksSnapshot.empty) {
        dataDetails.push(`Tasks assigned to this user`);
      }

      // Check Customers (createdById)
      const customersQuery = query(
        collection(db, 'crm', 'main', 'customers'),
        where('createdById', '==', userId),
        limit(1)
      );
      const customersSnapshot = await getDocs(customersQuery);
      if (!customersSnapshot.empty) {
        dataDetails.push(`Customers created by this user`);
      }

      // Check Calendars (ownerId)
      const calendarsQuery = query(
        collection(db, 'calendars'),
        where('ownerId', '==', userId),
        limit(1)
      );
      const calendarsSnapshot = await getDocs(calendarsQuery);
      if (!calendarsSnapshot.empty) {
        dataDetails.push(`Calendars owned by this user`);
      }

      // Check Calendar Shares (ownerId or sharedWithId)
      const calendarSharesOwnerQuery = query(
        collection(db, 'calendar_shares'),
        where('ownerId', '==', userId),
        limit(1)
      );
      const calendarSharesOwnerSnapshot = await getDocs(calendarSharesOwnerQuery);
      if (!calendarSharesOwnerSnapshot.empty) {
        dataDetails.push(`Calendar shares created by this user`);
      }

      const calendarSharesSharedQuery = query(
        collection(db, 'calendar_shares'),
        where('sharedWithId', '==', userId),
        limit(1)
      );
      const calendarSharesSharedSnapshot = await getDocs(calendarSharesSharedQuery);
      if (!calendarSharesSharedSnapshot.empty) {
        dataDetails.push(`Calendars shared with this user`);
      }

      // Check User Schedules
      const userSchedulesQuery = query(
        collection(db, 'user_schedules'),
        where('userId', '==', userId),
        limit(1)
      );
      const userSchedulesSnapshot = await getDocs(userSchedulesQuery);
      if (!userSchedulesSnapshot.empty) {
        dataDetails.push(`User schedule settings`);
      }

      // Check Quotations (createdBy)
      const quotationsQuery = query(
        collection(db, 'crm', 'main', 'quotations'),
        where('createdBy', '==', userName),
        limit(1)
      );
      const quotationsSnapshot = await getDocs(quotationsQuery);
      if (!quotationsSnapshot.empty) {
        dataDetails.push(`Quotations created by this user`);
      }

      // Check Invoices (createdBy)
      const invoicesQuery = query(
        collection(db, 'crm', 'main', 'invoices'),
        where('createdBy', '==', userName),
        limit(1)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      if (!invoicesSnapshot.empty) {
        dataDetails.push(`Invoices created by this user`);
      }

      // Check Quotation Requests
      const quotationRequestsQuery = query(
        collection(db, 'crm', 'main', 'quotation_requests'),
        where('requestedById', '==', userId),
        limit(1)
      );
      const quotationRequestsSnapshot = await getDocs(quotationRequestsQuery);
      if (!quotationRequestsSnapshot.empty) {
        dataDetails.push(`Quotation requests created by this user`);
      }

      return {
        hasData: dataDetails.length > 0,
        details: dataDetails
      };
    } catch (error) {
      console.error('Error checking user associated data:', error);
      throw error;
    }
  };

  const handleDeleteUser = async (user: User) => {
    setActiveMenuId(null);

    // Open modal and start checking for associated data
    setDeleteConfirmModal({
      isOpen: true,
      user,
      hasData: false,
      dataDetails: [],
      isChecking: true
    });

    try {
      const { hasData, details } = await checkUserAssociatedData(user.id, user.name);

      setDeleteConfirmModal(prev => ({
        ...prev,
        hasData,
        dataDetails: details,
        isChecking: false
      }));
    } catch (error) {
      console.error('Failed to check user data:', error);
      setDeleteConfirmModal(prev => ({
        ...prev,
        isChecking: false
      }));
      alert('Failed to check user data. Please try again.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmModal.user) return;

    try {
      await deleteUser(deleteConfirmModal.user.id);
      setDeleteConfirmModal({
        isOpen: false,
        user: null,
        hasData: false,
        dataDetails: [],
        isChecking: false
      });
    } catch (err) {
      console.error("Failed to delete user", err);
      alert("Failed to delete user");
    }
  };

  const closeDeleteModal = () => {
    setDeleteConfirmModal({
      isOpen: false,
      user: null,
      hasData: false,
      dataDetails: [],
      isChecking: false
    });
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    try {
        await toggleUserStatus(user.id, !user.isActive);
        setActiveMenuId(null);
    } catch (err) {
        console.error(`Failed to ${action} user`, err);
        alert(`Failed to ${action} user`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          name: formData.name,
          roleId: formData.roleId
        });
      } else {
        await adminCreateUser(formData.email, formData.password, formData.name, formData.roleId);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      let msg = 'Operation failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Email is already in use.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
      } else if (err.message?.includes('Failed to save user to database')) {
        msg = err.message;
      } else if (err.code === 'permission-denied') {
        msg = 'Permission denied. Check Firestore security rules.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      console.error('User creation error:', err);
    } finally {
      setIsLoading(false);
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage system access and roles.</p>
        </div>
        {hasPermission(Permission.CREATE_USERS) && (
            <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">Add User</Button>
        )}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold">Name</th>
                <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                <th scope="col" className="px-6 py-4 font-semibold">Role</th>
                <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const userRole = getRoleForUser(user);
                return (
                  <tr key={user.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${userRole?.id === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        {userRole?.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-xs font-medium ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <Button 
                        variant="ghost" 
                        className="!p-2 text-slate-400 hover:text-slate-600"
                        onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                      >
                          <MoreVerticalIcon className="w-4 h-4"/>
                      </Button>

                      {/* Dropdown Menu */}
                      {activeMenuId === user.id && (
                        <div className="absolute right-8 top-8 z-20 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                          {hasPermission(Permission.EDIT_USERS) && (
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                            >
                              <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                            </button>
                          )}
                          
                          {hasPermission(Permission.EDIT_USERS) && user.roleId !== 'admin' && (
                            <button
                                onClick={() => handleToggleStatus(user)}
                                className={`w-full px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center transition-colors ${user.isActive ? 'text-orange-600' : 'text-green-600'}`}
                            >
                                <PowerIcon className="w-4 h-4 mr-2 opacity-80" /> 
                                {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {hasPermission(Permission.DELETE_USERS) && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.roleId === 'admin'}
                              className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingUser ? "Edit User" : "Add New User"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Email</label>
            <input
              type="email"
              required
              disabled={!!editingUser}
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed outline-none"
              placeholder="user@company.com"
            />
            {editingUser && <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>}
          </div>

          {!editingUser && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Password</label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Role</label>
            <select
              value={formData.roleId}
              onChange={(e) => setFormData({...formData, roleId: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              disabled={editingUser?.roleId === 'admin'}
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create User')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={closeDeleteModal}
        title="Delete User"
      >
        <div className="space-y-4">
          {deleteConfirmModal.isChecking ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-sm text-slate-600">Checking for associated data...</p>
            </div>
          ) : deleteConfirmModal.hasData ? (
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Cannot Delete User</h3>
                    <p className="text-sm text-red-700">
                      This user cannot be deleted because they have associated data in the system.
                      Deleting this user would result in data loss.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase mb-2">Associated Data Found:</h4>
                <ul className="space-y-1">
                  {deleteConfirmModal.dataDetails.map((detail, index) => (
                    <li key={index} className="text-sm text-slate-600 flex items-center">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2"></span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-slate-500">
                To proceed with deletion, please reassign or remove all associated data first.
              </p>

              <div className="flex justify-end pt-2">
                <Button onClick={closeDeleteModal}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-800 mb-1">Confirm Deletion</h3>
                    <p className="text-sm text-amber-700">
                      Are you sure you want to delete <span className="font-semibold">{deleteConfirmModal.user?.name}</span>?
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                No associated data found. This user can be safely deleted.
              </p>

              <div className="flex justify-end space-x-3 pt-2">
                <Button variant="ghost" onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteUser}
                  className="!bg-red-600 hover:!bg-red-700 !text-white"
                >
                  Delete User
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
