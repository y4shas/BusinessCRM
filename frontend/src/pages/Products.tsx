import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../api';
import { Package, Plus, Search, AlertTriangle, X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface ProductFormData {
  name: string; sku: string; category: string;
  unitPrice: string; currentStock: string; minStockAlert: string; location: string;
}

const emptyForm: ProductFormData = {
  name: '', sku: '', category: '', unitPrice: '', currentStock: '0', minStockAlert: '0', location: '',
};

// ── Shared image dropzone ─────────────────────────────────────────────────────
function ImageZone({
  imageUrl,
  uploading,
  onFile,
  onRemove,
  pendingFile,
}: {
  imageUrl: string | null;
  uploading: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
  pendingFile?: File | null;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const previewSrc = pendingFile ? URL.createObjectURL(pendingFile) : imageUrl;

  return (
    <div className="form-group">
      <label className="form-label">Product Image <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
      {previewSrc ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={previewSrc} alt="Product" className="img-preview" />
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.55)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6 }}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              style={{ backdropFilter: 'blur(8px)', background: 'rgba(239,68,68,0.7)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', fontSize: 13 }}>
              <Loader2 size={18} className="animate-spin" /> Uploading…
            </div>
          )}
        </div>
      ) : (
        <div
          className={`img-dropzone${dragOver ? ' drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 0', pointerEvents: 'none' }}>
            <ImagePlus size={22} style={{ color: dragOver ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {dragOver ? 'Drop to select' : 'Drag & drop or click to browse'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>JPG, PNG, WebP — max 5 MB</span>
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }}
      />
    </div>
  );
}

// ── Product modal (create + edit) ─────────────────────────────────────────────
function ProductModal({ initial, onClose, onSave }: {
  initial?: any;
  onClose: () => void;
  onSave: (d: any, imageFile: File | null) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormData>(
    initial ? {
      name: initial.name, sku: initial.sku, category: initial.category ?? '',
      unitPrice: String(initial.unitPrice), currentStock: String(initial.currentStock),
      minStockAlert: String(initial.minStockAlert), location: initial.location ?? '',
    } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  // Edit mode: track the persisted S3 URL
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [imgUploading, setImgUploading] = useState(false);

  // Create mode: hold the local File before submission
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const set = (k: keyof ProductFormData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = !!initial;

  // Edit mode: upload to S3 immediately when user picks a file
  const handleFileInEditMode = async (file: File) => {
    setImgUploading(true);
    try {
      const res = await productsApi.uploadImage(initial.id, file);
      setImageUrl(res.data.data.imageUrl);
      toast.success('Image uploaded!');
    } catch {
      toast.error('Image upload failed. Check your S3 bucket.');
    } finally {
      setImgUploading(false);
    }
  };

  // Edit mode: delete from S3 immediately
  const handleRemoveInEditMode = async () => {
    setImgUploading(true);
    try {
      await productsApi.deleteImage(initial.id);
      setImageUrl(null);
      toast.success('Image removed');
    } catch {
      toast.error('Failed to remove image');
    } finally {
      setImgUploading(false);
    }
  };

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
      }, isEdit ? null : pendingFile);
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
          <h2>{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Image zone — always visible */}
            {isEdit ? (
              <ImageZone
                imageUrl={imageUrl}
                uploading={imgUploading}
                onFile={handleFileInEditMode}
                onRemove={handleRemoveInEditMode}
              />
            ) : (
              <ImageZone
                imageUrl={null}
                uploading={false}
                pendingFile={pendingFile}
                onFile={f => setPendingFile(f)}
                onRemove={() => setPendingFile(null)}
              />
            )}

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Steel Rod 12mm" />
              </div>
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-input" required value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="STL-ROD-12" disabled={isEdit} />
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
            <button type="submit" className="btn btn-primary" disabled={saving || imgUploading}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
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
      toast.success('Stock updated!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>Stock Movement</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{product.name} · Current stock: <strong style={{ color: 'var(--text-primary)' }}>{product.currentStock}</strong></p>
            <div className="form-group">
              <label className="form-label">Movement Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['IN', 'OUT'].map(t => (
                  <button key={t} type="button"
                    className={`btn ${type === t ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setType(t)}
                  >
                    {t === 'IN' ? '↑ Stock In' : '↓ Stock Out'}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
              <input className="form-input" required type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Restock, damaged, sold..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => productsApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated!'); },
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const handleSave = async (d: any, imageFile: File | null) => {
    if (editProduct) {
      await updateMutation.mutateAsync({ id: editProduct.id, ...d });
    } else {
      const res = await createMutation.mutateAsync(d);
      const newId = res.data.data.id;
      if (imageFile && newId) {
        try {
          await productsApi.uploadImage(newId, imageFile);
          qc.invalidateQueries({ queryKey: ['products'] });
          toast.success('Product created with image!');
        } catch {
          toast.success('Product created!');
          toast.error('Image upload failed — you can add it via Edit.');
        }
      } else {
        toast.success('Product created!');
      }
    }
  };

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
          onSave={handleSave}
        />
      )}
      {stockProduct && <StockMovementModal product={stockProduct} onClose={() => setStockProduct(null)} />}
    </div>
  );
}