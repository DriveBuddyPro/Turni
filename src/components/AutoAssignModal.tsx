import React, { useState, useEffect } from 'react';
import { X, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { assignmentService, employeeService, STATION_NAMES } from '../services/supabaseService';
import toast from 'react-hot-toast';

interface AutoAssignModalProps {
  shift: any;
  employees: any[];
  onClose: () => void;
}

const AutoAssignModal: React.FC<AutoAssignModalProps> = ({ shift, onClose }) => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data.filter(emp => emp.active));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Errore nel caricamento degli OSS');
    } finally {
      setDataLoading(false);
    }
  };

  const assignedEmployeeIds = shift.assignments?.map((a: any) => a.employee_id) || [];
  const occupiedStationIndexes = shift.assignments?.map((a: any) => a.station_number) || [];
  
  // Get station names for this shift type
  const stationNames = STATION_NAMES[shift.shift_type as keyof typeof STATION_NAMES] || [];
  
  // Ordina i lavoratori disponibili alfabeticamente
  const availableEmployees = employees
    .filter(emp => !assignedEmployeeIds.includes(emp.id))
    .sort((a, b) => a.name.localeCompare(b.name));
    
  const availableStationIndexes = stationNames
    .map((_, index) => index)
    .filter(index => !occupiedStationIndexes.includes(index));

  const maxSelectable = Math.min(availableEmployees.length, availableStationIndexes.length);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else if (prev.length < maxSelectable) {
        return [...prev, employeeId];
      } else {
        toast.error(`Puoi selezionare massimo ${maxSelectable} lavoratori`);
        return prev;
      }
    });
  };

  const handleAutoAssign = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast.error('Seleziona almeno un lavoratore');
      return;
    }

    setLoading(true);
    try {
      // Mescola casualmente le postazioni disponibili
      const shuffledStationIndexes = [...availableStationIndexes].sort(() => Math.random() - 0.5);
      
      // Mescola casualmente i lavoratori selezionati
      const shuffledEmployees = [...selectedEmployeeIds].sort(() => Math.random() - 0.5);

      // Assegna i lavoratori alle postazioni mescolate
      const assignments = shuffledEmployees.map((employeeId, index) => ({
        employee_id: employeeId,
        shift_id: shift.id,
        station_number: shuffledStationIndexes[index],
      }));

      // Esegui tutte le assegnazioni
      await Promise.all(assignments.map(assignment => assignmentService.create(assignment)));
      
      toast.success(`${assignments.length} lavoratori assegnati automaticamente!`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Errore nell\'assegnazione automatica');
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Assegnazione Automatica</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="font-medium text-blue-900 dark:text-blue-100 text-sm sm:text-base">Informazioni Assegnazione</h3>
            </div>
            <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <p>• Postazioni disponibili: {availableStationIndexes.length}</p>
              <p>• Lavoratori disponibili: {availableEmployees.length}</p>
              <p>• Massimo selezionabili: {maxSelectable}</p>
              <p>• Attualmente selezionati: {selectedEmployeeIds.length}</p>
            </div>
          </div>

          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Users className="w-4 h-4 inline mr-2" />
              Seleziona Lavoratori ({selectedEmployeeIds.length}/{maxSelectable})
            </label>
            <div className="max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
              {availableEmployees.map((employee) => (
                <label
                  key={employee.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedEmployeeIds.includes(employee.id) ? 'bg-green-50 dark:bg-green-900/50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.includes(employee.id)}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">{employee.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{employee.role}</p>
                  </div>
                  {selectedEmployeeIds.includes(employee.id) && (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
            {availableEmployees.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Nessun lavoratore disponibile per questo turno
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Annulla
            </button>
            <button
              onClick={handleAutoAssign}
              disabled={loading || selectedEmployeeIds.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? 'Assegnando...' : `Assegna ${selectedEmployeeIds.length} Lavoratori`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoAssignModal;