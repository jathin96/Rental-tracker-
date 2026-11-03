import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

const StoreContext = createContext(null)

const STORAGE_KEY = 'gateflow_v1'

const ROLES = ['Security', 'Devaraj', 'Sharath', 'Admin']

const VEHICLE_TYPES = ['Tractor', 'JCB', 'Crane']

const MATERIALS = ['Debris', 'M-Sand', 'Stone', 'Bricks', 'Tile', 'Chips']

const STATUS = {
  PENDING_ENTRY_APPROVAL: 'PENDING_ENTRY_APPROVAL',
  APPROVED_FOR_WORK: 'APPROVED_FOR_WORK',
  PENDING_PRECLOSE_APPROVAL: 'PENDING_PRECLOSE_APPROVAL',
  PENDING_BILLING: 'PENDING_BILLING',
  PENDING_FULL_CLOSE_APPROVAL: 'PENDING_FULL_CLOSE_APPROVAL',
  FULLY_CLOSED: 'FULLY_CLOSED',
}

const initialState = {
  role: 'Security',
  jobCards: [],
}

function uid() {
  return 'jc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function nowIso() {
  return new Date().toISOString()
}

function formatTimestamp(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload }
    case 'SET_ROLE':
      return { ...state, role: action.role }
    case 'CREATE_GATE_ENTRY': {
      const jobCard = {
        id: uid(),
        status: STATUS.PENDING_ENTRY_APPROVAL,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        audit: [
          { at: nowIso(), byRole: 'Security', action: 'GATE_ENTRY_CREATED', note: 'Gate entry submitted' },
        ],
        gateEntry: {
          inTime: action.payload.inTime || nowIso(),
          vehicleType: action.payload.vehicleType,
          vehicleNumber: action.payload.vehicleNumber.trim(),
          vendorName: action.payload.vendorName.trim(),
          driverName: action.payload.driverName.trim(),
          driverPhone: action.payload.driverPhone.trim(),
          requesterName: action.payload.requesterName.trim(),
          location: action.payload.location.trim(),
          entryPhoto: action.payload.entryPhoto, // base64 + meta
        },
        trips: [],
        preClose: null,
        billing: null,
        closure: null,
        approvals: {
          entryApprovedAt: null,
          entryApprovedBy: null,
          entryRejectedAt: null,
          entryRejectedBy: null,
          entryRejectReason: null,
          preCloseApprovedAt: null,
          preCloseApprovedBy: null,
          preCloseRejectedAt: null,
          preCloseRejectedBy: null,
          preCloseRejectReason: null,
          fullClosedAt: null,
          fullClosedBy: null,
        },
      }
      return {
        ...state,
        jobCards: [jobCard, ...state.jobCards],
      }
    }
    case 'APPROVE_ENTRY': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.APPROVED_FOR_WORK,
          updatedAt: nowIso(),
          audit: [...jc.audit, { at: nowIso(), byRole: 'Devaraj', action: 'ENTRY_APPROVED', note: 'Gate entry approved' }],
          approvals: {
            ...jc.approvals,
            entryApprovedAt: nowIso(),
            entryApprovedBy: 'Devaraj',
            entryRejectedAt: null,
            entryRejectedBy: null,
            entryRejectReason: null,
          },
        }
      })
      return { ...state, jobCards }
    }
    case 'REJECT_ENTRY': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.PENDING_ENTRY_APPROVAL, // remains pending; could be rejected state but spec says approve/reject; keep pending with audit
          updatedAt: nowIso(),
          audit: [...jc.audit, { at: nowIso(), byRole: 'Devaraj', action: 'ENTRY_REJECTED', note: action.reason || 'Rejected' }],
          approvals: {
            ...jc.approvals,
            entryRejectedAt: nowIso(),
            entryRejectedBy: 'Devaraj',
            entryRejectReason: action.reason || 'Rejected',
          },
        }
      })
      return { ...state, jobCards }
    }
    case 'ADD_TRIP': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        const tripNumber = (jc.trips?.length || 0) + 1
        const trip = {
          id: 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
          tripNumber,
          materialType: action.payload.materialType,
          movement: action.payload.movement,
          timestamp: nowIso(),
          photo: action.payload.photo,
        }
        return {
          ...jc,
          updatedAt: nowIso(),
          trips: [...(jc.trips || []), trip],
          audit: [...jc.audit, { at: nowIso(), byRole: 'Security', action: 'TRIP_ADDED', note: `Trip #${tripNumber} logged` }],
        }
      })
      return { ...state, jobCards }
    }
    case 'PRE_CLOSE': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.PENDING_PRECLOSE_APPROVAL,
          updatedAt: nowIso(),
          preClose: {
            outTime: action.payload.outTime || nowIso(),
            exitPhoto: action.payload.exitPhoto,
            workDetails: action.payload.workDetails || '',
            submittedAt: nowIso(),
          },
          audit: [...jc.audit, { at: nowIso(), byRole: 'Security', action: 'PRE_CLOSE_SUBMITTED', note: 'Pre-close submitted' }],
        }
      })
      return { ...state, jobCards }
    }
    case 'APPROVE_PRE_CLOSE': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.PENDING_BILLING,
          updatedAt: nowIso(),
          audit: [...jc.audit, { at: nowIso(), byRole: 'Devaraj', action: 'PRE_CLOSE_APPROVED', note: 'Pre-close approved' }],
          approvals: {
            ...jc.approvals,
            preCloseApprovedAt: nowIso(),
            preCloseApprovedBy: 'Devaraj',
            preCloseRejectedAt: null,
            preCloseRejectedBy: null,
            preCloseRejectReason: null,
          },
        }
      })
      return { ...state, jobCards }
    }
    case 'REJECT_PRE_CLOSE': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.APPROVED_FOR_WORK, // back to work phase
          updatedAt: nowIso(),
          audit: [...jc.audit, { at: nowIso(), byRole: 'Devaraj', action: 'PRE_CLOSE_REJECTED', note: action.reason || 'Pre-close rejected' }],
          approvals: {
            ...jc.approvals,
            preCloseRejectedAt: nowIso(),
            preCloseRejectedBy: 'Devaraj',
            preCloseRejectReason: action.reason || 'Rejected',
          },
        }
      })
      return { ...state, jobCards }
    }
    case 'SUBMIT_BILLING': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.PENDING_FULL_CLOSE_APPROVAL,
          updatedAt: nowIso(),
          billing: {
            billReceived: action.payload.billReceived,
            invoiceNumber: action.payload.invoiceNumber.trim(),
            billAmount: action.payload.billAmount,
            inwardChecked: action.payload.inwardChecked,
            inwardEntry: action.payload.inwardEntry.trim(),
            xeroxPhoto: action.payload.xeroxPhoto,
            submittedAt: nowIso(),
            submittedBy: 'Sharath',
          },
          audit: [...jc.audit, { at: nowIso(), byRole: 'Sharath', action: 'BILL_SUBMITTED', note: 'Bill and inward details submitted' }],
        }
      })
      return { ...state, jobCards }
    }
    case 'APPROVE_FULL_CLOSE': {
      const jobCards = state.jobCards.map((jc) => {
        if (jc.id !== action.id) return jc
        return {
          ...jc,
          status: STATUS.FULLY_CLOSED,
          updatedAt: nowIso(),
          closure: {
            closedAt: nowIso(),
            closedBy: 'Devaraj',
          },
          audit: [...jc.audit, { at: nowIso(), byRole: 'Devaraj', action: 'FULLY_CLOSED', note: 'Job card fully closed' }],
        }
      })
      return { ...state, jobCards }
    }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        dispatch({ type: 'LOAD', payload: parsed })
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      // ignore
    }
  }, [state])

  const value = useMemo(
    () => ({
      state,
      dispatch,
      roles: ROLES,
      vehicleTypes: VEHICLE_TYPES,
      materials: MATERIALS,
      status: STATUS,
      formatTimestamp,
    }),
    [state],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
