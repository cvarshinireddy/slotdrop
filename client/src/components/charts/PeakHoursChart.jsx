import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, TooltipBox } from './ChartCard';

const INK = 'hsl(var(--muted-foreground))';
const GRID = 'hsl(var(--border))';
const SERIES = 'hsl(var(--primary))';

export function PeakHoursChart({ data, reloading }) {
  const max = Math.max(0, ...data.map((d) => d.count));
  const peak = data.find((d) => d.count === max);
  const summary = max ? `Bar chart of handover slots booked by hour. Busiest hour is ${peak.label} with ${max} bookings.` : 'No handover bookings in this period yet.';
  // Label only the peak bar: a number on every bar would be noise (the tooltip and table carry the rest).
  const PeakLabel = ({ x, y, width, value, index }) => (data[index].count === max && max > 0
    ? <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={12} fontWeight={600}>{value}</text> : null);

  return (
    <ChartCard title="Peak handover hours" subtitle="When residents book their slots" summary={summary} reloading={reloading}
      columns={['Hour', 'Bookings']} rows={data.map((d) => [d.label, d.count])}>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: -20 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="label" interval={2} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} width={44} />
            <Tooltip
              cursor={{ fill: GRID, fillOpacity: 0.35 }}
              content={({ active, payload }) => (active && payload?.length ? <TooltipBox keyStyle="box" title={payload[0].payload.label} value={payload[0].value} unit={payload[0].value === 1 ? 'booking' : 'bookings'} /> : null)}
            />
            {/* 24px max, rounded data-end (top), square at the baseline; hovered bar lightens */}
            <Bar dataKey="count" fill={SERIES} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} activeBar={{ fill: SERIES, fillOpacity: 0.75 }}>
              <LabelList dataKey="count" content={PeakLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
