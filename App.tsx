
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
import QuotationRequests from './components/sales/QuotationRequests';
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

      // Admin Routes - Strict Permission Enforcement
      case 'admin_users':
        return hasPermission(Permission.VIEW_USERS) ? <AdminDashboard tab="users" /> : <Placeholder title="User Management" />;
      case 'admin_roles':
        return hasPermission(Permission.VIEW_ROLES) ? <AdminDashboard tab="roles" /> : <Placeholder title="Role Management" />;

      // CRM Routes - Strict Permission Enforcement
      case 'sales_leads':
        return hasPermission(Permission.VIEW_LEADS) ? <SalesLeads /> : <Placeholder title="Leads" />;
      case 'sales_projects':
        return hasPermission(Permission.MANAGE_PROJECTS) ? <SalesProjects /> : <Placeholder title="Projects" />;
      case 'sales_tasks':
        return hasPermission(Permission.VIEW_TASKS) ? <SalesTasks /> : <Placeholder title="Tasks" />;
      case 'sales_quotations':
        return hasPermission(Permission.VIEW_QUOTATIONS) ? <SalesQuotations /> : <Placeholder title="Quotations" />;
      case 'sales_invoices':
        return hasPermission(Permission.VIEW_INVOICES) ? <SalesInvoices /> : <Placeholder title="Invoices" />;
      case 'quotation_requests':
        return hasPermission(Permission.VIEW_QUOTATION_REQUESTS) ? <QuotationRequests /> : <Placeholder title="Quotation Requests" />;

      // Customer Routes - Strict Permission Enforcement
      case 'customers':
        return hasPermission(Permission.VIEW_CUSTOMERS) ? <CustomerList /> : <Placeholder title="Customers" />;

      // CRM Module Views - Strict Permission Enforcement
      case 'crm_dashboard':
        return hasPermission(Permission.VIEW_SALES_DASHBOARD) ? <SalesDashboard /> : <Placeholder title="CRM Dashboard" />;
      case 'crm_calendar':
        return hasPermission(Permission.MANAGE_CRM_CALENDAR) ? <SalesCalendar /> : <Placeholder title="CRM Calendar" />;
      case 'crm_reports':
        return hasPermission(Permission.VIEW_CRM_REPORTS) ? <SalesReports /> : <Placeholder title="CRM Reports" />;

      // Sales Module Views - Strict Permission Enforcement
      case 'sales_dashboard':
        return hasPermission(Permission.VIEW_SALES_DASHBOARD) ? <SalesDashboard /> : <Placeholder title="Sales" />;

      // Other Module Placeholders - Strict Permission Enforcement
      case 'accounts':
        return hasPermission(Permission.VIEW_ACCOUNTS) ? <Placeholder title="Accounts" /> : <Placeholder title="Accounts (No Access)" />;
      case 'store':
        return hasPermission(Permission.VIEW_STORE) ? <Placeholder title="Store" /> : <Placeholder title="Store (No Access)" />;
      case 'procurement':
        return hasPermission(Permission.VIEW_PROCUREMENT) ? <Placeholder title="Procurement" /> : <Placeholder title="Procurement (No Access)" />;
      case 'logistics':
        return hasPermission(Permission.VIEW_LOGISTICS) ? <Placeholder title="Logistics" /> : <Placeholder title="Logistics (No Access)" />;
      case 'marketing':
        return hasPermission(Permission.VIEW_MARKETING) ? <Placeholder title="Marketing" /> : <Placeholder title="Marketing (No Access)" />;
      case 'compliance':
        return hasPermission(Permission.VIEW_COMPLIANCE) ? <Placeholder title="Compliance & Documentation" /> : <Placeholder title="Compliance (No Access)" />;
      case 'fleet':
        return hasPermission(Permission.VIEW_FLEET) ? <Placeholder title="Fleet Management" /> : <Placeholder title="Fleet (No Access)" />;

      // Always Accessible - No Permission Required
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
