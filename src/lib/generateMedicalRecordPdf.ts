import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

export function generateMedicalRecordPdf(record: MedicalRecordPdfData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addText = (label: string, value: string, bold = false) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(content, pageWidth - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 2;
  };

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('VetCRM', 14, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Meditsinskaya karta', 14, y + 6);
  y += 16;

  // Line
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Basic info
  const visitDate = format(new Date(record.visit_date), 'd MMMM yyyy, HH:mm', { locale: ru });
  addText('Data:', visitDate);
  addText('Pitomets:', record.pet?.name || '—');
  addText('Vladelets:', record.pet?.client?.full_name || '—');
  addText('Vrach:', record.veterinarian?.full_name || '—');

  if (record.weight_at_visit) addText('Ves:', `${record.weight_at_visit} kg`);
  if (record.temperature) addText('Temperatura:', `${record.temperature}°C`);

  y += 4;
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Sections
  addSection('Zhaloby', record.chief_complaint || '');
  addSection('Osmotr', record.examination_notes || '');
  addSection('Diagnoz', record.diagnosis || '');
  addSection('Lechenie', record.treatment || '');
  addSection('Naznacheniya', record.prescriptions || '');
  addSection('Analizy', record.lab_results || '');
  addSection('Materialy', record.materials_used || '');
  addSection('Kommentarii vracha', record.doctor_notes || '');

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `VetCRM — ${format(new Date(), 'dd.MM.yyyy HH:mm')} — str. ${i}/${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.setTextColor(0);
  }

  const petName = record.pet?.name || 'record';
  const dateStr = format(new Date(record.visit_date), 'yyyy-MM-dd');
  doc.save(`medkarta_${petName}_${dateStr}.pdf`);
}
