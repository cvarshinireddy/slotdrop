import { LogOut, Moon } from 'lucide-react';
import { Button, Card, CardDescription, CardTitle } from '@/components/ui';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Account() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Account</h1>
      <Card className="space-y-1">
        <CardTitle>{user.name}</CardTitle>
        <CardDescription className="capitalize">{user.role}{user.flatId ? ` · Flat ${user.flatId.number}` : ''}</CardDescription>
        <CardDescription>{user.email} · {user.phone}</CardDescription>
      </Card>
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Moon className="size-5 text-muted-foreground" aria-hidden /><div><p className="font-medium">Appearance</p><p className="text-sm text-muted-foreground capitalize">{theme} mode</p></div></div>
        <ThemeToggle />
      </Card>
      <Button variant="secondary" size="lg" block leftIcon={LogOut} onClick={logout}>Sign out</Button>
    </div>
  );
}
