import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireRole } from '@/components/layout/RequireRole';
import { ParcelsProvider } from '@/context/ParcelsContext';
import { Outlet } from 'react-router-dom';
import Login from '@/pages/Login';
import Account from '@/pages/Account';
import DesignSystem from '@/pages/DesignSystem';
import Home from '@/pages/resident/Home';
import SlotPicker from '@/pages/resident/SlotPicker';
import BookingConfirmed from '@/pages/resident/BookingConfirmed';
import History from '@/pages/resident/History';
import QuickLog from '@/pages/guard/QuickLog';
import Handover from '@/pages/guard/Handover';
import Schedule from '@/pages/guard/Schedule';
import Dashboard from '@/pages/admin/Dashboard';
import Users from '@/pages/admin/Users';

// Residents share one parcels store across Home / SlotPicker / History / Booking so state stays consistent.
const ResidentLayout = () => <ParcelsProvider><Outlet /></ParcelsProvider>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/design-system" element={<DesignSystem />} />
      <Route element={<RequireRole />}>
        <Route element={<AppShell />}>
          <Route path="/account" element={<Account />} />
          <Route element={<RequireRole roles={['resident']} />}>
            <Route element={<ResidentLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/parcels/:id/slot" element={<SlotPicker />} />
              <Route path="/bookings/:id" element={<BookingConfirmed />} />
              <Route path="/history" element={<History />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={['guard']} />}>
            <Route path="/guard/log" element={<QuickLog />} />
            <Route path="/guard/handover" element={<Handover />} />
            <Route path="/guard/schedule" element={<Schedule />} />
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
