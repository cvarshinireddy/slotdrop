import { Navigate, Route, Routes } from 'react-router-dom';
import DesignSystem from './pages/DesignSystem';

// Step 5 only ships the component gallery. Role-based routes arrive in Step 6.
export default function App() {
  return (
    <Routes>
      <Route path="/design-system" element={<DesignSystem />} />
      <Route path="*" element={<Navigate to="/design-system" replace />} />
    </Routes>
  );
}
