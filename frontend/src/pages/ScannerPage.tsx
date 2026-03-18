import { useCallback, useEffect, useState } from 'react'
import Scanner from '../components/Scanner'
import ComponentModal from '../components/ComponentModal'
import { parseScanData } from '../services/lcsc'
import * as api from '../services/api'
import type { Box, InventoryItem } from '../types'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle, Check, X, AlertTriangle } from 'lucide-react'

type ScanStatus = 'idle' | 'loading' | 'success' | 'error';

interface ScanState {
    status: ScanStatus;
    message: string;
    item: InventoryItem | null;
    isNew: boolean;
}

export default function ScannerPage() {
    const [boxes, setBoxes] = useState<Box[]>([])
    const [boxesLoading, setBoxesLoading] = useState(true)
    const [scanState, setScanState] = useState<ScanState>({
        status: 'idle',
        message: '',
        item: null,
        isNew: false,
    })
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        api
            .getBoxes()
            .then(setBoxes)
            .catch(() => {/* non-fatal */})
            .finally(() => setBoxesLoading(false))
    }, [])

    const handleScan = useCallback(
        async ( rawScan: string ) => {
            if (scanState.status === 'loading') return

            setScanState({status: 'loading', message: 'Looking up part…', item: null, isNew: false})

            try {
                const {partNumber, quantity: parsedQty} = parseScanData(rawScan)

                // Ask the backend to look up the LCSC part and find or create it
                const lookupResult = await api.lookupLCSC(rawScan)

                // Try to find an existing inventory item for this part
                const inventory = await api.getInventory()
                const existing = inventory.find(
                    ( inv ) => inv.component.lcsc_part_no === lookupResult.lcsc_part_no,
                )

                if (existing) {
                    setScanState({
                        status: 'success',
                        message: `Found: ${existing.component.name || partNumber}`,
                        item: existing,
                        isNew: false,
                    })
                } else {
                    // Create a stub inventory item so the modal has the component data
                    const stubItem: InventoryItem = {
                        id: 0,
                        component_id: 0,
                        box_id: boxes[0]?.id ?? 0,
                        quantity: parsedQty ?? 1,
                        component: {
                            id: 0,
                            lcsc_part_no: lookupResult.lcsc_part_no,
                            name: lookupResult.name,
                            value: lookupResult.value,
                            footprint: lookupResult.footprint,
                            description: lookupResult.description,
                            manufacturer: lookupResult.manufacturer,
                            created_at: '',
                            updated_at: '',
                        },
                        box: boxes[0] ?? {id: 0, name: '', description: '', created_at: '', updated_at: ''},
                        created_at: '',
                        updated_at: '',
                    }
                    setScanState({
                        status: 'success',
                        message: `New part: ${lookupResult.name || partNumber}`,
                        item: stubItem,
                        isNew: true,
                    })
                }
                setModalOpen(true)
            } catch (err) {
                setScanState({
                    status: 'error',
                    message: err instanceof Error ? err.message : 'Lookup failed.',
                    item: null,
                    isNew: false,
                })
            }
        },
        [scanState.status, boxes],
    )

    async function handleModalSave( data: { quantity: number; box_id: number } ) {
        if (!scanState.item) return

        try {
            if (scanState.isNew) {
                // include component data so the backend can populate component fields
                await api.upsertByLCSC(
                    scanState.item.component.lcsc_part_no,
                    data.quantity,
                    data.box_id,
                    {
                        name: scanState.item.component.name,
                        value: scanState.item.component.value,
                        footprint: scanState.item.component.footprint,
                        description: scanState.item.component.description,
                        manufacturer: scanState.item.component.manufacturer,
                    },
                )
            } else {
                await api.updateInventoryItem(scanState.item.id, {
                    quantity: data.quantity,
                    box_id: data.box_id,
                })
            }
            setModalOpen(false)
            setScanState({status: 'idle', message: '', item: null, isNew: false})
        } catch (err) {
            setScanState(( prev ) => ({
                ...prev,
                status: 'error',
                message: err instanceof Error ? err.message : 'Save failed.',
            }))
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Page heading */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Scanner</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Point your camera at a barcode or scan with a USB scanner to look up
                    a component.
                </p>
            </div>

            {/* Status banner */}
            {scanState.status !== 'idle' && (
                <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                        scanState.status === 'loading'
                            ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
                            : scanState.status === 'error'
                                ? 'bg-red-900/40 text-red-300 border border-red-700'
                                : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
                    }`}
                >
                    {scanState.status === 'loading' && (
                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0"/>
                    )}
                    {scanState.status === 'error' && (
                        <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                    )}
                    {scanState.status === 'success' && (
                        <Check className="h-4 w-4 flex-shrink-0"/>
                    )}
                    <span>{scanState.message}</span>
                    {scanState.status !== 'loading' && (
                        <button
                            type="button"
                            onClick={() => setScanState({status: 'idle', message: '', item: null, isNew: false})}
                            className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
                            aria-label="Dismiss"
                        >
                            <X className="h-4 w-4"/>
                        </button>
                    )}
                </div>
            )}

            {/* Boxes warning */}
            {!boxesLoading && boxes.length === 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-amber-900/30 text-amber-300 border border-amber-700">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0"/>
                    No boxes found. Create a box first so you can assign scanned parts.
                </div>
            )}

            {/* Scanner component */}
            <Card>
                <CardContent className="p-5">
                    <Scanner
                        onScan={handleScan}
                        disabled={scanState.status === 'loading'}
                    />
                </CardContent>
            </Card>

            {/* Tips */}
            <Card>
                <CardContent className="p-5">
                    <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                        Tips
                    </h2>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            LCSC part numbers start with <code className="text-slate-200">C</code> followed by digits
                            (e.g. <code className="text-slate-200">C14663</code>).
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            Reel barcodes may include quantity: <code className="text-slate-200">C14663,100,…</code>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span>
                            USB barcode scanners work in Manual mode — click the field and scan.
                        </li>
                    </ul>
                </CardContent>
            </Card>

            {/* Modal */}
            {modalOpen && scanState.item && (
                <ComponentModal
                    item={scanState.item}
                    isNew={scanState.isNew}
                    boxes={boxes}
                    onSave={handleModalSave}
                    onClose={() => {
                        setModalOpen(false)
                        setScanState({status: 'idle', message: '', item: null, isNew: false})
                    }}
                />
            )}
        </div>
    )
}
