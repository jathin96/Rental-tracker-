import React, { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X, Image as ImageIcon, AlertCircle } from 'lucide-react'

function formatWatermark() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  return `${date} ${time}`
}

export default function CameraModal({ open, onClose, onCapture, title = 'Capture Live Photo' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [captured, setCaptured] = useState(null)
  const [watermark, setWatermark] = useState(formatWatermark())

  useEffect(() => {
    if (!open) return
    setCaptured(null)
    setError('')
    setReady(false)
    const interval = setInterval(() => setWatermark(formatWatermark()), 1000)
    startCamera()
    return () => {
      clearInterval(interval)
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function startCamera() {
    stopCamera()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setReady(true)
      }
    } catch (e) {
      setError('Camera unavailable. Use the file input below (works on desktop).')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  function takePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, w, h)
    // watermark
    const pad = 16
    ctx.fillStyle = 'rgba(8, 17, 31, 0.6)'
    ctx.fillRect(0, h - 40, w, 40)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 18px Inter, system-ui'
    ctx.fillText(watermark, pad, h - 14)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCaptured({ dataUrl, timestamp: new Date().toISOString() })
  }

  function retake() {
    setCaptured(null)
  }

  function confirm() {
    if (!captured) return
    onCapture({ dataUrl: captured.dataUrl, timestamp: captured.timestamp })
    onClose()
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const w = img.width
        const h = img.height
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const pad = 16
        const wm = formatWatermark()
        ctx.fillStyle = 'rgba(8, 17, 31, 0.6)'
        ctx.fillRect(0, h - 40, w, 40)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 18px Inter, system-ui'
        ctx.fillText(wm, pad, h - 14)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setCaptured({ dataUrl, timestamp: new Date().toISOString() })
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-ink-950 text-white shadow-float ring-1 ring-white/10">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-safety-400" />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-white/60">Timestamp watermark will be applied to camera or gallery photo</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mx-5 mb-5 overflow-hidden rounded-2xl bg-black">
          {!captured ? (
            <>
              <video ref={videoRef} playsInline muted className="h-[320px] w-full object-cover sm:h-[420px]" />
              <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white/90">
                {watermark}
              </div>
              {!ready && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-safety-400" />
                  <p className="text-sm text-white/70">Starting camera…</p>
                </div>
              )}
              {error && (
                <div className="absolute inset-x-4 bottom-4 flex items-start gap-2 rounded-xl bg-amber-500/90 px-3 py-2 text-sm text-slate-950">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
            </>
          ) : (
            <img src={captured.dataUrl} alt="Captured" className="h-[320px] w-full object-cover sm:h-[420px]" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ImageIcon className="h-4 w-4" />
            <span>Mandatory for Security actions</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              Upload from Gallery
            </label>
            {!captured ? (
              <button
                onClick={takePhoto}
                disabled={!ready && !error}
                className="rounded-full bg-safety-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-safety-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Capture Photo
              </button>
            ) : (
              <>
                <button onClick={retake} className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10">
                  Retake
                </button>
                <button onClick={confirm} className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                  Use Photo
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
