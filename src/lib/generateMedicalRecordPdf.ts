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

export async function generateMedicalRecordPdf(record: MedicalRecordPdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Load and register Cyrillic font
  const fontBase64 = await loadFont();
  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');

  const addText = (label: string, value: string) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.text(label, 14, y);
    const lines = doc.splitTextToSize(value, pageWidth - 60);
    doc.text(lines, 60, y);
    y += Math.max(lines.length * 5, 7);
  };

  const addSection = (title: string, content: string) => {
    if (!content) return;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    y += 3;
    doc.setFontSize(11);
    doc.setFont('Roboto', 'normal');
    doc.text(title, 14, y);
    y += 6;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(content, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
  };

  // Header
  doc.setFontSize(16);
  doc.text('VetCRM', 14, y);
  doc.setFontSize(10);
  doc.text('Медицинская карта', 14, y + 6);
  y += 16;

  // Line
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Basic info
  const visitDate = format(new Date(record.visit_date), 'd MMMM yyyy, HH:mm', { locale: ru });
  addText('Дата:', visitDate);
  addText('Питомец:', record.pet?.name || '—');
  addText('Владелец:', record.pet?.client?.full_name || '—');
  addText('Врач:', record.veterinarian?.full_name || '—');

  if (record.weight_at_visit) addText('Вес:', `${record.weight_at_visit} кг`);
  if (record.temperature) addText('Температура:', `${record.temperature}°C`);

  y += 4;
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Sections
  addSection('Жалобы', record.chief_complaint || '');
  addSection('Осмотр', record.examination_notes || '');
  addSection('Диагноз', record.diagnosis || '');
  addSection('Лечение', record.treatment || '');
  addSection('Назначения', record.prescriptions || '');
  addSection('Анализы', record.lab_results || '');
  addSection('Материалы', record.materials_used || '');
  addSection('Комментарии врача', record.doctor_notes || '');

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `VetCRM — ${format(new Date(), 'dd.MM.yyyy HH:mm')} — стр. ${i}/${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.setTextColor(0);
  }

  const petName = record.pet?.name || 'record';
  const dateStr = format(new Date(record.visit_date), 'yyyy-MM-dd');
  doc.save(`медкарта_${petName}_${dateStr}.pdf`);
}
