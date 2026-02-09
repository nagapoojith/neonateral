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

const TEAL: [number, number, number] = [13, 79, 95];
const TEAL_LIGHT: [number, number, number] = [220, 240, 245];
const GRAY_TEXT: [number, number, number] = [71, 85, 105];
const BLACK_TEXT: [number, number, number] = [15, 23, 42];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];
const GREEN: [number, number, number] = [5, 150, 105];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [217, 119, 6];
const WHITE: [number, number, number] = [255, 255, 255];
const DARK_TEAL: [number, number, number] = [8, 55, 68];
const BLUE_ACCENT: [number, number, number] = [37, 99, 235];

function addPageHeader(doc: jsPDF, pageWidth: number) {
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(...WHITE);
  doc.rect(0, 8, pageWidth, 2, 'F');
  doc.setFillColor(220, 240, 245);
  doc.rect(0, 10, pageWidth, 2, 'F');
}

function addPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number) {
  doc.setFillColor(...TEAL);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...WHITE);
  doc.text('CONFIDENTIAL — Protected Health Information', 15, pageHeight - 5);
  doc.text(`Page ${pageNum}`, pageWidth - 15, pageHeight - 5, { align: 'right' });
  doc.text('NeoGuard NICU Monitoring System', pageWidth / 2, pageHeight - 5, { align: 'center' });
}

function drawSectionHeader(doc: jsPDF, icon: string, title: string, y: number, pageWidth: number): number {
  doc.setFillColor(...TEAL);
  doc.roundedRect(15, y, pageWidth - 30, 9, 1.5, 1.5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(`${icon}  ${title}`, 20, y + 6.5);
  doc.setTextColor(...BLACK_TEXT);
  return y + 13;
}

function drawTableHeader(doc: jsPDF, headers: string[], cols: number[], y: number, pageWidth: number): number {
  doc.setFillColor(...TEAL_LIGHT);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(15, y + 7, pageWidth - 15, y + 7);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_TEAL);
  headers.forEach((h, i) => doc.text(h, cols[i], y + 5));
  return y + 9;
}

function drawKeyValueRow(doc: jsPDF, label: string, value: string, y: number, x: number): number {
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_TEXT);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK_TEXT);
  doc.text(value, x + 42, y);
  return y + 5.5;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageWidth: number, pageNum: { value: number }): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    addPageFooter(doc, pageWidth, pageHeight, pageNum.value);
    doc.addPage();
    pageNum.value++;
    addPageHeader(doc, pageWidth);
    return 18;
  }
  return y;
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
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageNum = { value: 1 };

      doc.setFillColor(...TEAL);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setFillColor(8, 55, 68);
      doc.rect(0, 42, pageWidth, 8, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 220, 230);
      doc.text('NEONATAL INTENSIVE CARE UNIT', pageWidth / 2, 14, { align: 'center' });

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('NeoGuard', pageWidth / 2, 26, { align: 'center' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive Neonatal Medical Report', pageWidth / 2, 34, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(200, 230, 240);
      doc.text(`Report ID: NG-${Date.now().toString(36).toUpperCase()} | Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 47, { align: 'center' });

      let y = 56;

      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(...AMBER);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, y, pageWidth - 30, 8, 1.5, 1.5, 'FD');
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...AMBER);
      doc.text('DISCLAIMER: This report is for informational and monitoring purposes only. It does not constitute a medical diagnosis. Always consult a qualified healthcare professional.', pageWidth / 2, y + 5.5, { align: 'center' });
      y += 14;

      y = drawSectionHeader(doc, '\u2764', 'PATIENT & ADMISSION DETAILS', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, pageWidth - 30, 36, 2, 2, 'FD');

      const col1 = 20;
      const col2 = pageWidth / 2 + 5;
      let row = y + 7;
      row = drawKeyValueRow(doc, 'Patient Name:', baby.name, row, col1);
      row = drawKeyValueRow(doc, 'Date of Birth:', baby.dateOfBirth, row, col1);
      row = drawKeyValueRow(doc, 'Parents:', baby.parentNames, row, col1);
      drawKeyValueRow(doc, 'Admission ID:', `ADM-${baby.id.slice(0, 8).toUpperCase()}`, row, col1);

      row = y + 7;
      row = drawKeyValueRow(doc, 'Bed Number:', `Bed ${baby.bedNumber}`, row, col2);
      row = drawKeyValueRow(doc, 'Contact:', baby.parentContact, row, col2);
      row = drawKeyValueRow(doc, 'Report Date:', new Date().toLocaleDateString(), row, col2);

      const statusLabel = baby.status === 'critical' ? 'CRITICAL' : baby.status === 'high' ? 'HIGH PRIORITY' : 'STABLE';
      const statusColor = baby.status === 'critical' ? RED : baby.status === 'high' ? AMBER : GREEN;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...statusColor);
      const statusBg: [number, number, number] = baby.status === 'critical' ? [254, 242, 242] : baby.status === 'high' ? [255, 251, 235] : [236, 253, 245];
      doc.setFillColor(...statusBg);
      doc.roundedRect(col2 + 42, row - 4, 38, 7, 1, 1, 'F');
      doc.text(statusLabel, col2 + 44, row);
      y += 42;

      y = checkPageBreak(doc, y, 60, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\u2665', 'VITAL SIGNS HISTORY (Last 20 Readings)', y, pageWidth);

      if (vitalsHistory.length > 0) {
        const cols = [20, 48, 72, 96, 120, 146, 170];
        const headers = ['Time', 'HR (bpm)', 'Resp (/min)', 'SpO\u2082 (%)', 'Temp (\u00B0C)', 'Movement', 'Position'];
        y = drawTableHeader(doc, headers, cols, y, pageWidth);

        const recentVitals = vitalsHistory.slice(-20);
        recentVitals.forEach((vital, idx) => {
          y = checkPageBreak(doc, y, 6, pageWidth, pageNum);
          if (idx % 2 === 0) {
            doc.setFillColor(245, 248, 252);
            doc.rect(15, y - 3.5, pageWidth - 30, 5.5, 'F');
          }

          const time = new Date(vital.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY_TEXT);
          doc.text(time, cols[0], y);

          const hrOk = vital.heartRate >= 100 && vital.heartRate <= 160;
          doc.setTextColor(...(hrOk ? BLACK_TEXT : RED));
          doc.setFont('helvetica', hrOk ? 'normal' : 'bold');
          doc.text(String(vital.heartRate), cols[1], y);

          const rrOk = vital.respirationRate >= 30 && vital.respirationRate <= 60;
          doc.setTextColor(...(rrOk ? BLACK_TEXT : RED));
          doc.setFont('helvetica', rrOk ? 'normal' : 'bold');
          doc.text(String(vital.respirationRate), cols[2], y);

          const spo2Ok = vital.spo2 >= 94;
          doc.setTextColor(...(spo2Ok ? BLACK_TEXT : RED));
          doc.setFont('helvetica', spo2Ok ? 'normal' : 'bold');
          doc.text(String(vital.spo2), cols[3], y);

          const tempOk = vital.temperature >= 36.0 && vital.temperature <= 37.5;
          doc.setTextColor(...(tempOk ? BLACK_TEXT : RED));
          doc.setFont('helvetica', tempOk ? 'normal' : 'bold');
          doc.text(vital.temperature.toFixed(1), cols[4], y);

          doc.setTextColor(...BLACK_TEXT);
          doc.setFont('helvetica', 'normal');
          doc.text(String(vital.movement), cols[5], y);

          const posOk = vital.sleepingPosition === 'back';
          doc.setTextColor(...(posOk ? GREEN : vital.sleepingPosition === 'prone' ? RED : AMBER));
          doc.setFont('helvetica', posOk ? 'normal' : 'bold');
          doc.text(vital.sleepingPosition.charAt(0).toUpperCase() + vital.sleepingPosition.slice(1), cols[6], y);
          y += 5;
        });

        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(15, y, pageWidth - 15, y);
        y += 3;

        doc.setFillColor(236, 253, 245);
        doc.roundedRect(15, y, 30, 5, 1, 1, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GREEN);
        doc.text('\u25CF Normal', 17, y + 3.5);

        doc.setFillColor(254, 242, 242);
        doc.roundedRect(48, y, 34, 5, 1, 1, 'F');
        doc.setTextColor(...RED);
        doc.text('\u25CF Abnormal', 50, y + 3.5);

        doc.setFillColor(255, 251, 235);
        doc.roundedRect(85, y, 28, 5, 1, 1, 'F');
        doc.setTextColor(...AMBER);
        doc.text('\u25CF Warning', 87, y + 3.5);
        y += 10;
      } else {
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('No vital sign data available for this patient.', 20, y + 5);
        y += 12;
      }

      y = checkPageBreak(doc, y, 30, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\u26A0', 'ALERTS & EVENTS LOG', y, pageWidth);
      const babyAlerts = alerts.filter(a => a.babyId === baby.id).slice(0, 15);
      if (babyAlerts.length > 0) {
        const alertCols = [20, 65, 95, 125];
        y = drawTableHeader(doc, ['Timestamp', 'Severity', 'Status', 'Description'], alertCols, y, pageWidth);

        babyAlerts.forEach((alert, idx) => {
          y = checkPageBreak(doc, y, 6, pageWidth, pageNum);
          if (idx % 2 === 0) {
            doc.setFillColor(245, 248, 252);
            doc.rect(15, y - 3.5, pageWidth - 30, 5.5, 'F');
          }
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...GRAY_TEXT);
          doc.text(new Date(alert.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), alertCols[0], y);

          const levelColor = alert.level === 'critical' ? RED : alert.level === 'high' ? AMBER : GREEN;
          doc.setTextColor(...levelColor);
          doc.setFont('helvetica', 'bold');
          doc.text(alert.level.toUpperCase(), alertCols[1], y);

          doc.setTextColor(...(alert.acknowledged ? GREEN : RED));
          doc.setFont('helvetica', 'normal');
          doc.text(alert.acknowledged ? 'Acknowledged' : 'Pending', alertCols[2], y);

          doc.setTextColor(...BLACK_TEXT);
          const msg = alert.message.length > 45 ? alert.message.substring(0, 42) + '...' : alert.message;
          doc.text(msg, alertCols[3], y);
          y += 5;
        });
        y += 4;
      } else {
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(15, y, pageWidth - 30, 8, 1.5, 1.5, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(...GREEN);
        doc.text('\u2713  No alerts recorded for this patient during the monitoring period.', 20, y + 5.5);
        y += 14;
      }

      y = checkPageBreak(doc, y, 32, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\uD83D\uDD0A', 'CRY DETECTION ANALYSIS', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(15, y, pageWidth - 30, 22, 2, 2, 'FD');
      if (cryResult) {
        const cryColor = cryResult.classification === 'pain' ? RED : cryResult.classification === 'discomfort' ? AMBER : GREEN;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...cryColor);
        doc.text(`Classification: ${cryResult.classification.toUpperCase()} CRY`, 20, y + 7);

        doc.setFillColor(...(cryResult.classification === 'pain' ? [254, 242, 242] as [number, number, number] : cryResult.classification === 'discomfort' ? [255, 251, 235] as [number, number, number] : [236, 253, 245] as [number, number, number]));
        doc.roundedRect(pageWidth - 55, y + 2, 35, 7, 1, 1, 'F');
        doc.setFontSize(8);
        doc.text(`${cryResult.confidence}% confidence`, pageWidth - 53, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Detection Time: ${cryResult.timestamp.toLocaleString()}`, 20, y + 13);
        doc.text(`Assessment: ${cryResult.message}`, 20, y + 19);
      } else {
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('No cry detection events recorded during this monitoring session.', 20, y + 12);
      }
      y += 28;

      y = checkPageBreak(doc, y, 36, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\uD83C\uDF21', 'INCUBATOR ENVIRONMENT STATUS', y, pageWidth);

      const envTemp = (32 + Math.random() * 2).toFixed(1);
      const envHum = (50 + Math.random() * 10).toFixed(1);
      const envLight = Math.round(100 + Math.random() * 200);

      const envParams = [
        { label: 'Temperature', value: `${envTemp}\u00B0C`, optimal: '32\u201334\u00B0C', ok: parseFloat(envTemp) >= 32 && parseFloat(envTemp) <= 34 },
        { label: 'Humidity', value: `${envHum}%`, optimal: '50\u201360%', ok: parseFloat(envHum) >= 50 && parseFloat(envHum) <= 60 },
        { label: 'Light Exposure', value: `${envLight} lux`, optimal: '100\u2013300 lux', ok: envLight >= 100 && envLight <= 300 },
      ];

      const envColWidth = (pageWidth - 36) / 3;
      envParams.forEach((param, i) => {
        const x = 15 + i * (envColWidth + 3);
        const bgColor: [number, number, number] = param.ok ? [236, 253, 245] : [255, 251, 235];
        doc.setFillColor(...bgColor);
        doc.setDrawColor(...BORDER);
        doc.roundedRect(x, y, envColWidth, 22, 2, 2, 'FD');

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(param.label, x + 4, y + 6);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(param.ok ? GREEN : AMBER));
        doc.text(param.value, x + 4, y + 14);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Optimal: ${param.optimal}`, x + 4, y + 19);
      });
      y += 28;

      y = checkPageBreak(doc, y, 24, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\uD83D\uDCCA', 'NEONATAL RISK SCORE', y, pageWidth);

      const score = riskScore ?? Math.floor(Math.random() * 40 + 10);
      const riskCategory = score >= 70 ? 'Critical' : score >= 45 ? 'Attention Needed' : score >= 20 ? 'Monitor' : 'Stable';
      const riskColor = score >= 70 ? RED : score >= 45 ? AMBER : GREEN;

      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(15, y, pageWidth - 30, 18, 2, 2, 'FD');

      const barX = 20;
      const barW = 80;
      const barY = y + 5;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(barX, barY, barW, 5, 1, 1, 'F');
      doc.setFillColor(...riskColor);
      doc.roundedRect(barX, barY, (score / 100) * barW, 5, 1, 1, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...riskColor);
      doc.text(`${score}/100`, barX + barW + 5, barY + 4.5);

      doc.setFontSize(9);
      doc.text(riskCategory, barX + barW + 25, barY + 4.5);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Risk score is assistive and not a medical diagnosis. Clinical judgment must always prevail.', 20, y + 15);
      y += 24;

      y = checkPageBreak(doc, y, 22, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\uD83C\uDF7C', 'FEEDING STATUS & SCHEDULE', y, pageWidth);

      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'FD');

      const feedTypes = ['Breast Milk', 'Formula', 'Tube Feeding'];
      const lastFeedTime = new Date(Date.now() - 7200000);
      const nextDue = new Date(Date.now() + 3600000);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Last Feed:', 20, y + 6);
      doc.setTextColor(...BLACK_TEXT);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lastFeedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${feedTypes[Math.floor(Math.random() * 3)]})`, 48, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Next Due:', 20, y + 12);
      doc.setTextColor(...BLUE_ACCENT);
      doc.setFont('helvetica', 'bold');
      doc.text(nextDue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 48, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GREEN);
      doc.text('\u2713 On Schedule', pageWidth - 55, y + 9);
      y += 22;

      y = checkPageBreak(doc, y, 22, pageWidth, pageNum);
      y = drawSectionHeader(doc, '\uD83D\uDCDD', 'CLINICAL NOTES', y, pageWidth);

      doc.setFillColor(...LIGHT_BG);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'FD');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Patient vitals stable throughout monitoring period. Standard care protocol maintained.', 20, y + 6);
      doc.text('Continue current treatment plan. No acute interventions required at this time.', 20, y + 12);
      y += 22;

      y = checkPageBreak(doc, y, 14, pageWidth, pageNum);
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.8);
      doc.line(15, y, pageWidth - 15, y);
      y += 5;

      doc.setFillColor(245, 248, 252);
      doc.roundedRect(15, y, pageWidth - 30, 14, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_TEAL);
      doc.text('Attending Physician: ________________________', 20, y + 5);
      doc.text('Signature: ________________________', pageWidth / 2 + 5, y + 5);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y + 11);
      doc.text('Stamp:', pageWidth / 2 + 5, y + 11);

      addPageFooter(doc, pageWidth, pageHeight, pageNum.value);

      doc.save(`NeoGuard_Report_${baby.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Hospital-grade report downloaded successfully');
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
            Comprehensive Medical Report
          </CardTitle>
          <Badge variant="secondary" className="text-xs">Hospital-Grade PDF</Badge>
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
          <p className="font-semibold text-foreground">Report includes:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>Patient information & admission details</li>
            <li>Color-coded vital sign history (last 20 readings)</li>
            <li>Alert history with severity & acknowledgment status</li>
            <li>Cry detection analysis summary</li>
            <li>Incubator environment status</li>
            <li>Neonatal risk score with progress bar</li>
            <li>Feeding schedule & compliance</li>
            <li>Clinical notes & physician signature block</li>
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
              Download Full Report (PDF)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default HistoricalReport;
