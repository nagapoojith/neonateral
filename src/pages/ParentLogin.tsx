import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useParentAuth } from '@/contexts/ParentAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Heart, Baby, MessageCircle, MapPin, AlertTriangle } from 'lucide-react';

const ParentLogin = () => {
  const [parentContact, setParentContact] = useState('');
  const [babyId, setBabyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useParentAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(parentContact, babyId);

      if (result.success) {
        toast({
          title: 'Welcome!',
          description: 'Redirecting to parent portal...',
        });
        navigate('/parent/portal');
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Invalid credentials. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: MessageCircle,
      title: 'AI Care Assistant',
      description: 'Get instant answers to all your baby care questions',
    },
    {
      icon: AlertTriangle,
      title: 'Smart Escalation',
      description: 'Automatic alerts when symptoms need medical attention',
    },
    {
      icon: MapPin,
      title: 'Hospital Finder',
      description: 'Find nearest hospitals with directions',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent to-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/50" />
        
        {/* Decorative circles */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/10" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10" />
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 rounded-2xl bg-primary/20 backdrop-blur-sm shadow-lg">
              <Baby className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Parent Portal</h1>
              <p className="text-muted-foreground text-sm">NeoGuard Post-Discharge Care</p>
            </div>
          </div>
          
          <h2 className="text-3xl font-semibold mb-4 leading-tight text-foreground">
            Your baby's care<br />continues at home
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-md leading-relaxed">
            Access our AI-powered care assistant for guidance, answers, and peace of mind after discharge.
          </p>
          
          <div className="space-y-5">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className="p-2.5 rounded-xl bg-primary/20 group-hover:bg-primary/30 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
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
            <div className="p-3 rounded-2xl bg-primary/20 shadow-lg">
              <Baby className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Parent Portal</h1>
              <p className="text-xs text-muted-foreground">Post-Discharge Care</p>
            </div>
          </div>

          <Card className="border-0 shadow-elevated bg-card">
            <CardHeader className="space-y-2 pb-6 text-center">
              <CardTitle className="text-2xl font-bold">Welcome, Parent</CardTitle>
              <CardDescription>
                Enter your contact info and baby ID to access the care portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="parentContact" className="text-sm font-medium">Parent Contact (Email/Phone)</Label>
                  <Input
                    id="parentContact"
                    type="text"
                    placeholder="your@email.com or phone number"
                    value={parentContact}
                    onChange={(e) => setParentContact(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/60 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="babyId" className="text-sm font-medium">Baby ID</Label>
                  <Input
                    id="babyId"
                    type="text"
                    placeholder="Enter your baby's unique ID"
                    value={babyId}
                    onChange={(e) => setBabyId(e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/60 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    This ID was provided to you at discharge
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold gradient-hero hover:opacity-90 transition-opacity mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Access Portal'}
                </Button>
              </form>

              {/* Info box */}
              <div className="mt-8 p-4 rounded-xl bg-accent/50 border border-accent">
                <p className="text-sm font-medium text-accent-foreground mb-1">Need help?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Contact the hospital if you don't have your baby's ID or if your contact info has changed.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you a medical professional?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Staff Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentLogin;
