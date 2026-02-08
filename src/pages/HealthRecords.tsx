import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { FileText, Upload, Download, Eye, Folder, File, Image, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HealthDocument {
  id: string;
  babyId: string;
  babyName: string;
  documentName: string;
  documentType: 'birth_certificate' | 'discharge_summary' | 'prescription' | 'medical_report';
  fileType: 'pdf' | 'image';
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  discharge_summary: 'Discharge Summary',
  prescription: 'Prescription',
  medical_report: 'Medical Report',
};

const HealthRecords = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const isDoctorOrSenior = user?.role === 'doctor' || user?.role === 'senior_doctor';
  const isNurse = user?.role === 'nurse';

  // For this demo, parents can upload. Doctors can view. Nurses view-only.
  const canUpload = isDoctorOrSenior; // In parent portal, parents also upload

  const [documents, setDocuments] = useState<HealthDocument[]>([
    {
      id: '1',
      babyId: babies[0]?.id || '',
      babyName: babies[0]?.name || 'Baby A',
      documentName: 'Birth_Certificate.pdf',
      documentType: 'birth_certificate',
      fileType: 'pdf',
      uploadedBy: 'Parent',
      uploadedAt: new Date(Date.now() - 86400000 * 3),
      size: '245 KB',
    },
    {
      id: '2',
      babyId: babies[0]?.id || '',
      babyName: babies[0]?.name || 'Baby A',
      documentName: 'Initial_Assessment.pdf',
      documentType: 'medical_report',
      fileType: 'pdf',
      uploadedBy: 'Dr. Sarah Johnson',
      uploadedAt: new Date(Date.now() - 86400000 * 2),
      size: '512 KB',
    },
    {
      id: '3',
      babyId: babies[1]?.id || '',
      babyName: babies[1]?.name || 'Baby B',
      documentName: 'Prescription_Vitamins.pdf',
      documentType: 'prescription',
      fileType: 'pdf',
      uploadedBy: 'Dr. Rajesh Kumar',
      uploadedAt: new Date(Date.now() - 86400000),
      size: '128 KB',
    },
  ]);

  const [selectedBaby, setSelectedBaby] = useState<string>('all');
  const [uploadBaby, setUploadBaby] = useState('');
  const [uploadType, setUploadType] = useState<string>('medical_report');
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocs = selectedBaby === 'all' ? documents : documents.filter(d => d.babyId === selectedBaby);

  const handleUpload = () => {
    if (!uploadBaby) {
      toast.error('Please select a baby');
      return;
    }
    const baby = babies.find(b => b.id === uploadBaby);
    const newDoc: HealthDocument = {
      id: Date.now().toString(),
      babyId: uploadBaby,
      babyName: baby?.name || 'Unknown',
      documentName: `${DOC_TYPE_LABELS[uploadType]?.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      documentType: uploadType as any,
      fileType: 'pdf',
      uploadedBy: user?.name || 'Unknown',
      uploadedAt: new Date(),
      size: `${Math.floor(Math.random() * 500 + 100)} KB`,
    };
    setDocuments(prev => [newDoc, ...prev]);
    setShowUpload(false);
    setUploadBaby('');
    toast.success('Document uploaded successfully');
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success('Document removed');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Health Records</h1>
            <p className="text-muted-foreground">Secure access to baby-related medical documents</p>
          </div>
          {canUpload && (
            <Button onClick={() => setShowUpload(!showUpload)} className="btn-medical gap-2">
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          )}
        </div>

        {showUpload && canUpload && (
          <Card className="card-medical border-2 border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Upload New Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Select Baby</label>
                <select
                  value={uploadBaby}
                  onChange={e => setUploadBaby(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select --</option>
                  {babies.map(b => <option key={b.id} value={b.id}>{b.name} (Bed {b.bedNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-2 block">Document Type</label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="birth_certificate">Birth Certificate</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="prescription">Prescription</option>
                  <option value="medical_report">Medical Report</option>
                </select>
              </div>
              <div className="p-6 border-2 border-dashed border-border rounded-xl text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to select or drag & drop files</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10MB)</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleUpload} className="btn-medical gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter by baby:</span>
          <Button
            variant={selectedBaby === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedBaby('all')}
          >
            All ({documents.length})
          </Button>
          {babies.map(b => {
            const count = documents.filter(d => d.babyId === b.id).length;
            return (
              <Button
                key={b.id}
                variant={selectedBaby === b.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedBaby(b.id)}
              >
                {b.name} ({count})
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          {filteredDocs.length === 0 ? (
            <Card className="card-medical">
              <CardContent className="flex flex-col items-center py-16">
                <Folder className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-lg font-semibold">No Documents Found</p>
                <p className="text-sm text-muted-foreground">Upload medical documents to get started</p>
              </CardContent>
            </Card>
          ) : (
            filteredDocs.map(doc => (
              <Card key={doc.id} className="card-medical">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                    {doc.fileType === 'pdf' ? <FileText className="w-6 h-6 text-primary" /> : <Image className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{doc.documentName}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{DOC_TYPE_LABELS[doc.documentType]}</Badge>
                      <span className="text-xs text-muted-foreground">{doc.babyName}</span>
                      <span className="text-xs text-muted-foreground">{doc.size}</span>
                      <span className="text-xs text-muted-foreground">by {doc.uploadedBy}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{doc.uploadedAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => toast.info('Document preview (demo)')}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => toast.info('Download started (demo)')}>
                      <Download className="w-4 h-4" />
                    </Button>
                    {canUpload && (
                      <Button variant="ghost" size="icon" className="rounded-xl text-destructive" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HealthRecords;
