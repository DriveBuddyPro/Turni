import React, { useState } from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';
import { exportSingleShiftPDF, exportShiftsPDF } from '../utils/pdfExport';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ExportModalProps {
  shifts: any[];
  shiftTypes: Array<{
    type: string;
    label: string;
    color: string;
    time: string;
  }>;
  selectedDate: Date;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ shifts, shiftTypes, selectedDate, onClose }) => {
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  const shiftsWithAssignments = shifts.filter(shift => shift.assignments.length > 0);

  const handleShiftToggle = (shiftType: string) => {
    setSelectedShifts(prev => {
      if (prev.includes(shiftType)) {
        return prev.filter(type => type !== shiftType);
      } else {
        return [...prev, shiftType];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedShifts.length === shiftsWithAssignments.length) {
      setSelectedShifts([]);
    } else {
      setSelectedShifts(shiftsWithAssignments.map(shift => shift.shift_type));
    }
  };

  const handleExportSelected = () => {
    if (selectedShifts.length === 0) {
      toast.error('Seleziona almeno un turno da esportare', {
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }

    if (selectedShifts.length === 1) {
      // Export single shift
      const shiftType = selectedShifts[0];
      const shift = shifts.find(s => s.shift_type === shiftType);
      const shiftTypeInfo = shiftTypes.find(st => st.type === shiftType);
      
      if (shift && shiftTypeInfo) {
        exportSingleShiftPDF(shift, shiftTypeInfo, selectedDate);
        toast.success(`PDF ${shiftTypeInfo.label} esportato con successo!`, {
          duration: 4000,
          icon: '📄',
        });
      }
    } else {
      // Export multiple shifts
      const selectedShiftData = shifts.filter(shift => selectedShifts.includes(shift.shift_type));
      exportShiftsPDF(selectedShiftData, selectedDate);
      toast.success(`PDF con ${selectedShifts.length} turni esportato con successo!`, {
        duration: 4000,
        icon: '📄',
      });
    }

    onClose();
  };

  const getShiftTypeInfo = (shiftType: string) => {
    return shiftTypes.find(st => st.type === shiftType);
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'from-blue-500 to-blue-600 border-blue-200 dark:border-blue-700';
      case 'orange':
        return 'from-orange-500 to-orange-600 border-orange-200 dark:border-orange-700';
      case 'purple':
        return 'from-purple-500 to-purple-600 border-purple-200 dark:border-purple-700';
      default:
        return 'from-gray-500 to-gray-600 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-200">
        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Esporta Turni PDF</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
              {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {shiftsWithAssignments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nessun turno con assegnazioni
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                Non ci sono turni con lavoratori assegnati per questa data.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Seleziona i turni da esportare
                </h3>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  {selectedShifts.length === shiftsWithAssignments.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {shiftsWithAssignments.map((shift) => {
                  const shiftTypeInfo = getShiftTypeInfo(shift.shift_type);
                  if (!shiftTypeInfo) return null;

                  const isSelected = selectedShifts.includes(shift.shift_type);
                  const colorClasses = getColorClasses(shiftTypeInfo.color);

                  return (
                    <label
                      key={shift.shift_type}
                      className={`flex items-center justify-between p-4 sm:p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? `${colorClasses} bg-gradient-to-r text-white shadow-lg`
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleShiftToggle(shift.shift_type)}
                        className="sr-only"
                      />
                      
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-base sm:text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          {shiftTypeInfo.label}
                        </h4>
                        <p className={`text-sm mt-1 ${isSelected ? 'text-white opacity-90' : 'text-gray-500 dark:text-gray-400'}`}>
                          {shift.assignments.length} lavorator{shift.assignments.length !== 1 ? 'i' : 'e'} assegnat{shift.assignments.length !== 1 ? 'i' : 'o'}
                        </p>
                      </div>
                      
                      {isSelected && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0 ml-4">
                          <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={handleExportSelected}
                  disabled={selectedShifts.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center text-sm"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Esporta {selectedShifts.length > 0 ? `(${selectedShifts.length})` : ''}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;