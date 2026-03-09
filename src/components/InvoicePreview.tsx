import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useInvoices } from '../store/invoices';
import { useAuth } from '../store/auth';
import {
  ArrowLeft, Printer, Download, Edit, Trash2, Mail, Phone, Globe, MapPin, Shield,
  ImageDown, Loader2,
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
  const invoiceRef = useRef<HTMLDivElement>(null);
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

  const handleDownloadPNG = async () => {
    if (!invoiceRef.current || downloading) return;
    setDownloading(true);

    try {
      // Simple direct capture — most reliable approach
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
      });

      // PNG is the default and most reliable format for toDataURL
      const dataUrl = canvas.toDataURL('image/png');

      // Trigger download
      const link = document.createElement('a');
      link.download = `${invoice.invoiceNumber || 'invoice'}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('PNG generation error (attempt 1):', err);

      // Fallback: minimal options
      try {
        const canvas = await html2canvas(invoiceRef.current!, {
          scale: 1,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: false,
          allowTaint: true,
          foreignObjectRendering: false,
        });

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${invoice.invoiceNumber || 'invoice'}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err2) {
        console.error('PNG generation error (attempt 2):', err2);

        // Final fallback: use SVG serialization
        try {
          const el = invoiceRef.current!;
          const rect = el.getBoundingClientRect();
          const c = document.createElement('canvas');
          c.width = rect.width * 2;
          c.height = rect.height * 2;
          const ctx = c.getContext('2d')!;
          ctx.scale(2, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, rect.width, rect.height);

          const svgData = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
              <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml">${el.innerHTML}</div>
              </foreignObject>
            </svg>`;

          const img = new window.Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            const dataUrl = c.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${invoice.invoiceNumber || 'invoice'}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };
          img.onerror = () => {
            alert('Could not generate image. Please use Print → Save as PDF instead.');
          };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
        } catch {
          alert('Could not generate image. Please use Print → Save as PDF instead.');
        }
      }
    } finally {
      setDownloading(false);
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
            onClick={handleDownloadPNG}
            disabled={downloading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              downloading
                ? 'bg-amber-100 text-amber-700 cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-sm hover:shadow-md'
            }`}
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <ImageDown className="w-4 h-4" /> Download PNG
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

      {/* Invoice Document — this div is captured for PNG download */}
      <div
        ref={invoiceRef}
        className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden print:shadow-none print:border-none print:rounded-none"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)', padding: '24px 32px' }}>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-0.025em', margin: 0 }}>INVOICE</h2>
              <p style={{ color: '#a5b4fc', marginTop: '4px', fontSize: '14px', fontFamily: 'monospace' }}>{invoice.invoiceNumber}</p>
            </div>
            <div className="text-left sm:text-right">
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: invoice.status === 'paid' ? '#a7f3d0' : invoice.status === 'overdue' ? '#fca5a5' : '#ffffff',
                backgroundColor: invoice.status === 'paid' ? 'rgba(52, 211, 153, 0.2)' : invoice.status === 'overdue' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                border: `1px solid ${invoice.status === 'paid' ? 'rgba(52, 211, 153, 0.3)' : invoice.status === 'overdue' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(255, 255, 255, 0.3)'}`,
              }}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px' }}>
          {/* Dates + Amount */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
            <div style={{ minWidth: '120px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Invoice Date</p>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', marginTop: '4px' }}>{fmtDate(invoice.date)}</p>
            </div>
            <div style={{ minWidth: '120px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Due Date</p>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', marginTop: '4px' }}>{fmtDate(invoice.dueDate)}</p>
            </div>
            <div style={{ minWidth: '80px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Currency</p>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b', marginTop: '4px' }}>{invoice.currency}</p>
            </div>
            <div style={{ minWidth: '120px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Amount Due</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#4f46e5', marginTop: '4px' }}>{fmt(invoice.total, invoice.currency)}</p>
            </div>
            <div style={{ minWidth: '120px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Paid</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>{fmt(invoice.paidAmount || 0, invoice.currency)}</p>
            </div>
            <div style={{ minWidth: '120px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Balance Due</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: (invoice.balanceDue ?? invoice.total) <= 0 ? '#059669' : '#dc2626', marginTop: '4px' }}>
                {fmt(Math.max(0, invoice.balanceDue ?? invoice.total), invoice.currency)}
              </p>
            </div>
          </div>

          {/* From / To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>From</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{invoice.senderName || '—'}</p>
              {invoice.senderEmail && <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail style={{ width: 12, height: 12 }} />{invoice.senderEmail}</p>}
              {invoice.senderPhone && <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone style={{ width: 12, height: 12 }} />{invoice.senderPhone}</p>}
              {invoice.senderWebsite && <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Globe style={{ width: 12, height: 12 }} />{invoice.senderWebsite}</p>}
              {(invoice.senderAddress || invoice.senderCity) && (
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0 }} />
                  <span>{[invoice.senderAddress, invoice.senderCity].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
            <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Bill To</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{invoice.clientName || '—'}</p>
              {invoice.clientCompany && <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>{invoice.clientCompany}</p>}
              {invoice.clientEmail && <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail style={{ width: 12, height: 12 }} />{invoice.clientEmail}</p>}
              {invoice.clientPhone && <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone style={{ width: 12, height: 12 }} />{invoice.clientPhone}</p>}
              {(invoice.clientAddress || invoice.clientCity) && (
                <p style={{ fontSize: '13px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin style={{ width: 12, height: 12, marginTop: 2, flexShrink: 0 }} />
                  <span>{[invoice.clientAddress, invoice.clientCity].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '32px' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '12px 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '12px 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '12px 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '12px 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                    <td style={{ padding: '12px 4px', color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 4px', color: '#1e293b', fontWeight: 500 }}>{item.description || '—'}</td>
                    <td style={{ padding: '12px 4px', textAlign: 'right', color: '#475569' }}>{item.quantity}</td>
                    <td style={{ padding: '12px 4px', textAlign: 'right', color: '#475569' }}>{fmt(item.rate, invoice.currency)}</td>
                    <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>{fmt(item.quantity * item.rate, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0' }}>
                <span style={{ color: '#64748b' }}>Subtotal</span>
                <span style={{ fontWeight: 500, color: '#334155' }}>{fmt(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0' }}>
                  <span style={{ color: '#64748b' }}>Tax ({invoice.taxRate}%)</span>
                  <span style={{ fontWeight: 500, color: '#334155' }}>+{fmt(invoice.taxAmount, invoice.currency)}</span>
                </div>
              )}
              {invoice.discountRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '6px 0' }}>
                  <span style={{ color: '#64748b' }}>Discount ({invoice.discountRate}%)</span>
                  <span style={{ fontWeight: 500, color: '#ef4444' }}>-{fmt(invoice.discountAmount, invoice.currency)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Total</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#4f46e5' }}>{fmt(invoice.total, invoice.currency)}</span>
              </div>
              {(invoice.paidAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '8px' }}>
                  <span style={{ color: '#059669', fontWeight: 500 }}>Paid Amount</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>-{fmt(invoice.paidAmount || 0, invoice.currency)}</span>
                </div>
              )}
              <div style={{
                borderTop: `2px solid ${(invoice.balanceDue ?? invoice.total) <= 0 ? '#86efac' : '#fca5a5'}`,
                paddingTop: '12px',
                marginTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: (invoice.balanceDue ?? invoice.total) <= 0 ? '#15803d' : '#b91c1c',
                }}>
                  {(invoice.balanceDue ?? invoice.total) <= 0 ? '✓ Fully Paid' : 'Balance Due'}
                </span>
                <span style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: (invoice.balanceDue ?? invoice.total) <= 0 ? '#059669' : '#dc2626',
                }}>
                  {fmt(Math.max(0, invoice.balanceDue ?? invoice.total), invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', paddingTop: '24px', marginTop: '24px', borderTop: '1px solid #f1f5f9' }}>
              {invoice.notes && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Notes</p>
                  <p style={{ fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap', margin: 0 }}>{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Terms & Conditions</p>
                  <p style={{ fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap', margin: 0 }}>{invoice.terms}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign: 'center', paddingTop: '24px', marginTop: '24px', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Created by {invoice.createdByName} • {new Date(invoice.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Info banner — hidden in print */}
      <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
            <ImageDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Download as PNG Image</p>
            <p className="text-xs text-slate-500">Click the <strong>&quot;Download PNG&quot;</strong> button above to save this invoice as a high-resolution PNG image. Perfect for sharing via messaging apps.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
