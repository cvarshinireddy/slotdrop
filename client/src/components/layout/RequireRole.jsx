import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui';

export const homeFor = (role) => ({ resident: '/', guard: '/guard/log', admin: '/admin' }[role]);

// Route guard: unauthenticated -> /login; wrong role -> that role's own home (never a blank 403 page).
export function RequireRole({ roles }) {
  const { user, booting } = useAuth();
  if (booting) return <div className="p-6"><Skeleton className="h-40" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
