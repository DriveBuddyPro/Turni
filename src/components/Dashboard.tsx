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
  const [initialLoad, setInitialLoad] = useState(true);

  const shiftTypes = [
    { type: 'morning', label: 'Turno Mattina', color: 'blue', time: '07:00 - 14:00' },
    { type: 'afternoon', label: 'Turno Pomeriggio', color: 'orange', time: '14:00 - 21:00' },
    { type: 'evening', label: 'Turno Notte', color: 'purple', time: '21:00 - 07:00' }
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [selectedDate, user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Solo mostra loading completo al primo caricamento
    if (initialLoad) {
      setLoading(true);
    }
    
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const [shiftsData, employeesData] = await Promise.all([
        shiftService.getByDate(dateString),
        employeeService.getAll()
      ]);
      
      setShifts(shiftsData);
      setEmployees(employeesData.filter(emp => emp.active));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Funzione per aggiornare solo i dati senza loading
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

  // Loading iniziale con skeleton
  if (loading && initialLoad) {
    return (
      <div className="p-0 bg-transparent min-h-screen transition-colors duration-200">
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-6 lg:mb-8">
            <div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 mb-2 animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-96 animate-pulse"></div>
            </div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-32 animate-pulse"></div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 mb-6 lg:mb-8">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
              <div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-24 animate-pulse"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            </div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-24 animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton per le card dei turni */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
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
              className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
              className="p-2 sm:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
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