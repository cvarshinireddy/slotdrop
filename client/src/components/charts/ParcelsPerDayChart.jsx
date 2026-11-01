import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, TooltipBox } from './ChartCard';
import { dayLabel } from '@/lib/format';

// Colours are CSS tokens, so the chart re-themes with the app (light/dark) and never contains a hex value.
const INK = 'hsl(var(--muted-foreground))';
const GRID = 'hsl(var(--border))';
const SERIES = 'hsl(var(--primary))';
const SURFACE = 'hsl(var(--surface))';

const shortDate = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// Only the latest point gets a visible marker: selective labelling, so the eye lands on "now".
function EndDot({ cx, cy, index, data }) {
  if (index !== data.length - 1) return null;
  return <circle key="end" cx={cx} cy={cy} r={4.5} fill={SERIES} stroke={SURFACE} strokeWidth={2} />;
}

export function ParcelsPerDayChart({ data, reloading }) {
  const total = data.reduce((n, d) => n + d.received, 0);
  const peak = data.reduce((a, d) => (d.received > a.received ? d : a), data[0] || { received: 0 });
  const summary = `Line chart of parcels received per day over ${data.length} days. ${total} in total; busiest day ${peak.date ? shortDate(peak.date) : 'n/a'} with ${peak.received}.`;
  const tickEvery = data.length > 14 ? 4 : data.length > 7 ? 2 : 0;

  return (
    <ChartCard title="Parcels per day" subtitle="Parcels logged at the gate" summary={summary} reloading={reloading}
      columns={['Date', 'Received', 'Delivered']} rows={data.map((d) => [shortDate(d.date), d.received, d.delivered])}>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis dataKey="date" tickFormatter={shortDate} interval={tickEvery} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: INK, fontSize: 12 }} width={44} />
            <Tooltip
              cursor={{ stroke: INK, strokeWidth: 1, strokeOpacity: 0.5 }}
              content={({ active, payload }) => (active && payload?.length ? <TooltipBox title={dayLabel(payload[0].payload.date) === 'Today' ? 'Today' : shortDate(payload[0].payload.date)} value={payload[0].value} unit={payload[0].value === 1 ? 'parcel' : 'parcels'} /> : null)}
            />
            <Area type="monotone" dataKey="received" stroke={SERIES} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={SERIES} fillOpacity={0.1}
              dot={<EndDot data={data} />} activeDot={{ r: 5, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
