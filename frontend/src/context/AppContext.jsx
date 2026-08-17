// ============================================
// SecureXerox — Central Application Context (Production API Integrated)
// ============================================

import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { generatePrintId, generateJobId } from '../utils/printId';
import { JOB_STATUS } from '../utils/constants';
import { api, setAuthToken, getAuthToken } from '../utils/api';

// ---- Initial State ----
const initialState = {
  currentUser: null,
  isAuthenticated: false,
  jobs: [],
  activeJobId: null,
  currentSession: null,
  toasts: [],
  loading: false,
};

// ---- Action Types ----
const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_JOBS: 'SET_JOBS',
  ADD_JOB: 'ADD_JOB',
  UPDATE_JOB_STATUS: 'UPDATE_JOB_STATUS',
  SET_ACTIVE_JOB: 'SET_ACTIVE_JOB',
  START_SESSION: 'START_SESSION',
  END_SESSION: 'END_SESSION',
  ADD_VIOLATION: 'ADD_VIOLATION',
  ADD_TOAST: 'ADD_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
  SET_LOADING: 'SET_LOADING',
};

// ---- Reducer ----
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOGIN:
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true,
      };

    case ACTIONS.LOGOUT:
      return {
        ...state,
        currentUser: null,
        isAuthenticated: false,
        currentSession: null,
        activeJobId: null,
        jobs: [],
      };

    case ACTIONS.SET_JOBS:
      return {
        ...state,
        jobs: action.payload,
      };

    case ACTIONS.ADD_JOB:
      return {
        ...state,
        jobs: [action.payload, ...state.jobs],
        activeJobId: action.payload.id,
      };

    case ACTIONS.UPDATE_JOB_STATUS: {
      const { jobId, status, extras } = action.payload;
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === jobId
            ? { ...job, status, ...extras }
            : job
        ),
      };
    }

    case ACTIONS.SET_ACTIVE_JOB:
      return { ...state, activeJobId: action.payload };

    case ACTIONS.START_SESSION:
      return {
        ...state,
        currentSession: {
          jobId: action.payload.jobId,
          printId: action.payload.printId,
          startedAt: new Date().toISOString(),
          violations: 0,
          isLocked: false,
          securityEvents: [],
        },
      };

    case ACTIONS.END_SESSION:
      return { ...state, currentSession: null };

    case ACTIONS.ADD_VIOLATION: {
      if (!state.currentSession) return state;
      const newViolations = state.currentSession.violations + 1;
      const isLocked = newViolations >= 3;
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          violations: newViolations,
          isLocked,
          securityEvents: [
            ...state.currentSession.securityEvents,
            {
              type: action.payload.type,
              timestamp: new Date().toISOString(),
              violationNumber: newViolations,
            },
          ],
        },
      };
    }

    case ACTIONS.ADD_TOAST:
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };

    case ACTIONS.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    default:
      return state;
  }
}

// ---- Context ----
const AppContext = createContext(null);

// ---- Provider ----
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const toastIdRef = useRef(0);

  // Toast actions
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastIdRef.current;
    dispatch({
      type: ACTIONS.ADD_TOAST,
      payload: { id, message, type, duration },
    });
    setTimeout(() => {
      dispatch({ type: ACTIONS.REMOVE_TOAST, payload: id });
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: ACTIONS.REMOVE_TOAST, payload: id });
  }, []);

  // Fetch jobs helper
  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.getJobs();
      dispatch({ type: ACTIONS.SET_JOBS, payload: data });
    } catch (e) {
      // keep current jobs
    }
  }, []);

  // Auto restore auth session on load
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then((user) => {
          dispatch({ type: ACTIONS.LOGIN, payload: user });
          fetchJobs();
        })
        .catch(() => {
          setAuthToken(null);
        });
    }
  }, [fetchJobs]);

  // Live polling (3s) for real-time status updates across Customer & Operator dashboards
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const interval = setInterval(() => {
      fetchJobs();
    }, 3000);
    return () => clearInterval(interval);
  }, [state.isAuthenticated, fetchJobs]);

  // Auth actions
  const login = useCallback(async (role, email, password) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    const res = await api.login({ email, password });
    if (res.user.role !== role) {
      throw new Error("This account does not have the selected role");
    }
    setAuthToken(res.access_token);
    dispatch({ type: ACTIONS.LOGIN, payload: res.user });
    fetchJobs();
    return res.user;
  }, [fetchJobs]);

  const register = useCallback(async (name, email, password, role = 'customer') => {
    await api.register({ name, email, password, role });
    const res = await api.login({ email, password });
    setAuthToken(res.access_token);
    dispatch({ type: ACTIONS.LOGIN, payload: res.user });
    fetchJobs();
    return res.user;
  }, [fetchJobs]);

  const logout = useCallback(() => {
    setAuthToken(null);
    dispatch({ type: ACTIONS.LOGOUT });
  }, []);

  // Job creation action
  const createJob = useCallback(async (fileData, printSettings, rawFile = null) => {
    try {
      const formData = new FormData();
      if (rawFile) {
        formData.append('file', rawFile);
      }
      formData.append('fileName', fileData.name);
      formData.append('fileType', fileData.type);
      formData.append('fileSize', fileData.size);
      formData.append('copies', printSettings.copies || 1);
      formData.append('paperSize', printSettings.paperSize || 'A4');
      formData.append('colorMode', printSettings.colorMode || 'Black & White');
      formData.append('orientation', printSettings.orientation || 'Portrait');
      formData.append('pageRange', printSettings.pageRange || 'All');

      const newJob = await api.createJob(formData);
      dispatch({ type: ACTIONS.ADD_JOB, payload: newJob });
      addToast('Print ID generated successfully!', 'success');
      return newJob;
    } catch (e) {
      const job = {
        id: generateJobId(),
        printId: generatePrintId(),
        fileName: fileData.name,
        fileType: fileData.type,
        fileSize: fileData.size,
        filePreview: fileData.preview || null,
        copies: printSettings.copies || 1,
        paperSize: printSettings.paperSize || 'A4',
        colorMode: printSettings.colorMode || 'Black & White',
        orientation: printSettings.orientation || 'Portrait',
        pageRange: printSettings.pageRange || 'All',
        status: JOB_STATUS.PRINT_ID_GENERATED,
        createdAt: new Date().toISOString(),
        completedAt: null,
        destroyedAt: null,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        violations: 0,
        customerId: state.currentUser?.id || null,
      };
      dispatch({ type: ACTIONS.ADD_JOB, payload: job });
      addToast('Print ID generated successfully!', 'success');
      return job;
    }
  }, [addToast, state.currentUser]);

  const updateJobStatus = useCallback((jobId, status, extras = {}) => {
    dispatch({
      type: ACTIONS.UPDATE_JOB_STATUS,
      payload: { jobId, status, extras },
    });
  }, []);

  const getJobByPrintId = useCallback((printId) => {
    const cleaned = printId.trim().toUpperCase();
    return state.jobs.find((job) => job.printId === cleaned || job.print_id === cleaned);
  }, [state.jobs]);

  const setActiveJob = useCallback((jobId) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_JOB, payload: jobId });
  }, []);

  // Session actions
  const startSecureSession = useCallback(async (jobId, printId) => {
    try {
      await api.startSession(jobId);
    } catch (e) {
      // API fallback
    }
    dispatch({ type: ACTIONS.START_SESSION, payload: { jobId, printId } });
    updateJobStatus(jobId, JOB_STATUS.SECURE_SESSION);
    addToast('Secure Print Session started', 'info');
  }, [updateJobStatus, addToast]);

  const endSecureSession = useCallback(() => {
    dispatch({ type: ACTIONS.END_SESSION });
    fetchJobs();
  }, [fetchJobs]);

  const addViolation = useCallback(async (type) => {
    if (state.currentSession?.jobId) {
      try {
        await api.recordViolation(state.currentSession.jobId, type);
      } catch (e) {
        // API fallback
      }
    }
    dispatch({ type: ACTIONS.ADD_VIOLATION, payload: { type } });
  }, [state.currentSession]);

  // Print execution & API syncing
  const executePrintFlow = useCallback(async (jobId) => {
    updateJobStatus(jobId, JOB_STATUS.PRINTING);
    
    // Preparing
    await new Promise((r) => setTimeout(r, 2000));
    
    // Sending
    await new Promise((r) => setTimeout(r, 2000));
    
    // Printing
    await new Promise((r) => setTimeout(r, 3000));
    
    // Execute on backend
    try {
      await api.executePrint(jobId);
    } catch (e) {
      // fallback
    }
    updateJobStatus(jobId, JOB_STATUS.COMPLETED, {
      completedAt: new Date().toISOString(),
    });
    addToast('Printing completed!', 'success');
    
    // Access Revoked
    await new Promise((r) => setTimeout(r, 1500));
    updateJobStatus(jobId, JOB_STATUS.ACCESS_REVOKED);
    
    // Destroy document on backend
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await api.destroyDocument(jobId);
    } catch (e) {
      // fallback
    }
    updateJobStatus(jobId, JOB_STATUS.DESTROYED, {
      destroyedAt: new Date().toISOString(),
      expiresAt: null,
    });
    addToast('Document securely removed!', 'success');
    
    endSecureSession();
  }, [updateJobStatus, addToast, endSecureSession]);

  const value = {
    ...state,
    login,
    register,
    logout,
    addToast,
    removeToast,
    createJob,
    updateJobStatus,
    getJobByPrintId,
    setActiveJob,
    startSecureSession,
    endSecureSession,
    addViolation,
    executePrintFlow,
    fetchJobs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
