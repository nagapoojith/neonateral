import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Baby, MessageCircle, MapPin, AlertTriangle, Heart, ArrowLeft } from 'lucide-react';
import ParentChatbot from '@/components/parent/ParentChatbot';
import HospitalMap from '@/components/parent/HospitalMap';

const ParentPortal = () => {
  const [activeTab, setActiveTab] = useState<'chatbot' | 'hospitals'>('chatbot');
  const [showHospitalMap, setShowHospitalMap] = useState(false);

  const handleShowHospitals = () => {
    setShowHospitalMap(true);
    setActiveTab('hospitals');
  };

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
                <h1 className="text-lg font-bold text-foreground">Parent Care Portal</h1>
                <p className="text-xs text-muted-foreground">Neonatal Care Assistant</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Welcome Card */}
        <Card className="mb-6 card-medical">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-accent">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">Welcome, Parent!</h2>
                <p className="text-muted-foreground mt-1">
                  Get general guidance on newborn care, feeding, sleep, hygiene, and more. 
                  Our AI assistant is here to help answer your questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="mb-6 p-4 rounded-xl bg-status-warning-bg border border-status-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm text-foreground">
              <p className="font-semibold mb-1">Important Disclaimer</p>
              <p>
                This chatbot provides <strong>general guidance only</strong> and does not provide baby-specific medical data or replace a doctor's consultation. 
                For any medical emergency, please call emergency services or visit the nearest hospital immediately.
              </p>
            </div>
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