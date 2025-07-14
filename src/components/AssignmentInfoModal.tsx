import React, { useState, useEffect } from 'react';
import { X, User, Clock, Calendar, Edit, Trash2, History } from 'lucide-react';
import { assignmentService } from '../services/supabaseService';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface AssignmentInfoModalProps {
  assignment: any;
  onClose: () => void;
}

const AssignmentInfoModal: React.FC<AssignmentInfoModalProps> = ({ assignment, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignmentHistory();
  }, [assignment.id]);

  const fetchAssignmentHistory = async () => {
    try {
      const historyData = await assignmentService.getAssignmentHistory(assignment.id);
      setHistory(historyData);
    } catch (error: any) {
      console.error('Error fetching assignment history:', error);
      toast.error('Errore nel caricamento dello storico');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: it });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Creata';
      case 'updated': return 'Modificata';
      case 'deleted': return 'Eliminata';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400';
      case 'updated': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400';
      case 'deleted': return 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/50 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Dettagli Assegnazione
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {assignment.employee?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Assignment Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Informazioni Assegnazione
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  OSS Assegnato
                </label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {assignment.employee?.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {assignment.employee?.role}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Postazione
                </label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  Postazione {assignment.station_number + 1}
                </p>
              </div>
              {assignment.employee?.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {assignment.employee.email}
                  </p>
                </div>
              )}
              {assignment.employee?.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Telefono
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {assignment.employee.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Creation and Modification Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Informazioni di Tracciamento
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Creata da</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {assignment.created_by_info?.full_name || assignment.created_by_info?.email || 'Utente sconosciuto'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(assignment.created_at)}
                  </p>
                </div>
              </div>
              
              {assignment.modified_at && (
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Ultima modifica</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {assignment.modified_by_info?.full_name || assignment.modified_by_info?.email || 'Utente sconosciuto'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(assignment.modified_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Section */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Storico Modifiche
            </h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Caricamento storico...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {history.map((entry, index) => (
                  <div key={entry.id} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(entry.action)}`}>
                      {getActionLabel(entry.action)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.changed_by_profile?.full_name || entry.changed_by_profile?.email || 'Utente sconosciuto'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(entry.changed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                Nessuna modifica registrata
              </p>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentInfoModal;