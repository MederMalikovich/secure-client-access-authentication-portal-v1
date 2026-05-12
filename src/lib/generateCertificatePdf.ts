import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import robotoUrl from '@/lib/fonts/Roboto-Regular.ttf';

interface CertificatePdfData {
  code: string;
  amount: number;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  expires_at?: string | null;
  notes?: string | null;
}

const PRIMARY: [number, number, number] = [218, 165, 32];
const DARK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [120, 120, 120];
const BG: [number, number, number] = [252, 248, 235];

async function loadFont(): Promise<string> {
  const r = await fetch(robotoUrl);
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

const formatKZT = (v: number) =>
  new Intl.NumberFormat('kk-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(v);

export async function generateCertificatePdf(data: CertificatePdfData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const fontBase64 = await loadFont();
  doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.setFont('Roboto');

  // Background
  doc.setFillColor(...BG);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Border
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.roundedRect(8, 8, pageW - 16, pageH - 16, 4, 4, 'S');
  doc.setLineWidth(0.3);
  doc.roundedRect(11, 11, pageW - 22, pageH - 22, 3, 3, 'S');

  // Header
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(11);
  doc.text('VetCRM', pageW / 2, 22, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(...DARK);
  doc.text('ПОДАРОЧНЫЙ СЕРТИФИКАТ', pageW / 2, 38, { align: 'center' });

  // Amount block
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(pageW / 2 - 50, 48, 100, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(formatKZT(data.amount), pageW / 2, 64, { align: 'center' });

  // Recipient
  let y = 86;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text('ВЫДАН', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.text(data.recipient_name || 'Предъявителю', pageW / 2, y, { align: 'center' });

  if (data.recipient_phone) {
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(data.recipient_phone, pageW / 2, y, { align: 'center' });
  }

  // Code
  y += 12;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text('КОД АКТИВАЦИИ', pageW / 2, y, { align: 'center' });
  y += 6;
  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.text(data.code, pageW / 2, y, { align: 'center' });

  // Expiry
  y += 10;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  if (data.expires_at) {
    const exp = format(new Date(data.expires_at), 'd MMMM yyyy', { locale: ru });
    doc.text(`Действителен до ${exp}`, pageW / 2, y, { align: 'center' });
  } else {
    doc.text('Без срока действия', pageW / 2, y, { align: 'center' });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Сгенерировано ${format(new Date(), 'dd.MM.yyyy HH:mm')}`,
    pageW / 2,
    pageH - 14,
    { align: 'center' }
  );

  doc.save(`сертификат_${data.code}.pdf`);
}
