import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import { Receipt, Package, Clock, WifiOff, ArrowRight } from '../../components/icons';
import { api, formatRupees } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { Skeleton, EmptyState, Button, cx } from '../../components/ui';
import { gridContainer, gridItem } from '../../lib/motion';

/**
 * The shop's dashboard, at `/admin`.
 *
 * Built only from numbers this shop actually has. The reference dashboards that
 * prompted it carry sales-by-country, traffic sources, returning-visitor rates
 * and star ratings; none of that exists here -- the app collects no analytics,
 * takes no reviews, and delivers to one city -- and inventing panels that would
 * sit empty is worse than a shorter page that is true.
 *
 * Everything comes from one request, `GET /orders/admin/stats`, which
 * aggregates in MongoDB. The obvious alternative -- add the orders up in the
 * browser -- would have described only the most recent hundred, because
 * `/admin/all` caps `limit` at 100.
 */

/**
 * Chart colour, per mode, and every value here came out of the palette
 * validator rather than out of taste.
 *
 * `pending` / `done` / `void` are a **status** palette: reserved meanings, never
 * reused as "series 4", and always drawn beside their own word, so identity is
 * never carried by colour alone.
 *
 * Light passes every check outright. **Dark is a compromise and worth knowing
 * about:** on the dark surface a green and a red that both sit inside the
 * validator's L 0.48-0.67 band collapse to a deuteranopia separation of about
 * 2, and every step that fixes the separation leaves the band. The set below
 * keeps the separation (dE 9.2 deutan, 21.5 normal) and contrast, and sits the
 * green slightly above the band at L 0.718. Given both are labelled in text
 * wherever they appear, legibility was the right thing to spend the miss on.
 */
const PALETTE = {
  light: {
    revenue: '#45945F', // brand-700 -- darker than brand-600, which fails 3:1 on white
    bar: '#45945F',
    pending: '#B45309',
    done: '#45945F',
    void: '#B02532',
    grid: '#E2E2E2',
    axis: '#7C7C7C',
    tooltipBg: '#FFFFFF',
  },
  dark: {
    revenue: '#5FBA83',
    bar: '#5FBA83',
    pending: '#D97706',
    done: '#5FBA83',
    void: '#E5484D',
    grid: '#2A2F3A',
    axis: '#8B8B8B',
    tooltipBg: '#1A1E26',
  },
};

const useChartColors = () => {
  const { isDark } = useTheme();
  return isDark ? PALETTE.dark : PALETTE.light;
};

/** "2026-09-03" -> "3 Sep", for an axis that has to fit thirty of them. */
const shortDay = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * A headline number.
 *
 * Not a chart, deliberately: "how many orders are waiting" is one value with no
 * shape to it, and a sparkline beside it would be decoration competing with the
 * number the client came to read.
 */
const StatTile = ({ label, value, sub, icon, tone = 'default', to }) => {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          {label}
        </p>
        <span
          className={cx(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            tone === 'attention'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              : 'bg-surface-sunken text-ink-faint'
          )}
        >
          {icon}
        </span>
      </div>

      <p className="mt-2 text-[26px] font-bold text-ink tabular leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-ink-muted">{sub}</p>}
    </>
  );

  const className =
    'block bg-surface-raised border border-line rounded-card p-4 transition-colors';

  return to ? (
    <motion.div variants={gridItem}>
      <Link to={to} className={cx(className, 'hover:border-brand-300')}>
        {body}
      </Link>
    </motion.div>
  ) : (
    <motion.div variants={gridItem} className={className}>
      {body}
    </motion.div>
  );
};

const Panel = ({ title, hint, action, actionTo, children }) => (
  <section className="bg-surface-raised border border-line rounded-card p-4">
    <div className="flex items-baseline justify-between gap-3 mb-4">
      <div>
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {hint && <p className="text-[12px] text-ink-muted mt-0.5">{hint}</p>}
      </div>
      {action && (
        <Link
          to={actionTo}
          className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600"
        >
          {action}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
    {children}
  </section>
);

/**
 * Tooltips are the default, not an extra.
 *
 * A 30-day line cannot label every point without becoming unreadable, so the
 * per-day figures live on hover -- which is also the only way to read a quiet
 * day that draws as a flat segment.
 */
const ChartTooltip = ({ active, payload, label, colors, format }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border border-line px-3 py-2 shadow-lift"
      style={{ background: colors.tooltipBg }}
    >
      <p className="text-[12px] font-semibold text-ink">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-[12px] text-ink-muted tabular">
          {format(entry)}
        </p>
      ))}
    </div>
  );
};

const RevenueChart = ({ series, colors }) => (
  <div className="h-[240px] -ml-2">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {/*
            A fade under the line, not a solid fill: the area is there to give
            the line weight, and a flat block of green at full strength reads as
            the subject rather than as the line's shadow.
          */}
          <linearGradient id="revenueFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.revenue} stopOpacity={0.22} />
            <stop offset="100%" stopColor={colors.revenue} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Recessive: horizontal only, so the grid measures without drawing a cage. */}
        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tick={{ fontSize: 11, fill: colors.axis }}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 11, fill: colors.axis }}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(paise) => `₹${Math.round(paise / 100)}`}
        />

        <Tooltip
          cursor={{ stroke: colors.axis, strokeDasharray: '3 3' }}
          content={(props) => (
            <ChartTooltip
              {...props}
              label={props.label ? shortDay(props.label) : ''}
              colors={colors}
              format={(entry) =>
                `${formatRupees(entry.value)} · ${entry.payload.orders} order${
                  entry.payload.orders === 1 ? '' : 's'
                }`
              }
            />
          )}
        />

        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={colors.revenue}
          strokeWidth={2}
          fill="url(#revenueFade)"
          /* >= 8px only where the pointer is; a dot on all thirty points would
             be noise on a chart whose job is the shape. */
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: colors.tooltipBg }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/**
 * Best sellers, horizontal.
 *
 * Horizontal because the labels are product names -- "Double Chabi Basmati
 * Rice" does not fit under a vertical bar without being rotated, and rotated
 * axis labels are the thing everyone squints at.
 */
const TopProducts = ({ products, colors }) => (
  <div style={{ height: Math.max(140, products.length * 44) }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={products}
        layout="vertical"
        margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
        barCategoryGap={10}
      >
        <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: colors.axis }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          cursor={{ fill: colors.grid, fillOpacity: 0.35 }}
          content={(props) => (
            <ChartTooltip
              {...props}
              colors={colors}
              format={(entry) =>
                `${entry.payload.quantity} sold · ${formatRupees(entry.payload.revenue)}`
              }
            />
          )}
        />
        {/* 4px rounded ends on the data end only; the baseline end stays square
            so every bar starts on the same line. */}
        <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {products.map((product) => (
            <Cell key={product.name} fill={colors.bar} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

/**
 * Where the orders stand.
 *
 * A row of labelled counts rather than a pie: three numbers the client compares
 * against each other and against zero, which a pie makes harder, not easier.
 * The colour repeats what the word already says -- it never carries it alone.
 */
const StatusBreakdown = ({ statuses, colors }) => {
  const rows = [
    { key: 'placed', label: 'To do', color: colors.pending },
    { key: 'completed', label: 'Completed', color: colors.done },
    { key: 'cancelled', label: 'Cancelled', color: colors.void },
  ];

  const total = rows.reduce((sum, row) => sum + (statuses[row.key] ?? 0), 0);

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const count = statuses[row.key] ?? 0;
        const share = total ? (count / total) * 100 : 0;

        return (
          <div key={row.key}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-2 text-[13px] text-ink">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: row.color }}
                />
                {row.label}
              </span>
              <span className="text-[13px] font-semibold text-ink tabular">{count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${share}%`, background: row.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Loading dashboard">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] rounded-card" />
      ))}
    </div>
    <Skeleton className="h-[300px] rounded-card" />
    <div className="grid lg:grid-cols-2 gap-4">
      <Skeleton className="h-[240px] rounded-card" />
      <Skeleton className="h-[240px] rounded-card" />
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const colors = useChartColors();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/orders/admin/stats?days=30');
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={<WifiOff className="w-7 h-7" />}
        title="Could not load the dashboard"
        message={error}
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  const anyRevenue = stats.series.some((point) => point.revenue > 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Dashboard</h1>
        <p className="text-xs text-ink-muted mt-0.5">
          {stats.statuses.placed > 0
            ? `${stats.statuses.placed} order${
                stats.statuses.placed === 1 ? '' : 's'
              } waiting to be packed`
            : 'Nothing waiting — all caught up'}
        </p>
      </div>

      {/* The four headline numbers. To-do leads: it is the only one that asks
          the client to go and do something. */}
      <motion.div
        variants={gridContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatTile
          label="To do"
          value={stats.statuses.placed}
          sub={stats.statuses.placed ? 'Open orders →' : 'All handed over'}
          icon={<Clock className="w-4 h-4" />}
          tone={stats.statuses.placed > 0 ? 'attention' : 'default'}
          to="/admin/orders"
        />
        <StatTile
          label="Today"
          value={formatRupees(stats.today.revenue)}
          sub={`${stats.today.orders} order${stats.today.orders === 1 ? '' : 's'}`}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatTile
          label="Last 7 days"
          value={formatRupees(stats.week.revenue)}
          sub={`${stats.week.orders} order${stats.week.orders === 1 ? '' : 's'}`}
          icon={<Receipt className="w-4 h-4" />}
        />
        <StatTile
          label="Average order"
          value={formatRupees(stats.averageOrderValue)}
          sub={`Across ${stats.allTime.orders} order${
            stats.allTime.orders === 1 ? '' : 's'
          }`}
          icon={<Package className="w-4 h-4" />}
        />
      </motion.div>

      <Panel
        title="Revenue"
        hint={`Last ${stats.days} days · cancelled orders excluded`}
      >
        {anyRevenue ? (
          <RevenueChart series={stats.series} colors={colors} />
        ) : (
          <p className="py-14 text-center text-[13px] text-ink-muted">
            No orders in this window yet.
          </p>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title="Best sellers"
          hint={`By quantity, last ${stats.days} days`}
          action="All products"
          actionTo="/admin/products"
        >
          {stats.topProducts.length > 0 ? (
            <TopProducts products={stats.topProducts} colors={colors} />
          ) : (
            <p className="py-14 text-center text-[13px] text-ink-muted">
              Nothing sold in this window yet.
            </p>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Orders" hint="All time" action="Open" actionTo="/admin/orders">
            <StatusBreakdown statuses={stats.statuses} colors={colors} />
          </Panel>

          <Panel title="Catalogue" action="Manage" actionTo="/admin/products">
            <div className="flex gap-6">
              <div>
                <p className="text-[22px] font-bold text-ink tabular leading-none">
                  {stats.catalogue.live}
                </p>
                <p className="text-[12px] text-ink-muted mt-1">On the shop</p>
              </div>
              <div>
                <p className="text-[22px] font-bold text-ink-muted tabular leading-none">
                  {stats.catalogue.hidden}
                </p>
                <p className="text-[12px] text-ink-muted mt-1">Hidden</p>
              </div>
              <div>
                <p className="text-[22px] font-bold text-ink-muted tabular leading-none">
                  {stats.catalogue.total}
                </p>
                <p className="text-[12px] text-ink-muted mt-1">Total</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
