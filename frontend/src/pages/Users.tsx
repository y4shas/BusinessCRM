import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api';
import { UserCog, Plus, X, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'badge-purple',
  SALES: 'badge-blue',
  WAREHOUSE: 'badge-amber',
  ACCOUNTS: 'badge-green',
};

interface UserForm {
  name: string; email: string; password: string; role: string;
}

function UserModal({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [form, setForm] = useState<UserForm>(
    initial ? { name: initial.name, email: initial.email, password: '', role: initial.role } :
      { name: '', email: '', password: '', role: 'SALES' }
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof UserForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: any = { name: form.name, email: form.email, role: form.role };
    if (form.password) data.password = form.password;
    try {
      await onSave(data);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal slide-up" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>{initial ? 'Edit User' : 'Create User'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="form-group">
              <label className="form-label">{initial ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required={!initial} minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="ADMIN">Admin</option>
                <option value="SALES">Sales</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="ACCOUNTS">Accounts</option>
              </select>
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

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created!'); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => usersApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated!'); },
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated.'); },
  });

  const users: any[] = data ?? [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage team accounts and roles</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowModal(true); }}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="table-wrapper">
          {isLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UserCog size={24} color="var(--text-muted)" /></div>
              <h3>No users found</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>
                          {u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span className="td-primary">{u.name}</span>
                      </div>
                    </td>
                    <td className="text-sm">{u.email}</td>
                    <td><span className={`badge ${ROLE_BADGE[u.role] ?? 'badge-gray'}`}><ShieldCheck size={11} />{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>Edit</button>
                        {u.isActive && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => { if (confirm(`Deactivate ${u.name}?`)) deactivateMutation.mutate(u.id); }}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <UserModal
          initial={editUser}
          onClose={() => setShowModal(false)}
          onSave={async (d) => {
            if (editUser) await updateMutation.mutateAsync({ id: editUser.id, ...d });
            else await createMutation.mutateAsync(d);
          }}
        />
      )}
    </div>
  );
}
