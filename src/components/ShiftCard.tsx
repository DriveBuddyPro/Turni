import React, { useState } from 'react';
import { Users, Shuffle, Trash2, Clock, MapPin, FileText, MoreVertical, User, Lock, Info } from 'lucide-react';
import { assignmentService, STATION_NAMES } from '../services/supabaseService';
import { exportSingleShiftPDF } from '../utils/pdfExport';
import AutoAssignModal from './AutoAssignModal';
import AssignmentInfoModal from './AssignmentInfoModal';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface ShiftCardProps {
  shift: any;
  shiftType: {
    type: string;
    label: string;
    color: string;
    time: string;
  };
  selectedDate: Date;
  onRefetch: () => void;
}

const ShiftCard: React.FC<ShiftCardProps> = ({ shift, shiftType, selectedDate, onRefetch }) => {
  const { user } = useAuth();
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [showAssignmentInfo, setShowAssignmentInfo] = useState<any>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [draggedAssignment, setDraggedAssignment] = useState<any>(null);
  const [dragOverStation, setDragOverStation] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use regular state instead of useOptimistic (React 18 compatible)
  const [localAssignments, setLocalAssignments] = useState(shift?.assignments || []);

  // Update local assignments when shift prop changes
  React.useEffect(() => {
    setLocalAssignments(shift?.assignments || []);
  }, [shift?.assignments]);

  // Check if current user can modify an assignment
  const canModifyAssignment = (assignment: any) => {
    return assignment.created_by === user?.id;
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Optimistic update using regular state
    const previousAssignments = localAssignments;
    setLocalAssignments(prev => prev.filter((a: any) => a.id !== assignmentId));

    // Find the assignment to check permissions
    const assignmentToDelete = localAssignments.find((a: any) => a.id === assignmentId);
    if (assignmentToDelete && !canModifyAssignment(assignmentToDelete)) {
      toast.error('Non puoi eliminare questa assegnazione. Puoi eliminare solo le tue assegnazioni.');
      return;
    }
    
    try {
      await assignmentService.delete(assignmentId);
      toast.success('Assegnazione rimossa con successo', {
        duration: 3000,
        icon: '✅',
      });
      // Refresh data
      onRefetch();
    } catch (error: any) {
      // Revert optimistic update on error
      setLocalAssignments(previousAssignments);
      toast.error(error.message || 'Errore nella rimozione dell\'assegnazione', {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoAssignClick = () => {
    if (!shift) return;
    
    // Check if shift has assignments from another user
    if (shift.assignments && shift.assignments.length > 0) {
      const hasOtherUserAssignments = shift.assignments.some((assignment: any) => 
        assignment.created_by !== user?.id
      );
      
      if (hasOtherUserAssignments) {
        toast.error('Questo turno è già stato compilato da un altro utente. Puoi solo visualizzarlo.', {
          duration: 5000,
          icon: '🔒',
        });
        return;
      }
    }
    
    setShowAutoAssignModal(true);
    setShowMobileActions(false);
  };

  const handleCloseAutoAssignModal = () => {
    setShowAutoAssignModal(false);
    onRefetch();
  };

  const handleShowAssignmentInfo = (assignment: any) => {
    setShowAssignmentInfo(assignment);
  };

  const handleExportShiftPDF = () => {
    if (!shift || !shift.assignments || shift.assignments.length === 0) {
      toast.error('Nessuna assegnazione da esportare per questo turno', {
        duration: 4000,
        icon: '⚠️',
      });
      return;
    }
    
    exportSingleShiftPDF(shift, shiftType, selectedDate);
    toast.success(`PDF ${shiftType.label} esportato con successo!`, {
      duration: 4000,
      icon: '📄',
    });
    setShowMobileActions(false);
  };

  const handleMoveAssignment = async (draggedAssignment: any, targetStationNumber: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Check if user can modify this assignment
    if (!canModifyAssignment(draggedAssignment)) {
      toast.error('Non puoi spostare questa assegnazione. Puoi modificare solo le tue assegnazioni.', {
        duration: 4000,
        icon: '🔒',
      });
      setIsProcessing(false);
      return;
    }
    
    const previousAssignments = localAssignments;
    
    try {
      // Find if there's already someone at the target station
      const targetAssignment = localAssignments.find((a: any) => a.station_number === targetStationNumber);
      
      if (targetAssignment) {
        // SWAP: There's someone at the target station, so we swap them
        // Check if user can modify the target assignment too
        if (!canModifyAssignment(targetAssignment)) {
          toast.error('Non puoi scambiare con questa assegnazione. Puoi modificare solo le tue assegnazioni.', {
            duration: 4000,
            icon: '🔒',
          });
          setIsProcessing(false);
          return;
        }

        const optimisticAssignments = localAssignments.map((a: any) => {
          if (a.id === draggedAssignment.id) {
            return { ...a, station_number: targetStationNumber };
          } else if (a.id === targetAssignment.id) {
            return { ...a, station_number: draggedAssignment.station_number };
          }
          return a;
        });
        
        setLocalAssignments(optimisticAssignments);
        
        // Sequential update to avoid constraint violation:
        // 1. Move target assignment to temporary station (-1)
        // 2. Move dragged assignment to target station
        // 3. Move target assignment to dragged assignment's original station
        const originalDraggedStation = draggedAssignment.station_number;
        
        await assignmentService.update(targetAssignment.id, { station_number: -1 });
        await assignmentService.update(draggedAssignment.id, { station_number: targetStationNumber });
        await assignmentService.update(targetAssignment.id, { station_number: originalDraggedStation });
        
        toast.success('Lavoratori scambiati con successo!', {
          duration: 3000,
          icon: '🔄',
        });
      } else {
        // MOVE: Target station is empty, just move the worker
        const optimisticAssignments = localAssignments.map((a: any) => 
          a.id === draggedAssignment.id 
            ? { ...a, station_number: targetStationNumber }
            : a
        );
        
        setLocalAssignments(optimisticAssignments);
        
        // Update assignment to new station
        await assignmentService.update(draggedAssignment.id, { station_number: targetStationNumber });
        
        toast.success('Lavoratore spostato con successo!', {
          duration: 3000,
          icon: '✅',
        });
      }
      
      // Refresh data
      onRefetch();
    } catch (error: any) {
      // Revert optimistic update on error
      setLocalAssignments(previousAssignments);
      console.error('Error in handleMoveAssignment:', error);
      toast.error(error.message || 'Errore nello spostamento del lavoratore', {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, assignment: any) => {
    if (isProcessing || !canModifyAssignment(assignment)) {
      e.preventDefault();
      return;
    }
    setDraggedAssignment(assignment);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stationNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStation(stationNumber);
  };

  const handleDragLeave = () => {
    setDragOverStation(null);
  };

  const handleDrop = (e: React.DragEvent, stationNumber: number) => {
    e.preventDefault();
    setDragOverStation(null);
    
    if (draggedAssignment && draggedAssignment.station_number !== stationNumber && !isProcessing) {
      handleMoveAssignment(draggedAssignment, stationNumber);
    }
    setDraggedAssignment(null);
  };

  // Improved Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, assignment: any) => {
    if (isProcessing || !canModifyAssignment(assignment)) return;
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setDraggedAssignment(assignment);
    setIsDragging(false);
    
    // Prevent default to avoid scrolling
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isProcessing || !draggedAssignment || !touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.y);
    
    // Start dragging if moved more than 10px
    if (!isDragging && (deltaX > 10 || deltaY > 10)) {
      setIsDragging(true);
      // Add visual feedback
      document.body.style.userSelect = 'none';
    }
    
    if (isDragging) {
      e.preventDefault();
      
      // Find the element under the touch point
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const stationElement = element?.closest('[data-station-number]');
      
      if (stationElement) {
        const stationNumber = parseInt(stationElement.getAttribute('data-station-number') || '0');
        setDragOverStation(stationNumber);
      } else {
        setDragOverStation(null);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isProcessing) return;
    
    // Restore user selection
    document.body.style.userSelect = '';
    
    if (isDragging && draggedAssignment && touchStartPos) {
      e.preventDefault();
      
      const touch = e.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const stationElement = element?.closest('[data-station-number]');
      
      if (stationElement) {
        const stationNumber = parseInt(stationElement.getAttribute('data-station-number') || '0');
        if (draggedAssignment.station_number !== stationNumber) {
          handleMoveAssignment(draggedAssignment, stationNumber);
        }
      }
    }
    
    // Reset states
    setDraggedAssignment(null);
    setDragOverStation(null);
    setTouchStartPos(null);
    setIsDragging(false);
  };

  // Helper function to truncate long names
  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const assignments = localAssignments;
  const stationNames = STATION_NAMES[shift?.shift_type as keyof typeof STATION_NAMES] || [];
  const maxStations = stationNames.length;
  const coveragePercentage = maxStations ? Math.round((assignments.length / maxStations) * 100) : 0;

  // Create array of all stations with their assignments
  const stationsWithAssignments = stationNames.map((stationName, index) => {
    const assignment = assignments.find((a: any) => a.station_number === index);
    return {
      stationNumber: index,
      stationName,
      assignment
    };
  });

  const getColorClasses = () => {
    switch (shiftType.color) {
      case 'blue':
        return {
          gradient: 'from-blue-500 to-blue-600',
          station: 'bg-blue-500',
          border: 'border-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          text: 'text-blue-700 dark:text-blue-300'
        };
      case 'orange':
        return {
          gradient: 'from-orange-500 to-orange-600',
          station: 'bg-orange-500',
          border: 'border-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          text: 'text-orange-700 dark:text-orange-300'
        };
      case 'purple':
        return {
          gradient: 'from-purple-500 to-purple-600',
          station: 'bg-purple-500',
          border: 'border-purple-500',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          text: 'text-purple-700 dark:text-purple-300'
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          station: 'bg-gray-500',
          border: 'border-gray-500',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          text: 'text-gray-700 dark:text-gray-300'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className={`p-4 sm:p-6 bg-gradient-to-r ${colors.gradient}`}>
          <div className="flex items-center justify-between text-white">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{shiftType.label}</h3>
              <div className="flex items-center text-sm opacity-90">
                <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{shiftType.time}</span>
              </div>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl sm:text-3xl font-bold">{assignments.length}</p>
              <p className="text-sm opacity-90">su {maxStations}</p>
              <div className="mt-2">
                <div className="w-12 sm:w-16 h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${coveragePercentage}%` }}
                  />
                </div>
                <p className="text-xs mt-1 opacity-90">{coveragePercentage}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center text-gray-600 dark:text-gray-300 min-w-0">
              <Users className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">Postazioni di Lavoro</span>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden sm:flex space-x-2">
              <button
                onClick={handleExportShiftPDF}
                disabled={isProcessing}
                className="p-2.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Esporta PDF Turno"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                onClick={handleAutoAssignClick}
                disabled={isProcessing}
                className="p-2.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Assegnazione Automatica"
              >
                <Shuffle className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Actions Menu */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setShowMobileActions(!showMobileActions)}
                disabled={isProcessing}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showMobileActions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={handleAutoAssignClick}
                    disabled={isProcessing}
                    className="w-full flex items-center px-4 py-3 text-left text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors first:rounded-t-xl disabled:opacity-50"
                  >
                    <Shuffle className="w-4 h-4 mr-3" />
                    Assegnazione Auto
                  </button>
                  <button
                    onClick={handleExportShiftPDF}
                    disabled={isProcessing}
                    className="w-full flex items-center px-4 py-3 text-left text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/50 transition-colors last:rounded-b-xl disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 mr-3" />
                    Esporta PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stations Grid with Improved Mobile Layout */}
          <div className="space-y-3 mb-4 sm:mb-6">
            {stationsWithAssignments.map((station) => (
              <div
                key={station.stationNumber}
                data-station-number={station.stationNumber}
                className={`relative p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 group ${
                  dragOverStation === station.stationNumber
                    ? `${colors.border} ${colors.bg} shadow-lg`
                    : station.assignment
                    ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm'
                    : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800'
                } ${isProcessing ? 'pointer-events-none opacity-75' : ''}`}
                onDragOver={(e) => handleDragOver(e, station.stationNumber)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, station.stationNumber)}
              >
                <div className="flex items-center justify-between">
                  {/* Station Info */}
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-white font-bold text-xs sm:text-sm ${colors.station} shadow-sm flex-shrink-0`}>
                      {station.stationName}
                    </div>
                    
                    {station.assignment ? (
                      /* Assigned Employee Card - Improved Mobile Layout */
                      <div
                        key={`assigned-${station.assignment.id}`}
                        draggable={!isProcessing}
                        onDragStart={(e) => handleDragStart(e, station.assignment)}
                        onTouchStart={(e) => handleTouchStart(e, station.assignment)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gradient-to-r rounded-lg transition-all duration-200 group min-w-0 flex-1 ${
                          canModifyAssignment(station.assignment)
                            ? 'from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 cursor-move hover:shadow-md'
                            : 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 cursor-not-allowed'
                        } ${
                          draggedAssignment?.id === station.assignment.id ? 'opacity-50 scale-95' : ''
                        } ${isProcessing ? 'cursor-not-allowed' : ''} ${isDragging ? 'z-50' : ''}`}
                        style={{
                          touchAction: canModifyAssignment(station.assignment) ? 'none' : 'auto',
                          userSelect: 'none'
                        }}
                      >
                        {/* Employee Avatar */}
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm flex-shrink-0 relative ${
                          canModifyAssignment(station.assignment) ? colors.station : 'bg-red-500'
                        }`}>
                          {station.assignment.employee?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'OS'}
                          {!canModifyAssignment(station.assignment) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                              <Lock className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Employee Info - Improved Text Handling */}
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-xs sm:text-sm leading-tight ${
                            canModifyAssignment(station.assignment) 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-red-800 dark:text-red-200'
                          }`}>
                            <span className="block sm:hidden">
                              {truncateName(station.assignment.employee?.name || 'Nome non disponibile', 15)}
                            </span>
                            <span className="hidden sm:block">
                              {truncateName(station.assignment.employee?.name || 'Nome non disponibile', 25)}
                            </span>
                          </p>
                          <p className={`text-xs truncate ${
                            canModifyAssignment(station.assignment)
                              ? 'text-gray-600 dark:text-gray-400'
                              : 'text-red-600 dark:text-red-300'
                          }`}>
                            {station.assignment.employee?.role || 'OSS'}
                            {!canModifyAssignment(station.assignment) && ' • Non modificabile'}
                          </p>
                        </div>
                        
                        {/* Info Button */}
                        <button
                          onClick={() => handleShowAssignmentInfo(station.assignment)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded transition-colors flex-shrink-0"
                          title="Informazioni Assegnazione"
                        >
                          <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>

                        {/* Drag Indicator - only for modifiable assignments */}
                        {canModifyAssignment(station.assignment) && (
                          <div className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:block">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty Station */
                      <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 text-gray-400 dark:text-gray-500 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm">Postazione Libera</p>
                          <p className="text-xs">Disponibile per assegnazione</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  {station.assignment && canModifyAssignment(station.assignment) && (
                    <button
                      onClick={() => handleDeleteAssignment(station.assignment.id)}
                      disabled={isProcessing}
                      className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2 disabled:opacity-50"
                      title="Rimuovi Assegnazione"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>

                {/* Non-modifiable assignment indicator */}
                {station.assignment && !canModifyAssignment(station.assignment) && (
                  <div className="absolute top-2 right-2 flex items-center space-x-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-xs">
                    <Lock className="w-3 h-3" />
                    <span className="hidden sm:inline">Non modificabile</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Shift Status Info */}
          {shift && shift.assignments && shift.assignments.length > 0 && (
            <div className="text-center">
              {shift.assignments.some((assignment: any) => assignment.created_by !== user?.id) ? (
                <div className="inline-flex items-center px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  <Lock className="w-4 h-4 mr-2" />
                  Turno compilato da altro utente - Solo visualizzazione
                </div>
              ) : (
                <div className="inline-flex items-center px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
                  <User className="w-4 h-4 mr-2" />
                  Turno modificabile - Tue assegnazioni
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auto Assign Modal */}
      {showAutoAssignModal && shift && (
        <AutoAssignModal
          shift={shift}
          employees={[]} // Will be fetched in the modal
          onClose={handleCloseAutoAssignModal}
        />
      )}

      {/* Assignment Info Modal */}
      {showAssignmentInfo && (
        <AssignmentInfoModal
          assignment={showAssignmentInfo}
          onClose={() => setShowAssignmentInfo(null)}
        />
      )}

      {/* Mobile Actions Overlay */}
      {showMobileActions && (
        <div 
          className="fixed inset-0 z-0 sm:hidden" 
          onClick={() => setShowMobileActions(false)}
        />
      )}
    </>
  );
};

export default ShiftCard;