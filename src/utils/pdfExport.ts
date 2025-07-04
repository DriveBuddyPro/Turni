import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { STATION_NAMES } from '../services/supabaseService';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const exportEmployeesPDF = (employees: any[]) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Elenco Lavoratori', 20, 20);
  
  // Stats
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(`Totale Lavoratori: ${employees.length}`, 20, 40);
  
  const activeEmployees = employees.filter(emp => emp.active).length;
  doc.text(`Lavoratori Attivi: ${activeEmployees}`, 20, 50);
  
  // Table data
  const tableData = employees.map(employee => [
    employee.name,
    employee.role,
    employee.active ? 'Attivo' : 'Inattivo'
  ]);
  
  // Table
  doc.autoTable({
    head: [['Nome', 'Ruolo', 'Stato']],
    body: tableData,
    startY: 65,
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }
  
  // Save
  doc.save(`lavoratori_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportSingleShiftPDF = (shift: any, shiftType: any, selectedDate: Date) => {
  const doc = new jsPDF();
  
  let yPosition = 20;
  
  // Header - ONLY shift name
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(shiftType.label, 20, yPosition);
  yPosition += 30;
  
  if (shift.assignments && shift.assignments.length > 0) {
    // Get station names for this shift type
    const stationNames = STATION_NAMES[shift.shift_type as keyof typeof STATION_NAMES] || [];
    
    // Table data - ONLY essential info with station names
    const shiftTableData = shift.assignments
      .sort((a: any, b: any) => a.station_number - b.station_number)
      .map((assignment: any) => [
        stationNames[assignment.station_number] || `Postazione ${assignment.station_number + 1}`,
        assignment.employee?.name || 'N/A',
        assignment.employee?.role || 'N/A'
      ]);
    
    // Table
    doc.autoTable({
      head: [['Postazione', 'Lavoratore', 'Ruolo']],
      body: shiftTableData,
      startY: yPosition,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: shiftType.color === 'blue' ? [59, 130, 246] : 
                   shiftType.color === 'orange' ? [249, 115, 22] : [147, 51, 234],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
      },
      margin: { left: 20, right: 20 },
    });
  } else {
    doc.setFontSize(11);
    doc.setTextColor(150, 150, 150);
    doc.text('Nessun lavoratore assegnato', 25, yPosition);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Pagina ${i} di ${pageCount}`, 
      doc.internal.pageSize.width / 2, 
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  const shiftTypeName = shiftType.type === 'morning' ? 'mattina' : 
                       shiftType.type === 'afternoon' ? 'pomeriggio' : 'sera';
  doc.save(`turno_${shiftTypeName}_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
};

export const exportShiftsPDF = (shifts: any[], selectedDate: Date) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Turni di Lavoro', 20, 20);
  
  let yPosition = 50;
  
  // Process each shift
  const shiftLabels = {
    morning: 'Turno Mattina',
    afternoon: 'Turno Pomeriggio', 
    evening: 'Turno Sera'
  };
  
  shifts.forEach((shift, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Shift title
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(shiftLabels[shift.shift_type as keyof typeof shiftLabels] || shift.shift_type, 20, yPosition);
    yPosition += 20;
    
    if (shift.assignments && shift.assignments.length > 0) {
      // Get station names for this shift type
      const stationNames = STATION_NAMES[shift.shift_type as keyof typeof STATION_NAMES] || [];
      
      // Table data - ONLY essential info with station names
      const shiftTableData = shift.assignments
        .sort((a: any, b: any) => a.station_number - b.station_number)
        .map((assignment: any) => [
          stationNames[assignment.station_number] || `Postazione ${assignment.station_number + 1}`,
          assignment.employee?.name || 'N/A',
          assignment.employee?.role || 'N/A'
        ]);
      
      // Table
      doc.autoTable({
        head: [['Postazione', 'Lavoratore', 'Ruolo']],
        body: shiftTableData,
        startY: yPosition,
        styles: {
          fontSize: 10,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: index === 0 ? [59, 130, 246] : index === 1 ? [249, 115, 22] : [147, 51, 234],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 60 },
          2: { cellWidth: 40 },
        },
        margin: { left: 20, right: 20 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text('Nessun lavoratore assegnato', 25, yPosition);
      yPosition += 20;
    }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Pagina ${i} di ${pageCount}`, 
      doc.internal.pageSize.width / 2, 
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`turni_${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
};