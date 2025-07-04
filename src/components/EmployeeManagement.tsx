import React, { useState, useEffect } from 'react';
import { Search, FileText, AlertCircle, Filter, Users, Building2 } from 'lucide-react';
import { employeeService } from '../services/supabaseService';
import { exportEmployeesPDF } from '../utils/pdfExport';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const EmployeeManagement = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const roles = [
    'Tutti',
    'OSS'
  ];

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [refreshKey, user]);

  const fetchEmployees = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Errore nel caricamento degli OSS');
    } finally {
      setDataLoading(false);
    }
  };

  // Ordina i lavoratori alfabeticamente
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));

  const filteredEmployees = sortedEmployees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = selectedRole === '' || selectedRole === 'Tutti' || employee.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleExportPDF = () => {
    if (filteredEmployees.length === 0) {
      toast.error('Nessun OSS da esportare', {
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }
    exportEmployeesPDF(filteredEmployees);
    toast.success('PDF esportato con successo!', {
      duration: 4000,
      icon: '📄',
    });
  };

  if (!user) {
    return null;
  }

  if (dataLoading) {
    return (
      <div className="p-0 bg-transparent min-h-screen transition-colors duration-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Caricamento OSS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 bg-transparent min-h-screen transition-colors duration-200">
      <div className="mb-6 lg:mb-8">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Database OSS</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Database condiviso del personale OSS dell'ospedale</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button 
              onClick={handleExportPDF}
              className="flex items-center justify-center px-4 sm:px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Esporta PDF
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <div className="flex items-start space-x-3">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Database Condiviso OSS
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Questo è il database condiviso di tutti gli OSS dell'ospedale. Tutti gli utenti possono visualizzare e assegnare questi OSS ai turni, ma solo gli amministratori possono modificare le informazioni.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 shadow-sm text-sm sm:text-base"
            />
          </div>

          {/* Mobile Filter Toggle */}
          <div className="flex items-center justify-between sm:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtri
            </button>
            {selectedRole && selectedRole !== 'Tutti' && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {selectedRole}
              </span>
            )}
          </div>

          {/* Role Filter */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all duration-200 shadow-sm text-sm sm:text-base"
            >
              {roles.map(role => (
                <option key={role} value={role === 'Tutti' ? '' : role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 lg:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Totale OSS</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">OSS Attivi</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {employees.filter(emp => emp.active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
              <Search className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Risultati Filtro</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredEmployees.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" key={refreshKey}>
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 p-6 sm:p-8 group"
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm sm:text-lg">
                  {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                Database
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg mb-1 truncate">{employee.name}</h3>
                <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-semibold">{employee.role}</p>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {employee.email && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <div className="w-4 h-4 mr-2 sm:mr-3 text-gray-400 flex-shrink-0">📧</div>
                    <span className="text-xs sm:text-sm truncate">{employee.email}</span>
                  </div>
                )}
                {employee.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <div className="w-4 h-4 mr-2 sm:mr-3 text-gray-400 flex-shrink-0">📞</div>
                    <span className="text-xs sm:text-sm">{employee.phone}</span>
                  </div>
                )}
                {!employee.email && !employee.phone && (
                  <div className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm italic flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Nessun contatto specificato</span>
                  </div>
                )}
              </div>

              <div className="pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Stato</span>
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold ${
                    employee.active 
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                  }`}>
                    {employee.active ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Nessun OSS trovato</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base px-4">
            Prova a modificare i criteri di ricerca. Il database contiene {employees.length} OSS totali.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;