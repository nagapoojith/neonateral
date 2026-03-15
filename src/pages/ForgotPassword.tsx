import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Heart, ArrowLeft, Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'Reset link sent',
          description: 'Check your email for the password reset link.',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-10">
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
            <CardTitle className="text-2xl font-bold">
              {emailSent ? 'Check Your Email' : 'Forgot Password'}
            </CardTitle>
            <CardDescription>
              {emailSent
                ? 'We sent a password reset link to your email address.'
                : 'Enter your email and we\'ll send you a reset link.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setEmailSent(false)}
                    className="text-primary font-semibold hover:underline"
                  >
                    try again
                  </button>.
                </p>
              </div>
            ) : (
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
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl text-base font-semibold gradient-hero hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
