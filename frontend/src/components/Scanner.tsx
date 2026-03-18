import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    HTMLCanvasElementLuminanceSource,
    HybridBinarizer,
    MultiFormatReader,
    NotFoundException,
} from '@zxing/library'

// ---------------------------------------------------------------------------
// We use MultiFormatReader (core) NOT BrowserMultiFormatReader/BrowserCodeReader.
// The browser wrappers unconditionally attach canplay DOM listeners and call
// tryPlayVideo() — causing "Trying to play video that is already playing".
// The core reader is pure in-memory with zero DOM involvement.
// ---------------------------------------------------------------------------

interface ScannerProps {
    onScan: ( scanData: string ) => void
    disabled?: boolean
}

type InputMode = 'camera' | 'manual'

// Target decode canvas size. Larger = more detail but slower HybridBinarizer.
// 640 is the sweet spot for dense QR codes.
const DECODE_SIZE = 640
const SCAN_FPS = 15

// ---------------------------------------------------------------------------
// Each pass describes how to render a region of the video frame into the
// decode canvas. All image processing uses CSS canvas filters — GPU-accelerated
// and orders of magnitude faster than manual JS pixel loops.
//
// cropFraction: what fraction of the shorter video dimension to crop (centred).
//   1.0 = full frame, 0.6 = centre 60%, etc.
// filter: CSS filter string applied during drawImage.
// ---------------------------------------------------------------------------
interface Pass {
    label: string
    cropFraction: number
    filter: string
}

const PASSES: Pass[] = [
    // ── Fast passes first ────────────────────────────────────────────────────

    // Standard: full frame, greyscale + moderate contrast.
    // Catches any code anywhere in frame without cropping bets.
    {label: 'full·contrast', cropFraction: 1.0, filter: 'grayscale(1) contrast(2.5)'},

    // Centre crop upscaled — best for codes held inside the reticle.
    {label: 'crop60·contrast', cropFraction: 0.6, filter: 'grayscale(1) contrast(2.5)'},

    // Higher contrast — helps low-ink / faded printed labels.
    {label: 'full·hi-contrast', cropFraction: 1.0, filter: 'grayscale(1) contrast(4) brightness(1.15)'},

    // Sharpen via oversaturated contrast then normalise — helps blurry prints.
    // The blur+contrast combo is a fast software unsharp-mask equivalent.
    {label: 'crop60·sharpen', cropFraction: 0.6, filter: 'grayscale(1) blur(0.3px) contrast(6) brightness(1.1)'},

    // Wide crop — QR slightly off-centre but still in reticle neighbourhood.
    {label: 'crop80·contrast', cropFraction: 0.8, filter: 'grayscale(1) contrast(3)'},

    // Inverted — some LCSC tape uses light-on-dark labels.
    {label: 'crop60·invert', cropFraction: 0.6, filter: 'grayscale(1) invert(1) contrast(2.5)'},

    // Full frame inverted.
    {label: 'full·invert', cropFraction: 1.0, filter: 'grayscale(1) invert(1) contrast(2.5)'},
]

// ---------------------------------------------------------------------------
// Draw a centred-crop of `src` into `dst` using a CSS filter.
// cropFraction=1 draws the full frame; <1 draws an inset square crop upscaled.
// ---------------------------------------------------------------------------
function drawPass(
    dst: HTMLCanvasElement,
    src: HTMLVideoElement,
    cropFraction: number,
    filter: string,
): void {
    dst.width = DECODE_SIZE
    dst.height = DECODE_SIZE
    const ctx = dst.getContext('2d', {willReadFrequently: true})!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const vw = src.videoWidth
    const vh = src.videoHeight

    if (cropFraction >= 1) {
        // Full frame stretched to square decode canvas.
        ctx.filter = filter
        ctx.drawImage(src, 0, 0, DECODE_SIZE, DECODE_SIZE)
        ctx.filter = 'none'
    } else {
        // Centre-crop: take a square region of (shorter side × cropFraction),
        // centred in the frame, then upscale to DECODE_SIZE.
        const side = Math.floor(Math.min(vw, vh) * cropFraction)
        const sx = Math.floor((vw - side) / 2)
        const sy = Math.floor((vh - side) / 2)
        ctx.filter = filter
        ctx.drawImage(src, sx, sy, side, side, 0, 0, DECODE_SIZE, DECODE_SIZE)
        ctx.filter = 'none'
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Scanner( {onScan, disabled = false}: ScannerProps ) {
    const [mode, setMode] = useState<InputMode>('camera')
    const [manualInput, setManualInput] = useState('')
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [lastScan, setLastScan] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [debugMode, setDebugMode] = useState(false)
    const [debugLabel, setDebugLabel] = useState('')
    const [debugPass, setDebugPassIdx] = useState(0) // which pass to preview

    const webcamRef = useRef<Webcam>(null)
    // Single reusable decode canvas (mutated each pass).
    const decodeCanvas = useRef<HTMLCanvasElement>(null)
    // Separate canvas for the debug view so we can freeze it on the chosen pass.
    const debugCanvas = useRef<HTMLCanvasElement>(null)
    const rafRef = useRef<number | null>(null)
    const readerRef = useRef<MultiFormatReader | null>(null)
    const lastScanRef = useRef('')
    const lastFrameTs = useRef(0)
    const debugModeRef = useRef(false)
    const debugPassRef = useRef(0)

    useEffect(() => { debugModeRef.current = debugMode }, [debugMode])
    useEffect(() => { debugPassRef.current = debugPass }, [debugPass])

    // ── Init reader ──────────────────────────────────────────────────────────
    useEffect(() => {
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
        hints.set(DecodeHintType.TRY_HARDER, true)
        const r = new MultiFormatReader()
        r.setHints(hints)
        readerRef.current = r
        return () => { readerRef.current = null }
    }, [])

    // ── Result handler ───────────────────────────────────────────────────────
    const handleScan = useCallback(( raw: string, passLabel: string ) => {
        if (raw === lastScanRef.current) return
        lastScanRef.current = raw
        setTimeout(() => { lastScanRef.current = '' }, 2000)
        setLastScan(raw)
        setDebugLabel(passLabel)
        onScan(raw)
    }, [onScan])

    // ── Decode one canvas ────────────────────────────────────────────────────
    const tryDecode = useCallback(( canvas: HTMLCanvasElement ): string | null => {
        if (!readerRef.current) return null
        try {
            const src = new HTMLCanvasElementLuminanceSource(canvas)
            const bitmap = new BinaryBitmap(new HybridBinarizer(src))
            return readerRef.current.decode(bitmap).getText()
        } catch (err: any) {
            if (!(err instanceof NotFoundException) && err?.name !== 'NotFoundException') {
                console.error('QR decode error:', err)
            }
            return null
        }
    }, [])

    // ── rAF loop ─────────────────────────────────────────────────────────────
    const stopLoop = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
        setScanning(false)
    }, [])

    useEffect(() => {
        if (mode !== 'camera' || disabled) {
            stopLoop()
            return
        }

        let cancelled = false

        const waitForVideo = async (): Promise<HTMLVideoElement | null> => {
            for (let i = 0; i < 100 && !cancelled; i++) {
                const v = (webcamRef.current as any)?.video as HTMLVideoElement | undefined
                if (v && v.readyState >= 2 && v.videoWidth > 0) return v
                await new Promise(r => setTimeout(r, 100))
            }
            return null
        }

        waitForVideo().then(video => {
            if (cancelled || !video) {
                if (!cancelled) setCameraError('Camera not available.')
                return
            }
            setScanning(true)

            const tick = ( ts: number ) => {
                if (cancelled) return
                rafRef.current = requestAnimationFrame(tick)

                if (ts - lastFrameTs.current < 1000 / SCAN_FPS) return
                lastFrameTs.current = ts

                const vid = (webcamRef.current as any)?.video as HTMLVideoElement | undefined
                if (!vid || vid.readyState < 2 || vid.paused || vid.ended) return

                const dc = decodeCanvas.current
                const dbg = debugCanvas.current
                if (!dc) return

                const isDebug = debugModeRef.current
                const previewIdx = debugPassRef.current

                for (let i = 0; i < PASSES.length; i++) {
                    const pass = PASSES[i]
                    drawPass(dc, vid, pass.cropFraction, pass.filter)

                    // In debug mode, mirror the chosen preview pass to the debug canvas.
                    if (isDebug && dbg && i === previewIdx) {
                        dbg.width = DECODE_SIZE
                        dbg.height = DECODE_SIZE
                        dbg.getContext('2d')!.drawImage(dc, 0, 0)
                    }

                    const result = tryDecode(dc)
                    if (result) {
                        // Update debug canvas to show the winning pass.
                        if (isDebug && dbg) {
                            dbg.width = DECODE_SIZE
                            dbg.height = DECODE_SIZE
                            dbg.getContext('2d')!.drawImage(dc, 0, 0)
                        }
                        handleScan(result, pass.label)
                        break
                    }
                }
            }

            rafRef.current = requestAnimationFrame(tick)
        })

        return () => {
            cancelled = true
            stopLoop()
        }
    }, [mode, disabled, handleScan, tryDecode, stopLoop])

    // ── Manual submit ────────────────────────────────────────────────────────
    function handleManualSubmit( e: React.FormEvent<HTMLFormElement> ) {
        e.preventDefault()
        const trimmed = manualInput.trim()
        if (!trimmed) return
        handleScan(trimmed, 'manual')
        setManualInput('')
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Hidden decode canvas */}
            <canvas ref={decodeCanvas} className="hidden" aria-hidden/>

            {/* Mode + debug toggles */}
            <div className="flex flex-wrap gap-2 items-center">
                <button
                    type="button"
                    onClick={() => {
                        setMode('camera')
                        setCameraError(null)
                    }}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <circle cx="12" cy="13" r="3"/>
                    </svg>
                    Camera
                </button>
                <button
                    type="button"
                    onClick={() => setMode('manual')}
                    disabled={disabled}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Manual / USB
                </button>

                {mode === 'camera' && (
                    <button
                        type="button"
                        onClick={() => setDebugMode(d => !d)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-auto ${
                            debugMode ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                        {debugMode ? 'Debug ON' : 'Debug'}
                    </button>
                )}
            </div>

            {/* Camera view */}
            {mode === 'camera' && (
                <div className="space-y-2 max-w-lg">
                    <div
                        className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video">
                        {cameraError ? (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none"
                                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                                </svg>
                                <p className="text-sm text-red-400 font-medium">{cameraError}</p>
                                <p className="text-xs text-slate-500">Use manual input mode instead.</p>
                            </div>
                        ) : (
                            <>
                                {/* Live webcam — always mounted to keep stream alive */}
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    muted
                                    playsInline
                                    videoConstraints={{
                                        width: {ideal: 1920},
                                        height: {ideal: 1080},
                                        facingMode: {ideal: 'environment'},
                                    }}
                                    onUserMediaError={( err ) =>
                                        setCameraError(err instanceof Error ? `${err.message}. Ensure camera permissions are allowed and try again.` : 'Camera access denied.')
                                    }
                                    className={`w-full h-full object-cover ${debugMode ? 'invisible absolute' : ''}`}
                                />

                                {/* Debug canvas replaces live feed */}
                                {debugMode && (
                                    <canvas
                                        ref={debugCanvas}
                                        className="w-full h-full object-contain bg-black"
                                        style={{imageRendering: 'pixelated'}}
                                    />
                                )}

                                {/* Reticle (live mode only) */}
                                {!debugMode && (
                                    <div
                                        className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div className="w-1/2 aspect-square relative">
                                            {(['tl', 'tr', 'bl', 'br'] as const).map(c => (
                                                <span key={c} className={`absolute w-5 h-5 border-blue-400 opacity-80 ${
                                                    c === 'tl' ? 'top-0 left-0   border-t-2 border-l-2 rounded-tl-sm' :
                                                        c === 'tr' ? 'top-0 right-0  border-t-2 border-r-2 rounded-tr-sm' :
                                                            c === 'bl' ? 'bottom-0 left-0  border-b-2 border-l-2 rounded-bl-sm' :
                                                                'bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm'
                                                }`}/>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Status / debug badges */}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                    {debugLabel && (
                                        <span
                                            className="bg-amber-500/90 text-slate-900 text-xs font-mono px-2 py-0.5 rounded-full">
                                            ✓ {debugLabel}
                                        </span>
                                    )}
                                    {scanning && (
                                        <div
                                            className="flex items-center gap-1.5 bg-slate-900/70 px-2 py-1 rounded-full">
                                            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"/>
                                            <span className="text-xs text-green-400">Scanning…</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Debug controls */}
                    {debugMode && (
                        <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 space-y-2">
                            <p className="text-xs text-amber-400 font-medium">
                                Previewing pass {debugPass + 1}/{PASSES.length}: <span
                                className="font-mono">{PASSES[debugPass].label}</span>
                                <span className="text-slate-400 ml-2">filter: <span
                                    className="font-mono">{PASSES[debugPass].filter}</span></span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {PASSES.map(( p, i ) => (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => setDebugPassIdx(i)}
                                        className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                                            i === debugPass
                                                ? 'bg-amber-500 text-slate-900'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">
                                The scanner tries all passes in order each frame and stops at the first success.
                                Use the buttons to preview what each pass looks like. The winning pass is shown in the
                                badge above.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Manual / USB input */}
            {mode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="flex gap-2 max-w-lg">
                    <input
                        type="text"
                        value={manualInput}
                        onChange={( e ) => setManualInput(e.target.value)}
                        placeholder="Scan QR code or type part no…"
                        autoFocus
                        disabled={disabled}
                        className="input-field flex-1"
                    />
                    <button type="submit" disabled={disabled || !manualInput.trim()}
                            className="btn-primary flex-shrink-0">
                        Submit
                    </button>
                </form>
            )}

            {/* Last scan feedback */}
            {lastScan && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>Last scan: <code className="font-mono">{lastScan}</code></span>
                </div>
            )}
        </div>
    )
}