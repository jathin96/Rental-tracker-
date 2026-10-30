import React, { useMemo, useState } from 'react'
import { useStore } from './store/StoreProvider.jsx'
import CameraModal from './components/CameraModal.jsx'
import ProgressStepper from './components/ProgressStepper.jsx'
import { useAuth } from './auth/AuthProvider.jsx'
import Login from './auth/Login.jsx'
import {
  Plus,
  ShieldCheck,
  Truck,
  UserCog,
  ShoppingBag,
  Lock,
  Camera,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Clock,
  MapPin,
  Phone,
  Hash,
  Building2,
  Receipt,
  BookOpen,
  LogOut,
} from 'lucide-react'

function StatusPill({ status }) {
  const map = {
    PENDING_ENTRY_APPROVAL: { label: 'Pending Entry Approval', cls: 'bg-amber-100 text-amber-800' },
    APPROVED_FOR_WORK: { label: 'Approved for Work', cls: 'bg-sky-100 text-sky-800' },
    PENDING_PRECLOSE_APPROVAL: { label: 'Pending Pre-Close Approval', cls: 'bg-violet-100 text-violet-800' },
    PENDING_BILLING: { label: 'Pending Billing', cls: 'bg-orange-100 text-orange-800' },
    PENDING_FULL_CLOSE_APPROVAL: { label: 'Pending Full Close', cls: 'bg-fuchsia-100 text-fuchsia-800' },
    FULLY_CLOSED: { label: 'Fully Closed', cls: 'bg-emerald-100 text-emerald-800' },
  }
  const m = map[status] || { label: status, cls: 'bg-slate-100 text-slate-700' }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${m.cls}`}>{m.label}</span>
}

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function Input(props) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-safety-400 focus:outline-none focus:ring-2 focus:ring-safety-400/10 ${props.className || ''}`} />
}

function Select(props) {
  return <select {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-safety-400 focus:outline-none focus:ring-2 focus:ring-safety-400/10 ${props.className || ''}`} />
}

function Textarea(props) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-safety-400 focus:outline-none focus:ring-2 focus:ring-safety-400/10 ${props.className || ''}`} />
}

export default function App() {
  const { state, dispatch, roles, vehicleTypes, materials, formatTimestamp } = useStore()
  const { user, profile, role: authRole, loading: authLoading, signOut } = useAuth()
  const role = authRole || state.role

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>
  }
  if (!user || !profile) {
    return <Login />
  }

  const [view, setView] = useState('list') // list | create | detail
  const [activeId, setActiveId] = useState(null)

  const [camera, setCamera] = useState({ open: false, title: '', onCapture: null })

  // Create gate entry form
  const [gateForm, setGateForm] = useState({
    vehicleType: 'Tractor',
    vehicleNumber: '',
    vendorName: '',
    driverName: '',
    driverPhone: '',
    requesterName: '',
    location: '',
  })
  const [entryPhoto, setEntryPhoto] = useState(null)
  const inTimeNow = useMemo(() => new Date().toISOString(), [view])

  // Trip form
  const [tripForm, setTripForm] = useState({ materialType: materials[0], movement: 'Inside' })
  const [tripPhoto, setTripPhoto] = useState(null)

  // Pre-close
  const [preCloseForm, setPreCloseForm] = useState({ workDetails: '', outTime: new Date().toISOString() })
  const [exitPhoto, setExitPhoto] = useState(null)

  // Billing
  const [billForm, setBillForm] = useState({ billReceived: 'Yes', invoiceNumber: '', billAmount: '', inwardChecked: false, inwardEntry: '' })
  const [xeroxPhoto, setXeroxPhoto] = useState(null)

  const activeJC = useMemo(() => state.jobCards.find((j) => j.id === activeId) || null, [state.jobCards, activeId])

  function openCamera(title, onCapture) {
    setCamera({ open: true, title, onCapture })
  }

  function validatePhone(p) {
    return /^[0-9]{10}$/.test(p)
  }

  function canCreateGate() {
    if (role !== 'Security') return false
    const v = gateForm
    if (!v.vehicleNumber.trim() || !v.vendorName.trim() || !v.driverName.trim() || !v.requesterName.trim() || !v.location.trim()) return false
    if (!validatePhone(v.driverPhone.trim())) return false
    if (!entryPhoto) return false
    return true
  }

  function submitGateEntry() {
    if (!canCreateGate()) return
    dispatch({
      type: 'CREATE_GATE_ENTRY',
      payload: {
        inTime: inTimeNow,
        vehicleType: gateForm.vehicleType,
        vehicleNumber: gateForm.vehicleNumber,
        vendorName: gateForm.vendorName,
        driverName: gateForm.driverName,
        driverPhone: gateForm.driverPhone,
        requesterName: gateForm.requesterName,
        location: gateForm.location,
        entryPhoto,
      },
    })
    // reset
    setGateForm({ vehicleType: 'Tractor', vehicleNumber: '', vendorName: '', driverName: '', driverPhone: '', requesterName: '', location: '' })
    setEntryPhoto(null)
    setView('list')
  }

  function approveEntry(id) {
    if (role !== 'Devaraj') return
    dispatch({ type: 'APPROVE_ENTRY', id })
  }

  function rejectEntry(id) {
    if (role !== 'Devaraj') return
    const reason = window.prompt('Enter rejection reason (optional):') || 'Rejected'
    dispatch({ type: 'REJECT_ENTRY', id, reason })
  }

  function canAddTrip(jc) {
    if (role !== 'Security') return false
    if (jc.status !== 'APPROVED_FOR_WORK') return false
    if (jc.vehicleType !== 'Tractor' && jc.gateEntry?.vehicleType !== 'Tractor') {
      // also check stored
    }
    if (!tripPhoto) return false
    return true
  }

  function addTrip(jc) {
    if (!canAddTrip(jc)) return
    dispatch({ type: 'ADD_TRIP', id: jc.id, payload: { materialType: tripForm.materialType, movement: tripForm.movement, photo: tripPhoto } })
    setTripPhoto(null)
  }

  function canPreClose(jc) {
    if (role !== 'Security') return false
    if (jc.status !== 'APPROVED_FOR_WORK') return false
    const vt = jc.gateEntry?.vehicleType
    if (vt === 'Tractor') {
      if ((jc.trips || []).length < 1) return false
    }
    if (!exitPhoto) return false
    return true
  }

  function submitPreClose(jc) {
    if (!canPreClose(jc)) return
    dispatch({
      type: 'PRE_CLOSE',
      id: jc.id,
      payload: {
        outTime: preCloseForm.outTime || new Date().toISOString(),
        exitPhoto,
        workDetails: preCloseForm.workDetails,
      },
    })
    setExitPhoto(null)
  }

  function approvePreClose(id) {
    if (role !== 'Devaraj') return
    dispatch({ type: 'APPROVE_PRE_CLOSE', id })
  }

  function rejectPreClose(id) {
    if (role !== 'Devaraj') return
    const reason = window.prompt('Enter rejection reason (optional):') || 'Pre-close rejected'
    dispatch({ type: 'REJECT_PRE_CLOSE', id, reason })
  }

  function canSubmitBilling(jc) {
    if (role !== 'Sharath') return false
    if (jc.status !== 'PENDING_BILLING') return false
    if (!billForm.invoiceNumber.trim()) return false
    if (billForm.billAmount === '' || billForm.billAmount === null) return false
    if (!billForm.inwardChecked) return false
    if (!billForm.inwardEntry.trim()) return false
    if (!xeroxPhoto) return false
    return true
  }

  function submitBilling(jc) {
    if (!canSubmitBilling(jc)) return
    dispatch({
      type: 'SUBMIT_BILLING',
      id: jc.id,
      payload: {
        billReceived: billForm.billReceived,
        invoiceNumber: billForm.invoiceNumber,
        billAmount: billForm.billAmount,
        inwardChecked: billForm.inwardChecked,
        inwardEntry: billForm.inwardEntry,
        xeroxPhoto,
      },
    })
    setXeroxPhoto(null)
  }

  function approveFullClose(id) {
    if (role !== 'Devaraj') return
    dispatch({ type: 'APPROVE_FULL_CLOSE', id })
  }

  const queue = useMemo(() => {
    if (role === 'Devaraj') {
      return state.jobCards.filter((jc) => jc.status === 'PENDING_ENTRY_APPROVAL' || jc.status === 'PENDING_PRECLOSE_APPROVAL' || jc.status === 'PENDING_FULL_CLOSE_APPROVAL')
    }
    if (role === 'Sharath') {
      return state.jobCards.filter((jc) => jc.status === 'PENDING_BILLING')
    }
    if (role === 'Security') {
      return state.jobCards
    }
    return state.jobCards
  }, [role, state.jobCards])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-950 text-safety-400 shadow-float">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-slate-900">GateFlow</p>
              <p className="text-xs text-slate-500">Vehicle Gate Entry • Job Card • Purchase Management</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
              {role === 'Security' && <ShieldCheck className="h-4 w-4 text-slate-600" />}
              {role === 'Devaraj' && <UserCog className="h-4 w-4 text-slate-600" />}
              {role === 'Sharath' && <ShoppingBag className="h-4 w-4 text-slate-600" />}
              <div>
                <p className="text-sm font-medium text-slate-900 leading-none">{profile?.full_name || user?.email}</p>
                <p className="text-xs text-slate-500 leading-none mt-0.5">{role}</p>
              </div>
            </div>
            {role === 'Security' && (
              <button
                onClick={() => setView('create')}
                className="flex items-center gap-2 rounded-full bg-safety-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-safety-400"
              >
                <Plus className="h-4 w-4" />
                New Gate Entry
              </button>
            )}
            <button onClick={() => setView('list')} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Job Cards
            </button>
            <button onClick={signOut} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {view === 'list' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-semibold text-slate-900">Job Cards</h1>
                <p className="text-sm text-slate-500">
                  {role === 'Devaraj' && 'Approvals queue'}
                  {role === 'Sharath' && 'Ready for billing'}
                  {role === 'Security' && 'All job cards'}
                </p>
              </div>
              <div className="text-sm text-slate-500">{queue.length} card(s)</div>
            </div>
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-white/60 py-12 text-center">
                <ClipboardList className="h-8 w-8 text-slate-400" />
                <p className="font-medium text-slate-700">No job cards in this queue</p>
                <p className="text-sm text-slate-500">Switch role or create a gate entry as Security</p>
              </div>
            )}
            <div className="grid gap-3">
              {queue.map((jc) => (
                <button
                  key={jc.id}
                  onClick={() => {
                    setActiveId(jc.id)
                    setView('detail')
                  }}
                  className="flex flex-col gap-3 rounded-3xl border border-white/80 bg-white/80 p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-950/90 text-safety-400">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{jc.gateEntry?.vehicleNumber}</p>
                        <p className="text-sm text-slate-500">
                          {jc.gateEntry?.vehicleType} • {jc.gateEntry?.vendorName}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={jc.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      IN: {formatTimestamp(jc.gateEntry?.inTime)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {jc.gateEntry?.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {jc.gateEntry?.driverPhone}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-4 w-4" />
                      Trips: {(jc.trips || []).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'create' && role === 'Security' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-900">New Gate Entry</h1>
              <p className="text-sm text-slate-500">Stage 1 • Mandatory live photo capture</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vehicle Type">
                    <Select value={gateForm.vehicleType} onChange={(e) => setGateForm({ ...gateForm, vehicleType: e.target.value })}>
                      {vehicleTypes.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="IN Time">
                    <Input value={formatTimestamp(inTimeNow)} readOnly />
                  </Field>
                  <Field label="Vehicle Number">
                    <Input value={gateForm.vehicleNumber} onChange={(e) => setGateForm({ ...gateForm, vehicleNumber: e.target.value.toUpperCase() })} placeholder="e.g. KA-01-AB-1234" />
                  </Field>
                  <Field label="Vendor Name">
                    <Input value={gateForm.vendorName} onChange={(e) => setGateForm({ ...gateForm, vendorName: e.target.value })} placeholder="Vendor / Contractor" />
                  </Field>
                  <Field label="Driver Name">
                    <Input value={gateForm.driverName} onChange={(e) => setGateForm({ ...gateForm, driverName: e.target.value })} placeholder="Driver full name" />
                  </Field>
                  <Field label="Driver Phone Number">
                    <Input value={gateForm.driverPhone} onChange={(e) => setGateForm({ ...gateForm, driverPhone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })} placeholder="10-digit number" />
                  </Field>
                  <Field label="Requester Name">
                    <Input value={gateForm.requesterName} onChange={(e) => setGateForm({ ...gateForm, requesterName: e.target.value })} placeholder="Person requesting" />
                  </Field>
                  <Field label="Location">
                    <Input value={gateForm.location} onChange={(e) => setGateForm({ ...gateForm, location: e.target.value })} placeholder="Site / Yard location" />
                  </Field>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-safety-500" />
                      <div>
                        <p className="font-medium text-slate-900">Mandatory Live Gate Entry Photo</p>
                        <p className="text-sm text-slate-500">Capture empty {gateForm.vehicleType} at gate</p>
                      </div>
                    </div>
                    <button
                      onClick={() => openCamera('Gate Entry Photo', (img) => setEntryPhoto(img))}
                      className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900"
                    >
                      Open Camera
                    </button>
                  </div>
                  {entryPhoto ? (
                    <div className="mt-4 overflow-hidden rounded-2xl">
                      <img src={entryPhoto.dataUrl} alt="Entry" className="h-64 w-full object-cover" />
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                        <span>Live capture</span>
                        <span>{formatTimestamp(entryPhoto.timestamp)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-10 text-center">
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                      <p className="text-sm text-slate-600">No photo captured yet</p>
                      <p className="text-xs text-slate-500">Submit button disabled until captured</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={submitGateEntry}
                  disabled={!canCreateGate()}
                  className="flex items-center justify-center gap-2 rounded-full bg-safety-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Submit Gate Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'detail' && activeJC && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-xl font-semibold text-slate-900">{activeJC.gateEntry?.vehicleNumber}</h1>
                  <StatusPill status={activeJC.status} />
                </div>
                <p className="text-sm text-slate-500">
                  {activeJC.gateEntry?.vehicleType} • {activeJC.gateEntry?.vendorName} • {activeJC.gateEntry?.location}
                </p>
              </div>
              <button onClick={() => setView('list')} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
                Back to list
              </button>
            </div>

            <div className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-card sm:p-6">
              <ProgressStepper status={activeJC.status} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col gap-6">
                <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-safety-500" />
                    <p className="font-medium text-slate-900">Gate Entry Details</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">IN Time</p>
                      <p className="text-sm font-medium text-slate-900">{formatTimestamp(activeJC.gateEntry?.inTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Vehicle Type</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.vehicleType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Vendor Name</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.vendorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Requester Name</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.requesterName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Driver Name</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.driverName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Driver Phone</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.driverPhone}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-sm font-medium text-slate-900">{activeJC.gateEntry?.location}</p>
                    </div>
                  </div>
                  {activeJC.gateEntry?.entryPhoto && (
                    <div className="mt-4 overflow-hidden rounded-2xl">
                      <img src={activeJC.gateEntry.entryPhoto.dataUrl} alt="Gate entry" className="h-64 w-full object-cover" />
                      <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                        <span>Live Gate Entry Photo</span>
                        <span>{formatTimestamp(activeJC.gateEntry.entryPhoto.timestamp)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {(role === 'Devaraj' && activeJC.status === 'PENDING_ENTRY_APPROVAL') && (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-card">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-5 w-5 text-amber-700" />
                      <p className="font-medium text-slate-900">Stage 2: Entry Approval</p>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">Review gate entry details and live photo before approving.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => approveEntry(activeJC.id)} className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Gate Entry
                      </button>
                      <button onClick={() => rejectEntry(activeJC.id)} className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50">
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {activeJC.status === 'APPROVED_FOR_WORK' && role === 'Security' && (
                  <div className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-safety-500" />
                        <p className="font-medium text-slate-900">Stage 3: Trips & Pre-Close</p>
                      </div>
                      <StatusPill status={activeJC.status} />
                    </div>
                    {activeJC.gateEntry?.vehicleType === 'Tractor' ? (
                      <div className="mt-4 flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Material Type">
                            <Select value={tripForm.materialType} onChange={(e) => setTripForm({ ...tripForm, materialType: e.target.value })}>
                              {materials.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Movement">
                            <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
                              {['Inside', 'Outside'].map((mv) => (
                                <button
                                  key={mv}
                                  onClick={() => setTripForm({ ...tripForm, movement: mv })}
                                  className={`flex-1 rounded-full px-3 py-1.5 text-sm transition ${tripForm.movement === mv ? 'bg-ink-950 text-white' : 'text-slate-600'}`}
                                >
                                  {mv}
                                </button>
                              ))}
                            </div>
                          </Field                        >
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
                          <div className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-safety-500" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">Live Trip Photo (mandatory per trip)</p>
                              <p className="text-xs text-slate-500">Capture loaded tractor at gate</p>
                            </div>
                          </div>
                          <button onClick={() => openCamera('Trip Photo', (img) => setTripPhoto(img))} className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900">
                            Open Camera
                          </button>
                        </div>
                        {tripPhoto && (
                          <div className="overflow-hidden rounded-2xl">
                            <img src={tripPhoto.dataUrl} alt="Trip" className="h-48 w-full object-cover" />
                            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                              <span>Trip photo</span>
                              <span>{formatTimestamp(tripPhoto.timestamp)}</span>
                            </div>
                          </div>
                        )}
                        <button onClick={() => addTrip(activeJC)} disabled={!canAddTrip(activeJC)} className="flex items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
                          <Plus className="h-4 w-4" />
                          Add Trip
                        </button>

                        <div className="border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900">Pre-Close</p>
                            <p className="text-sm text-slate-500">Total Loads: {(activeJC.trips || []).length}</p>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Field label="OUT Time">
                              <Input value={formatTimestamp(preCloseForm.outTime)} readOnly />
                            </Field>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
                            <div className="flex items-center gap-2">
                              <Camera className="h-5 w-5 text-safety-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">Live Exit Photo (mandatory)</p>
                                <p className="text-xs text-slate-500">Capture exit/gate photo</p>
                              </div>
                            </div>
                            <button onClick={() => openCamera('Exit Photo', (img) => setExitPhoto(img))} className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900">
                              Open Camera
                            </button>
                          </div>
                          {exitPhoto && (
                            <div className="mt-3 overflow-hidden rounded-2xl">
                              <img src={exitPhoto.dataUrl} alt="Exit" className="h-48 w-full object-cover" />
                              <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                                <span>Exit photo</span>
                                <span>{formatTimestamp(exitPhoto.timestamp)}</span>
                              </div>
                            </div>
                          )}
                          <button onClick={() => submitPreClose(activeJC)} disabled={!canPreClose(activeJC)} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-safety-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-50">
                            <CheckCircle2 className="h-4 w-4" />
                            Pre-Close Job Card
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col gap-4">
                        <Field label="Work Details / Description">
                          <Textarea rows={4} value={preCloseForm.workDetails} onChange={(e) => setPreCloseForm({ ...preCloseForm, workDetails: e.target.value })} placeholder="Describe work done (JCB/Crane)" />
                        </Field>
                        <Field label="Exit Time">
                          <Input value={formatTimestamp(preCloseForm.outTime)} readOnly />
                        </Field>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
                          <div className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-safety-500" />
                            <div>
                              <p className="text-sm font-medium text-slate-900">Live Work/Exit Photo (mandatory)</p>
                              <p className="text-xs text-slate-500">Capture at exit</p>
                            </div>
                          </div>
                          <button onClick={() => openCamera('Work/Exit Photo', (img) => setExitPhoto(img))} className="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900">
                            Open Camera
                          </button>
                        </div>
                        {exitPhoto && (
                          <div className="overflow-hidden rounded-2xl">
                            <img src={exitPhoto.dataUrl} alt="Exit" className="h-48 w-full object-cover" />
                            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                              <span>Exit photo</span>
                              <span>{formatTimestamp(exitPhoto.timestamp)}</span>
                            </div>
                          </div>
                        )}
                        <button onClick={() => submitPreClose(activeJC)} disabled={!canPreClose(activeJC)} className="flex items-center justify-center gap-2 rounded-full bg-safety-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-50">
                          <CheckCircle2 className="h-4 w-4" />
                          Pre-Close Job Card
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(role === 'Devaraj' && activeJC.status === 'PENDING_PRECLOSE_APPROVAL') && (
                  <div class="rounded-3xl border border-violet-200 bg-violet-50/80 p-6 shadow-card">
                    <div class="flex items-center gap-2">
                      <UserCog class="h-5 w-5 text-violet-700" />
                      <p class="font-medium text-slate-900">Stage 4: Pre-Close Approval</p>
                    </div>
                    <p class="mt-1 text-sm text-slate-600">Inspect trips, photos, exit time and totals before approving.</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => approvePreClose(activeJC.id)} class="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400">
                        <CheckCircle2 class="h-4 w-4" />
                        Approve Pre-Close
                      </button>
                      <button onClick={() => rejectPreClose(activeJC.id)} class="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-50">
                        <XCircle class="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {(role === 'Sharath' && activeJC.status === 'PENDING_BILLING') && (
                  <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <ShoppingBag class="h-5 w-5 text-safety-500" />
                        <p class="font-medium text-slate-900">Stage 5: Purchase & Bill Upload</p>
                      </div>
                      <StatusPill status={activeJC.status} />
                    </div>
                    <div class="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field label="Bill / Invoice Received at Gate">
                        <Select value={billForm.billReceived} onChange={(e) => setBillForm({ ...billForm, billReceived: e.target.value })}>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </Select>
                      </Field>
                      <Field label="Invoice Number">
                        <Input value={billForm.invoiceNumber} onChange={(e) => setBillForm({ ...billForm, invoiceNumber: e.target.value })} placeholder="INV-XXXX" />
                      </Field>
                      <Field label="Bill Amount (₹)">
                        <Input type="number" value={billForm.billAmount} onChange={(e) => setBillForm({ ...billForm, billAmount: e.target.value })} placeholder="0.00" />
                      </Field>
                    </div>
                    <div class="mt-4 flex flex-col gap-3">
                      <label class="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                        <input type="checkbox" checked={billForm.inwardChecked} onChange={(e) => setBillForm({ ...billForm, inwardChecked: e.target.checked })} class="mt-1 h-4 w-4 rounded border-slate-300 text-safety-500 focus:ring-safety-400" />
                        <div>
                          <p class="text-sm font-medium text-slate-900">Cross-Checked (C/S) with Inward Book</p>
                          <p class="text-xs text-slate-500">Mandatory checkbox</p>
                        </div>
                      </label>
                      <Field label="Inward Book Entry/Page No.">
                        <Input value={billForm.inwardEntry} onChange={(e) => setBillForm({ ...billForm, inwardEntry: e.target.value })} placeholder="IB-XX / Page 12" />
                      </Field>
                    </div>
                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-4">
                      <div class="flex items-center gap-2">
                        <Receipt class="h-5 w-5 text-safety-500" />
                        <div>
                          <p class="text-sm font-medium text-slate-900">Attach Xerox / Invoice Copy (mandatory)</p>
                          <p class="text-xs text-slate-500">Camera capture or file upload</p>
                        </div>
                      </div>
                      <button onClick={() => openCamera('Xerox / Invoice Copy', (img) => setXeroxPhoto(img))} class="rounded-full bg-ink-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-900">
                        Open Camera
                      </button>
                    </div>
                    {xeroxPhoto && (
                      <div class="mt-3 overflow-hidden rounded-2xl">
                        <img src={xeroxPhoto.dataUrl} alt="Xerox" class="h-48 w-full object-cover" />
                        <div class="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          <span>Xerox/Invoice</span>
                          <span>{formatTimestamp(xeroxPhoto.timestamp)}</span>
                        </div>
                      </div>
                    )}
                    <button onClick={() => submitBilling(activeJC)} disabled={!canSubmitBilling(activeJC)} class="mt-4 flex items-center justify-center gap-2 rounded-full bg-safety-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-50">
                      <CheckCircle2 class="h-4 w-4" />
                      Submit Bill & Close Inward Trip
                    </button>
                  </div>
                )}

                {(role === 'Devaraj' && activeJC.status === 'PENDING_FULL_CLOSE_APPROVAL') && (
                  <div class="rounded-3xl border border-fuchsia-200 bg-fuchsia-50/80 p-6 shadow-card">
                    <div class="flex items-center gap-2">
                      <UserCog class="h-5 w-5 text-fuchsia-700" />
                      <p class="font-medium text-slate-900">Stage 6: Full Closure Approval</p>
                    </div>
                    <p class="mt-1 text-sm text-slate-600">Review bill, inward book, xerox copy and trip photos before final closure.</p>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => approveFullClose(activeJC.id)} class="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400">
                        <CheckCircle2 class="h-4 w-4" />
                        Approve Full Closure
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div class="flex flex-col gap-6">
                <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                  <div class="flex items-center gap-2">
                    <ClipboardList class="h-5 w-5 text-safety-500" />
                    <p class="font-medium text-slate-900">Trip Photo Gallery</p>
                  </div>
                  {(activeJC.trips || []).length === 0 ? (
                    <div class="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-8 text-center">
                      <ImageIcon class="h-6 w-6 text-slate-400" />
                      <p class="text-sm text-slate-600">No trips logged yet</p>
                      <p class="text-xs text-slate-500">Trips appear here after Security logs them</p>
                    </div>
                  ) : (
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      {(activeJC.trips || []).map ( (trip) => (
                        <div key={trip.id} class="overflow-hidden rounded-2xl border border-slate-200">
                          <img src={trip.photo?.dataUrl} alt={`Trip ${trip.tripNumber}`} class="h-40 w-full object-cover" />
                          <div class="flex flex-col gap-1 p-3">
                            <div class="flex items-center justify-between">
                              <p class="text-sm font-medium text-slate-900">Trip #{trip.tripNumber}</p>
                              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{trip.movement}</span>
                            </div>
                            <p class="text-xs text-slate-500">{trip.materialType}</p>
                            <p class="text-xs text-slate-500">{formatTimestamp(trip.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {activeJC.preClose && (
                  <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                    <div class="flex items-center gap-2">
                      <Clock class="h-5 w-5 text-safety-500" />
                      <p class="font-medium text-slate-900">Pre-Close Details</p>
                    </div>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p class="text-xs text-slate-500">OUT Time</p>
                        <p class="text-sm font-medium text-slate-900">{formatTimestamp(activeJC.preClose.outTime)}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Submitted</p>
                        <p class="text-sm font-medium text-slate-900">{formatTimestamp(activeJC.preClose.submittedAt)}</p>
                      </div>
                      {activeJC.preClose.workDetails && (
                        <div class="sm:col-span-2">
                          <p class="text-xs text-slate-500">Work Details</p>
                          <p class="text-sm text-slate-900">{activeJC.preClose.workDetails}</p>
                        </div>
                      )}
                    </div>
                    {activeJC.preClose.exitPhoto && (
                      <div class="mt-4 overflow-hidden rounded-2xl">
                        <img src={activeJC.preClose.exitPhoto.dataUrl} alt="Exit" class="h-56 w-full object-cover" />
                        <div class="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          <span>Live Exit/Work Photo</span>
                          <span>{formatTimestamp(activeJC.preClose.exitPhoto.timestamp)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeJC.billing && (
                  <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                    <div class="flex items-center gap-2">
                      <Receipt class="h-5 w-5 text-safety-500" />
                      <p class="font-medium text-slate-900">Billing Details</p>
                    </div>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p class="text-xs text-slate-500">Bill Received</p>
                        <p class="text-sm font-medium text-slate-900">{activeJC.billing.billReceived}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Invoice Number</p>
                        <p class="text-sm font-medium text-slate-900">{activeJC.billing.invoiceNumber}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Bill Amount</p>
                        <p class="text-sm font-medium text-slate-900">₹ {activeJC.billing.billAmount}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Inward Checked</p>
                        <p class="text-sm font-medium text-slate-900">{activeJC.billing.inwardChecked ? 'Yes' : 'No'}</p>
                      </div>
                      <div class="sm:col-span-2">
                        <p class="text-xs text-slate-500">Inward Book Entry/Page No.</p>
                        <p class="text-sm font-medium text-slate-900">{activeJC.billing.inwardEntry}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Submitted By</p>
                        <p class="text-sm font-medium text-slate-900">{activeJC.billing.submittedBy}</p>
                      </div>
                      <div>
                        <p class="text-xs text-slate-500">Submitted At</p>
                        <p class="text-sm font-medium text-slate-900">{formatTimestamp(activeJC.billing.submittedAt)}</p>
                      </div>
                    </div>
                    {activeJC.billing.xeroxPhoto && (
                      <div class="mt-4 overflow-hidden rounded-2xl">
                        <img src={activeJC.billing.xeroxPhoto.dataUrl} alt="Xerox" class="h-56 w-full object-cover" />
                        <div class="flex items-center justify-between bg-slate-50 px-4 py-2 text-xs text-slate-500">
                          <span>Xerox / Invoice Copy</span>
                          <span>{formatTimestamp(activeJC.billing.xeroxPhoto.timestamp)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div class="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-card">
                  <div class="flex items-center gap-2">
                    <BookOpen class="h-5 w-5 text-safety-500" />
                    <p class="font-medium text-slate-900">Audit Trail</p>
                  </div>
                  <div class="mt-4 flex flex-col gap-3">
                    {(activeJC.audit || []).slice().reverse().map((a, idx) => (
                      <div key={idx} class="flex items-start gap-3">
                        <div class="mt-1 h-2 w-2 rounded-full bg-safety-400" />
                        <div>
                          <p class="text-sm font-medium text-slate-900">{a.action.replace(/_/g, ' ')}</p>
                          <p class="text-xs text-slate-500">
                            {a.byRole} • {formatTimestamp(a.at)} {a.note ? `• ${a.note}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CameraModal
        open={camera.open}
        title={camera.title}
        onClose={() => setCamera({ open: false, title: '', onCapture: null })}
        onCapture={(img) => {
          if (camera.onCapture) camera.onCapture(img)
        }}
      />
    </div>
  )
}
