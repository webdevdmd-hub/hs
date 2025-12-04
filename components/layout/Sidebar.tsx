
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Permission } from '../../types';
import { HomeIcon, BriefcaseIcon, ContactIcon, LockIcon, FolderIcon, TruckIcon, PackageIcon, SettingsIcon, UsersIcon, ChevronDownIcon, XIcon, RocketIcon, DashboardIcon, CalendarIcon, DocumentIcon, CurrencyIcon, CheckCircleIcon } from '../icons/Icons';

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  view: string;
  currentView: string;
  setCurrentView: (view: string) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, view, currentView, setCurrentView }) => {
  const isActive = currentView === view;
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setCurrentView(view);
      }}
      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 mb-1 ${
        isActive
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-50'
      }`}
    >
      <span className={`w-5 h-5 mr-3 ${isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-emerald-600'}`}>{icon}</span>
      {label}
    </a>
  );
};

interface NavGroupProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    views: string[];
    currentView: string;
}

const NavGroup: React.FC<NavGroupProps> = ({ icon, label, children, views, currentView }) => {
    const isParentActive = views.some(v => currentView.startsWith(v));
    const [isOpen, setIsOpen] = useState(isParentActive);

    return (
        <div className="mb-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left rounded-xl transition-all duration-200 ${
                    isParentActive ? 'text-emerald-800' : 'text-slate-600'
                } hover:bg-slate-50 hover:text-emerald-700`}
            >
                <span className="flex items-center">
                    <span className={`w-5 h-5 mr-3 ${isParentActive ? 'text-emerald-600' : 'text-slate-400'}`}>{icon}</span>
                    {label}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="pl-4 mt-1 space-y-0.5 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                    {children}
                </div>
            )}
        </div>
    );
}

interface SidebarProps {
    currentView: string;
    setCurrentView: (view: string) => void;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, onClose }) => {
  const { hasPermission } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-emerald-200 shadow-lg">
              H
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">HS App</h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-4rem)]">
          <NavLink icon={<HomeIcon />} label="Dashboard" view="dashboard" currentView={currentView} setCurrentView={setCurrentView} />
          
          {(hasPermission(Permission.VIEW_USERS) || hasPermission(Permission.VIEW_ROLES)) && (
            <NavGroup icon={<LockIcon />} label="Admin" views={['admin_']} currentView={currentView}>
                {hasPermission(Permission.VIEW_USERS) && <NavLink icon={<UsersIcon className="w-4 h-4" />} label="User Management" view="admin_users" currentView={currentView} setCurrentView={setCurrentView} />}
                {hasPermission(Permission.VIEW_ROLES) && <NavLink icon={<LockIcon className="w-4 h-4"/>} label="Role Management" view="admin_roles" currentView={currentView} setCurrentView={setCurrentView} />}
            </NavGroup>
          )}
          
          {(hasPermission(Permission.VIEW_SALES_DASHBOARD) || hasPermission(Permission.VIEW_LEADS) || hasPermission(Permission.MANAGE_CRM_CALENDAR) || hasPermission(Permission.VIEW_CRM_REPORTS)) && (
              <NavGroup icon={<BriefcaseIcon />} label="CRM" views={['crm_', 'sales_leads', 'crm_reports']} currentView={currentView}>
                  {hasPermission(Permission.VIEW_SALES_DASHBOARD) && <NavLink icon={<DashboardIcon className="w-4 h-4" />} label="Dashboard" view="crm_dashboard" currentView={currentView} setCurrentView={setCurrentView} />}
                  {hasPermission(Permission.VIEW_LEADS) && <NavLink icon={<FolderIcon className="w-4 h-4"/>} label="Leads" view="sales_leads" currentView={currentView} setCurrentView={setCurrentView} />}
                  {hasPermission(Permission.MANAGE_CRM_CALENDAR) && <NavLink icon={<CalendarIcon className="w-4 h-4" />} label="Calendar" view="crm_calendar" currentView={currentView} setCurrentView={setCurrentView} />}
                  {hasPermission(Permission.VIEW_CRM_REPORTS) && <NavLink icon={<DocumentIcon className="w-4 h-4"/>} label="Reports" view="crm_reports" currentView={currentView} setCurrentView={setCurrentView} />}
              </NavGroup>
          )}

          {hasPermission(Permission.VIEW_TASKS) && <NavLink icon={<CheckCircleIcon />} label="Tasks" view="sales_tasks" currentView={currentView} setCurrentView={setCurrentView} />}

          {(hasPermission(Permission.VIEW_SALES_DASHBOARD) || hasPermission(Permission.VIEW_CUSTOMERS) || hasPermission(Permission.MANAGE_PROJECTS) || hasPermission(Permission.VIEW_QUOTATIONS) || hasPermission(Permission.VIEW_INVOICES) || hasPermission(Permission.VIEW_QUOTATION_REQUESTS)) && (
            <NavGroup icon={<RocketIcon />} label="Sales" views={['sales_dashboard', 'customers', 'sales_projects', 'sales_quotations', 'sales_invoices', 'quotation_requests']} currentView={currentView}>
              {hasPermission(Permission.VIEW_SALES_DASHBOARD) && <NavLink icon={<DashboardIcon className="w-4 h-4" />} label="Dashboard" view="sales_dashboard" currentView={currentView} setCurrentView={setCurrentView} />}
              {hasPermission(Permission.VIEW_CUSTOMERS) && <NavLink icon={<ContactIcon className="w-4 h-4" />} label="Customers" view="customers" currentView={currentView} setCurrentView={setCurrentView} />}
              {hasPermission(Permission.MANAGE_PROJECTS) && <NavLink icon={<FolderIcon className="w-4 h-4" />} label="Projects" view="sales_projects" currentView={currentView} setCurrentView={setCurrentView} />}
              {hasPermission(Permission.VIEW_QUOTATION_REQUESTS) && <NavLink icon={<DocumentIcon className="w-4 h-4" />} label="Quotation Requests" view="quotation_requests" currentView={currentView} setCurrentView={setCurrentView} />}
              {hasPermission(Permission.VIEW_QUOTATIONS) && <NavLink icon={<DocumentIcon className="w-4 h-4" />} label="Quotations" view="sales_quotations" currentView={currentView} setCurrentView={setCurrentView} />}
              {hasPermission(Permission.VIEW_INVOICES) && <NavLink icon={<CurrencyIcon className="w-4 h-4" />} label="Invoices" view="sales_invoices" currentView={currentView} setCurrentView={setCurrentView} />}
            </NavGroup>
          )}

          {hasPermission(Permission.VIEW_ACCOUNTS) && <NavLink icon={<FolderIcon />} label="Accounts" view="accounts" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_STORE) && <NavLink icon={<PackageIcon />} label="Store" view="store" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_PROCUREMENT) && <NavLink icon={<FolderIcon />} label="Procurement" view="procurement" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_LOGISTICS) && <NavLink icon={<TruckIcon />} label="Logistics" view="logistics" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_MARKETING) && <NavLink icon={<FolderIcon />} label="Marketing" view="marketing" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_COMPLIANCE) && <NavLink icon={<FolderIcon />} label="Compliance" view="compliance" currentView={currentView} setCurrentView={setCurrentView} />}
          {hasPermission(Permission.VIEW_FLEET) && <NavLink icon={<TruckIcon />} label="Fleet" view="fleet" currentView={currentView} setCurrentView={setCurrentView} />}

          <div className="my-4 border-t border-slate-100 pt-4">
              <NavLink icon={<SettingsIcon />} label="Settings" view="settings" currentView={currentView} setCurrentView={setCurrentView} />
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
