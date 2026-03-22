import React, { useEffect, useState } from 'react'
import readXlsxFile from 'read-excel-file'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    AlertCircle,
    CheckCircle2,
    Flame,
    Search,
    Settings,
    ShoppingCart,
    Trash2,
    UploadCloud,
    Zap,
} from 'lucide-react'
import * as api from '../services/api'
import { InventoryItem } from '@/types'

// Types
interface BomItem {
    id: string;
    designator: string;
    footprint: string;
    quantity: number;
    value: string;
    lcscPartNumber: string;
    matchedInventoryItem?: InventoryItem;
    manualMatch?: boolean;
    selected?: boolean;
    placed?: boolean;
    soldered?: boolean;
}

export default function BomPage() {
    const [bomData, setBomData] = useState<BomItem[] | null>(null)
    const [pcbCount, setPcbCount] = useState<number>(1)
    const [isSolderingMode, setIsSolderingMode] = useState<boolean>(false)
    const [recentBoms, setRecentBoms] = useState<string[]>([])
    const [confirmSubtract, setConfirmSubtract] = useState(false)
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(false)

    // Load state
    useEffect(() => {
        const savedBom = localStorage.getItem('currentBom')
        if (savedBom) {
            try {
                setBomData(JSON.parse(savedBom))
            } catch (e) {
                console.error('Failed to parse saved BOM', e)
            }
        }

        // Load inventory for matching
        loadInventory()
    }, [])

    async function loadInventory() {
        try {
            const inv = await api.getInventory()
            setInventory(inv)
        } catch (e) {
            console.error('Failed to load inventory', e)
        }
    }

    // Save state
    useEffect(() => {
        if (bomData) {
            localStorage.setItem('currentBom', JSON.stringify(bomData))
        } else {
            localStorage.removeItem('currentBom')
        }
    }, [bomData])

    // Match BOM items with Inventory
    useEffect(() => {
        if (!bomData || !inventory.length) return

        const matchedData = bomData.map(item => {
            if (item.manualMatch && item.matchedInventoryItem) return item

            let match = inventory.find(inv =>
                inv.component.lcsc_part_no &&
                item.lcscPartNumber &&
                inv.component.lcsc_part_no.trim().toLowerCase() === item.lcscPartNumber.trim().toLowerCase(),
            )

            if (!match && !item.lcscPartNumber) {
                match = inventory.find(inv =>
                    (inv.component.value && item.value && inv.component.value.toLowerCase() === item.value.toLowerCase()) &&
                    (inv.component.footprint && item.footprint && inv.component.footprint.toLowerCase().includes(item.footprint.toLowerCase())),
                )
            }

            if (JSON.stringify(match) !== JSON.stringify(item.matchedInventoryItem)) {
                return {...item, matchedInventoryItem: match}
            }
            return item
        })

        const hasChanges = JSON.stringify(matchedData) !== JSON.stringify(bomData)
        if (hasChanges) {
            setBomData(matchedData)
        }
    }, [inventory, bomData?.length])


    const parseFile = async ( file: File ) => {
        let items: BomItem[] = []

        if (file.name.endsWith('.csv')) {
            const text = await file.text()
            const lines = text.split('\n')

            items = lines.slice(1).filter(l => l.trim() !== '').map(( line, idx ) => {
                const row: string[] = []
                let current = ''
                let inQuote = false
                for (let i = 0; i < line.length; i++) {
                    const char = line[i]
                    if (char === '"') {
                        inQuote = !inQuote
                    } else if (char === ',' && !inQuote) {
                        row.push(current)
                        current = ''
                    } else {
                        current += char
                    }
                }
                row.push(current)

                return {
                    id: `bom-${idx}`,
                    quantity: parseInt(row[1] || '0'),
                    designator: row[3]?.replace(/"/g, '') || '',
                    footprint: row[4] || '',
                    value: row[5] || '',
                    lcscPartNumber: row[8] || '',
                    placed: false,
                    soldered: false,
                }
            })

        } else {
            const rows = await readXlsxFile(file)
            const headerRow = rows[0] as string[]
            const designatorIdx = headerRow.findIndex(h => h?.toString().toLowerCase().includes('designator'))
            const quantityIdx = headerRow.findIndex(h => h?.toString().toLowerCase().includes('quantity'))
            const footprintIdx = headerRow.findIndex(h => h?.toString().toLowerCase().includes('footprint'))
            const valueIdx = headerRow.findIndex(h => h?.toString().toLowerCase().includes('value') || h?.toString().toLowerCase().includes('comment'))
            const lcscIdx = headerRow.findIndex(h => h?.toString().toLowerCase().includes('supplier part') || h?.toString().toLowerCase().includes('lcsc'))

            items = rows.slice(1).map(( row: any, index: number ) => ({
                id: `bom-${index}`,
                designator: row[designatorIdx > -1 ? designatorIdx : 3]?.toString() || '',
                footprint: row[footprintIdx > -1 ? footprintIdx : 4]?.toString() || '',
                quantity: parseInt(row[quantityIdx > -1 ? quantityIdx : 1]?.toString() || '0'),
                value: row[valueIdx > -1 ? valueIdx : 5]?.toString() || '',
                lcscPartNumber: row[lcscIdx > -1 ? lcscIdx : 8]?.toString() || '',
                placed: false,
                soldered: false,
            }))
        }

        setBomData(items)
    }

    const handleFileUpload = async ( e: React.ChangeEvent<HTMLInputElement> ) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            await parseFile(file)
        } catch (error) {
            console.error('Error reading file:', error)
            alert('Failed to read BOM file.')
        }
    }

    const handleClearBom = () => {
        setBomData(null)
        setIsSolderingMode(false)
        setPcbCount(1)
    }

    const calculateMaxPossible = () => {
        if (!bomData) return
        let minRatio = Infinity

        bomData.forEach(item => {
            if (item.quantity === 0) return
            const inStock = item.matchedInventoryItem ? item.matchedInventoryItem.quantity : 0
            const ratio = Math.floor(inStock / item.quantity)
            if (ratio < minRatio) minRatio = ratio
        })

        setPcbCount(minRatio === Infinity ? 0 : minRatio)
    }

    const handleQuickSubtract = async () => {
        if (!bomData) return
        setLoading(true)
        try {
            const itemsToSubtract = bomData
                .filter(item => item.matchedInventoryItem)
                .map(item => ({
                    inventory_item_id: item.matchedInventoryItem!.id,
                    quantity: item.quantity * pcbCount,
                }))
                .filter(i => i.quantity > 0)

            if (itemsToSubtract.length === 0) {
                alert('No matched items to subtract.')
                return
            }

            await api.batchSubtractInventory(itemsToSubtract)
            await loadInventory() // Refresh stock
            alert('Inventory updated successfully.')
            setConfirmSubtract(false)
        } catch (e) {
            console.error(e)
            alert('Failed to subtract inventory: ' + (e instanceof Error ? e.message : String(e)))
        } finally {
            setLoading(false)
        }
    }

    const handleSolderingFinish = async () => {
        if (!bomData) return
        if (!confirm('Are you sure you want to finish and subtract matched components marked as Placed/Soldered from inventory?')) return

        setLoading(true)
        try {
            alert('Soldering completion not fully implemented in this step. Use Quick Subtract for batch updates.')
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleLcscExport = async () => {
        if (!bomData) return
        const missing = bomData.filter(item => {
            const stock = item.matchedInventoryItem?.quantity || 0
            const needed = item.quantity * pcbCount
            return stock < needed
        })

        if (missing.length === 0) {
            alert('No missing parts!')
            return
        }

        // Generate CSV for LCSC BOM Tool
        const csvContent = 'data:text/csv;charset=utf-8,'
            + 'LCSC Part No,Quantity\n'
            + missing.map(item => `${item.lcscPartNumber},${(item.quantity * pcbCount) - (item.matchedInventoryItem?.quantity || 0)}`).join('\n')

        const textForClipboard = missing.map(item => `${item.lcscPartNumber},${(item.quantity * pcbCount) - (item.matchedInventoryItem?.quantity || 0)}`).join('\n')

        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(textForClipboard)
            alert('Missing parts copied to clipboard! Opening LCSC BOM Tool. Paste the data or upload the downloaded CSV.')
        } catch (err) {
            console.error('Failed to copy: ', err)
            alert('Opening LCSC BOM Tool. Please upload the downloaded CSV.')
        }

        // Download CSV
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', 'lcsc_order.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Open LCSC BOM tool
        window.open('https://www.lcsc.com/bom.html', '_blank')
    }


    // --- View Logic ---

    const getDisplayData = () => {
        if (!bomData) return []
        return bomData
    }

    // New state for soldering progress
    const [solderingStatus, setSolderingStatus] = useState<Record<string, { placed: boolean, soldered: boolean }>>({})

    const toggleSolderingStatus = ( designator: string, field: 'placed' | 'soldered' ) => {
        setSolderingStatus(prev => ({
            ...prev,
            [designator]: {
                ...prev[designator],
                [field]: !prev[designator]?.[field],
            },
        }))
    }

    const displayItems = isSolderingMode
        ? bomData?.flatMap(item => {
        const designators = item.designator.split(/,| /).filter(d => d.trim() !== '')
        if (designators.length > 0) {
            return designators.map(d => ({
                ...item,
                id: `${item.id}-${d}`,
                uniqueDesignator: d,
                quantity: 1,
            }))
        }
        return [{...item, uniqueDesignator: item.designator}]
    }) || []
        : bomData || []


    if (!bomData) {
        return (
            <div className="flex flex-col h-full space-y-5 p-6">
                <h1 className="text-2xl font-bold text-slate-100">BOM Upload</h1>

                <Card
                    className="border-2 border-dashed border-gray-600 bg-card/50 rounded-xl p-16 text-center hover:bg-card/80 transition-all cursor-pointer relative group flex flex-col items-center justify-center gap-4">
                    <input
                        type="file"
                        accept=".xlsx, .csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                        <UploadCloud className="w-10 h-10 text-primary"/>
                    </div>
                    <div>
                        <p className="text-lg font-medium text-slate-200">Click or drag file to this area to upload</p>
                        <p className="text-sm text-muted-foreground mt-1">Support for .xlsx and .csv files</p>
                    </div>
                </Card>
            </div>
        )
    }

    const totalPartsNeeded = bomData.reduce(( acc, item ) => acc + (item.quantity * pcbCount), 0)
    const uniqueParts = bomData.length
    const missingCount = bomData.filter(item => (item.matchedInventoryItem?.quantity || 0) < (item.quantity * pcbCount)).length

    return (
        <div className="space-y-5 p-1 h-full flex flex-col">
            {/* Header Bar */}
            <div
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 p-4 rounded-xl border border-border">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        BOM Manager
                        {isSolderingMode &&
                            <Badge variant="default" className="bg-orange-500/20 text-orange-400 border-orange-500/50">Soldering
                                Mode</Badge>}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {uniqueParts} unique parts • {totalPartsNeeded} total components required
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleClearBom}>
                        <Trash2 className="w-4 h-4 mr-2"/>
                        Exit BOM
                    </Button>
                </div>
            </div>

            {/* Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration */}
                <Card className="p-5 flex flex-col justify-center gap-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Settings className="w-4 h-4"/> Production Settings
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-slate-400 mb-1 block">PCBs to Build</label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={pcbCount}
                                    onChange={( e ) => setPcbCount(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-24 text-center font-mono text-lg"
                                />
                                <span className="text-sm text-muted-foreground">units</span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={calculateMaxPossible}
                                className="h-10 border-dashed text-xs">
                            Calculate Max
                        </Button>
                    </div>
                </Card>

                {/* Actions */}
                <Card className="p-5 flex flex-col justify-center gap-4 lg:col-span-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Zap className="w-4 h-4"/> Quick Actions
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            disabled={loading}
                            variant={confirmSubtract ? 'destructive' : 'secondary'}
                            onClick={() => {
                                if (confirmSubtract) {
                                    handleQuickSubtract()
                                } else {
                                    setConfirmSubtract(true)
                                }
                            }}
                            onMouseLeave={() => setConfirmSubtract(false)}
                        >
                            {loading ? 'Processing...' : (confirmSubtract ? 'Confirm Subtract?' : 'Quick Subtract Stock')}
                        </Button>

                        <Button
                            variant={isSolderingMode ? 'default' : 'outline'}
                            className={isSolderingMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                            onClick={() => setIsSolderingMode(!isSolderingMode)}
                        >
                            <Flame className={`w-4 h-4 mr-2 ${isSolderingMode ? 'fill-current' : ''}`}/>
                            {isSolderingMode ? 'Exit Soldering Mode' : 'Enter Soldering Mode'}
                        </Button>

                        {isSolderingMode && (
                            <Button className="ml-auto bg-blue-600 hover:bg-blue-700" onClick={handleSolderingFinish}>
                                <CheckCircle2 className="w-4 h-4 mr-2"/>
                                Finish & Subtract
                            </Button>
                        )}
                    </div>
                </Card>
            </div>

            {/* Main Table */}
            <Card className="flex-1 overflow-hidden border-border bg-card/80 flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                        <thead
                            className="sticky top-0 bg-secondary/90 backdrop-blur-sm z-10 text-xs uppercase font-semibold text-muted-foreground">
                        <tr>
                            <th className="p-3 text-left w-12">#</th>
                            <th className="p-3 text-left">Designator</th>
                            <th className="p-3 text-left">Part Info</th>
                            {!isSolderingMode && <th className="p-3 text-center">Qty/PCB</th>}
                            {!isSolderingMode && <th className="p-3 text-center">Total</th>}
                            <th className="p-3 text-left">Stock Status</th>
                            {isSolderingMode && <th className="p-3 text-center w-24">Placed</th>}
                            {isSolderingMode && <th className="p-3 text-center w-24">Soldered</th>}
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                        {displayItems.map(( item, idx ) => {
                            // Handle expanded vs grouped items
                            // If expanded, item has `uniqueDesignator`
                            const designator = (item as any).uniqueDesignator || item.designator
                            const needed = item.quantity * pcbCount
                            const match = item.matchedInventoryItem
                            const inStock = match ? match.quantity : 0
                            const isMissing = needed > inStock

                            // Soldering status
                            const sStatus = solderingStatus[designator] || {placed: false, soldered: false}

                            return (
                                <tr key={item.id} className="hover:bg-secondary/40 transition-colors group">
                                    <td className="p-3 text-muted-foreground text-xs">{idx + 1}</td>
                                    <td className="p-3 font-mono text-blue-400 font-medium">{designator}</td>
                                    <td className="p-3">
                                        <div className="font-medium text-slate-200">{item.value}</div>
                                        <div className="text-xs text-muted-foreground">{item.footprint}</div>
                                        {item.lcscPartNumber && (
                                            <div
                                                className="text-xs font-mono text-emerald-500 mt-0.5">{item.lcscPartNumber}</div>
                                        )}
                                    </td>
                                    {!isSolderingMode && <td className="p-3 text-center">{item.quantity}</td>}
                                    {!isSolderingMode &&
                                        <td className="p-3 text-center font-bold text-slate-200">{needed}</td>}
                                    <td className="p-3">
                                        {match ? (
                                            <div className="flex flex-col">
                                                <Badge variant="outline"
                                                       className={`${isMissing ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>
                                                    {inStock} in stock
                                                </Badge>
                                                <span
                                                    className="text-xs text-muted-foreground mt-1">Box: {match.box?.name}</span>
                                            </div>
                                        ) : (
                                            <Badge variant="outline"
                                                   className="text-gray-500 border-gray-500/30 bg-gray-500/10">
                                                Not Found
                                            </Badge>
                                        )}
                                    </td>
                                    {isSolderingMode && (
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={sStatus.placed}
                                                onChange={() => toggleSolderingStatus(designator, 'placed')}
                                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-offset-gray-900"
                                            />
                                        </td>
                                    )}
                                    {isSolderingMode && (
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={sStatus.soldered}
                                                onChange={() => toggleSolderingStatus(designator, 'soldered')}
                                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-offset-gray-900"
                                            />
                                        </td>
                                    )}
                                    <td className="p-3 text-right">
                                        {!isSolderingMode && (
                                            <Button size="icon" variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-white">
                                                <Search className="w-4 h-4"/>
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Order Summary */}
                {!isSolderingMode && (
                    <div className="p-4 border-t border-border bg-secondary/20 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div
                                className={`${missingCount > 0 ? 'bg-red-500/10' : 'bg-green-500/10'} p-2 rounded-full`}>
                                <AlertCircle
                                    className={`w-5 h-5 ${missingCount > 0 ? 'text-red-500' : 'text-green-500'}`}/>
                            </div>
                            <div>
                                <div
                                    className={`text-sm font-medium ${missingCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {missingCount > 0 ? `${missingCount} parts missing stock` : 'All parts in stock!'}
                                </div>
                                <div className="text-xs text-muted-foreground">Ready for production</div>
                            </div>
                        </div>
                        {missingCount > 0 && (
                            <Button onClick={handleLcscExport} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <ShoppingCart className="w-4 h-4 mr-2"/>
                                Copy & Export Order
                            </Button>
                        )}
                    </div>
                )}
            </Card>
        </div>
    )
}
