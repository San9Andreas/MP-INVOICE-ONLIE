import { useState, useMemo } from 'react';
import { useInvoices } from '../store/invoices';
import { useAuth } from '../store/auth';
import type { InvoiceStatus } from '../types';
import {
  Search, Eye, Edit, Trash2, Filter, ArrowUpDown, FileText, Calendar, DollarSign,
  ChevronLeft, ChevronRight, Users, Shield,
} from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  MMK: 'Ks', THB: '฿', USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', INR: '₹', BRL: 'R$',
};

function fmt(amount: number, currency: string) {
  return `${CURRENCY_SYMBOLS[currency] || 'Ks'}${amount.toFixed(2)}`;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

interface Props {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const PER_PAGE = 10;

export default function InvoiceHistory({ onView, onEdit }: Props) {
  const { invoices, deleteInvoice } = useInvoices();
  const { isOwner } = useAuth();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'date' | 'total' | 'client'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...invoices];

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(inv =>
        inv.clientName.toLowerCase().includes(q) ||
        inv.clientCompany.toLowerCase().includes(q) ||
        inv.clientEmail.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.senderName.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(inv => inv.status === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      else if (sortField === 'total') cmp = a.total - b.total;
      else cmp = a.clientName.localeCompare(b.clientName);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [invoices, query, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (field: 'date' | 'total' | 'client') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) return;
    if (confirm('Delete this invoice permanently?')) {
      await deleteInvoice(id);
    }
  };

  // Stats
  const totalRevenue = invoices.reduce((s, i) => s + (i.status === 'paid' ? i.total : 0), 0);
  const uniqueClients = new Set(invoices.map(i => i.clientEmail || i.clientName).filter(Boolean)).size;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Invoice History</h1>
        <p className="text-sm text-slate-500 mt-1">Search and manage all invoices</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase">Clients</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{uniqueClients}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-400 uppercase">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{invoices.filter(i => i.status === 'overdue').length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Search by client name, company, email, invoice number..."
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value as InvoiceStatus | 'all'); setPage(1); }}
                  className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No invoices found</p>
            <p className="text-sm text-slate-400 mt-1">
              {query ? 'Try adjusting your search terms' : 'Create your first invoice to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Invoice</th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase cursor-pointer hover:text-slate-600 select-none"
                      onClick={() => toggleSort('client')}
                    >
                      <span className="flex items-center gap-1">Client <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase cursor-pointer hover:text-slate-600 select-none"
                      onClick={() => toggleSort('date')}
                    >
                      <span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase cursor-pointer hover:text-slate-600 select-none"
                      onClick={() => toggleSort('total')}
                    >
                      <span className="flex items-center gap-1 justify-end">Amount <ArrowUpDown className="w-3 h-3" /></span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Created By</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-indigo-600 font-semibold">{inv.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-slate-800">{inv.clientName || '—'}</p>
                          {inv.clientCompany && <p className="text-xs text-slate-400">{inv.clientCompany}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-sm">{new Date(inv.date + 'T00:00:00').toLocaleDateString()}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-800">{fmt(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-slate-600">{inv.createdByName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            inv.createdByRole === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            {inv.createdByRole}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onView(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          {isOwner && (
                            <>
                              <button onClick={() => onEdit(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Edit">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginated.map(inv => (
                <div key={inv.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-xs text-indigo-600 font-semibold">{inv.invoiceNumber}</p>
                      <p className="font-medium text-slate-800 mt-0.5">{inv.clientName || '—'}</p>
                      {inv.clientCompany && <p className="text-xs text-slate-400">{inv.clientCompany}</p>}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{new Date(inv.date + 'T00:00:00').toLocaleDateString()}</span>
                      <span className="font-semibold text-slate-800 text-sm">{fmt(inv.total, inv.currency)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onView(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Eye className="w-4 h-4" />
                      </button>
                      {isOwner && (
                        <>
                          <button onClick={() => onEdit(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, page - 3), Math.min(totalPages, page + 2)
                  ).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium ${
                        p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* RBAC Legend */}
      {!isOwner && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>As <strong>Staff</strong>, you can view, print, and download invoices. Editing and deleting requires <strong>Owner</strong> access.</span>
        </div>
      )}
    </div>
  );
}
