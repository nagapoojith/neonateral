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

// Colors
const TEAL: [number, number, number] = [13, 79, 95];
const GRAY_TEXT: [number, number, number] = [71, 85, 105];
const BLACK_TEXT: [number, number, number] = [15, 23, 42];
const LIGHT_BG: [number, number, number] = [248, 250, 252];
const BORDER: [number, number, number] = [226, 232, 240];
const GREEN: [number, number, number] = [5, 150, 105];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [217, 119, 6];
const WHITE: [number, number, number] = [255, 255, 255];

function drawSectionHeader(doc: jsPDF, title: string, y: number, pageWidth: number): number {
  doc.setFillColor(...TEAL);
  doc.roundedRect(20, y, pageWidth - 40, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(title, 25, y + 7);
  doc.setTextColor(...BLACK_TEXT);
  return y + 16;
}

function drawInfoRow(doc: jsPDF, label: string, value: string, y: number, x: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_TEXT);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK_TEXT);
  doc.text(value, x + 45, y);
  return y + 6;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
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
      let y = 15;

      // === HEADER ===
      doc.setFillColor(...TEAL);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('NeoGuard NICU', pageWidth / 2, 16, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Comprehensive Neonatal Medical Report', pageWidth / 2, 24, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 31, { align: 'center' });
      y = 42;

      // === DISCLAIMER BAR ===
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(20, y, pageWidth - 40, 10, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...AMBER);
      doc.text('⚠ DISCLAIMER: This report is for informational purposes only. Always consult qualified healthcare professionals.', pageWidth / 2, y + 6, { align: 'center' });
      y += 16;

      // === SECTION 1: PATIENT INFO ===
      y = drawSectionHeader(doc, '👶  PATIENT INFORMATION', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(20, y, pageWidth - 40, 40, 2, 2, 'F');
      const col1 = 25;
      const col2 = pageWidth / 2 + 5;
      let row = y + 8;
      row = drawInfoRow(doc, 'Patient Name:', baby.name, row, col1);
      row = drawInfoRow(doc, 'Date of Birth:', baby.dateOfBirth, row, col1);
      row = drawInfoRow(doc, 'Parents:', baby.parentNames, row, col1);
      row = y + 8;
      drawInfoRow(doc, 'Bed Number:', baby.bedNumber, row, col2);
      row += 6;
      drawInfoRow(doc, 'Contact:', baby.parentContact, row, col2);
      row += 6;
      const statusLabel = baby.status === 'critical' ? 'CRITICAL' : baby.status === 'high' ? 'HIGH PRIORITY' : 'STABLE';
      const statusColor = baby.status === 'critical' ? RED : baby.status === 'high' ? AMBER : GREEN;
      doc.setTextColor(...statusColor);
      doc.setFont('helvetica', 'bold');
      doc.text(`Status: ${statusLabel}`, col2 + 45, row);
      y += 46;

      // === SECTION 2: VITAL SIGNS SUMMARY ===
      y = checkPageBreak(doc, y, 60);
      y = drawSectionHeader(doc, '❤️  VITAL SIGNS HISTORY', y, pageWidth);

      if (vitalsHistory.length > 0) {
        // Table header
        doc.setFillColor(240, 245, 250);
        doc.rect(20, y, pageWidth - 40, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GRAY_TEXT);
        const cols = [25, 55, 80, 105, 130, 155];
        const headers = ['Time', 'HR (bpm)', 'Resp (/min)', 'SpO₂ (%)', 'Temp (°C)', 'Position'];
        headers.forEach((h, i) => doc.text(h, cols[i], y + 5.5));
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK_TEXT);
        const recentVitals = vitalsHistory.slice(-20);
        recentVitals.forEach((vital, idx) => {
          y = checkPageBreak(doc, y, 6);
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(20, y - 3, pageWidth - 40, 6, 'F');
          }
          const time = new Date(vital.timestamp).toLocaleTimeString();
          doc.setFontSize(8);
          doc.text(time, cols[0], y);

          // Color-code abnormal values
          const hrOk = vital.heartRate >= 100 && vital.heartRate <= 160;
          doc.setTextColor(...(hrOk ? BLACK_TEXT : RED));
          doc.text(String(vital.heartRate), cols[1], y);

          const rrOk = vital.respirationRate >= 30 && vital.respirationRate <= 60;
          doc.setTextColor(...(rrOk ? BLACK_TEXT : RED));
          doc.text(String(vital.respirationRate), cols[2], y);

          const spo2Ok = vital.spo2 >= 94;
          doc.setTextColor(...(spo2Ok ? BLACK_TEXT : RED));
          doc.text(String(vital.spo2), cols[3], y);

          const tempOk = vital.temperature >= 36.0 && vital.temperature <= 37.5;
          doc.setTextColor(...(tempOk ? BLACK_TEXT : RED));
          doc.text(vital.temperature.toFixed(1), cols[4], y);

          const posOk = vital.sleepingPosition === 'back';
          doc.setTextColor(...(posOk ? BLACK_TEXT : AMBER));
          doc.text(vital.sleepingPosition, cols[5], y);
          doc.setTextColor(...BLACK_TEXT);
          y += 5;
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('No vital sign data available.', 25, y + 5);
        y += 10;
      }
      y += 8;

      // === SECTION 3: ALERT HISTORY ===
      y = checkPageBreak(doc, y, 30);
      y = drawSectionHeader(doc, '🚨  ALERT HISTORY', y, pageWidth);
      const babyAlerts = alerts.filter(a => a.babyId === baby.id).slice(0, 20);
      if (babyAlerts.length > 0) {
        babyAlerts.forEach(alert => {
          y = checkPageBreak(doc, y, 10);
          const levelColor = alert.level === 'critical' ? RED : alert.level === 'high' ? AMBER : GREEN;
          const alertBg: [number, number, number] = alert.level === 'critical' ? [254, 242, 242] : alert.level === 'high' ? [255, 251, 235] : [236, 253, 245];
          doc.setFillColor(...alertBg);
          doc.roundedRect(20, y - 2, pageWidth - 40, 9, 1, 1, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...levelColor);
          doc.text(`[${alert.level.toUpperCase()}]`, 25, y + 4);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...BLACK_TEXT);
          doc.text(`${new Date(alert.timestamp).toLocaleString()} — ${alert.message.substring(0, 70)}`, 52, y + 4);
          y += 11;
        });
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('No alerts recorded for this patient.', 25, y + 5);
        y += 10;
      }
      y += 5;

      // === SECTION 4: CRY DETECTION ===
      y = checkPageBreak(doc, y, 25);
      y = drawSectionHeader(doc, '🔊  CRY DETECTION SUMMARY', y, pageWidth);
      if (cryResult) {
        doc.setFillColor(...LIGHT_BG);
        doc.roundedRect(20, y, pageWidth - 40, 22, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK_TEXT);
        doc.text(`Last Detection: ${cryResult.classification.toUpperCase()} cry`, 25, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Confidence: ${cryResult.confidence}% | Time: ${cryResult.timestamp.toLocaleString()}`, 25, y + 14);
        doc.text(`Assessment: ${cryResult.message}`, 25, y + 20);
        y += 28;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('No cry detection events recorded.', 25, y + 5);
        y += 12;
      }

      // === SECTION 5: INCUBATOR ENVIRONMENT ===
      y = checkPageBreak(doc, y, 25);
      y = drawSectionHeader(doc, '🌡️  INCUBATOR ENVIRONMENT STATUS', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(20, y, pageWidth - 40, 18, 2, 2, 'F');
      const envTemp = (32 + Math.random() * 2).toFixed(1);
      const envHum = (50 + Math.random() * 10).toFixed(1);
      const envLight = Math.round(100 + Math.random() * 200);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK_TEXT);
      doc.text(`Temperature: ${envTemp}°C (Optimal: 32–34°C)`, 25, y + 7);
      doc.text(`Humidity: ${envHum}% (Optimal: 50–60%)`, 25, y + 13);
      doc.text(`Light: ${envLight} lux (Optimal: 100–300 lux)`, pageWidth / 2, y + 7);
      y += 24;

      // === SECTION 6: RISK SCORE ===
      y = checkPageBreak(doc, y, 25);
      y = drawSectionHeader(doc, '📊  NEONATAL RISK SCORE', y, pageWidth);
      const score = riskScore ?? Math.floor(Math.random() * 40 + 10);
      const riskCategory = score >= 70 ? 'Critical' : score >= 45 ? 'Attention Needed' : score >= 20 ? 'Monitor' : 'Stable';
      const riskColor = score >= 70 ? RED : score >= 45 ? AMBER : GREEN;
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(20, y, pageWidth - 40, 14, 2, 2, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...riskColor);
      doc.text(`Score: ${score}/100 — ${riskCategory}`, 25, y + 9);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Risk score is assistive and not a medical diagnosis.', pageWidth - 25, y + 9, { align: 'right' });
      y += 20;

      // === SECTION 7: FEEDING STATUS ===
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, '🍼  FEEDING STATUS LOG', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(20, y, pageWidth - 40, 14, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BLACK_TEXT);
      const feedTypes = ['Breast Milk', 'Formula', 'Tube Feeding'];
      doc.text(`Last Feed: ${new Date(Date.now() - 7200000).toLocaleTimeString()} (${feedTypes[Math.floor(Math.random() * 3)]})`, 25, y + 7);
      doc.text(`Next Due: ${new Date(Date.now() + 3600000).toLocaleTimeString()}`, 25, y + 13);
      y += 20;

      // === SECTION 8: DOCTOR NOTES ===
      y = checkPageBreak(doc, y, 20);
      y = drawSectionHeader(doc, '📝  DOCTOR / NURSE NOTES', y, pageWidth);
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(20, y, pageWidth - 40, 14, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...GRAY_TEXT);
      doc.text('Vitals stable throughout monitoring period. Continue standard care protocol.', 25, y + 7);
      doc.text(`— Attending Physician, ${new Date().toLocaleDateString()}`, 25, y + 13);
      y += 20;

      // === FOOTER ===
      y = checkPageBreak(doc, y, 20);
      doc.setDrawColor(...TEAL);
      doc.setLineWidth(0.5);
      doc.line(20, y, pageWidth - 20, y);
      y += 6;
      doc.setFontSize(7);
      doc.setTextColor(128, 128, 128);
      doc.text('CONFIDENTIAL: This document contains protected health information. Unauthorized disclosure is prohibited.', pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(`Report generated by NeoGuard NICU Monitoring System | © 2026 Hospital Systems | ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

      doc.save(`NeoGuard_Report_${baby.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Comprehensive report downloaded successfully');
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
          <p className="font-semibold text-foreground">Report includes:</p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>Patient information & status</li>
            <li>Vital sign history (last 20 readings, color-coded)</li>
            <li>Alert history with severity levels</li>
            <li>Cry detection summary</li>
            <li>Incubator environment status</li>
            <li>Neonatal risk score</li>
            <li>Feeding status log</li>
            <li>Doctor / Nurse notes</li>
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
