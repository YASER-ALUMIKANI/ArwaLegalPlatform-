import { create } from 'zustand';

export const useLawyerStore = create((set) => ({
  // UI Navigation
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Case Selection
  selectedCaseId: null,
  setSelectedCaseId: (id) => set({ selectedCaseId: id }),

  // Modal Dialogs
  isHearingModalOpen: false,
  setHearingModalOpen: (isOpen) => set({ isHearingModalOpen: isOpen }),

  isInvoiceModalOpen: false,
  setInvoiceModalOpen: (isOpen) => set({ isInvoiceModalOpen: isOpen }),

  // Consultation Virtual Room Session
  activeSessionConsultation: null,
  setActiveSessionConsultation: (consultation) => set({ activeSessionConsultation: consultation }),
  isVirtualRoomOpen: false,
  setVirtualRoomOpen: (isOpen) => set({ isVirtualRoomOpen: isOpen }),

  // Document AI Analysis Modal
  selectedDocForAnalysis: null,
  setSelectedDocForAnalysis: (doc) => set({ selectedDocForAnalysis: doc }),
  isAnalysisModalOpen: false,
  setAnalysisModalOpen: (isOpen) => set({ isAnalysisModalOpen: isOpen }),

  // Global Messages & Notifications Feedback
  errorMessage: '',
  successMessage: '',
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  setSuccessMessage: (msg) => set({ successMessage: msg }),
  clearMessages: () => set({ errorMessage: '', successMessage: '' }),
}));
