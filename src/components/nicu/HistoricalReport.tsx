import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import type { Baby, Alert, VitalSigns } from '@/contexts/DataContext';
import type { CryResult } from './CryDetection';

interface HistoricalReportProps {
  baby: Baby;
  alerts: Alert[];
  vitalsHistory: VitalSigns[];
  cryResult?: CryResult | null;
  riskScore?: number;
}

const HistoricalReport: React.FC<HistoricalReportProps> = ({
  baby,
  alerts,
  vitalsHistory,
  cryResult,
  riskScore,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('NeoGuard - Neonatal Monitoring Report', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.setDrawColor(0, 150, 180);
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Patient Information', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const patientInfo = [
        `Name: ${baby.name}`,
        `Bed Number: ${baby.bedNumber}`,
        `Date of Birth: ${baby.dateOfBirth}`,
        `Parents: ${baby.parentNames}`,
        `Contact: ${baby.parentContact}`,
        `Status: ${baby.status.charAt(0).toUpperCase() + baby.status.slice(1)}`,
      ];
      patientInfo.forEach(line => {
        doc.text(line, 25, y);
        y += 6;
      });
      y += 5;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Vital Signs History', 20, y);
      y += 8;

      if (vitalsHistory.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const headers = ['Time', 'HR (bpm)', 'Resp (/min)', 'SpO2 (%)', 'Temp (°C)', 'Position'];
        const colWidths = [35, 25, 25, 25, 25, 25];
        let x = 20;
        headers.forEach((header, i) => {
          doc.text(header, x, y);
          x += colWidths[i];
        });
        y += 2;
        doc.line(20, y, pageWidth - 20, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        const recentVitals = vitalsHistory.slice(-20);
        recentVitals.forEach(vital => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          x = 20;
          const time = new Date(vital.timestamp).toLocaleTimeString();
          const row = [time, String(vital.heartRate), String(vital.respirationRate), String(vital.spo2), vital.temperature.toFixed(1), vital.sleepingPosition];
          row.forEach((cell, i) => {
            doc.text(cell, x, y);
            x += colWidths[i];
          });
          y += 5;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No vital sign data available.', 25, y);
        y += 6;
      }
      y += 8;

      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Alert History', 20, y);
      y += 8;

      const babyAlerts = alerts.filter(a => a.babyId === baby.id).slice(0, 20);
      if (babyAlerts.length > 0) {
        doc.setFontSize(9);
        babyAlerts.forEach(alert => {
          if (y > 270) { doc.addPage(); y = 20; }
          const levelColor = alert.level === 'critical' ? [220, 50, 50] : alert.level === 'high' ? [230, 160, 0] : [50, 160, 100];
          doc.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(`[${alert.level.toUpperCase()}]`, 25, y);
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          const alertTime = new Date(alert.timestamp).toLocaleString();
          doc.text(`${alertTime} - ${alert.message.substring(0, 80)}`, 50, y);
          y += 6;
        });
      } else {
        doc.setFontSize(10);
        doc.text('No alerts recorded.', 25, y);
        y += 6;
      }
      y += 8;

      if (cryResult) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Cry Detection Events', 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Last Detection: ${cryResult.classification} cry (${cryResult.confidence}% confidence)`, 25, y);
        y += 6;
        doc.text(`Time: ${cryResult.timestamp.toLocaleString()}`, 25, y);
        y += 6;
        doc.text(`Assessment: ${cryResult.message}`, 25, y);
        y += 10;
      }

      if (riskScore !== undefined) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Risk Score Summary', 20, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const riskCategory = riskScore >= 70 ? 'Critical' : riskScore >= 45 ? 'Attention Needed' : riskScore >= 20 ? 'Monitor' : 'Stable';
        doc.text(`Current Risk Score: ${riskScore}/100 (${riskCategory})`, 25, y);
        y += 10;
      }

      if (y > 260) { doc.addPage(); y = 20; }
      doc.setDrawColor(0, 150, 180);
      doc.line(20, y, pageWidth - 20, y);
      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('DISCLAIMER: This report is generated for informational purposes only and does not constitute a medical diagnosis.', 20, y);
      y += 5;
      doc.text('Always consult with qualified healthcare professionals for medical decisions.', 20, y);
      y += 5;
      doc.text(`Report generated by NeoGuard NICU Monitoring System on ${new Date().toLocaleString()}`, 20, y);

      doc.save(`NeoGuard_Report_${baby.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="card-medical overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            Historical Report
          </CardTitle>
          <Badge variant="secondary" className="text-xs">PDF Download</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground">Vital Records</p>
            <p className="text-lg font-bold text-foreground">{vitalsHistory.length}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground">Alerts Logged</p>
            <p className="text-lg font-bold text-foreground">{alerts.filter(a => a.babyId === baby.id).length}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Report includes:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>Patient information</li>
            <li>Vital sign history (last 20 readings)</li>
            <li>Alert history (last 20 alerts)</li>
            <li>Cry detection events</li>
            <li>Risk score summary</li>
          </ul>
        </div>

        <Button
          onClick={generatePDF}
          disabled={isGenerating}
          className="w-full btn-medical gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Report (PDF)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HistoricalReport;
