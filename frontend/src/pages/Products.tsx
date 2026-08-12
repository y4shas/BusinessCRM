import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api';
import { Package, Plus, Search, AlertTriangle, X, Loader2, TrendingUp, TrendingDown, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string; sku: string; category: string;
  unitPrice: string; currentStock: string; minStockAlert: string; location: string;
}

const emptyForm: ProductFormData = {
  name: '', sku: '', category: '', unitPrice: '', currentStock: '0', minStockAlert: '0', location: '',
};

function ProductModal({ initial, onClose, onSave, onImageUploaded }: {
  initial?: any;
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
  onImageUploaded?: () => void;
}) {
  const [form, setForm] = useState<ProductFormData>(
    initial ? {
      name: initial.name, sku: initial.sku, category: initial.category ?? '',
      unitPrice: String(initial.unitPrice), currentStock: String(initial.currentStock),
      minStockAlert: String(initial.minStockAlert), location: initial.location ?? '',
    } : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof ProductFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        currentStock: parseInt(form.currentStock),
        minStockAlert: parseInt(form.minStockAlert),
        category: form.category || null,
        location: form.location || null,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleImageFile = async (file: File) => {
    if (!initial?.id) return;
    setUploading(true);
    try {
      const res = await productsApi.uploadImage(initial.id, file);
      setImageUrl(res.data.data.imageUrl);
      onImageUploaded?.();
      toast.success('Image uploaded!');
    } catch {
      toast.error('Image upload failed. Check your S3 bucket.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!initial?.id) return;
    setUploading(true);
    try {
      await productsApi.deleteImage(initial.id);
      setImageUrl(null);
      onImageUploaded?.();
      toast.success('Image removed');
    } catch {
      toast.error('Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up">
        <div className="modal-header">
          <h2>{initial ? 'Edit Product' : 'Add Product'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Image upload zone (edit mode only) ── */}
            {initial && (
              <div className="form-group">
                <label className="form-label">Product Image</label>
                {imageUrl ? (
                  <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={imageUrl} alt="Product" className="img-preview" />
                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => imgInputRef.current?.click()}
                        disabled={uploading}
                        style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                      >
                        {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                        style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.5)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`img-dropzone${dragOver ? ' drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                    onClick={() => imgInputRef.current?.click()}
                  >
                    {uploading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-blue)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading to S3…</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0', pointerEvents: 'none' }}>
                        <ImagePlus size={24} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WebP — max 5 MB</span>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={imgInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) handleImageFile(file);
                  }}
                />
              </div>
            )}

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Steel Rod 12mm" />
              </div>
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" required value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="STL-ROD-12" disabled={!!initial} />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Steel, Cement..." />
              </div>
              <div className="form-group">
                <label className="form-label">Unit Price (₹) *</label>
                <input className="form-input" required type="number" step="0.01" min="0" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="450.00" />
              </div>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Current Stock</label>
                <input className="form-input" type="number" min="0" value={form.currentStock} onChange={e => set('currentStock', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock Alert</label>
                <input className="form-input" type="number" min="0" value={form.minStockAlert} onChange={e => set('minStockAlert', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Rack A1, Bay B2..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

function StockMovementModal({ product, onClose }: { product: any; onClose: () => void }) {
  const [type, setType] = useState('IN');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await productsApi.addStockMovement(product.id, { quantity: parseInt(qty), movementType: type, reason: reason || null });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Stock ${type === 'IN' ? 'added' : 'deducted'} successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Stock update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>Adjust Stock</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card card-sm" style={{ background: 'var(--bg-secondary)' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
              <div className="text-xs text-muted">SKU: {product.sku} · Current stock: <strong style={{ color: 'var(--text-primary)' }}>{product.currentStock}</strong></div>
            </div>
            <div className="form-group">
              <label className="form-label">Movement Type</label>
              <div className="flex gap-2">
                {['IN', 'OUT'].map(t => (
                  <button key={t} type="button"
                    className={`btn ${type === t ? (t === 'IN' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setType(t)}
                  >
                    {t === 'IN' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    Stock {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" required type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter quantity" />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional reason..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !qty}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [stockProduct, setStockProduct] = useState<any>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadProduct, setPendingUploadProduct] = useState<any>(null);
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasRole('ADMIN', 'WAREHOUSE');

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, lowStockOnly],
    queryFn: () => productsApi.list({ page, limit: 20, search: search || undefined, lowStock: lowStockOnly || undefined }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => productsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => productsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated!'); },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Products & Inventory</h1>
            <p className="page-subtitle">Track stock levels and manage your product catalog</p>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="toolbar">
          <div className="search-bar" style={{ maxWidth: 380 }}>
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              placeholder="Search name or SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button
            className={`btn ${lowStockOnly ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => { setLowStockOnly(v => !v); setPage(1); }}
          >
            <AlertTriangle size={14} />
            {lowStockOnly ? 'Show All' : 'Low Stock'}
          </button>
          {meta && <span className="pagination-info">{meta.total} products</span>}
        </div>

        <div className="table-wrapper">
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Package size={24} color="var(--text-muted)" /></div>
              <h3>No products found</h3>
              <p>Start building your product catalog.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 52 }}></th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id}>
                      <td style={{ padding: '8px 12px' }}>
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, display: 'block', border: '1px solid var(--border)' }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                            <Package size={16} color="var(--text-muted)" />
                          </div>
                        )}
                      </td>
                      <td className="td-primary">{p.name}</td>
                      <td className="td-code">{p.sku}</td>
                      <td>{p.category || <span className="text-muted">—</span>}</td>
                      <td>₹{Number(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: isLow ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                          {isLow && <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />}
                          {p.currentStock}
                        </span>
                        <span className="text-muted text-xs"> / min {p.minStockAlert}</span>
                      </td>
                      <td>{p.location || <span className="text-muted">—</span>}</td>
                      <td>
                        <div className="flex gap-2">
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setStockProduct(p)}>
                              Stock
                            </button>
                          )}
                          {canEdit && (
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(p); setShowModal(true); }}>
                              Edit
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Upload image"
                              disabled={uploadingId === p.id}
                              onClick={() => { setPendingUploadProduct(p); fileRef.current?.click(); }}
                            >
                              {uploadingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                            </button>
                          )}
                          {canEdit && p.imageUrl && (
                            <button
                              className="btn btn-danger btn-sm"
                              title="Remove image"
                              disabled={uploadingId === p.id}
                              onClick={async () => {
                                setUploadingId(p.id);
                                try {
                                  await productsApi.deleteImage(p.id);
                                  qc.invalidateQueries({ queryKey: ['products'] });
                                  toast.success('Image removed');
                                } catch { toast.error('Failed to remove image'); }
                                finally { setUploadingId(null); }
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {showModal && (
        <ProductModal
          initial={editProduct}
          onClose={() => setShowModal(false)}
          onImageUploaded={() => qc.invalidateQueries({ queryKey: ['products'] })}
          onSave={async (d) => {
            if (editProduct) await updateMutation.mutateAsync({ id: editProduct.id, ...d });
            else await createMutation.mutateAsync(d);
          }}
        />
      )}
      {stockProduct && <StockMovementModal product={stockProduct} onClose={() => setStockProduct(null)} />}

      {/* Hidden file input for image upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file || !pendingUploadProduct) return;
          setUploadingId(pendingUploadProduct.id);
          try {
            await productsApi.uploadImage(pendingUploadProduct.id, file);
            qc.invalidateQueries({ queryKey: ['products'] });
            toast.success('Image uploaded!');
          } catch {
            toast.error('Image upload failed. Check your S3 bucket configuration.');
          } finally {
            setUploadingId(null);
            setPendingUploadProduct(null);
          }
        }}
      />
    </div>
  );
}
