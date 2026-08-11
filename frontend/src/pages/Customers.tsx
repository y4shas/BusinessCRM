import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../api';
import { Users, Plus, Search, Phone, Mail, Building, ChevronRight, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  LEAD: 'badge-amber',
  ACTIVE: 'badge-green',
  INACTIVE: 'badge-gray',
};

const TYPE_BADGE: Record<string, string> = {
  RETAIL: 'badge-blue',
  WHOLESALE: 'badge-purple',
  DISTRIBUTOR: 'badge-teal',
};

interface CustomerFormData {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: string;
  address: string;
  status: string;
  notes: string;
}

const emptyForm: CustomerFormData = {
  name: '', mobile: '', email: '', businessName: '',
  gstNumber: '', customerType: 'RETAIL', address: '', status: 'LEAD', notes: '',
};

function CustomerModal({
  initial, onClose, onSave
}: { initial?: any; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState<CustomerFormData>(
    initial ? {
      name: initial.name ?? '',
      mobile: initial.mobile ?? '',
      email: initial.email ?? '',
      businessName: initial.businessName ?? '',
      gstNumber: initial.gstNumber ?? '',
      customerType: initial.customerType ?? 'RETAIL',
      address: initial.address ?? '',
      status: initial.status ?? 'LEAD',
      notes: initial.notes ?? '',
    } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CustomerFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, email: form.email || null, businessName: form.businessName || null, gstNumber: form.gstNumber || null, address: form.address || null, notes: form.notes || null });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up">
        <div className="modal-header">
          <h2>{initial ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile *</label>
                <input className="form-input" required value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="9876543210" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input className="form-input" value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder="Company name" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Customer Type *</label>
                <select className="form-select" value={form.customerType} onChange={e => set('customerType', e.target.value)}>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="form-input" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-textarea" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address..." style={{ minHeight: 70 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." style={{ minHeight: 70 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search, statusFilter],
    queryFn: () => customersApi.list({ page, limit: 20, search: search || undefined, status: statusFilter || undefined }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => customersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer created!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => customersApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer updated!'); },
  });

  const customers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage your customer base and follow-ups</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setShowModal(true); }}>
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-bar" style={{ maxWidth: 380 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Search name, mobile, business..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          {meta && <span className="pagination-info">{meta.total} customers</span>}
        </div>

        {/* Table */}
        <div className="table-wrapper">
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={24} color="var(--text-muted)" /></div>
              <h3>No customers found</h3>
              <p>Add your first customer to get started.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                <Plus size={14} /> Add Customer
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: any) => (
                  <tr key={c.id}>
                    <td className="td-primary">{c.name}</td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm"><Phone size={11} color="var(--text-muted)" /> {c.mobile}</span>
                        {c.email && <span className="flex items-center gap-1 text-xs text-muted"><Mail size={11} color="var(--text-muted)" /> {c.email}</span>}
                      </div>
                    </td>
                    <td>
                      {c.businessName ? (
                        <span className="flex items-center gap-1 text-sm"><Building size={12} color="var(--text-muted)" /> {c.businessName}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td><span className={`badge ${TYPE_BADGE[c.customerType] ?? 'badge-gray'}`}>{c.customerType}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{c.status}</span></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setEditCustomer(c); setShowModal(true); }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CustomerModal
          initial={editCustomer}
          onClose={() => setShowModal(false)}
          onSave={async (d) => {
            if (editCustomer) {
              await updateMutation.mutateAsync({ id: editCustomer.id, ...d });
            } else {
              await createMutation.mutateAsync(d);
            }
          }}
        />
      )}
    </div>
  );
}
