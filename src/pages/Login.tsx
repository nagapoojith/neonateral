import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Heart, Shield, Activity, Check } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'Redirecting to dashboard...',
        });
        // Small delay to allow session to be set before redirect
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Activity,
      title: 'Real-Time Vitals',
      description: 'Continuous monitoring of heart rate, SpO₂, temperature, and movement',
    },
    {
      icon: Shield,
      title: 'Smart Alert System',
      description: 'Multi-level escalation and behavior pattern detection',
    },
    {
      icon: Check,
      title: 'HIPAA Compliant',
      description: 'Secure, encrypted data storage and transmission',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary/80" />
        
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/5" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg">
              <Heart className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">NeoGuard</h1>
              <p className="text-white/70 text-sm">Neonatal Monitoring System</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-semibold mb-4 leading-tight">
            Protecting the most<br />precious lives
          </h2>
          <p className="text-lg text-white/80 mb-12 max-w-md leading-relaxed">
            Advanced real-time monitoring for newborn care with intelligent alerts and predictive analytics.
          </p>
          
          <div className="space-y-5">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className="p-2.5 rounded-xl bg-white/15 group-hover:bg-white/20 transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="p-3 rounded-2xl gradient-hero shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">NeoGuard</h1>
              <p className="text-xs text-muted-foreground">Neonatal Monitoring</p>
            </div>
          </div>

          <Card className="border-0 shadow-elevated bg-card">
            <CardHeader className="space-y-2 pb-6 text-center">
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <CardDescription>
                Enter your credentials to access the monitoring system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/60 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/60 focus:border-primary"
                  />
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold gradient-hero hover:opacity-90 transition-opacity mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Info box */}
              <div className="mt-8 p-4 rounded-xl bg-accent/50 border border-accent">
                <p className="text-sm font-medium text-accent-foreground mb-1">First time here?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create an account to start monitoring newborns. Choose your role during signup.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-semibold hover:underline">
                Sign up here
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Looking for parent resources?{' '}
              <Link to="/parent" className="text-primary font-semibold hover:underline">
                Visit Parent Support Portal →
              </Link>
            </p>
            <p className="text-xs text-muted-foreground/70">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;