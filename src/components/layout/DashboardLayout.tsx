import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  LayoutDashboard,
  Baby,
  Bell,
  History,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Activity,
  Shield,
  Clock,
  Radio,
  Thermometer,
  Users,
  Utensils,
  FileText,
  Volume2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const VoiceAssistantFab = lazy(() => import('@/components/VoiceAssistantFab'));

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/register', label: 'Register Baby', icon: Baby, doctorOnly: true },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/history', label: 'Alert History', icon: History },
  { path: '/live-monitoring', label: 'IoT Monitoring', icon: Radio },
  { path: '/cry-detection', label: 'Cry Detection', icon: Volume2 },
  { path: '/nicu-environment', label: 'NICU Incubator Overview', icon: Thermometer, doctorOnly: true },
  { path: '/shift-handover', label: 'Shift & Handover', icon: Users },
  { path: '/feeding-status', label: 'Feeding Status', icon: Utensils },
  { path: '/health-records', label: 'Health Records', icon: FileText },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, logout } = useAuth();
  const { alerts } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);
  const criticalAlerts = unacknowledgedAlerts.filter((a) => a.level === 'critical');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.doctorOnly || user?.role === 'doctor' || user?.role === 'senior_doctor'
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 h-16 header-medical z-50">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-xl gradient-primary shadow-lg">
                <Heart className="w-5 h-5 text-primary-foreground" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-status-normal rounded-full border-2 border-card animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-foreground tracking-tight">NeoGuard</span>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">NICU Monitoring</p>
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/50">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground tabular-nums">{formatTime(currentTime)}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(currentTime)}</p>
              </div>
            </div>

            <div className="live-indicator">
              <Activity className="w-3.5 h-3.5" />
              <span>Live Monitoring</span>
            </div>

            {criticalAlerts.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-status-critical-bg border border-status-critical/20 alert-pulse">
                <Bell className="w-4 h-4 text-status-critical" />
                <span className="text-sm font-semibold text-status-critical">
                  {criticalAlerts.length} Critical
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/alerts" className="relative">
              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-muted">
                <Bell className="w-5 h-5" />
                {unacknowledgedAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-status-critical text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-lg">
                    {unacknowledgedAlerts.length > 9 ? '9+' : unacknowledgedAlerts.length}
                  </span>
                )}
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2.5 px-3 rounded-xl hover:bg-muted">
                  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-semibold">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{user?.name}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2.5 rounded-lg">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Badge variant={user?.role === 'doctor' || user?.role === 'senior_doctor' ? 'default' : 'secondary'} className="capitalize">
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive rounded-lg">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 w-64 sidebar-medical z-40 transition-transform duration-300 lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          <p className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Navigation</p>
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'gradient-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                {item.path === '/alerts' && unacknowledgedAlerts.length > 0 && (
                  <Badge
                    variant={criticalAlerts.length > 0 ? 'critical' : 'warning'}
                    className="ml-auto text-[10px] h-5 min-w-[20px] flex items-center justify-center"
                  >
                    {unacknowledgedAlerts.length}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-border/50">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-status-normal" />
              <span className="text-xs font-semibold text-foreground">System Active</span>
            </div>
            <p className="text-[10px] text-muted-foreground">All monitors connected</p>
            <div className="flex items-center gap-1.5 mt-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-status-normal animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground text-center mt-3">
            <p className="font-semibold">NeoGuard v2.0</p>
            <p>© 2024 Hospital Systems</p>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;