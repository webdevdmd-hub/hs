
import React, { useState, useMemo } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CRMProvider } from './hooks/useCRM';
import LoginScreen from './components/auth/LoginScreen';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import SalesDashboard from './components/sales/SalesDashboard';
import SalesLeads from './components/sales/SalesLeads';
import SalesProjects from './components/sales/SalesProjects';
import SalesTasks from './components/sales/SalesTasks';
import SalesCalendar from './components/sales/SalesCalendar';
import SalesQuotations from './components/sales/SalesQuotations';
import SalesInvoices from './components/sales/SalesInvoices';
import SalesReports from './components/sales/SalesReports';
import CustomerList from './components/customers/CustomerList';
import Placeholder from './components/shared/Placeholder';
import { User, Role, Permission } from './types';

const AppContent: React.FC = () => {
  const { currentUser, hasPermission, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  // Show loading state while Firebase restores auth session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return hasPermission(Permission.VIEW_SALES_DASHBOARD) ? <SalesDashboard /> : <Placeholder title="Dashboard" />;
      case 'admin_users':
        return <AdminDashboard tab="users" />;
      case 'admin_roles':
        return <AdminDashboard tab="roles" />;
      case 'sales_leads':
        return <SalesLeads />;
      case 'sales_projects':
        return <SalesProjects />;
      case 'sales_tasks':
        return <SalesTasks />;
      case 'sales_quotations':
        return hasPermission(Permission.VIEW_QUOTATIONS) ? <SalesQuotations /> : <Placeholder title="Quotations" />;
      case 'sales_invoices':
        return hasPermission(Permission.VIEW_INVOICES) ? <SalesInvoices /> : <Placeholder title="Invoices" />;
      case 'customers':
        return <CustomerList />;
      case 'crm_dashboard':
        return hasPermission(Permission.VIEW_SALES_DASHBOARD) ? <SalesDashboard /> : <Placeholder title="CRM Dashboard" />;
      case 'crm_calendar':
        return hasPermission(Permission.MANAGE_CRM_CALENDAR) ? <SalesCalendar /> : <Placeholder title="CRM Calendar" />;
      case 'crm_reports':
        return hasPermission(Permission.VIEW_CRM_REPORTS) ? <SalesReports /> : <Placeholder title="CRM Reports" />;
      case 'sales_dashboard':
        return hasPermission(Permission.VIEW_SALES_DASHBOARD) ? <SalesDashboard /> : <Placeholder title="Sales" />;
      case 'accounts':
        return <Placeholder title="Accounts" />;
      case 'store':
        return <Placeholder title="Store" />;
      case 'procurement':
        return <Placeholder title="Procurement" />;
      case 'logistics':
        return <Placeholder title="Logistics" />;
      case 'marketing':
        return <Placeholder title="Marketing" />;
      case 'compliance':
        return <Placeholder title="Compliance & Documentation" />;
      case 'fleet':
        return <Placeholder title="Fleet Management" />;
      case 'profile':
        return <Placeholder title="My Profile" />;
      case 'settings':
        return <Placeholder title="Settings" />;
      default:
        return <Placeholder title="Dashboard" />;
    }
  };

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <DashboardLayout currentView={currentView} setCurrentView={setCurrentView}>
      {renderContent()}
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CRMProvider>
        <AppContent />
      </CRMProvider>
    </AuthProvider>
  );
};

export default App;
