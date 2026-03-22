import React, { useEffect, useState } from 'react'
import readXlsxFile from 'read-excel-file'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    AlertCircle,
    CheckCircle2,
    FileText,
    Flame,
    History,
    Plus,
    Search,
    Settings,
    ShoppingCart,
    Trash2,
    UploadCloud,
    X,
    Zap,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
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

interface SavedBom {
    name: string;
    date: string;
    data: BomItem[];
}

interface SolderingSummaryItem {
    id: number;
    name: string;
    quantity: number;
}

interface OrderItem {
    lcscPartNumber: string;
    quantity: number;
    stock: number;
    needed: number;
    toOrder: number;
}

export default function BomPage() {
    const [bomData, setBomData] = useState<BomItem[] | null>(null)
    const [bomName, setBomName] = useState<string>('Untitled BOM')
    const [pcbCount, setPcbCount] = useState<number>(1)
    const [isSolderingMode, setIsSolderingMode] = useState<boolean>(false)
    const [savedBoms, setSavedBoms] = useState<SavedBom[]>([])
    const [confirmSubtract, setConfirmSubtract] = useState(false)
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(false)

    // Manual Matching State
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [matchingItemId, setMatchingItemId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])

    // Soldering Summary State
    const [isSolderingSummaryOpen, setIsSolderingSummaryOpen] = useState(false)
    const [solderingSummary, setSolderingSummary] = useState<SolderingSummaryItem[]>([])

    // Order Dialog State
    const [isOrderOpen, setIsOrderOpen] = useState(false)
    const [orderList, setOrderList] = useState<OrderItem[]>([])

    // Load state
    useEffect(() => {
        const savedBom = localStorage.getItem('currentBom')
        if (savedBom) {
            try {
                const parsed = JSON.parse(savedBom)
                setBomData(parsed.data)
                setBomName(parsed.name || 'Untitled BOM')
            } catch (e) {
                console.error('Failed to parse saved BOM', e)
            }
        }

        const savedHistory = localStorage.getItem('recentBomsHistory')
        if (savedHistory) {
            try {
                setSavedBoms(JSON.parse(savedHistory))
            } catch (e) {
                console.error(e)
            }
        }

        // Load inventory for matching
        void loadInventory()
    }, [])

    async function loadInventory() {
        try {
            const inv = await api.getInventory()
            setInventory(inv)
            setFilteredInventory(inv)
        } catch (e) {
            console.error('Failed to load inventory', e)
        }
    }

    // Save state
    useEffect(() => {
        if (bomData) {
            localStorage.setItem('currentBom', JSON.stringify({name: bomName, data: bomData}))
        } else {
            localStorage.removeItem('currentBom')
        }
    }, [bomData, bomName])

    const saveToHistory = ( name: string, data: BomItem[] ) => {
        const newItem = {name, date: new Date().toISOString(), data}
        setSavedBoms(prev => {
            const filtered = prev.filter(b => b.name !== name)
            const updated = [newItem, ...filtered].slice(0, 5) // Keep last 5
            localStorage.setItem('recentBomsHistory', JSON.stringify(updated))
            return updated
        })
    }

    const loadFromHistory = ( saved: SavedBom ) => {
        setBomData(saved.data)
        setBomName(saved.name)
        setPcbCount(1)
        setIsSolderingMode(false)
    }

    // Match BOM items with Inventory
    useEffect(() => {
        if (!bomData || !inventory.length) return

        const matchedData = bomData.map(item => {
            if (item.manualMatch && item.matchedInventoryItem) return item

            // 1. Exact Match (LCSC Part Number)
            let match = inventory.find(inv =>
                inv.component.lcsc_part_no &&
                item.lcscPartNumber &&
                inv.component.lcsc_part_no.trim().toLowerCase() === item.lcscPartNumber.trim().toLowerCase(),
            )

            // 2. Name Match (as per spec)
            if (!match) {
                match = inventory.find(inv =>
                    inv.component.name && item.value && inv.component.name.trim().toLowerCase() === item.value.trim().toLowerCase(),
                )
            }

            // 3. Fuzzy Match (Value & Footprint)
            if (!match) {
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
    }, [inventory, bomData])

    // Filter inventory when search query changes
    useEffect(() => {
        if (!searchQuery) {
            setFilteredInventory(inventory)
        } else {
            const q = searchQuery.toLowerCase()
            setFilteredInventory(inventory.filter(i =>
                i.component.name.toLowerCase().includes(q) ||
                (i.component.lcsc_part_no && i.component.lcsc_part_no.toLowerCase().includes(q)) ||
                (i.component.value && i.component.value.toLowerCase().includes(q)) ||
                (i.component.footprint && i.component.footprint.toLowerCase().includes(q)),
            ))
        }
    }, [searchQuery, inventory])


    const parseFile = async ( file: File ) => {
        let items: BomItem[]

        if (file.name.endsWith('.csv')) {
            const text = await file.text()
            const lines = text.split('\n')

            // Basic CSV parsing logic assuming EasyEDA/JLC style BOM
            // We check the first few lines to find headers
            const headerLineIdx = lines.findIndex(l => l.toLowerCase().includes('designator') && l.toLowerCase().includes('quantity'))
            if (headerLineIdx === -1) {
                alert('Could not find header row in CSV. Expected \'Designator\' and \'Quantity\' columns.')
                return
            }

            const headerRow = lines[headerLineIdx].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
            const designatorIdx = headerRow.findIndex(h => h === 'designator')
            const quantityIdx = headerRow.findIndex(h => h === 'quantity')
            const footprintIdx = headerRow.findIndex(h => h === 'footprint')
            const valueIdx = headerRow.findIndex(h => h === 'value' || h === 'comment') // EasyEDA uses 'Comment' for value often
            const lcscIdx = headerRow.findIndex(h => h === 'supplier part' || h.includes('lcsc')) // 'Supplier Part' usually has the LCSC code

            items = lines.slice(headerLineIdx + 1).filter(l => l.trim() !== '').map(( line, idx ) => {
                // Handle CSV split with quotes
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

                // Helper to clean quotes
                const getVal = ( i: number ) => row[i]?.trim().replace(/^"|"$/g, '') || ''

                return {
                    id: `bom-${Date.now()}-${idx}`,
                    quantity: parseInt(getVal(quantityIdx)) || 0,
                    designator: getVal(designatorIdx),
                    footprint: getVal(footprintIdx),
                    value: getVal(valueIdx),
                    lcscPartNumber: getVal(lcscIdx),
                    placed: false,
                    soldered: false,
                }
            })

        } else {
            const rows = await readXlsxFile(file)
            const headerRow = rows[0].map(cell => cell?.toString().toLowerCase() || '')

            const designatorIdx = headerRow.findIndex(h => h.includes('designator'))
            const quantityIdx = headerRow.findIndex(h => h.includes('quantity'))
            const footprintIdx = headerRow.findIndex(h => h.includes('footprint'))
            const valueIdx = headerRow.findIndex(h => h.includes('value') || h.includes('comment'))
            const lcscIdx = headerRow.findIndex(h => h.includes('supplier part') || h.includes('lcsc'))

            items = rows.slice(1).map(( row: any, index: number ) => ({
                id: `bom-${Date.now()}-${index}`,
                designator: row[designatorIdx > -1 ? designatorIdx : 3]?.toString() || '',
                footprint: row[footprintIdx > -1 ? footprintIdx : 4]?.toString() || '',
                quantity: parseInt(row[quantityIdx > -1 ? quantityIdx : 1]?.toString() || '0'),
                value: row[valueIdx > -1 ? valueIdx : 5]?.toString() || '',
                lcscPartNumber: row[lcscIdx > -1 ? lcscIdx : 8]?.toString() || '',
                placed: false,
                soldered: false,
            }))
        }

        // Filter out empty lines
        items = items.filter(i => i.designator && i.quantity > 0)

        setBomData(items)
        setBomName(file.name)
        saveToHistory(file.name, items)
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
        localStorage.removeItem('currentBom')
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

    // Soldering Mode Logic
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

    const prepareSolderingSummary = () => {
        if (!bomData) return

        const summaryMap = new Map<number, SolderingSummaryItem>()

        // Flatten BOM to designators
        bomData.forEach(item => {
            if (!item.matchedInventoryItem) return

            const designators = item.designator.split(/[, ]+/).filter(d => d.trim() !== '')

            designators.forEach(d => {
                const status = solderingStatus[d]
                // If marked as placed or soldered, count it
                if (status?.placed || status?.soldered) {
                    const invId = item.matchedInventoryItem!.id
                    const current = summaryMap.get(invId) || {
                        id: invId,
                        name: item.matchedInventoryItem!.component.name,
                        quantity: 0,
                    }
                    current.quantity += 1
                    summaryMap.set(invId, current)
                }
            })
        })

        const summary = Array.from(summaryMap.values())
        setSolderingSummary(summary)
        setIsSolderingSummaryOpen(true)
    }

    const confirmSolderingSubtract = async () => {
        setLoading(true)
        try {
            const itemsToSubtract = solderingSummary.map(s => ({
                inventory_item_id: s.id,
                quantity: s.quantity,
            }))

            if (itemsToSubtract.length > 0) {
                await api.batchSubtractInventory(itemsToSubtract)
                await loadInventory()
            }

            // Clear status for next PCB
            setSolderingStatus({})
            setIsSolderingSummaryOpen(false)
            alert('Inventory updated and soldering status cleared for next PCB.')

        } catch (e) {
            console.error(e)
            alert('Failed to subtract: ' + String(e))
        } finally {
            setLoading(false)
        }
    }

    // Ordering Workflow
    const prepareOrder = () => {
        if (!bomData) return

        // Find missing parts
        const list: OrderItem[] = []
        bomData.forEach(item => {
            // If item has a match, check stock. If no match, we definitely need it.
            const stock = item.matchedInventoryItem?.quantity || 0
            const needed = item.quantity * pcbCount
            const missing = Math.max(0, needed - stock)

            if (missing > 0 || !item.matchedInventoryItem) {
                // Deduplicate by LCSC part number if possible, or keep separate?
                // Spec says "Order List". LCSC needs combined quantities per part number.

                const partNo = item.lcscPartNumber || item.matchedInventoryItem?.component.lcsc_part_no || item.designator // Fallback

                const existing = list.find(l => l.lcscPartNumber === partNo && partNo !== '')
                if (existing) {
                    existing.needed += needed
                    existing.stock += stock // This might double count stock if multiple bom items map to same inventory?
                                            // Actually, if multiple bom items map to same inventory, they share the stock.
                                            // This logic is a bit complex. 
                                            // Simplified: just list items as they are in BOM, user can manually merge?
                                            // Or better: aggregate by Part Number.
                } else {
                    list.push({
                        lcscPartNumber: partNo,
                        needed: needed,
                        stock: stock,
                        quantity: 1, // Placeholder
                        toOrder: missing,
                    })
                }
            }
        })

        // Fix aggregation for shared stock?
        // If multiple BOM items point to same LCSC Part, the "stock" is the same pool.
        // So Needed = sum(needed_i), Stock = stock_pool. ToOrder = max(0, Needed - Stock).
        // Let's re-calculate cleanly.

        const aggregated = new Map<string, { needed: number, stock: number, lcsc: string }>()

        bomData.forEach(item => {
            const lcsc = item.lcscPartNumber || item.matchedInventoryItem?.component.lcsc_part_no
            if (!lcsc) return // Skip items without LCSC part number for LCSC order (or handle separately?)

            // If we have a match, we know the stock.
            // BEWARE: item.matchedInventoryItem.quantity is the TOTAL stock of that item.
            // If we iterate BOM items, we shouldn't sum up the stock multiple times for the same part.

            const current = aggregated.get(lcsc) || {needed: 0, stock: item.matchedInventoryItem?.quantity || 0, lcsc}
            current.needed += (item.quantity * pcbCount)
            // Update stock just in case (should be same for same LCSC)
            if (item.matchedInventoryItem) current.stock = item.matchedInventoryItem.quantity

            aggregated.set(lcsc, current)
        })

        const finalOrderList: OrderItem[] = []
        aggregated.forEach(val => {
            if (val.needed > val.stock) {
                finalOrderList.push({
                    lcscPartNumber: val.lcsc,
                    needed: val.needed,
                    stock: val.stock,
                    quantity: 0, // unused
                    toOrder: val.needed - val.stock,
                })
            }
        })

        setOrderList(finalOrderList)
        setIsOrderOpen(true)
    }

    const handleLcscExport = async () => {
        if (orderList.length === 0) {
            alert('Order list is empty.')
            return
        }

        const csvContent = 'data:text/csv;charset=utf-8,'
            + 'LCSC Part No,Quantity\n'
            + orderList.map(item => `${item.lcscPartNumber},${item.toOrder}`).join('\n')

        const textForClipboard = orderList.map(item => `${item.lcscPartNumber},${item.toOrder}`).join('\n')

        try {
            await navigator.clipboard.writeText(textForClipboard)
            alert('Order copied to clipboard! Opening LCSC BOM Tool. Paste the data or upload the downloaded CSV.')
        } catch (err) {
            console.error('Failed to copy: ', err)
            alert('Opening LCSC BOM Tool. Please upload the downloaded CSV.')
        }

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', 'lcsc_order.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.open('https://www.lcsc.com/bom.html', '_blank')
        setIsOrderOpen(false)
    }

    // BOM Editing
    const handleDeleteItem = ( itemId: string ) => {
        if (!bomData) return
        setBomData(bomData.filter(i => i.id !== itemId))
    }

    const handleAddItem = () => {
        if (!bomData) return
        const des = prompt('Enter Designator (e.g. R1):')
        if (!des) return

        const newItem: BomItem = {
            id: `manual-${Date.now()}`,
            designator: des,
            footprint: '',
            quantity: 1,
            value: '',
            lcscPartNumber: '',
            placed: false,
            soldered: false,
        }
        setBomData([...bomData, newItem])
    }

    // Manual Matching
    const openMatchDialog = ( itemId: string ) => {
        setMatchingItemId(itemId)
        setSearchQuery('')
        setIsSearchOpen(true)
    }

    const handleMatchSelect = ( invItem: InventoryItem ) => {
        if (!bomData || !matchingItemId) return
        setBomData(bomData.map(item => {
            if (item.id === matchingItemId) {
                return {
                    ...item,
                    matchedInventoryItem: invItem,
                    manualMatch: true,
                    value: item.value || invItem.component.value || '',
                    footprint: item.footprint || invItem.component.footprint || '',
                    lcscPartNumber: item.lcscPartNumber || invItem.component.lcsc_part_no || '',
                }
            }
            return item
        }))
        setIsSearchOpen(false)
        setMatchingItemId(null)
    }

    // --- View Logic ---

    const displayItems = isSolderingMode
        ? bomData?.flatMap(item => {
        const designators = item.designator.split(/[, ]+/).filter(d => d.trim() !== '')
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

                {savedBoms.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                            <History className="w-5 h-5"/> Recent BOMs
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedBoms.map(( saved, idx ) => (
                                <Card key={idx} className="p-4 hover:bg-secondary/20 cursor-pointer transition-colors"
                                      onClick={() => loadFromHistory(saved)}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-medium text-slate-200">{saved.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {new Date(saved.date).toLocaleDateString()} • {saved.data.length} components
                                            </div>
                                        </div>
                                        <FileText className="w-8 h-8 text-muted-foreground/50"/>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
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
                        {bomName}
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
                        <X className="w-4 h-4 mr-2"/>
                        Close BOM
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
                                    void handleQuickSubtract()
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
                            <Button className="ml-auto bg-blue-600 hover:bg-blue-700" onClick={prepareSolderingSummary}>
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
                            const designator = (item as any).uniqueDesignator || item.designator
                            const needed = item.quantity * pcbCount
                            const match = item.matchedInventoryItem
                            const inStock = match ? match.quantity : 0
                            const isMissing = needed > inStock

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
                                                <div
                                                    className="text-sm font-medium text-slate-200">{match.component.name}</div>
                                                <Badge variant="outline"
                                                       className={`${isMissing ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'} mt-1`}>
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
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost"
                                                        onClick={() => openMatchDialog(item.id)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-white">
                                                    <Search className="w-4 h-4"/>
                                                </Button>
                                                <Button size="icon" variant="ghost"
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-400">
                                                    <Trash2 className="w-4 h-4"/>
                                                </Button>
                                            </div>
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
                            <Button size="sm" variant="outline" onClick={handleAddItem}>
                                <Plus className="w-4 h-4 mr-2"/> Add Item
                            </Button>
                            <div className="h-6 w-px bg-border mx-2"/>
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
                            <Button onClick={prepareOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <ShoppingCart className="w-4 h-4 mr-2"/>
                                Review & Order
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {/* Search Dialog */}
            <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Component</DialogTitle>
                        <DialogDescription>Search inventory to manually match this BOM item.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 my-4">
                        <Input
                            placeholder="Search by name, LCSC part #, value..."
                            value={searchQuery}
                            onChange={( e ) => setSearchQuery(e.target.value)}
                        />
                        <div className="h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                            {filteredInventory.map(inv => (
                                <div key={inv.id}
                                     onClick={() => handleMatchSelect(inv)}
                                     className="p-3 hover:bg-secondary cursor-pointer rounded border border-transparent hover:border-border transition-all">
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-sm">{inv.component.name}</div>
                                        <Badge variant="outline">{inv.quantity} in stock</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {inv.component.lcsc_part_no} • {inv.component.value} • {inv.component.footprint}
                                    </div>
                                </div>
                            ))}
                            {filteredInventory.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">No matching items found.</div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSearchOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Soldering Summary Dialog */}
            <Dialog open={isSolderingSummaryOpen} onOpenChange={setIsSolderingSummaryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Soldering Completion</DialogTitle>
                        <DialogDescription>
                            The following parts will be subtracted from inventory based on your 'Placed' or 'Soldered'
                            marks.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4 max-h-64 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary text-xs uppercase">
                            <tr>
                                <th className="p-2 text-left">Part</th>
                                <th className="p-2 text-center">Qty to Subtract</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                            {solderingSummary.map(( item, idx ) => (
                                <tr key={idx}>
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2 text-center">
                                        <Input
                                            type="number"
                                            className="w-20 h-8 text-center mx-auto"
                                            value={item.quantity}
                                            onChange={( e ) => {
                                                const val = parseInt(e.target.value) || 0
                                                setSolderingSummary(prev => prev.map(( p, i ) => i === idx ? {
                                                    ...p,
                                                    quantity: val,
                                                } : p))
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {solderingSummary.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="p-4 text-center text-muted-foreground">No parts marked
                                        for subtraction.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSolderingSummaryOpen(false)}>Cancel</Button>
                        <Button onClick={() => { void confirmSolderingSubtract() }} disabled={loading}>
                            {loading ? 'Processing...' : 'Confirm & Update Stock'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order Review Dialog */}
            <Dialog open={isOrderOpen} onOpenChange={setIsOrderOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Review Order</DialogTitle>
                        <DialogDescription>
                            Review the items to be ordered. Quantities calculated based on {pcbCount} PCBs.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="my-4 max-h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary text-xs uppercase sticky top-0">
                            <tr>
                                <th className="p-2 text-left">LCSC Part #</th>
                                <th className="p-2 text-center">Needed</th>
                                <th className="p-2 text-center">In Stock</th>
                                <th className="p-2 text-center">To Order</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                            {orderList.map(( item, idx ) => (
                                <tr key={idx}>
                                    <td className="p-2 font-mono text-blue-400">{item.lcscPartNumber}</td>
                                    <td className="p-2 text-center">{item.needed}</td>
                                    <td className="p-2 text-center text-muted-foreground">{item.stock}</td>
                                    <td className="p-2 text-center">
                                        <Input
                                            type="number"
                                            className="w-20 h-8 text-center mx-auto"
                                            value={item.toOrder}
                                            onChange={( e ) => {
                                                const val = parseInt(e.target.value) || 0
                                                setOrderList(prev => prev.map(( p, i ) => i === idx ? {
                                                    ...p,
                                                    toOrder: val,
                                                } : p))
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsOrderOpen(false)}>Cancel</Button>
                        <Button onClick={() => { void handleLcscExport() }}
                                className="bg-blue-600 hover:bg-blue-700 text-white">
                            <ShoppingCart className="w-4 h-4 mr-2"/>
                            Order on LCSC
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}