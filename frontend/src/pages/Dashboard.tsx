import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Package, FileText, AlertTriangle, CheckCircle,
  Clock, TrendingUp, TrendingDown, DollarSign, BarChart2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── Shared sub-components ─────────────────────────────────────────────────────

function StatCard({
  title, value, icon, color, subtitle
}: { title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color } as any}>
      <div className="flex items-center justify-between">
        <div className="stat-icon" style={{ background: `${color.split(',')[0].replace('linear-gradient(135deg', '').trim()}20` }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

function RecentChallansList({ challans }: { challans: any[] }) {
  const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'badge-amber', CONFIRMED: 'badge-green', CANCELLED: 'badge-red',
  };
  if (!challans?.length) return <p className="text-muted text-sm">No recent challans.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {challans.map((c: any) => (
        <div key={c.id} className="flex items-center justify-between" style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.challanNumber}</div>
            <div className="text-xs text-muted">{c.customer?.name}{c.customer?.businessName ? ` · ${c.customer.businessName}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-gray'}`}>{c.status}</span>
            {c.total != null && <div className="text-xs text-muted" style={{ marginTop: 3 }}>₹{Number(c.total).toLocaleString('en-IN')}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Role Views ────────────────────────────────────────────────────────────────

function AdminDashboard({ data }: { data: any }) {
  const customerChartData = [
    { name: 'Lead', value: data.customers.byStatus.LEAD },
    { name: 'Active', value: data.customers.byStatus.ACTIVE },
    { name: 'Inactive', value: data.customers.byStatus.INACTIVE },
  ];
  const challanChartData = [
    { name: 'Draft', value: data.challans.DRAFT },
    { name: 'Confirmed', value: data.challans.CONFIRMED },
    { name: 'Cancelled', value: data.challans.CANCELLED },
  ];

  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard title="Total Customers" value={data.customers.total} icon={<Users size={20} color="#4f8ef7" />} color="linear-gradient(135deg,#4f8ef7,#3b7aee)" subtitle={`${data.customers.byStatus.ACTIVE} active`} />
        <StatCard title="Products" value={data.products.total} icon={<Package size={20} color="#8b5cf6" />} color="linear-gradient(135deg,#8b5cf6,#7c3aed)" subtitle={data.products.lowStock > 0 ? `⚠ ${data.products.lowStock} low stock` : 'All stocked'} />
        <StatCard title="Draft Challans" value={data.challans.DRAFT} icon={<Clock size={20} color="#f59e0b" />} color="linear-gradient(135deg,#f59e0b,#d97706)" subtitle="Pending confirmation" />
        <StatCard title="Confirmed Challans" value={data.challans.CONFIRMED} icon={<CheckCircle size={20} color="#10b981" />} color="linear-gradient(135deg,#10b981,#059669)" subtitle="Total fulfilled" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Customer Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={customerChartData} barCategoryGap="40%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#f59e0b" /><Cell fill="#4f8ef7" /><Cell fill="#9da3b4" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Challan Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={challanChartData} barCategoryGap="40%">
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                <Cell fill="#f59e0b" /><Cell fill="#10b981" /><Cell fill="#ef4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Challans</h3>
          <RecentChallansList challans={data.recentChallans} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Follow-ups</h3>
          {!data.recentFollowUps?.length ? <p className="text-muted text-sm">No follow-ups yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recentFollowUps.map((f: any) => (
                <div key={f.id} style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{f.customer?.name}</span>
                    <span className="text-xs text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>{f.note?.slice(0, 80)}{f.note?.length > 80 ? '...' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.products.lowStock > 0 && (
        <div className="card" style={{ marginTop: 24, borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-amber)' }}>Low Stock Alert</div>
              <div className="text-xs text-muted">{data.products.lowStock} product(s) are at or below their minimum stock level.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SalesDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard title="Total Customers" value={data.customers.total} icon={<Users size={20} color="#4f8ef7" />} color="linear-gradient(135deg,#4f8ef7,#3b7aee)" subtitle={`${data.customers.byStatus.ACTIVE} active`} />
        <StatCard title="Leads" value={data.customers.byStatus.LEAD} icon={<TrendingUp size={20} color="#f59e0b" />} color="linear-gradient(135deg,#f59e0b,#d97706)" subtitle="Pending conversion" />
        <StatCard title="Draft Challans" value={data.challans.DRAFT} icon={<Clock size={20} color="#8b5cf6" />} color="linear-gradient(135deg,#8b5cf6,#7c3aed)" subtitle="Awaiting confirmation" />
        <StatCard title="Confirmed Challans" value={data.challans.CONFIRMED} icon={<CheckCircle size={20} color="#10b981" />} color="linear-gradient(135deg,#10b981,#059669)" subtitle="Fulfilled" />
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Challans</h3>
          <RecentChallansList challans={data.recentChallans} />
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Follow-ups</h3>
          {!data.recentFollowUps?.length ? <p className="text-muted text-sm">No follow-ups yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recentFollowUps.map((f: any) => (
                <div key={f.id} style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{f.customer?.name}</span>
                    <span className="text-xs text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: 4 }}>{f.note?.slice(0, 80)}{f.note?.length > 80 ? '...' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WarehouseDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <StatCard title="Total Products" value={data.products.total} icon={<Package size={20} color="#4f8ef7" />} color="linear-gradient(135deg,#4f8ef7,#3b7aee)" />
        <StatCard title="Low Stock Items" value={data.products.lowStock} icon={<AlertTriangle size={20} color="#f59e0b" />} color="linear-gradient(135deg,#f59e0b,#d97706)" subtitle={data.products.lowStock > 0 ? 'Action required' : 'All good'} />
        <StatCard title="Total Units in Stock" value={data.products.totalStock.toLocaleString('en-IN')} icon={<BarChart2 size={20} color="#10b981" />} color="linear-gradient(135deg,#10b981,#059669)" />
      </div>

      {data.products.lowStock > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} color="var(--accent-amber)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-amber)' }}>⚠ {data.products.lowStock} product(s) below minimum stock level</div>
              <div className="text-xs text-muted">Go to Products to adjust stock.</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Stock Movements</h3>
          {!data.recentMovements?.length ? <p className="text-muted text-sm">No movements yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recentMovements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between" style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex items-center gap-2">
                    {m.movementType === 'IN'
                      ? <TrendingUp size={14} color="var(--accent-green)" />
                      : <TrendingDown size={14} color="var(--accent-red)" />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.product?.name}</div>
                      <div className="text-xs text-muted">{m.reason || 'No reason'} · {m.createdBy?.name}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: m.movementType === 'IN' ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 14 }}>
                    {m.movementType === 'IN' ? '+' : '-'}{m.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Confirmed Challans (Dispatched)</h3>
          <RecentChallansList challans={data.pendingChallans} />
        </div>
      </div>
    </>
  );
}

function AccountsDashboard({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Revenue"
          value={`₹${Number(data.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`}
          icon={<DollarSign size={20} color="#10b981" />}
          color="linear-gradient(135deg,#10b981,#059669)"
          subtitle="From confirmed challans"
        />
        <StatCard title="Confirmed Challans" value={data.challans.CONFIRMED} icon={<CheckCircle size={20} color="#4f8ef7" />} color="linear-gradient(135deg,#4f8ef7,#3b7aee)" />
        <StatCard title="Draft Challans" value={data.challans.DRAFT} icon={<Clock size={20} color="#f59e0b" />} color="linear-gradient(135deg,#f59e0b,#d97706)" subtitle="Pending" />
        <StatCard title="Cancelled Challans" value={data.challans.CANCELLED} icon={<FileText size={20} color="#ef4444" />} color="linear-gradient(135deg,#ef4444,#dc2626)" />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Challans</h3>
        <RecentChallansList challans={data.recentChallans} />
      </div>
    </>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────

const ROLE_SUBTITLES: Record<string, string> = {
  ADMIN: 'Full business overview',
  SALES: 'Customers & sales activity',
  WAREHOUSE: 'Inventory & stock movements',
  ACCOUNTS: 'Financial overview',
};

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: resp, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary', user?.role],
    queryFn: () => dashboardApi.summary().then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{ROLE_SUBTITLES[user?.role ?? ''] ?? ''}</p>
        </div>
        <div className="page-content page-loader"><div className="spinner" style={{ width: 36, height: 36 }} /></div>
      </div>
    );
  }

  if (error || !resp?.data) {
    return (
      <div>
        <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
        <div className="page-content">
          <div className="card" style={{ color: 'var(--accent-red)' }}>Failed to load dashboard data. Please try refreshing.</div>
        </div>
      </div>
    );
  }

  const { role, data } = resp;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{ROLE_SUBTITLES[role] ?? 'Overview'}</p>
      </div>
      <div className="page-content">
        {role === 'ADMIN'     && <AdminDashboard data={data} />}
        {role === 'SALES'     && <SalesDashboard data={data} />}
        {role === 'WAREHOUSE' && <WarehouseDashboard data={data} />}
        {role === 'ACCOUNTS'  && <AccountsDashboard data={data} />}
      </div>
    </div>
  );
}
