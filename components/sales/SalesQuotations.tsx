
import React, { useState, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Quotation, QuotationStatus, LineItem, Permission } from '../../types';
import { FilterIcon, PlusIcon, EditIcon, TrashIcon, MoreVerticalIcon, DocumentIcon } from '../icons/Icons';
import { useCRM } from '../../hooks/useCRM';
import { useAuth } from '../../hooks/useAuth';

const SalesQuotations: React.FC = () => {
    const { hasPermission, currentUser } = useAuth();
    const { quotations, customers, addQuotation, updateQuotation, deleteQuotation } = useCRM();

    const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'All'>('All');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quotationToDeleteId, setQuotationToDeleteId] = useState<string | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        quotationNumber: '',
        customerId: '',
        validUntil: '',
        notes: '',
        tax: '5'
    });

    // Line Items
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q => statusFilter === 'All' || q.status === statusFilter);
    }, [quotations, statusFilter]);

    const generateQuotationNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `QT-${year}${month}-${random}`;
    };

    const handleOpenModal = () => {
        setEditingQuotation(null);
        setFormData({
            quotationNumber: generateQuotationNumber(),
            customerId: '',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            notes: '',
            tax: '5'
        });
        setLineItems([{ id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (quotation: Quotation) => {
        setEditingQuotation(quotation);
        setFormData({
            quotationNumber: quotation.quotationNumber,
            customerId: quotation.customerId,
            validUntil: quotation.validUntil,
            notes: quotation.notes || '',
            tax: ((quotation.tax / quotation.subtotal) * 100).toString() || '5'
        });
        setLineItems(quotation.items);
        setIsModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteClick = (id: string) => {
        setQuotationToDeleteId(id);
        setIsDeleteModalOpen(true);
        setActiveMenuId(null);
    };

    const handleConfirmDelete = () => {
        if (quotationToDeleteId) {
            deleteQuotation(quotationToDeleteId);
            setIsDeleteModalOpen(false);
            setQuotationToDeleteId(null);
        }
    };

    // Line Item handlers
    const addLineItem = () => {
        setLineItems([...lineItems, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    updated.total = updated.quantity * updated.unitPrice;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeLineItem = (id: string) => {
        if (lineItems.length > 1) {
            setLineItems(lineItems.filter(item => item.id !== id));
        }
    };

    const calculateTotals = () => {
        const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
        const taxAmount = subtotal * (parseFloat(formData.tax) / 100);
        const total = subtotal + taxAmount;
        return { subtotal, taxAmount, total };
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const selectedCustomer = customers.find(c => c.id === formData.customerId);
        const customerName = selectedCustomer ? selectedCustomer.name : 'Unknown Customer';
        const { subtotal, taxAmount, total } = calculateTotals();

        if (editingQuotation) {
            updateQuotation(editingQuotation.id, {
                quotationNumber: formData.quotationNumber,
                customerId: formData.customerId,
                customerName: customerName,
                items: lineItems,
                subtotal,
                tax: taxAmount,
                total,
                validUntil: formData.validUntil,
                notes: formData.notes
            });
        } else {
            const newQuotation: Quotation = {
                id: Date.now().toString(),
                quotationNumber: formData.quotationNumber,
                customerId: formData.customerId,
                customerName: customerName,
                items: lineItems,
                subtotal,
                tax: taxAmount,
                total,
                status: 'Draft',
                validUntil: formData.validUntil,
                notes: formData.notes,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.name || 'System'
            };
            addQuotation(newQuotation);
        }
        setIsModalOpen(false);
    };

    const handleStatusChange = (quotation: Quotation, newStatus: QuotationStatus) => {
        if (!hasPermission(Permission.EDIT_QUOTATIONS)) return;
        updateQuotation(quotation.id, { status: newStatus });
        setActiveMenuId(null);
    };

    const getStatusStyle = (status: QuotationStatus) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-600';
            case 'Sent': return 'bg-blue-50 text-blue-700';
            case 'Accepted': return 'bg-emerald-50 text-emerald-700';
            case 'Rejected': return 'bg-red-50 text-red-700';
            case 'Expired': return 'bg-orange-50 text-orange-700';
            default: return 'bg-slate-50 text-slate-600';
        }
    };

    return (
        <div className="space-y-6">
            {activeMenuId && (
                <div
                    className="fixed inset-0 z-10 bg-transparent"
                    onClick={() => setActiveMenuId(null)}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations</h1>
                    <p className="text-slate-500 text-sm mt-1">Create and manage customer quotations.</p>
                </div>
                {hasPermission(Permission.CREATE_QUOTATIONS) && (
                    <Button onClick={handleOpenModal} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        New Quotation
                    </Button>
                )}
            </div>

            <Card className="!p-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-full sm:w-64">
                        <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as QuotationStatus | 'All')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Sent">Sent</option>
                            <option value="Accepted">Accepted</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Expired">Expired</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Quotation #</th>
                                <th className="px-6 py-4 font-semibold">Customer</th>
                                <th className="px-6 py-4 font-semibold">Total</th>
                                <th className="px-6 py-4 font-semibold">Valid Until</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredQuotations.map(quotation => (
                                <tr key={quotation.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <DocumentIcon className="w-4 h-4 mr-2 text-slate-400" />
                                            <span className="font-medium text-slate-900">{quotation.quotationNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{quotation.customerName}</td>
                                    <td className="px-6 py-4 font-medium">AED {quotation.total.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {new Date(quotation.validUntil).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusStyle(quotation.status)}`}>
                                            {quotation.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <Button
                                            variant="ghost"
                                            className="!p-2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setActiveMenuId(activeMenuId === quotation.id ? null : quotation.id)}
                                        >
                                            <MoreVerticalIcon className="w-4 h-4"/>
                                        </Button>

                                        {activeMenuId === quotation.id && (
                                            <div className="absolute right-8 top-8 z-20 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden text-left origin-top-right">
                                                {hasPermission(Permission.EDIT_QUOTATIONS) && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEditModal(quotation)}
                                                            className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                                        >
                                                            <EditIcon className="w-4 h-4 mr-2 text-slate-400" /> Edit
                                                        </button>
                                                        {quotation.status === 'Draft' && (
                                                            <button
                                                                onClick={() => handleStatusChange(quotation, 'Sent')}
                                                                className="w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center transition-colors"
                                                            >
                                                                Mark as Sent
                                                            </button>
                                                        )}
                                                        {quotation.status === 'Sent' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleStatusChange(quotation, 'Accepted')}
                                                                    className="w-full px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center transition-colors"
                                                                >
                                                                    Mark as Accepted
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusChange(quotation, 'Rejected')}
                                                                    className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                                                >
                                                                    Mark as Rejected
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                                {hasPermission(Permission.DELETE_QUOTATIONS) && (
                                                    <button
                                                        onClick={() => handleDeleteClick(quotation.id)}
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
                            {filteredQuotations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        No quotations found.
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
                title={editingQuotation ? "Edit Quotation" : "New Quotation"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Quotation Number</label>
                            <input
                                type="text"
                                required
                                value={formData.quotationNumber}
                                onChange={(e) => setFormData({...formData, quotationNumber: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Valid Until</label>
                            <input
                                type="date"
                                required
                                value={formData.validUntil}
                                onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>
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

                    {/* Line Items */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Line Items</label>
                        <div className="space-y-2">
                            {lineItems.map((item, index) => (
                                <div key={item.id} className="flex gap-2 items-start">
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        required
                                        value={item.description}
                                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        min="1"
                                        required
                                        value={item.quantity}
                                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Unit Price"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={item.unitPrice}
                                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        className="w-28 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                    <div className="w-24 py-2 text-sm text-right font-medium">
                                        {item.total.toFixed(2)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeLineItem(item.id)}
                                        className="p-2 text-slate-400 hover:text-red-500"
                                        disabled={lineItems.length === 1}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <Button type="button" variant="ghost" onClick={addLineItem} className="mt-2 text-sm">
                            <PlusIcon className="w-4 h-4 mr-1" /> Add Line Item
                        </Button>
                    </div>

                    {/* Totals */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="font-medium">AED {calculateTotals().subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-600">Tax</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.tax}
                                    onChange={(e) => setFormData({...formData, tax: e.target.value})}
                                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center"
                                />
                                <span className="text-slate-400">%</span>
                            </div>
                            <span className="font-medium">AED {calculateTotals().taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2">
                            <span>Total</span>
                            <span>AED {calculateTotals().total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">Notes</label>
                        <textarea
                            rows={2}
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingQuotation ? 'Save Changes' : 'Create Quotation'}</Button>
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
                        <h3 className="text-lg font-medium text-slate-900">Delete Quotation?</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Are you sure you want to delete this quotation? This action cannot be undone.
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
                            Delete Quotation
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SalesQuotations;
