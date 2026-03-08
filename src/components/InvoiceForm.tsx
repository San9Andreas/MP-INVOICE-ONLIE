import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../store/auth';
import { useInvoices } from '../store/invoices';
import type { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import {
  Plus, Trash2, Save, ArrowLeft, Building2, User, DollarSign, FileText, Hash, Calendar, Percent, StickyNote,
  Cloud, HardDrive, Loader2,
} from 'lucide-react';

const CURRENCIES = [
  { code: 'MMK', symbol: 'Ks', name: 'Myanmar Kyats' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];

function getCurrencySymbol(code: string) {
  return CURRENCIES.find(c => c.code === code)?.symbol || 'Ks';
}

function formatCurrency(amount: number, currency: string) {
  const sym = getCurrencySymbol(currency);
  return `${sym}${amount.toFixed(2)}`;
}

function generateInvoiceNumber() {
  const d = new Date();
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function getDefaultInvoice(userName: string, userId: string, userRole: 'owner' | 'staff'): Invoice {
  const today = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  return {
    id: uuidv4(),
    invoiceNumber: generateInvoiceNumber(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    date: today,
    dueDate: due,
    currency: 'MMK',
    senderName: '', senderEmail: '', senderPhone: '', senderWebsite: '', senderAddress: '', senderCity: '',
    clientName: '', clientCompany: '', clientEmail: '', clientPhone: '', clientAddress: '', clientCity: '',
    items: [{ id: uuidv4(), description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0, taxRate: 0, taxAmount: 0, discountRate: 0, discountAmount: 0, total: 0,
    notes: '', terms: 'Payment is due within 30 days of the invoice date.',
    createdBy: userId,
    createdByName: userName,
    createdByRole: userRole,
  };
}

interface InvoiceFormProps {
  editInvoiceId?: string | null;
  onBack: () => void;
  onPreview: (id: string) => void;
}

export default function InvoiceForm({ editInvoiceId, onBack, onPreview }: InvoiceFormProps) {
  const { user, isOwner } = useAuth();
  const { addInvoice, updateInvoice, getInvoice, storageMode, firestoreConnected } = useInvoices();

  const isEditing = !!editInvoiceId;
  const existingInvoice = editInvoiceId ? getInvoice(editInvoiceId) : null;

  const [invoice, setInvoice] = useState<Invoice>(() => {
    if (existingInvoice) return { ...existingInvoice };
    return getDefaultInvoice(user?.name || '', user?.id || '', user?.role || 'staff');
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Permission check: Only owners can edit
  if (isEditing && !isOwner) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">Staff members cannot edit invoices. Contact an Owner for changes.</p>
          <button onClick={onBack} className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const updateField = (field: keyof Invoice, value: string | number) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setInvoice(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      items[idx].amount = items[idx].quantity * items[idx].rate;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, { id: uuidv4(), description: '', quantity: 1, rate: 0, amount: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    if (invoice.items.length <= 1) return;
    setInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const discountAmount = subtotal * (invoice.discountRate / 100);
    const total = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, discountAmount, total };
  }, [invoice.items, invoice.taxRate, invoice.discountRate]);

  useEffect(() => {
    setInvoice(prev => ({
      ...prev,
      subtotal: calculations.subtotal,
      taxAmount: calculations.taxAmount,
      discountAmount: calculations.discountAmount,
      total: calculations.total,
    }));
  }, [calculations]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalInvoice = {
        ...invoice,
        ...calculations,
        items: invoice.items.map(i => ({ ...i, amount: i.quantity * i.rate })),
        updatedAt: new Date().toISOString(),
      };
      if (isEditing) {
        await updateInvoice(finalInvoice);
      } else {
        await addInvoice(finalInvoice);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPreview = async () => {
    await handleSave();
    setTimeout(() => onPreview(invoice.id), 200);
  };

  const inputClass = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isEditing ? 'Edit Invoice' : 'New Invoice'}
            </h1>
            <p className="text-sm text-slate-500">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : saving
                ? 'bg-slate-200 text-slate-500 cursor-wait'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSaveAndPreview}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            Save & Preview
          </button>
        </div>
      </div>

      {/* Storage mode banner */}
      <div className={`mb-6 p-3 rounded-xl flex items-center gap-2 text-sm ${
        storageMode === 'firestore' && firestoreConnected
          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
          : 'bg-slate-50 border border-slate-200 text-slate-600'
      }`}>
        {storageMode === 'firestore' && firestoreConnected ? (
          <>
            <Cloud className="w-4 h-4 flex-shrink-0" />
            <span>Saving to <strong>Firebase Firestore</strong> — data syncs in real-time across all devices.</span>
          </>
        ) : (
          <>
            <HardDrive className="w-4 h-4 flex-shrink-0" />
            <span>Saving to <strong>Local Storage</strong> — configure Firebase environment variables to enable cloud sync.</span>
          </>
        )}
      </div>

      <div className="space-y-6">
        {/* Invoice Meta */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Hash className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Invoice Details</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Invoice Number</label>
              <input value={invoice.invoiceNumber} onChange={e => updateField('invoiceNumber', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={invoice.status}
                onChange={e => updateField('status', e.target.value as InvoiceStatus)}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Invoice Date</label>
              <input type="date" value={invoice.date} onChange={e => updateField('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" value={invoice.dueDate} onChange={e => updateField('dueDate', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Currency</label>
            <select value={invoice.currency} onChange={e => updateField('currency', e.target.value)} className={`${inputClass} max-w-xs`}>
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.symbol} {c.code} – {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sender & Client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">From (Your Details)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Name / Business</label>
                <input value={invoice.senderName} onChange={e => updateField('senderName', e.target.value)} className={inputClass} placeholder="Your Business Name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={invoice.senderEmail} onChange={e => updateField('senderEmail', e.target.value)} className={inputClass} placeholder="email@company.com" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={invoice.senderPhone} onChange={e => updateField('senderPhone', e.target.value)} className={inputClass} placeholder="+1 234 567 890" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Website</label>
                <input value={invoice.senderWebsite} onChange={e => updateField('senderWebsite', e.target.value)} className={inputClass} placeholder="www.company.com" />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input value={invoice.senderAddress} onChange={e => updateField('senderAddress', e.target.value)} className={inputClass} placeholder="123 Business St" />
              </div>
              <div>
                <label className={labelClass}>City, State, ZIP</label>
                <input value={invoice.senderCity} onChange={e => updateField('senderCity', e.target.value)} className={inputClass} placeholder="New York, NY 10001" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Bill To (Client)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Client Name</label>
                <input value={invoice.clientName} onChange={e => updateField('clientName', e.target.value)} className={inputClass} placeholder="Client Name" />
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <input value={invoice.clientCompany} onChange={e => updateField('clientCompany', e.target.value)} className={inputClass} placeholder="Client Company" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={invoice.clientEmail} onChange={e => updateField('clientEmail', e.target.value)} className={inputClass} placeholder="client@email.com" />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={invoice.clientPhone} onChange={e => updateField('clientPhone', e.target.value)} className={inputClass} placeholder="+1 234 567 890" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input value={invoice.clientAddress} onChange={e => updateField('clientAddress', e.target.value)} className={inputClass} placeholder="456 Client Ave" />
              </div>
              <div>
                <label className={labelClass}>City, State, ZIP</label>
                <input value={invoice.clientCity} onChange={e => updateField('clientCity', e.target.value)} className={inputClass} placeholder="Los Angeles, CA 90001" />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Line Items</h2>
            </div>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          {/* Table header - desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 px-2">
            <div className="col-span-5 text-xs font-semibold text-slate-400 uppercase">Description</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase">Qty</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase">Rate</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase text-right">Amount</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-3">
            {invoice.items.map((item, idx) => (
              <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">Description</label>
                    <input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className={inputClass}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={e => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">Amount</label>
                    <span className="text-sm font-semibold text-slate-700">
                      {formatCurrency(item.quantity * item.rate, invoice.currency)}
                    </span>
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={invoice.items.length <= 1}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{formatCurrency(calculations.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Percent className="w-3 h-3" /> Tax
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={invoice.taxRate}
                  onChange={e => updateField('taxRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="ml-auto text-sm font-medium text-slate-700">
                  +{formatCurrency(calculations.taxAmount, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Percent className="w-3 h-3" /> Discount
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={invoice.discountRate}
                  onChange={e => updateField('discountRate', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="ml-auto text-sm font-medium text-red-500">
                  -{formatCurrency(calculations.discountAmount, invoice.currency)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="text-base font-bold text-slate-800">Total</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(calculations.total, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Notes</h2>
            </div>
            <textarea
              value={invoice.notes}
              onChange={e => updateField('notes', e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="Additional notes for the client..."
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Terms & Conditions</h2>
            </div>
            <textarea
              value={invoice.terms}
              onChange={e => updateField('terms', e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="Payment terms..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
