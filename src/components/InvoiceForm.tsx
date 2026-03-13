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
  { code: 'MMK', symbol: 'Ks', name: 'မြန်မာကျပ်' },
  { code: 'THB', symbol: '฿', name: 'ထိုင်းဘတ်' },
  { code: 'USD', symbol: '$', name: 'အမေရိကန်ဒေါ်လာ' },
  { code: 'EUR', symbol: '€', name: 'ယူရို' },
  { code: 'GBP', symbol: '£', name: 'ဗြိတိသျှပေါင်' },
  { code: 'JPY', symbol: '¥', name: 'ဂျပန်ယန်း' },
  { code: 'CAD', symbol: 'C$', name: 'ကနေဒါဒေါ်လာ' },
  { code: 'AUD', symbol: 'A$', name: 'သြစတြေးလျဒေါ်လာ' },
  { code: 'INR', symbol: '₹', name: 'အိန္ဒိယရူပီး' },
  { code: 'BRL', symbol: 'R$', name: 'ဘရာဇီးရီယဲ' },
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
    subtotal: 0, taxRate: 0, taxAmount: 0, discountRate: 0, discountAmount: 0, total: 0, paidAmount: 0, balanceDue: 0,
    notes: '', terms: 'ပြေစာရက်စွဲမှ ရက် ၃၀ အတွင်း ပေးချေရမည်။',
    createdBy: userId,
    createdByName: userName,
    createdByRole: userRole,
  };
}

/* ── Number Input Component (fixes mobile backspace issue) ── */
function NumberInput({
  value,
  onChange,
  placeholder = '',
  className = '',
  min,
  step,
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  step?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? '' : String(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when not focused
  useEffect(() => {
    if (!focused) {
      setDisplayValue(value === 0 ? '' : String(value));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, digits, and decimal point
    if (raw === '' || /^[0-9]*\.?[0-9]*$/.test(raw)) {
      setDisplayValue(raw);
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        if (min !== undefined && num < min) return;
        onChange(num);
      } else {
        onChange(0);
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const num = parseFloat(displayValue);
    if (isNaN(num) || displayValue === '') {
      setDisplayValue('');
      onChange(0);
    } else {
      setDisplayValue(String(num));
      onChange(num);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder || '0'}
      className={className}
      data-step={step}
    />
  );
}

interface InvoiceFormProps {
  editInvoiceId?: string | null;
  onBack: () => void;
  onPreview: (id: string) => void;
}

export default function InvoiceForm({ editInvoiceId, onBack, onPreview }: InvoiceFormProps) {
  const { user } = useAuth();
  const { addInvoice, updateInvoice, getInvoice, storageMode, firestoreConnected } = useInvoices();

  const isEditing = !!editInvoiceId;
  const existingInvoice = editInvoiceId ? getInvoice(editInvoiceId) : null;

  const [invoice, setInvoice] = useState<Invoice>(() => {
    if (existingInvoice) return { ...existingInvoice };
    return getDefaultInvoice(user?.name || '', user?.id || '', user?.role || 'staff');
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const calculations = useMemo(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const discountAmount = subtotal * (invoice.discountRate / 100);
    const total = subtotal + taxAmount - discountAmount;
    const balanceDue = total - invoice.paidAmount;
    return { subtotal, taxAmount, discountAmount, total, balanceDue };
  }, [invoice.items, invoice.taxRate, invoice.discountRate, invoice.paidAmount]);

  useEffect(() => {
    setInvoice(prev => ({
      ...prev,
      subtotal: calculations.subtotal,
      taxAmount: calculations.taxAmount,
      discountAmount: calculations.discountAmount,
      total: calculations.total,
      balanceDue: calculations.balanceDue,
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
              {isEditing ? 'ပြေစာ ပြင်ဆင်ရန်' : 'ပြေစာ အသစ်ဖန်တီးရန်'}
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
            {saved ? 'သိမ်းပြီး!' : saving ? 'သိမ်းနေသည်...' : 'မူကြမ်းသိမ်းရန်'}
          </button>
          <button
            onClick={handleSaveAndPreview}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/20 disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            သိမ်းပြီး ကြည့်ရန်
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
            <span><strong>Firebase Firestore</strong> တွင် သိမ်းဆည်းနေသည် — စက်အားလုံးတွင် အချိန်နှင့်တစ်ပြေးညီ sync ဖြစ်သည်။</span>
          </>
        ) : (
          <>
            <HardDrive className="w-4 h-4 flex-shrink-0" />
            <span><strong>Local Storage</strong> တွင် သိမ်းဆည်းနေသည် — Cloud sync ဖွင့်ရန် Firebase သတ်မှတ်ပါ။</span>
          </>
        )}
      </div>

      <div className="space-y-6">
        {/* Invoice Meta */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Hash className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">ပြေစာ အသေးစိတ်</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>ပြေစာ နံပါတ်</label>
              <input value={invoice.invoiceNumber} onChange={e => updateField('invoiceNumber', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>အခြေအနေ</label>
              <select
                value={invoice.status}
                onChange={e => updateField('status', e.target.value as InvoiceStatus)}
                className={inputClass}
              >
                <option value="draft">မူကြမ်း</option>
                <option value="sent">ပို့ပြီး</option>
                <option value="paid">ပေးပြီး</option>
                <option value="overdue">ရက်လွန်</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>ပြေစာ ရက်စွဲ</label>
              <input type="date" value={invoice.date} onChange={e => updateField('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>နောက်ဆုံးရက်</label>
              <input type="date" value={invoice.dueDate} onChange={e => updateField('dueDate', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>ငွေကြေးအမျိုးအစား</label>
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
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">ပို့သူ (သင့်အချက်အလက်)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>အမည် / လုပ်ငန်း</label>
                <input value={invoice.senderName} onChange={e => updateField('senderName', e.target.value)} className={inputClass} placeholder="သင့်လုပ်ငန်းအမည်" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>အီးမေးလ်</label>
                  <input type="email" value={invoice.senderEmail} onChange={e => updateField('senderEmail', e.target.value)} className={inputClass} placeholder="email@company.com" />
                </div>
                <div>
                  <label className={labelClass}>ဖုန်း</label>
                  <input value={invoice.senderPhone} onChange={e => updateField('senderPhone', e.target.value)} className={inputClass} placeholder="+95 9XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className={labelClass}>ဝဘ်ဆိုဒ်</label>
                <input value={invoice.senderWebsite} onChange={e => updateField('senderWebsite', e.target.value)} className={inputClass} placeholder="www.company.com" />
              </div>
              <div>
                <label className={labelClass}>လိပ်စာ</label>
                <input value={invoice.senderAddress} onChange={e => updateField('senderAddress', e.target.value)} className={inputClass} placeholder="လမ်း/ရပ်ကွက်" />
              </div>
              <div>
                <label className={labelClass}>မြို့, ပြည်နယ်</label>
                <input value={invoice.senderCity} onChange={e => updateField('senderCity', e.target.value)} className={inputClass} placeholder="ရန်ကုန်, မြန်မာ" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">လက်ခံသူ (ဖောက်သည်)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>ဖောက်သည် အမည်</label>
                <input value={invoice.clientName} onChange={e => updateField('clientName', e.target.value)} className={inputClass} placeholder="ဖောက်သည်အမည်" />
              </div>
              <div>
                <label className={labelClass}>ကုမ္ပဏီ</label>
                <input value={invoice.clientCompany} onChange={e => updateField('clientCompany', e.target.value)} className={inputClass} placeholder="ကုမ္ပဏီအမည်" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>အီးမေးလ်</label>
                  <input type="email" value={invoice.clientEmail} onChange={e => updateField('clientEmail', e.target.value)} className={inputClass} placeholder="client@email.com" />
                </div>
                <div>
                  <label className={labelClass}>ဖုန်း</label>
                  <input value={invoice.clientPhone} onChange={e => updateField('clientPhone', e.target.value)} className={inputClass} placeholder="+95 9XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className={labelClass}>လိပ်စာ</label>
                <input value={invoice.clientAddress} onChange={e => updateField('clientAddress', e.target.value)} className={inputClass} placeholder="လမ်း/ရပ်ကွက်" />
              </div>
              <div>
                <label className={labelClass}>မြို့, ပြည်နယ်</label>
                <input value={invoice.clientCity} onChange={e => updateField('clientCity', e.target.value)} className={inputClass} placeholder="မန္တလေး, မြန်မာ" />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">ပစ္စည်းစာရင်း</h2>
            </div>
            <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">
              <Plus className="w-3.5 h-3.5" /> ထည့်ရန်
            </button>
          </div>

          {/* Table header - desktop */}
          <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 px-2">
            <div className="col-span-5 text-xs font-semibold text-slate-400 uppercase">အကြောင်းအရာ</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase">အရေအတွက်</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase">နှုန်း</div>
            <div className="col-span-2 text-xs font-semibold text-slate-400 uppercase text-right">ပမာဏ</div>
            <div className="col-span-1" />
          </div>

          <div className="space-y-3">
            {invoice.items.map((item, idx) => (
              <div key={item.id} className="bg-slate-50 rounded-xl p-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">အကြောင်းအရာ</label>
                    <input
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className={inputClass}
                      placeholder="ပစ္စည်း အကြောင်းအရာ"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">အရေအတွက်</label>
                    <NumberInput
                      value={item.quantity}
                      onChange={val => updateItem(idx, 'quantity', val)}
                      min={0}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">နှုန်း</label>
                    <NumberInput
                      value={item.rate}
                      onChange={val => updateItem(idx, 'rate', val)}
                      min={0}
                      step="0.01"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2 text-right">
                    <label className="sm:hidden text-xs font-semibold text-slate-400 uppercase mb-1 block">ပမာဏ</label>
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
                <span className="text-slate-500">ခွဲစုစုပေါင်း</span>
                <span className="font-medium text-slate-700">{formatCurrency(calculations.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Percent className="w-3 h-3" /> အခွန်
                </div>
                <NumberInput
                  value={invoice.taxRate}
                  onChange={val => updateField('taxRate', val)}
                  min={0}
                  className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="ml-auto text-sm font-medium text-slate-700">
                  +{formatCurrency(calculations.taxAmount, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <Percent className="w-3 h-3" /> လျှော့စျေး
                </div>
                <NumberInput
                  value={invoice.discountRate}
                  onChange={val => updateField('discountRate', val)}
                  min={0}
                  className="w-20 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="ml-auto text-sm font-medium text-red-500">
                  -{formatCurrency(calculations.discountAmount, invoice.currency)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="text-base font-bold text-slate-800">စုစုပေါင်း</span>
                <span className="text-xl font-bold text-indigo-600">{formatCurrency(calculations.total, invoice.currency)}</span>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <DollarSign className="w-3 h-3" /> ပေးပြီးငွေ
                </div>
                <NumberInput
                  value={invoice.paidAmount}
                  onChange={val => updateField('paidAmount', val)}
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className="w-28 px-2 py-1 text-sm border border-emerald-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50"
                />
                <span className="ml-auto text-sm font-medium text-emerald-600">
                  {formatCurrency(invoice.paidAmount, invoice.currency)}
                </span>
              </div>
              <div className={`border-t-2 pt-3 flex justify-between ${calculations.balanceDue <= 0 ? 'border-emerald-300' : 'border-red-300'}`}>
                <span className={`text-base font-bold ${calculations.balanceDue <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {calculations.balanceDue <= 0 ? '✓ အပြည့်ပေးပြီး' : 'ကျန်ငွေ'}
                </span>
                <span className={`text-xl font-bold ${calculations.balanceDue <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.max(0, calculations.balanceDue), invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">မှတ်ချက်</h2>
            </div>
            <textarea
              value={invoice.notes}
              onChange={e => updateField('notes', e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="ဖောက်သည်အတွက် ထပ်ဆောင်းမှတ်ချက်များ..."
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">စည်းကမ်းချက်များ</h2>
            </div>
            <textarea
              value={invoice.terms}
              onChange={e => updateField('terms', e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="ပေးချေမှု စည်းကမ်းချက်များ..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
