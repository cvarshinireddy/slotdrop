import { Card, EmptyState } from '@/components/ui';

// Placeholder: the KPI cards, charts and slot-capacity manager are built in Step 7.
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <Card><EmptyState illustration="noHistory" title="Analytics are on the way" description="Parcels per day, peak hours and slot capacity controls arrive in the next update." /></Card>
    </div>
  );
}
