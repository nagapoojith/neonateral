import React, { useState, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Download, Eye, Folder, Image, Plus, Trash2, Loader2, File, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HealthDocument {
  id: string;
  name: string;
  storagePath: string;
  babyId: string;
  babyName: string;
  documentType: string;
  fileType: string;
  size: string;
  uploadedBy: string;
  uploadedAt: Date;
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  birth_certificate: { label: 'Birth Certificate', icon: '📜' },
  discharge_summary: { label: 'Discharge Summary', icon: '📋' },
  prescription: { label: 'Prescription', icon: '💊' },
  medical_report: { label: 'Medical Report', icon: '🏥' },
};

const HealthRecords = () => {
  const { user } = useAuth();
  const { babies } = useData();
  const isDoctorOrSenior = user?.role === 'doctor' || user?.role === 'senior_doctor';
  const canUpload = isDoctorOrSenior;

  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBaby, setSelectedBaby] = useState<string>('all');
  const [uploadBaby, setUploadBaby] = useState('');
  const [uploadType, setUploadType] = useState<string>('medical_report');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.from('health-records').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const docs: HealthDocument[] = (data || [])
        .filter(f => !f.id.includes('.emptyFolderPlaceholder'))
        .map(file => {
          const parts = file.name.split('__');
          const babyId = parts[0] || '';
          const docType = parts[1] || 'medical_report';
          const originalName = parts.slice(2).join('__') || file.name;
          const baby = babies.find(b => b.id === babyId);
          const ext = originalName.split('.').pop()?.toLowerCase() || '';
          const fileType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'pdf';

          return {
            id: file.id || file.name,
            name: originalName,
            storagePath: file.name,
            babyId,
            babyName: baby?.name || 'Unknown',
            documentType: docType,
            fileType,
            size: formatFileSize(file.metadata?.size || 0),
            uploadedBy: 'Staff',
            uploadedAt: new Date(file.created_at || Date.now()),
          };
        });

      setDocuments(docs);
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      toast.error('Only PDF and image files are supported');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!uploadBaby) {
      toast.error('Please select a baby');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    try {
      const storageName = `${uploadBaby}__${uploadType}__${selectedFile.name}`;

      const { error } = await supabase.storage
        .from('health-records')
        .upload(storageName, selectedFile, { upsert: true });

      if (error) throw error;

      toast.success('Document uploaded successfully');
      setShowUpload(false);
      setSelectedFile(null);
      setUploadBaby('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleView = async (doc: HealthDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('health-records')
        .createSignedUrl(doc.storagePath, 300);

      if (error) throw error;
      setPreviewUrl(data.signedUrl);
      setPreviewName(doc.name);
    } catch {
      toast.error('Failed to load document preview');
    }
  };

  const handleDownload = async (doc: HealthDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('health-records')
        .download(doc.storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (doc: HealthDocument) => {
    try {
      const { error } = await supabase.storage
        .from('health-records')
        .remove([doc.storagePath]);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document removed');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const filteredDocs = selectedBaby === 'all' ? documents : documents.filter(d => d.babyId === selectedBaby);

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-medical">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl gradient-primary">
                <Folder className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
              </div>
            </CardContent>
          </Card>
          {Object.entries(DOC_TYPE_LABELS).slice(0, 3).map(([key, { label, icon }]) => (
            <Card key={key} className="card-medical">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {documents.filter(d => d.documentType === key).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showUpload && canUpload && (
          <Card className="card-medical border-2 border-primary/30">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Upload New Document
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
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
                    {Object.entries(DOC_TYPE_LABELS).map(([key, { label, icon }]) => (
                      <option key={key} value={key}>{icon} {label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors',
                  selectedFile ? 'border-status-normal bg-status-normal-bg' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-status-normal" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Click to select a file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 10MB)</p>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleUpload} disabled={isUploading || !selectedFile} className="btn-medical gap-2">
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button variant="outline" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-muted-foreground">Filter by baby:</span>
          <Button variant={selectedBaby === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedBaby('all')}>
            All ({documents.length})
          </Button>
          {babies.map(b => {
            const count = documents.filter(d => d.babyId === b.id).length;
            return (
              <Button key={b.id} variant={selectedBaby === b.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedBaby(b.id)}>
                {b.name} ({count})
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Card className="card-medical">
              <CardContent className="flex flex-col items-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Loading documents...</p>
              </CardContent>
            </Card>
          ) : filteredDocs.length === 0 ? (
            <Card className="card-medical">
              <CardContent className="flex flex-col items-center py-16">
                <Folder className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-lg font-semibold">No Documents Found</p>
                <p className="text-sm text-muted-foreground">Upload medical documents to get started</p>
              </CardContent>
            </Card>
          ) : (
            filteredDocs.map(doc => {
              const typeCfg = DOC_TYPE_LABELS[doc.documentType] || { label: doc.documentType, icon: '📄' };
              return (
                <Card key={doc.id} className="card-medical hover:shadow-card-hover">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                      <span className="text-xl">{typeCfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{typeCfg.label}</Badge>
                        <span className="text-xs text-muted-foreground">{doc.babyName}</span>
                        <span className="text-xs text-muted-foreground">{doc.size}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Uploaded: {doc.uploadedAt.toLocaleDateString()} at {doc.uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10" onClick={() => handleView(doc)}>
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-chart-spo2/10" onClick={() => handleDownload(doc)}>
                        <Download className="w-4 h-4 text-chart-spo2" />
                      </Button>
                      {canUpload && (
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(doc)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {previewUrl && (
          <div className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <div className="bg-card rounded-2xl shadow-elevated max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{previewName}</h3>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setPreviewUrl(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 overflow-auto max-h-[80vh]">
                {previewName.toLowerCase().endsWith('.pdf') ? (
                  <iframe src={previewUrl} className="w-full h-[70vh] rounded-xl border border-border" />
                ) : (
                  <img src={previewUrl} alt={previewName} className="max-w-full h-auto rounded-xl mx-auto" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HealthRecords;
