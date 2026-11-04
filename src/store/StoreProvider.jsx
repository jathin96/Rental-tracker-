import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../auth/AuthProvider'

const StoreContext = createContext(null)

const ROLES = ['Security', 'Devaraj', 'Sharath', 'Admin']
const VEHICLE_TYPES = ['Tractor', 'JCB', 'Crane', 'Tipper', 'Lorry']
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
      return { ...state, jobCards: action.jobCards || [] }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user, role } = useAuth()

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD', jobCards: [] })
      return
    }

    fetchJobCards()

    const channel = supabase
      .channel('job_cards_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'job_cards',
        },
        () => {
          fetchJobCards()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  async function fetchJobCards() {
    try {
      const { data, error } = await supabase
        .from('job_cards')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      const jcs = (data || []).map((row) => row.data).filter(Boolean)
      dispatch({ type: 'LOAD', jobCards: jcs })
    } catch (e) {
      console.error('Error fetching job cards', e)
    }
  }

  async function saveJobCard(jobCard) {
    try {
      const { error } = await supabase.from('job_cards').upsert({
        id: jobCard.id,
        status: jobCard.status,
        data: jobCard,
        created_by: jobCard.created_by || user?.id,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
    } catch (e) {
      console.error('Error saving job card', e)
    }
  }

  const value = useMemo(
    () => ({
      state,
      dispatch: async (action) => {
        if (action.type === 'CREATE_GATE_ENTRY') {
          const jobCard = {
            id: uid(),
            status: STATUS.PENDING_ENTRY_APPROVAL,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            created_by: user?.id,
            audit: [{ at: nowIso(), byRole: action.byRole || role || 'Security', action: 'GATE_ENTRY_CREATED', note: 'Gate entry submitted' }],
            gateEntry: action.payload,
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
          await saveJobCard(jobCard)
          await fetchJobCards()
          return
        }
        // ... rest of your existing actions can remain the same
        if (action.type === 'APPROVE_ENTRY') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = {
            ...jc,
            status: STATUS.APPROVED_FOR_WORK,
            updatedAt: nowIso(),
            audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Devaraj', action: 'ENTRY_APPROVED', note: 'Gate entry approved' }],
            approvals: { ...(jc.approvals || {}), entryApprovedAt: nowIso(), entryApprovedBy: action.byRole || role || 'Devaraj', entryRejectedAt: null, entryRejectedBy: null, entryRejectReason: null },
          }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'REJECT_ENTRY') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = {
            ...jc,
            updatedAt: nowIso(),
            audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Devaraj', action: 'ENTRY_REJECTED', note: action.reason || 'Rejected' }],
            approvals: { ...(jc.approvals || {}), entryRejectedAt: nowIso(), entryRejectedBy: action.byRole || role || 'Devaraj', entryRejectReason: action.reason || 'Rejected' },
          }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'ADD_TRIP') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const tripNumber = (jc.trips || []).length + 1
          const trip = { id: 't_' + Date.now().toString(36), tripNumber, materialType: action.payload.materialType, movement: action.payload.movement, timestamp: nowIso(), photo: action.payload.photo }
          const updated = { ...jc, updatedAt: nowIso(), trips: [...(jc.trips || []), trip], audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Security', action: 'TRIP_ADDED', note: `Trip #${tripNumber} logged` }] }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'PRE_CLOSE') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = {
            ...jc,
            status: STATUS.PENDING_PRECLOSE_APPROVAL,
            updatedAt: nowIso(),
            preClose: { outTime: action.payload.outTime || nowIso(), exitPhoto: action.payload.exitPhoto, workDetails: action.payload.workDetails || '', submittedAt: nowIso() },
            audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Security', action: 'PRE_CLOSE_SUBMITTED', note: 'Pre-close submitted' }],
          }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'APPROVE_PRE_CLOSE') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = { ...jc, status: STATUS.PENDING_BILLING, updatedAt: nowIso(), audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Devaraj', action: 'PRE_CLOSE_APPROVED', note: 'Pre-close approved' }], approvals: { ...(jc.approvals || {}), preCloseApprovedAt: nowIso(), preCloseApprovedBy: action.byRole || role || 'Devaraj', preCloseRejectedAt: null, preCloseRejectedBy: null, preCloseRejectReason: null } }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'REJECT_PRE_CLOSE') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = { ...jc, status: STATUS.APPROVED_FOR_WORK, updatedAt: nowIso(), audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Devaraj', action: 'PRE_CLOSE_REJECTED', note: action.reason || 'Rejected' }], approvals: { ...(jc.approvals || {}), preCloseRejectedAt: nowIso(), preCloseRejectedBy: action.byRole || role || 'Devaraj', preCloseRejectReason: action.reason || 'Rejected' } }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'SUBMIT_BILLING') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = { ...jc, status: STATUS.PENDING_FULL_CLOSE_APPROVAL, updatedAt: nowIso(), billing: { billReceived: action.payload.billReceived, invoiceNumber: action.payload.invoiceNumber, billAmount: action.payload.billAmount, inwardChecked: action.payload.inwardChecked, inwardEntry: action.payload.inwardEntry, xeroxPhoto: action.payload.xeroxPhoto, submittedAt: nowIso(), submittedBy: action.byRole || role || 'Sharath' }, audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Sharath', action: 'BILL_SUBMITTED', note: 'Bill submitted' }] }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
        if (action.type === 'APPROVE_FULL_CLOSE') {
          const jc = state.jobCards.find((j) => j.id === action.id)
          if (!jc) return
          const updated = { ...jc, status: STATUS.FULLY_CLOSED, updatedAt: nowIso(), closure: { closedAt: nowIso(), closedBy: action.byRole || role || 'Devaraj' }, audit: [...(jc.audit || []), { at: nowIso(), byRole: action.byRole || role || 'Devaraj', action: 'FULLY_CLOSED', note: 'Job card fully closed' }] }
          await saveJobCard(updated)
          await fetchJobCards()
          return
        }
      },
      roles: ROLES,
      vehicleTypes: VEHICLE_TYPES,
      materials: MATERIALS,
      status: STATUS,
      formatTimestamp,
      refresh: fetchJobCards,
    }),
    [state, user, role],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}