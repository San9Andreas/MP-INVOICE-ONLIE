import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useInvoices } from '../store/invoices';
import { useAuth } from '../store/auth';
import {
  ArrowLeft, Printer, Download, Edit, Trash2, Mail, Phone, Globe, MapPin, Shield,
  Image, Loader2,
} from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  MMK: 'Ks', THB: '฿', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', INR: '₹', BRL: 'R$',
};

function fmt(amount: number, currency: string) {
  const s = CURRENCY_SYMBOLS[currency] || 'Ks';
  return `${s}${amount.toFixed(2)}`;
}

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

interface Props {
  invoiceId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function InvoicePreview({ invoiceId, onBack, onEdit, onDelete }: Props) {
  const { getInvoice } = useInvoices();
  const { isOwner } = useAuth();
  const invoice = getInvoice(invoiceId);
  const invoiceDocRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  if (!invoice) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Invoice Not Found</h2>
        <button onClick={onBack} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500">Go Back</button>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoiceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJPEG = async () => {
    if (!invoiceDocRef.current || downloading) return;
    setDownloading(true);

    try {
      const el = invoiceDocRef.current;

      // Create a clone so we don't mutate the visible DOM
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.width = '900px';
      clone.style.minWidth = '900px';
      clone.style.maxWidth = '900px';
      clone.style.position = 'fixed';
      clone.style.top = '-99999px';
      clone.style.left = '-99999px';
      clone.style.zIndex = '-1';
      clone.style.backgroundColor = '#ffffff';
      clone.style.borderRadius = '0';
      document.body.appendChild(clone);

      // Wait for the clone to render
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 900,
        windowWidth: 900,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.body.querySelector('[data-invoice-doc]') || clonedDoc.body.firstElementChild;
          if (clonedEl) {
            (clonedEl as HTMLElement).style.borderRadius = '0';
            (clonedEl as HTMLElement).style.overflow = 'visible';
          }
        },
      });

      // Remove clone from DOM
      document.body.removeChild(clone);

      // Use toDataURL (more reliable than toBlob across browsers)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${invoice.invoiceNumber || 'invoice'}.jpg`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      setDownloading(false);
    } catch (err) {
      console.error('JPEG generation error:', err);
      setDownloading(false);

      // Fallback: try without cloning
      try {
        const el = invoiceDocRef.current;
        if (!el) return;
        const canvas = await html2canvas(el, {
          scale: 1,
          backgroundColor: '#ffffff',
          logging: false,
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${invoice.invoiceNumber || 'invoice'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackErr) {
        console.error('Fallback JPEG generation also failed:', fallbackErr);
        alert('Could not generate JPEG. Try using Print → Save as PDF instead.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Toolbar - hidden in print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{invoice.invoiceNumber}</h1>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[invoice.status]}`}>
              {invoice.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownloadJSON} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-all">
            <Download className="w-4 h-4" /> JSON
          </button>
          <button
            onClick={handleDownloadJPEG}
            disabled={downloading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              downloading
                ? 'bg-amber-100 text-amber-700 cursor-wait'
                : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-sm hover:shadow-md'
            }`}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Image className="w-4 h-4" /> Download JPEG
              </>
            )}
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => onEdit(invoice.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-all"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => { if (confirm('Delete this invoice permanently?')) onDelete(invoice.id); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* RBAC note for staff */}
      {!isOwner && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700 print:hidden">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>You have <strong>Staff</strong> access — you can view, print, and download but cannot edit or delete invoices.</span>
        </div>
      )}

      {/* Invoice Document — captured by html2canvas */}
      <div
        ref={invoiceDocRef}
        data-invoice-doc="true"
        className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden print:shadow-none print:border-none print:rounded-none"
        id="invoice-doc"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">INVOICE</h2>
              <p className="text-indigo-200 mt-1 text-sm font-mono">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                invoice.status === 'paid' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                : invoice.status === 'overdue' ? 'bg-red-400/20 text-red-200 border border-red-400/30'
                : 'bg-white/20 text-white border border-white/30'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Dates + Amount */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Invoice Date</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{fmtDate(invoice.date)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Due Date</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{fmtDate(invoice.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Currency</p>
              <p className="text-sm font-medium text-slate-800 mt-1">{invoice.currency}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Amount Due</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{fmt(invoice.total, invoice.currency)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Paid</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(invoice.paidAmount || 0, invoice.currency)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Balance Due</p>
              <p className={`text-xl font-bold mt-1 ${(invoice.balanceDue ?? invoice.total) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(Math.max(0, invoice.balanceDue ?? invoice.total), invoice.currency)}
              </p>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase mb-3">From</p>
              <p className="text-base font-bold text-slate-800">{invoice.senderName || '—'}</p>
              {invoice.senderEmail && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Mail className="w-3 h-3" />{invoice.senderEmail}</p>}
              {invoice.senderPhone && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" />{invoice.senderPhone}</p>}
              {invoice.senderWebsite && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Globe className="w-3 h-3" />{invoice.senderWebsite}</p>}
              {(invoice.senderAddress || invoice.senderCity) && (
                <p className="text-sm text-slate-600 flex items-start gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{[invoice.senderAddress, invoice.senderCity].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase mb-3">Bill To</p>
              <p className="text-base font-bold text-slate-800">{invoice.clientName || '—'}</p>
              {invoice.clientCompany && <p className="text-sm text-slate-600 mt-0.5">{invoice.clientCompany}</p>}
              {invoice.clientEmail && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Mail className="w-3 h-3" />{invoice.clientEmail}</p>}
              {invoice.clientPhone && <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" />{invoice.clientPhone}</p>}
              {(invoice.clientAddress || invoice.clientCity) && (
                <p className="text-sm text-slate-600 flex items-start gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{[invoice.clientAddress, invoice.clientCity].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase">Qty</th>
                  <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase">Rate</th>
                  <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
                    <td className="py-3 px-1 text-slate-400">{idx + 1}</td>
                    <td className="py-3 text-slate-800 font-medium">{item.description || '—'}</td>
                    <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600">{fmt(item.rate, invoice.currency)}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">{fmt(item.quantity * item.rate, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700">{fmt(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({invoice.taxRate}%)</span>
                  <span className="font-medium text-slate-700">+{fmt(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              {invoice.discountRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount ({invoice.discountRate}%)</span>
                  <span className="font-medium text-red-500">-{fmt(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-200 pt-3 flex justify-between">
                <span className="text-base font-bold text-slate-800">Total</span>
                <span className="text-xl font-bold text-indigo-600">{fmt(invoice.total, invoice.currency)}</span>
              </div>
              {(invoice.paidAmount || 0) > 0 && (
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-emerald-600 font-medium">Paid Amount</span>
                  <span className="font-semibold text-emerald-600">-{fmt(invoice.paidAmount || 0, invoice.currency)}</span>
                </div>
              )}
              <div className={`border-t-2 pt-3 flex justify-between ${(invoice.balanceDue ?? invoice.total) <= 0 ? 'border-emerald-300' : 'border-red-300'}`}>
                <span className={`text-base font-bold ${(invoice.balanceDue ?? invoice.total) <= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {(invoice.balanceDue ?? invoice.total) <= 0 ? '✓ Fully Paid' : 'Balance Due'}
                </span>
                <span className={`text-xl font-bold ${(invoice.balanceDue ?? invoice.total) <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmt(Math.max(0, invoice.balanceDue ?? invoice.total), invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Notes</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Terms & Conditions</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">Created by {invoice.createdByName} • {new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Download JPEG info banner — hidden in print */}
      <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Download as Image</p>
            <p className="text-xs text-slate-500">Click the <strong>"Download JPEG"</strong> button above to save this invoice as a high-resolution JPEG image file. Perfect for sharing via messaging apps or social media.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
