import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Code, 
  Database, 
  Mail, 
  Cloud, 
  Shield, 
  Cpu, 
  Layers,
  Globe,
  Zap,
  Server,
  Lock
} from 'lucide-react';

const Documentation = () => {
  const technologies = [
    {
      category: "Frontend Technology",
      icon: Code,
      items: [
        { name: "React 18", description: "Modern JavaScript library for building user interfaces with hooks and functional components" },
        { name: "TypeScript", description: "Strongly typed programming language that builds on JavaScript for better code quality" },
        { name: "Vite", description: "Next-generation frontend build tool for fast development and optimized production builds" },
        { name: "Tailwind CSS", description: "Utility-first CSS framework for rapid UI development with responsive design" },
        { name: "Shadcn/UI", description: "Re-usable component library built on Radix UI primitives for accessible interfaces" },
        { name: "Recharts", description: "Composable charting library for React to visualize vital signs data" },
      ]
    },
    {
      category: "Backend Platform",
      icon: Server,
      items: [
        { name: "Supabase", description: "Open-source Firebase alternative providing backend-as-a-service with PostgreSQL" },
        { name: "Edge Functions", description: "Serverless functions running on Deno runtime for API endpoints and email processing" },
        { name: "Real-time Subscriptions", description: "WebSocket-based real-time data synchronization for live monitoring updates" },
      ]
    },
    {
      category: "Database",
      icon: Database,
      items: [
        { name: "PostgreSQL", description: "Advanced open-source relational database for storing patient and vital signs data" },
        { name: "Row Level Security (RLS)", description: "Database-level security policies ensuring data access control and privacy" },
        { name: "Real-time Replication", description: "Automatic data synchronization across all connected clients" },
      ]
    },
    {
      category: "Authentication & Security",
      icon: Shield,
      items: [
        { name: "Supabase Auth", description: "Secure authentication system with email/password and session management" },
        { name: "JWT Tokens", description: "JSON Web Tokens for secure API authentication and authorization" },
        { name: "Role-Based Access Control", description: "Differentiated access levels for doctors, nurses, and senior doctors" },
      ]
    },
    {
      category: "Email Service",
      icon: Mail,
      items: [
        { name: "Brevo (Sendinblue)", description: "Transactional email API for sending alert notifications to medical staff" },
        { name: "HTML Email Templates", description: "Professional hospital-grade email templates for clinical alerts" },
      ]
    },
    {
      category: "AI Integration",
      icon: Cpu,
      items: [
        { name: "Lovable AI Gateway", description: "AI-powered content generation for clinical alert assessments" },
        { name: "Google Gemini 2.5 Flash", description: "Large language model for generating medical explanations and recommendations" },
      ]
    },
    {
      category: "Hosting & Deployment",
      icon: Cloud,
      items: [
        { name: "Lovable Platform", description: "Integrated development and deployment platform for web applications" },
        { name: "CDN Distribution", description: "Global content delivery network for fast application loading" },
        { name: "Automatic HTTPS", description: "SSL/TLS encryption for secure data transmission" },
      ]
    },
  ];

  const features = [
    {
      title: "Real-time Vital Monitoring",
      description: "Continuous monitoring of heart rate, SpO₂, temperature, and sleeping position with 3-second update intervals.",
      icon: Zap,
    },
    {
      title: "Automatic Alert System",
      description: "Intelligent threshold-based alerts that automatically notify medical staff when vitals exceed safe ranges.",
      icon: Shield,
    },
    {
      title: "Multi-Recipient Notifications",
      description: "Configure up to 5 email recipients per patient for comprehensive alert coverage.",
      icon: Mail,
    },
    {
      title: "AI-Powered Assessments",
      description: "Machine learning generates clinical explanations and recommended actions for each alert.",
      icon: Cpu,
    },
    {
      title: "Alert History & Escalation",
      description: "Complete audit trail of all alerts with automatic escalation for unacknowledged critical alerts.",
      icon: Layers,
    },
    {
      title: "Secure Data Management",
      description: "Enterprise-grade security with RLS policies, encrypted communications, and role-based access.",
      icon: Lock,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-semibold">Technical Documentation</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">
            NeoGuard NICU Monitoring System
          </h1>
          <p className="text-muted-foreground text-lg">
            A comprehensive neonatal intensive care monitoring solution built with modern web technologies
            for real-time patient monitoring and automated clinical alerts.
          </p>
        </div>

        <Card className="card-medical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Globe className="w-5 h-5 text-primary" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              The NeoGuard NICU Monitoring System is a web-based application designed to monitor vital signs 
              of neonates in intensive care units. The system provides real-time monitoring, automatic alert 
              generation based on configurable thresholds, and AI-powered clinical decision support. It enables 
              medical staff to receive immediate notifications when patient conditions require attention, 
              improving response times and patient outcomes.
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="card-medical">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Technology Stack
          </h2>
          <div className="space-y-6">
            {technologies.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <Card key={index} className="card-medical overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b border-border/50">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      {tech.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {tech.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-semibold text-foreground">{item.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0">Tech</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="card-medical bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-semibold">Academic Project</span>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Neonatal Monitoring System
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              This project demonstrates the application of modern web technologies in healthcare 
              information systems, combining real-time data processing, AI-powered decision support, 
              and secure data management for critical care environments.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Documentation;
