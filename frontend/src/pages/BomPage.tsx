import React, { useEffect, useState } from 'react'
import readXlsxFile from 'read-excel-file'
import { Card } from '@/components/ui/card'
import * as api from '../services/api'
import { InventoryItem } from '@/types'
import { BomItem, OrderItem, SavedBom, SolderingSummaryItem } from '@/types/bom'
import { BomHeader } from '@/components/BomHeader'
import { BomControlPanel } from '@/components/BomControlPanel'
import { BomTable } from '@/components/BomTable'
import { BomEmptyState } from '@/components/BomEmptyState'
import { BomFooter } from '@/components/BomFooter'
import { BomSearchDialog } from '@/components/BomSearchDialog'
import { BomSolderingSummaryDialog } from '@/components/BomSolderingSummaryDialog'
import { BomOrderDialog } from '@/components/BomOrderDialog'
import { useToast } from '@/components/ui/use-toast'

export default function BomPage() {
    const {toast} = useToast()
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
                toast({
                    title: 'CSV Error',
                    description: 'Could not find header row in CSV. Expected \'Designator\' and \'Quantity\' columns.',
                    variant: 'destructive',
                })
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
            toast({
                title: 'Upload Failed',
                description: 'Failed to read BOM file.',
                variant: 'destructive',
            })
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
                toast({
                    title: 'No Items',
                    description: 'No matched items to subtract.',
                    variant: 'destructive',
                })
                return
            }

            await api.batchSubtractInventory(itemsToSubtract)
            await loadInventory() // Refresh stock
            toast({
                title: 'Success',
                description: 'Inventory updated successfully.',
            })
            setConfirmSubtract(false)
        } catch (e) {
            console.error(e)
            toast({
                title: 'Error',
                description: 'Failed to subtract inventory: ' + (e instanceof Error ? e.message : String(e)),
                variant: 'destructive',
            })
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
            toast({
                title: 'Success',
                description: 'Inventory updated and soldering status cleared for next PCB.',
            })

        } catch (e) {
            console.error(e)
            toast({
                title: 'Error',
                description: 'Failed to subtract: ' + String(e),
                variant: 'destructive',
            })
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
            toast({
                title: 'Order Empty',
                description: 'Order list is empty.',
                variant: 'destructive',
            })
            return
        }

        const csvContent = 'data:text/csv;charset=utf-8,'
            + 'LCSC Part No,Quantity\n'
            + orderList.map(item => `${item.lcscPartNumber},${item.toOrder}`).join('\n')

        const textForClipboard = orderList.map(item => `${item.lcscPartNumber},${item.toOrder}`).join('\n')

        try {
            await navigator.clipboard.writeText(textForClipboard)
            toast({
                title: 'Copied!',
                description: 'Order copied to clipboard! Opening LCSC BOM Tool. Paste the data or upload the downloaded CSV.',
            })
        } catch (err) {
            console.error('Failed to copy: ', err)
            toast({
                title: 'Copy Failed',
                description: 'Opening LCSC BOM Tool. Please upload the downloaded CSV.',
            })
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
            <BomEmptyState
                onFileUpload={handleFileUpload}
                savedBoms={savedBoms}
                onLoadFromHistory={loadFromHistory}
            />
        )
    }

    const totalPartsNeeded = bomData.reduce(( acc, item ) => acc + (item.quantity * pcbCount), 0)
    const uniqueParts = bomData.length
    const missingCount = bomData.filter(item => (item.matchedInventoryItem?.quantity || 0) < (item.quantity * pcbCount)).length

    return (
        <div className="space-y-5 p-1 h-full flex flex-col">
            <BomHeader
                bomName={bomName}
                isSolderingMode={isSolderingMode}
                uniqueParts={uniqueParts}
                totalPartsNeeded={totalPartsNeeded}
                onClearBom={handleClearBom}
            />

            <BomControlPanel
                pcbCount={pcbCount}
                setPcbCount={setPcbCount}
                calculateMaxPossible={calculateMaxPossible}
                loading={loading}
                confirmSubtract={confirmSubtract}
                setConfirmSubtract={setConfirmSubtract}
                handleQuickSubtract={handleQuickSubtract}
                isSolderingMode={isSolderingMode}
                setIsSolderingMode={setIsSolderingMode}
                prepareSolderingSummary={prepareSolderingSummary}
            />

            <Card className="flex-1 overflow-hidden border-border bg-card/80 flex flex-col">
                <BomTable
                    items={displayItems}
                    pcbCount={pcbCount}
                    isSolderingMode={isSolderingMode}
                    solderingStatus={solderingStatus}
                    onToggleSolderingStatus={toggleSolderingStatus}
                    onOpenMatchDialog={openMatchDialog}
                    onDeleteItem={handleDeleteItem}
                />

                <BomFooter
                    isSolderingMode={isSolderingMode}
                    missingCount={missingCount}
                    onAddItem={handleAddItem}
                    onPrepareOrder={prepareOrder}
                />
            </Card>

            <BomSearchDialog
                open={isSearchOpen}
                onOpenChange={setIsSearchOpen}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                filteredInventory={filteredInventory}
                onMatchSelect={handleMatchSelect}
            />

            <BomSolderingSummaryDialog
                open={isSolderingSummaryOpen}
                onOpenChange={setIsSolderingSummaryOpen}
                solderingSummary={solderingSummary}
                setSolderingSummary={setSolderingSummary}
                loading={loading}
                confirmSolderingSubtract={confirmSolderingSubtract}
            />

            <BomOrderDialog
                open={isOrderOpen}
                onOpenChange={setIsOrderOpen}
                pcbCount={pcbCount}
                orderList={orderList}
                setOrderList={setOrderList}
                handleLcscExport={handleLcscExport}
            />
        </div>
    )
}
