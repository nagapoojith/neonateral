import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParentAuth } from '@/contexts/ParentAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Baby, LogOut, MessageCircle, MapPin, AlertTriangle, Heart, BedDouble, Activity } from 'lucide-react';
import ParentChatbot from '@/components/parent/ParentChatbot';
import HospitalMap from '@/components/parent/HospitalMap';

const ParentPortal = () => {
  const { parent, logout, isAuthenticated, isLoading } = useParentAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'chatbot' | 'hospitals'>('chatbot');
  const [showHospitalMap, setShowHospitalMap] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/parent/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/parent/login');
  };

  const handleShowHospitals = () => {
    setShowHospitalMap(true);
    setActiveTab('hospitals');
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return <Badge className="bg-status-normal text-white">Normal</Badge>;
      case 'had previous issue':
        return <Badge className="bg-status-warning text-white">Requires Attention</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!parent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 header-medical">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Baby className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Parent Portal</h1>
                <p className="text-xs text-muted-foreground">{parent.babyName}'s Care Assistant</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Welcome Card with Baby Details */}
        <Card className="mb-6 card-medical">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-accent">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">Welcome back!</h2>
                <p className="text-muted-foreground">
                  Caring for <span className="font-medium text-foreground">{parent.babyName}</span>
                </p>
              </div>
            </div>
            
            {/* Baby Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <BedDouble className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bed Number</p>
                  <p className="font-semibold text-foreground">{parent.bedNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(parent.status)}
                </div>
              </div>
              <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                <div className="p-2 rounded-lg bg-muted">
                  <Baby className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Baby Name</p>
                  <p className="font-semibold text-foreground">{parent.babyName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mb-6 p-4 rounded-xl bg-status-warning-bg border border-status-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">
              <strong>Important:</strong> This chatbot provides general guidance only and does not replace a doctor's consultation. 
              For any medical emergency, please call emergency services or visit the nearest hospital immediately.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'chatbot' ? 'default' : 'outline'}
            onClick={() => setActiveTab('chatbot')}
            className="gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Care Assistant
          </Button>
          <Button
            variant={activeTab === 'hospitals' ? 'default' : 'outline'}
            onClick={() => setActiveTab('hospitals')}
            className="gap-2"
          >
            <MapPin className="w-4 h-4" />
            Find Hospitals
          </Button>
        </div>

        {/* Content Area */}
        {activeTab === 'chatbot' ? (
          <ParentChatbot 
            babyName={parent.babyName} 
            onShowHospitals={handleShowHospitals}
          />
        ) : (
          <HospitalMap />
        )}
      </main>
    </div>
  );
};

export default ParentPortal;
