import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { format, addDays, subDays, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { shiftService, employeeService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import ShiftCard from './ShiftCard';
import ExportModal from './ExportModal';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [shifts, setShifts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const shiftTypes = [
    { type: 'morning', label: 'Turno Mattina', color: 'blue', time: '07:00 - 14:00' },
    { type: 'afternoon', label: 'Turno Pomeriggio', color: 'orange', time: '14:00 - 21:00' },
    { type: 'evening', label: 'Turno Notte', color: 'purple', time: '21:00 - 07:00' }
  ];

  useEffect(() => {
    if (user) {
      // Carica i dati in parallelo ma gestisci il loading separatamente
      fetchShifts();
      fetchEmployees();
    }
  }, [selectedDate, user]);

  // Aggiorna il loading generale quando entrambi i caricamenti sono completati
  useEffect(() => {
    setLoading(shiftsLoading || employeesLoading);
  }, [shiftsLoading, employeesLoading]);

  const fetchShifts = async () => {
    if (!user) return;
    
    setShiftsLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const shiftsData = await shiftService.getByDate(dateString);
      setShifts(shiftsData);
    } catch (error: any) {
      console.error('Error fetching shifts:', error);
      toast.error('Errore nel caricamento dei turni');
    } finally {
      setShiftsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (!user) return;
    
    setEmployeesLoading(true);
    try {
      const employeesData = await employeeService.getAll();
      setEmployees(employeesData.filter(emp => emp.active));
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Errore nel caricamento degli OSS');
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Funzione per aggiornare solo i turni senza loading
  const refreshData = async () => {
    if (!user) return;
    
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const shiftsData = await shiftService.getByDate(dateString);
      setShifts(shiftsData);
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      toast.error('Errore nell\'aggiornamento dei dati');
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(startOfDay(new Date()));
  };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const handleCloseExportModal = () => {
    setShowExportModal(false);
  };

  if (!user) {
    return null;
  }

  // Mostra il contenuto anche se sta ancora caricando, con skeleton per le parti mancanti
  return (
    <div className="p-0 bg-transparent min-h-screen transition-colors duration-200">
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard Turni</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Gestisci i turni di lavoro e le assegnazioni con drag & drop</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={handleExportClick}
              disabled={loading}
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 mr-2" />
              Esporta PDF
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 mb-6 lg:mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousDay}
              disabled={shiftsLoading}
              className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(selectedDate, 'EEEE', { locale: it })}
              </p>
            </div>
            
            <button
              onClick={handleNextDay}
              disabled={shiftsLoading}
              className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <button
            onClick={handleToday}
            disabled={shiftsLoading}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calendar className="w-4 h-4 mr-2 inline" />
            Oggi
          </button>
        </div>
      </div>

      {/* Shift Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
        {shiftTypes.map((shiftType) => {
          const shift = shifts.find(s => s.shift_type === shiftType.type);
          
          // Se i turni stanno ancora caricando, mostra skeleton
          if (shiftsLoading) {
            return (
              <div key={shiftType.type} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className={`h-24 bg-gradient-to-r ${
                  shiftType.color === 'blue' ? 'from-blue-500 to-blue-600' :
                  shiftType.color === 'orange' ? 'from-orange-500 to-orange-600' :
                  'from-purple-500 to-purple-600'
                } animate-pulse`}></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              </div>
            );
          }
          
          return (
            <ShiftCard
              key={shiftType.type}
              shift={shift}
              shiftType={shiftType}
              selectedDate={selectedDate}
              onRefetch={refreshData}
            />
          );
        })}
      </div>

      {/* Loading indicator per gli OSS */}
      {employeesLoading && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Caricamento OSS...</span>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          shifts={shifts}
          shiftTypes={shiftTypes}
          selectedDate={selectedDate}
          onClose={handleCloseExportModal}
        />
      )}
    </div>
  );
};

export default Dashboard;