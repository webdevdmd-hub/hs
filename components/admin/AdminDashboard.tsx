
import React from 'react';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';

interface AdminDashboardProps {
  tab: 'users' | 'roles';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ tab }) => {
  const { hasPermission } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold text-emerald-900 mb-6">Admin Panel</h1>
      {tab === 'users' && hasPermission(Permission.VIEW_USERS) && <UserManagement />}
      {tab === 'roles' && hasPermission(Permission.VIEW_ROLES) && <RoleManagement />}
    </div>
  );
};

export default AdminDashboard;
