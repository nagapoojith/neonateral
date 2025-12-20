import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Baby, Calendar, Clock, Users, Phone, Bed, Save } from 'lucide-react';

const RegisterBaby = () => {
  const { user } = useAuth();
  const { addBaby } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    bedNumber: '',
    dateOfBirth: '',
    timeOfBirth: '',
    parentNames: '',
    parentContact: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate form
    if (!formData.name || !formData.bedNumber || !formData.dateOfBirth || 
        !formData.timeOfBirth || !formData.parentNames || !formData.parentContact) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await addBaby({
        name: formData.name,
        bedNumber: formData.bedNumber,
        dateOfBirth: formData.dateOfBirth,
        timeOfBirth: formData.timeOfBirth,
        parentNames: formData.parentNames,
        parentContact: formData.parentContact,
        registeredBy: user?.name || 'Unknown',
      });

      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: 'Failed to register baby. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only doctors can access this page
  if (user?.role !== 'doctor' && user?.role !== 'senior_doctor') {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only doctors can register new babies.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Register New Baby</h1>
          <p className="text-muted-foreground">
            Add a newborn to the monitoring system
          </p>
        </div>

        <Card className="card-medical">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Baby className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Baby Registration Form</CardTitle>
                <CardDescription>All fields are required</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Baby Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Baby Information
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <Baby className="w-4 h-4" />
                      Baby Name / ID
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Baby Smith"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bedNumber" className="flex items-center gap-2">
                      <Bed className="w-4 h-4" />
                      Bed Number
                    </Label>
                    <Input
                      id="bedNumber"
                      name="bedNumber"
                      placeholder="NICU-05"
                      value={formData.bedNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date of Birth
                    </Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timeOfBirth" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time of Birth
                    </Label>
                    <Input
                      id="timeOfBirth"
                      name="timeOfBirth"
                      type="time"
                      value={formData.timeOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Parent Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="parentNames" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Parent Names
                  </Label>
                  <Input
                    id="parentNames"
                    name="parentNames"
                    placeholder="John & Jane Smith"
                    value={formData.parentNames}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="parentContact" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Number
                  </Label>
                  <Input
                    id="parentContact"
                    name="parentContact"
                    type="tel"
                    placeholder="+1-555-0105"
                    value={formData.parentContact}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="medical"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Registering...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Register Baby
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="card-medical mt-4">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Once registered, the baby will immediately begin 
              monitoring. The behavior baseline system will start tracking patterns and 
              will establish a baseline after 3-4 days of observation.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default RegisterBaby;
