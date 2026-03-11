import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import robotoUrl from '@/lib/fonts/Roboto-Regular.ttf';

interface MedicalRecordPdfData {
  visit_date: string;
  pet?: { name: string; client?: { full_name: string } };
  veterinarian?: { full_name: string };
  weight_at_visit?: number | null;
  temperature?: number | null;
  chief_complaint?: string | null;
  examination_notes?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  prescriptions?: string | null;
  lab_results?: string | null;
  materials_used?: string | null;
  doctor_notes?: string | null;
}

async function loadFont(): Promise<string> {
  const response = await fetch(robotoUrl);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Brand colors
const PRIMARY_COLOR: [number, number, number] = [218, 165, 32]; // golden
const DARK_TEXT: [number, number, number] = [40, 40, 40];
const MUTED_TEXT: [number, number, number] = [120, 120, 120];
const SECTION_BG: [number, number, number] = [248, 246, 240];
const LINE_COLOR: [number, number, number] = [220, 215, 200];

export async function generateMedicalRecordPdf(record: MedicalRecordPdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // Load and register Cyrillic font
  const fontBase64 = await loadFont();
  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = 25;
    }
  };

  // ── Header band ──
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Subtle decorative line
  doc.setFillColor(255, 255, 255);
  doc.setGlobalAlpha?.(0.15);
  doc.rect(0, 36, pageWidth, 2, 'F');
  doc.setGlobalAlpha?.(1);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('VetCRM', margin, 18);
  doc.setFontSize(10);
  doc.text('Медицинская карта приёма', margin, 28);

  // Date on the right
  const visitDate = format(new Date(record.visit_date), 'd MMMM yyyy, HH:mm', { locale: ru });
  doc.setFontSize(10);
  doc.text(visitDate, pageWidth - margin, 18, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Дата приёма', pageWidth - margin, 28, { align: 'right' });

  y = 50;

  // ── Patient info card ──
  doc.setFillColor(...SECTION_BG);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'F');
  doc.setDrawColor(...LINE_COLOR);
  doc.roundedRect(margin, y, contentWidth, 32, 3, 3, 'S');

  doc.setTextColor(...MUTED_TEXT);
  doc.setFontSize(8);
  doc.text('ПИТОМЕЦ', margin + 8, y + 10);
  doc.text('ВЛАДЕЛЕЦ', margin + 8, y + 24);

  const col2X = margin + contentWidth * 0.5;
  doc.text('ВРАЧ', col2X, y + 10);

  doc.setTextColor(...DARK_TEXT);
  doc.setFontSize(11);
  doc.text(record.pet?.name || '—', margin + 8, y + 16);
  doc.setFontSize(10);
  doc.text(record.pet?.client?.full_name || '—', margin + 8, y + 30);
  doc.text(record.veterinarian?.full_name || '—', col2X, y + 16);

  // Vitals on the right
  const vitalsX = pageWidth - margin - 8;
  if (record.weight_at_visit || record.temperature) {
    doc.setTextColor(...MUTED_TEXT);
    doc.setFontSize(8);
    let vitY = y + 10;
    if (record.weight_at_visit) {
      doc.text('ВЕС', vitalsX - 20, vitY);
      doc.setTextColor(...DARK_TEXT);
      doc.setFontSize(11);
      doc.text(`${record.weight_at_visit} кг`, vitalsX - 20, vitY + 6);
      vitY += 14;
      doc.setTextColor(...MUTED_TEXT);
      doc.setFontSize(8);
    }
    if (record.temperature) {
      doc.text('ТЕМП.', vitalsX - 20, vitY);
      doc.setTextColor(...DARK_TEXT);
      doc.setFontSize(11);
      doc.text(`${record.temperature}°C`, vitalsX - 20, vitY + 6);
    }
  }

  y += 42;

  // ── Sections ──
  const sections = [
    { label: 'Жалобы', value: record.chief_complaint, icon: '●' },
    { label: 'Осмотр', value: record.examination_notes, icon: '●' },
    { label: 'Диагноз', value: record.diagnosis, icon: '●' },
    { label: 'Лечение', value: record.treatment, icon: '●' },
    { label: 'Назначения', value: record.prescriptions, icon: '●' },
    { label: 'Результаты анализов', value: record.lab_results, icon: '●' },
    { label: 'Использованные материалы', value: record.materials_used, icon: '●' },
    { label: 'Комментарии врача', value: record.doctor_notes, icon: '●' },
  ].filter(s => s.value);

  for (const section of sections) {
    checkPageBreak(25);

    // Section title with golden accent dot
    doc.setFillColor(...PRIMARY_COLOR);
    doc.circle(margin + 3, y + 1, 1.5, 'F');

    doc.setTextColor(...PRIMARY_COLOR);
    doc.setFontSize(9);
    doc.text(section.label.toUpperCase(), margin + 8, y + 3);

    y += 8;

    // Section content
    doc.setTextColor(...DARK_TEXT);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(section.value!, contentWidth - 8);
    
    checkPageBreak(lines.length * 5 + 4);
    
    // Light background for content
    const blockHeight = lines.length * 5 + 6;
    doc.setFillColor(252, 251, 248);
    doc.roundedRect(margin, y - 2, contentWidth, blockHeight, 2, 2, 'F');

    doc.text(lines, margin + 4, y + 4);
    y += blockHeight + 4;
  }

  // ── Footer on all pages ──
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...LINE_COLOR);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

    doc.setFontSize(7);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(
      `VetCRM — Сгенерировано ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
      margin,
      pageHeight - 12
    );
    doc.text(
      `Стр. ${i} из ${pages}`,
      pageWidth - margin,
      pageHeight - 12,
      { align: 'right' }
    );
  }

  const petName = record.pet?.name || 'record';
  const dateStr = format(new Date(record.visit_date), 'yyyy-MM-dd');
  doc.save(`медкарта_${petName}_${dateStr}.pdf`);
}
