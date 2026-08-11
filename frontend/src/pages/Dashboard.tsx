import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import {
  Users, Package, FileText, TrendingUp, AlertTriangle,
  Clock, CheckCircle, XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function StatCard({
  title, value, icon, color, subtitle
}: { title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color } as any}>
      <div className="flex items-center justify-between">
        <div className="stat-icon" style={{ background: `${color.replace('linear-gradient(135deg,', '').split(',')[0]}20` }}>
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

const CHART_COLORS = ['#f59e0b', '#4f8ef7', '#ef4444'];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.summary().then(r => r.data.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your business operations</p>
        </div>
        <div className="page-content page-loader">
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="page-content">
          <div className="card" style={{ color: 'var(--accent-red)' }}>Failed to load dashboard data.</div>
        </div>
      </div>
    );
  }

  const d = data!;

  const customerChartData = [
    { name: 'Lead', value: d.customers.byStatus.LEAD },
    { name: 'Active', value: d.customers.byStatus.ACTIVE },
    { name: 'Inactive', value: d.customers.byStatus.INACTIVE },
  ];

  const challanChartData = [
    { name: 'Draft', value: d.challans.DRAFT },
    { name: 'Confirmed', value: d.challans.CONFIRMED },
    { name: 'Cancelled', value: d.challans.CANCELLED },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your business operations</p>
      </div>

      <div className="page-content">
        {/* Stat Cards */}
        <div className="grid grid-4" style={{ marginBottom: 24 }}>
          <StatCard
            title="Total Customers"
            value={d.customers.total}
            icon={<Users size={20} color="#4f8ef7" />}
            color="linear-gradient(135deg, #4f8ef7, #3b7aee)"
            subtitle={`${d.customers.byStatus.ACTIVE} active`}
          />
          <StatCard
            title="Products"
            value={d.products.total}
            icon={<Package size={20} color="#8b5cf6" />}
            color="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            subtitle={d.products.lowStock > 0 ? `⚠ ${d.products.lowStock} low stock` : 'All stocked'}
          />
          <StatCard
            title="Draft Challans"
            value={d.challans.DRAFT}
            icon={<Clock size={20} color="#f59e0b" />}
            color="linear-gradient(135deg, #f59e0b, #d97706)"
            subtitle="Pending confirmation"
          />
          <StatCard
            title="Confirmed Challans"
            value={d.challans.CONFIRMED}
            icon={<CheckCircle size={20} color="#10b981" />}
            color="linear-gradient(135deg, #10b981, #059669)"
            subtitle="Total fulfilled"
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-2" style={{ marginBottom: 24 }}>
          {/* Customer breakdown */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Customer Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={customerChartData} barCategoryGap="40%">
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#f59e0b" />
                  <Cell fill="#4f8ef7" />
                  <Cell fill="#9da3b4" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Challan status */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Challan Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={challanChartData} barCategoryGap="40%">
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  <Cell fill="#f59e0b" />
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="grid grid-2">
          {/* Recent Challans */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Challans</h3>
            {d.recentChallans.length === 0 ? (
              <p className="text-muted text-sm">No challans yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {d.recentChallans.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between" style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.challanNumber}</div>
                      <div className="text-xs text-muted">{c.customer?.name}</div>
                    </div>
                    <span className={`badge ${c.status === 'DRAFT' ? 'badge-amber' : c.status === 'CONFIRMED' ? 'badge-green' : 'badge-red'}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Follow-ups */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Recent Follow-ups</h3>
            {d.recentFollowUps.length === 0 ? (
              <p className="text-muted text-sm">No follow-ups yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {d.recentFollowUps.map((f: any) => (
                  <div key={f.id} style={{ padding: 10, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{f.customer?.name}</span>
                      <span className="text-xs text-muted">{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 4 }}>{f.note.slice(0, 80)}{f.note.length > 80 ? '...' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low stock warning */}
        {d.products.lowStock > 0 && (
          <div className="card" style={{ marginTop: 24, borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} color="var(--accent-amber)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-amber)' }}>Low Stock Alert</div>
                <div className="text-xs text-muted">{d.products.lowStock} product(s) are at or below their minimum stock level.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
