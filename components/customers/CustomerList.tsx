
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useCRM } from '../../hooks/useCRM';
import { Customer, Permission } from '../../types';
import { MoreVerticalIcon, EditIcon, TrashIcon, XIcon, CalendarIcon, CurrencyIcon, CheckCircleIcon, ContactIcon } from '../icons/Icons';

const CustomerList: React.FC = () => {
    const { hasPermission, currentUser } = useAuth();
    const { customers, addCustomer, updateCustomer, deleteCustomer, projects, invoices, quotations } = useCRM();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'Active' as Customer['status'],
        source: ''
    });

    // Check if user is manager or admin (can see all customers)
    const isManagerOrAdmin = currentUser?.roleId === 'admin' || currentUser?.roleId === 'sales_manager';

    // Filter customers based on user role
    const filteredCustomers = useMemo(() => {
        if (isManagerOrAdmin) {
            return customers;
        }
        // Regular users can only see customers they created
        return customers.filter(customer => customer.createdById === currentUser?.id);
    }, [customers, currentUser?.id, isManagerOrAdmin]);

    // Active Menus State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDeleteId, setCustomerToDeleteId] = useState<string | null>(null);

    // Customer Detail View State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const handleOpenModal = () => {
        setEditingCustomer(null);
        setFormData({
            name: '',
            contactPerson: '',
            email: '',
            phone: '',
            status: 'Active',
            source: ''
        });
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleOpenEditModal = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            contactPerson: customer.contactPerson,
            email: customer.email,
            phone: customer.phone,
            status: customer.status,
            source: customer.source || ''
        });
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (customerId: string) => {
        setCustomerToDeleteId(customerId);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const handleConfirmDelete = () => {
        if (customerToDeleteId) {
            deleteCustomer(customerToDeleteId);
            setIsDeleteModalOpen(false);
            setCustomerToDeleteId(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            updateCustomer(editingCustomer.id, {
                name: formData.name,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                status: formData.status,
                source: formData.source
            });
        } else {
            const newCustomer: Customer = {
                id: Date.now().toString(),
                name: formData.name,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                status: formData.status,
                source: formData.source,
                createdAt: new Date().toISOString(),
                createdById: currentUser?.id || 'system'
            };
            addCustomer(newCustomer);
        }
        setIsModalOpen(false);
    };

    const getStatusClass = (status: Customer['status']) => {
        switch (status) {
            case 'Active': return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
            case 'Inactive': return 'bg-slate-50 text-slate-600 border border-slate-200';
            case 'From Lead': return 'bg-blue-50 text-blue-700 border border-blue-100';
            default: return 'bg-gray-50 text-gray-700 border border-gray-200';
        }
    };

    // Open Customer Detail View
    const handleViewCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setActiveMenuId(null);
    };

    // Get customer's related data
    const getCustomerRelatedData = (customerId: string) => {
        const customerProjects = projects.filter(p => p.customerId === customerId);
        const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
        const customerQuotations = quotations.filter(q => q.customerId === customerId);

        return {
            projects: customerProjects,
            invoices: customerInvoices,
            quotations: customerQuotations,
            totalRevenue: customerInvoices
                .filter(inv => inv.status === 'Paid')
                .reduce((sum, inv) => sum + inv.amount, 0),
            pendingRevenue: customerInvoices
                .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
                .reduce((sum, inv) => sum + inv.amount, 0)
        };
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
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers</h1>
                <p className="text-slate-500 text-sm mt-1">Directory of all client relationships.</p>
            </div>
            {hasPermission(Permission.CREATE_CUSTOMERS) && (
                <Button onClick={handleOpenModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">Add Customer</Button>
            )}
        </div>
        <Card className="!p-0 overflow-hidden">
             <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                    <tr>
                    <th scope="col" className="px-6 py-4 font-semibold">Customer Name</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Contact Person</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Source</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Email</th>
                    <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                    <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((customer) => (
                    <tr
                        key={customer.id}
                        className="bg-white hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => handleViewCustomer(customer)}
                    >
                        <td className="px-6 py-4 font-medium text-slate-900">{customer.name}</td>
                        <td className="px-6 py-4">{customer.contactPerson}</td>
                        <td className="px-6 py-4">{customer.source || 'N/A'}</td>
                        <td className="px-6 py-4">{customer.email}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(customer.status)}`}>
                                {customer.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                className="!p-2 text-slate-400 hover:text-slate-600"
                                onClick={() => setActiveMenuId(activeMenuId === customer.id ? null : customer.id)}
                            >
                                <MoreVerticalIcon className="w-4 h-4"/>
                            </Button>

                            {/* Dropdown Menu */}
                            {activeMenuId === customer.id && (
                                <div className="absolute right-8 top-8 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                                    {hasPermission(Permission.EDIT_CUSTOMERS) && (
                                        <button
                                            onClick={() => handleOpenEditModal(customer)}
                                            className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                        >
                                            <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                        </button>
                                    )}
                                    {hasPermission(Permission.DELETE_CUSTOMERS) && (
                                        <button
                                            onClick={() => handleDeleteClick(customer.id)}
                                            className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4 mr-2 opacity-80" /> Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </td>
                    </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                No customers found.
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
            title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Company Name</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="e.g. Acme Corp"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Contact Person</label>
                    <input
                        type="text"
                        required
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="e.g. John Doe"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="john@acme.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Phone</label>
                        <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            placeholder="+1 (555) 000-0000"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as Customer['status'] })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="From Lead">From Lead</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Customer Source</label>
                        <select
                            required
                            value={formData.source}
                            onChange={(e) => setFormData({...formData, source: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none invalid:text-slate-400"
                        >
                            <option value="" disabled>Select Source</option>
                            <option value="Referral">Referral</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Website">Website</option>
                            <option value="Cold Call">Cold Call</option>
                            <option value="Email Campaign">Email Campaign</option>
                            <option value="Exhibition">Exhibition</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit">{editingCustomer ? 'Save Changes' : 'Create Customer'}</Button>
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
                    <h3 className="text-lg font-medium text-slate-900">Delete Customer?</h3>
                    <p className="text-sm text-slate-500 mt-2">
                        Are you sure you want to delete this customer? This action cannot be undone.
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
                        Delete Customer
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Customer Detail View */}
        {selectedCustomer && (() => {
            const relatedData = getCustomerRelatedData(selectedCustomer.id);

            return (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
                    onClick={() => setSelectedCustomer(null)}
                >
                    <div
                        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Scrollable Content */}
                        <div className="overflow-y-auto max-h-[90vh]">
                            {/* Minimalist Header */}
                            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200">
                                <div className="p-8">
                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                    <div className="pr-12">
                                        <h2 className="text-3xl font-bold text-slate-900 mb-3">{selectedCustomer.name}</h2>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                selectedCustomer.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                                selectedCustomer.status === 'Inactive' ? 'bg-slate-200 text-slate-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {selectedCustomer.status}
                                            </span>
                                            <span className="text-slate-500">•</span>
                                            <span>Customer since {new Date(selectedCustomer.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-gradient-to-br from-white to-slate-50 space-y-8">
                                {/* Quick Stats - Minimalist Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="group hover:scale-105 transition-transform duration-200">
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</span>
                                                <div className="p-2 bg-emerald-50 rounded-lg">
                                                    <CurrencyIcon className="w-4 h-4 text-emerald-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                ${relatedData.totalRevenue.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="group hover:scale-105 transition-transform duration-200">
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending</span>
                                                <div className="p-2 bg-blue-50 rounded-lg">
                                                    <CurrencyIcon className="w-4 h-4 text-blue-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                ${relatedData.pendingRevenue.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="group hover:scale-105 transition-transform duration-200">
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Projects</span>
                                                <div className="p-2 bg-purple-50 rounded-lg">
                                                    <CheckCircleIcon className="w-4 h-4 text-purple-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {relatedData.projects.length}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="group hover:scale-105 transition-transform duration-200">
                                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invoices</span>
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <CalendarIcon className="w-4 h-4 text-slate-600" />
                                                </div>
                                            </div>
                                            <p className="text-2xl font-bold text-slate-900">
                                                {relatedData.invoices.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Information and Details - Clean Design */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Contact Information</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <ContactIcon className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">Contact Person</p>
                                                    <p className="font-medium text-slate-900">{selectedCustomer.contactPerson}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">Email</p>
                                                    <p className="font-medium text-slate-900">{selectedCustomer.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg">
                                                    <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                                                    <p className="font-medium text-slate-900">{selectedCustomer.phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Details</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-sm text-slate-500">Source</span>
                                                <span className="font-medium text-slate-900">{selectedCustomer.source || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                <span className="text-sm text-slate-500">Customer Since</span>
                                                <span className="font-medium text-slate-900">
                                                    {new Date(selectedCustomer.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm text-slate-500">Status</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(selectedCustomer.status)}`}>
                                                    {selectedCustomer.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Projects Section - Clean List */}
                                {relatedData.projects.length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Projects</h3>
                                            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                                                {relatedData.projects.length}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {relatedData.projects.map(project => (
                                                <div key={project.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900 mb-1">{project.title}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${
                                                            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                            project.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                            project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {project.status}
                                                        </span>
                                                        <p className="text-sm font-bold text-slate-900">${project.value.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Invoices Section - Clean List */}
                                {relatedData.invoices.length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Recent Invoices</h3>
                                            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                                                {relatedData.invoices.length}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {relatedData.invoices.slice(0, 5).map(invoice => (
                                                <div key={invoice.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900 mb-1">Invoice #{invoice.invoiceNumber}</p>
                                                        <p className="text-xs text-slate-500">
                                                            Due: {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${
                                                            invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            invoice.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {invoice.status}
                                                        </span>
                                                        <p className="text-sm font-bold text-slate-900">${invoice.amount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quotations Section - Clean List */}
                                {relatedData.quotations.length > 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Quotations</h3>
                                            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                                                {relatedData.quotations.length}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {relatedData.quotations.slice(0, 5).map(quotation => (
                                                <div key={quotation.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-slate-900 mb-1">Quote #{quotation.quoteNumber}</p>
                                                        <p className="text-xs text-slate-500">
                                                            Valid until: {new Date(quotation.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-2 ${
                                                            quotation.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                            quotation.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                                                            quotation.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                            quotation.status === 'Expired' ? 'bg-slate-100 text-slate-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {quotation.status}
                                                        </span>
                                                        <p className="text-sm font-bold text-slate-900">${quotation.totalAmount.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State - Minimalist */}
                                {relatedData.projects.length === 0 &&
                                 relatedData.invoices.length === 0 &&
                                 relatedData.quotations.length === 0 && (
                                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-500 font-medium">No activity yet</p>
                                        <p className="text-sm text-slate-400 mt-1">Projects, invoices, and quotations will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        })()}
    </div>
  );
};

export default CustomerList;