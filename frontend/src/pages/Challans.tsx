import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { challansApi, customersApi, productsApi } from '../api';
import { FileText, Plus, X, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-amber',
  CONFIRMED: 'badge-green',
  CANCELLED: 'badge-red',
};

interface ChallanItem { productId: number; quantity: number; _product?: any; }

function CreateChallanModal({ onClose }: { onClose: () => void }) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<ChallanItem[]>([{ productId: 0, quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customersApi.list({ limit: 200 }).then(r => r.data.data),
  });
  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: () => productsApi.list({ limit: 200 }).then(r => r.data.data),
  });

  const addItem = () => setItems(prev => [...prev, { productId: 0, quantity: 1 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const setItem = (i: number, field: keyof ChallanItem, val: any) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error('Please select a customer'); return; }
    const validItems = items.filter(i => i.productId > 0 && i.quantity > 0);
    if (!validItems.length) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      await challansApi.create({ customerId: parseInt(customerId), items: validItems.map(i => ({ productId: i.productId, quantity: i.quantity })) });
      qc.invalidateQueries({ queryKey: ['challans'] });
      toast.success('Challan created!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create challan');
    } finally {
      setSaving(false);
    }
  };

  const productMap = new Map<number, any>((products ?? []).map((p: any) => [p.id, p]));

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalValue = items.reduce((s, i) => {
    const p = productMap.get(i.productId);
    return s + (p ? Number(p.unitPrice) * i.quantity : 0);
  }, 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg slide-up">
        <div className="modal-header">
          <h2>Create Challan</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <select className="form-select" required value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Select customer...</option>
                {(customers ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}{c.businessName ? ` (${c.businessName})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Items *</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                  <Plus size={13} /> Add Row
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => {
                  const prod = productMap.get(item.productId);
                  return (
                    <div key={i} className="flex items-center gap-2" style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <select
                        className="form-select"
                        style={{ flex: 2 }}
                        value={item.productId || ''}
                        onChange={e => setItem(i, 'productId', parseInt(e.target.value))}
                      >
                        <option value="">Select product...</option>
                        {(products ?? []).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} (₹{Number(p.unitPrice).toLocaleString('en-IN')} · Stock: {p.currentStock})</option>
                        ))}
                      </select>
                      <input
                        type="number" min="1" className="form-input" style={{ width: 90 }}
                        value={item.quantity}
                        onChange={e => setItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      {prod && (
                        <span style={{ fontSize: 12, color: 'var(--accent-green)', whiteSpace: 'nowrap', minWidth: 80 }}>
                          ₹{(Number(prod.unitPrice) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      )}
                      <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(i)} disabled={items.length === 1}>
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="card card-sm" style={{ background: 'var(--bg-secondary)' }}>
              <div className="flex items-center justify-between">
                <span className="text-muted text-sm">Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{totalQty}</strong></span>
                <span className="text-sm">Estimated Total: <strong style={{ color: 'var(--accent-green)' }}>₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Create Challan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChallanDetailModal({ challan, onClose, onRefresh }: { challan: any; onClose: () => void; onRefresh: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await challansApi.confirm(challan.id);
      toast.success('Challan confirmed! Stock deducted.');
      onRefresh(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this challan? This will reverse stock if confirmed.')) return;
    setCancelling(true);
    try {
      await challansApi.cancel(challan.id);
      toast.success('Challan cancelled.');
      onRefresh(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await challansApi.downloadPdf(challan.id, challan.challanNumber);
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const total = (challan.items ?? []).reduce((s: number, i: any) => s + Number(i.lineTotal), 0);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg slide-up">
        <div className="modal-header">
          <div>
            <h2>{challan.challanNumber}</h2>
            <span className={`badge ${STATUS_BADGE[challan.status]}`} style={{ marginTop: 4 }}>{challan.status}</span>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {/* Customer info */}
          <div className="card card-sm" style={{ background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{challan.customer?.name}</div>
            <div className="text-xs text-muted">{challan.customer?.businessName} · {challan.customer?.mobile}</div>
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>Created: {new Date(challan.createdAt).toLocaleString()} by {challan.createdBy?.name}</div>
          </div>

          {/* Items table */}
          <div className="table-wrapper" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(challan.items ?? []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="td-primary">{item.productNameSnap}</td>
                    <td className="td-code">{item.skuSnap}</td>
                    <td>₹{Number(item.unitPriceSnap).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>{item.quantity}</td>
                    <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>₹{Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{challan.totalQuantity}</strong></span>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-green)' }}>
              Total: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-secondary" onClick={handleDownloadPdf} disabled={downloading} style={{ marginRight: 'auto' }}>
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Download PDF
          </button>
          {challan.status !== 'CANCELLED' && (
            <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Cancel Challan
            </button>
          )}
          {challan.status === 'DRAFT' && (
            <button className="btn btn-success" onClick={handleConfirm} disabled={confirming}>
              {confirming ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              Confirm & Deduct Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChallansPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [viewChallan, setViewChallan] = useState<any>(null);
  const { hasRole } = useAuth();
  const canCreate = hasRole('ADMIN', 'SALES');
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['challans', page, statusFilter],
    queryFn: () => challansApi.list({ page, limit: 20, status: statusFilter || undefined }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const challans = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Sales Challans</h1>
            <p className="page-subtitle">Create and manage delivery challans</p>
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Challan
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="toolbar">
          <select className="form-select" style={{ width: 'auto'}} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {meta && <span className="pagination-info">{meta.total} challans</span>}
        </div>

        <div className="table-wrapper">
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : challans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={24} color="var(--text-muted)" /></div>
              <h3>No challans found</h3>
              <p>Create your first challan to get started.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c: any) => (
                  <tr key={c.id}>
                    <td className="td-code td-primary">{c.challanNumber}</td>
                    <td>
                      <div className="td-primary">{c.customer?.name}</div>
                      <div className="text-xs text-muted">{c.customer?.businessName}</div>
                    </td>
                    <td>{c.totalQuantity}</td>
                    <td><span className={`badge ${STATUS_BADGE[c.status]}`}>{c.status}</span></td>
                    <td className="text-sm">{c.createdBy?.name}</td>
                    <td className="text-sm text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewChallan(c)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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

      {showCreate && <CreateChallanModal onClose={() => setShowCreate(false)} />}
      {viewChallan && <ChallanDetailModal challan={viewChallan} onClose={() => setViewChallan(null)} onRefresh={() => { refetch(); qc.invalidateQueries({ queryKey: ['challans'] }); }} />}
    </div>
  );
}
