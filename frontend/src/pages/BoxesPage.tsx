import { type SubmitEvent, useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../services/api'
import type { Box, InventoryItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Loader2, Package, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLocation, useNavigate } from 'react-router-dom'

interface BoxWithCount {
    box: Box;
    count: number;
}

export default function BoxesPage() {
    const location = useLocation()
    const navigate = useNavigate()

    const [boxes, setBoxes] = useState<Box[]>([])
    const [itemsByBox, setItemsByBox] = useState<Map<number, InventoryItem[]>>(new Map())
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create/Edit box form
    const [showForm, setShowForm] = useState(false)
    const [editingBox, setEditingBox] = useState<Box | null>(null)
    const [boxName, setBoxName] = useState('')
    const [boxDesc, setBoxDesc] = useState('')
    const [formLoading, setFormLoading] = useState(false)

    // Delete box confirmation
    const [deletingBox, setDeletingBox] = useState<BoxWithCount | null>(null)
    const [moveToBoxId, setMoveToBoxId] = useState<string>('')
    const [deleteWithItems, setDeleteWithItems] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Drag and drop
    const [dragging, setDragging] = useState<{ itemId: number; fromBoxId: number } | null>(null)
    const [dragOverBoxId, setDragOverBoxId] = useState<number | null>(null)

    // Highlight / flash
    const [flashingBoxId, setFlashingBoxId] = useState<number | null>(null)
    const [flashingItemId, setFlashingItemId] = useState<number | null>(null)
    const boardRef = useRef<HTMLDivElement | null>(null)
    const boxRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const listRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const highlightTriggeredRef = useRef(false)

    function isOffscreen(
        el: HTMLElement,
        container: HTMLElement | null,
        axis: 'horizontal' | 'vertical' | 'both' = 'both',
    ) {
        const rect = el.getBoundingClientRect()

        if (!container) {
            const offscreenX = rect.left < 0 || rect.right > window.innerWidth
            const offscreenY = rect.top < 0 || rect.bottom > window.innerHeight
            if (axis === 'horizontal') return offscreenX
            if (axis === 'vertical') return offscreenY
            return offscreenX || offscreenY
        }

        const containerRect = container.getBoundingClientRect()
        const offscreenX = rect.left < containerRect.left || rect.right > containerRect.right
        const offscreenY = rect.top < containerRect.top || rect.bottom > containerRect.bottom
        if (axis === 'horizontal') return offscreenX
        if (axis === 'vertical') return offscreenY
        return offscreenX || offscreenY
    }

    const loadData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [bxs, inv] = await Promise.all([api.getBoxes(), api.getInventory()])
            const itemMap = new Map<number, InventoryItem[]>()
            for (const box of bxs) {
                itemMap.set(box.id, [])
            }
            for (const item of inv) {
                const arr = itemMap.get(item.box_id) ?? []
                arr.push(item)
                itemMap.set(item.box_id, arr)
            }
            setBoxes(bxs)
            setItemsByBox(itemMap)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load boxes.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData().then()
    }, [loadData])

    // Handle highlight from navigation state
    const highlightBoxId = (location.state as {
        highlightBoxId?: number;
        highlightItemId?: number
    } | null)?.highlightBoxId
    const highlightItemId = (location.state as {
        highlightBoxId?: number;
        highlightItemId?: number
    } | null)?.highlightItemId

    useEffect(() => {
        if (!highlightBoxId || loading || highlightTriggeredRef.current) return

        const boxEl = boxRefs.current.get(highlightBoxId)
        if (boxEl) {
            highlightTriggeredRef.current = true

            if (isOffscreen(boxEl, boardRef.current, 'horizontal')) {
                boxEl.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'})
            }

            if (highlightItemId) {
                const itemEl = itemRefs.current.get(highlightItemId)
                const listEl = listRefs.current.get(highlightBoxId)
                if (itemEl && isOffscreen(itemEl, listEl ?? null, 'vertical')) {
                    itemEl.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'nearest'})
                }
            }

            setFlashingBoxId(highlightBoxId)
            setFlashingItemId(highlightItemId ?? null)

            const timer = setTimeout(() => {
                setFlashingBoxId(null)
                setFlashingItemId(null)
                highlightTriggeredRef.current = false
                navigate('/boxes', {replace: true, state: null})
            }, 2200)

            return () => {
                clearTimeout(timer)
                highlightTriggeredRef.current = false
            }
        }
    }, [loading, highlightBoxId, highlightItemId, navigate])

    function openCreateForm() {
        setEditingBox(null)
        setBoxName('')
        setBoxDesc('')
        setShowForm(true)
    }

    function openEditForm( box: Box ) {
        setEditingBox(box)
        setBoxName(box.name)
        setBoxDesc(box.description || '')
        setShowForm(true)
    }

    async function handleSaveBox( e: SubmitEvent ) {
        e.preventDefault()
        if (!boxName.trim()) return
        setFormLoading(true)
        try {
            if (editingBox) {
                const updated = await api.updateBox(editingBox.id, {
                    name: boxName.trim(),
                    description: boxDesc.trim(),
                })
                setBoxes(prev => prev.map(b => b.id === updated.id ? updated : b))
            } else {
                const created = await api.createBox({name: boxName.trim(), description: boxDesc.trim()})
                setBoxes(prev => [...prev, created])
                setItemsByBox(prev => new Map(prev).set(created.id, []))
            }
            setBoxName('')
            setBoxDesc('')
            setShowForm(false)
            setEditingBox(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save box.')
        } finally {
            setFormLoading(false)
        }
    }

    function handleDeleteClick( box: Box ) {
        const count = itemsByBox.get(box.id)?.length ?? 0
        setDeletingBox({box, count})
        setDeleteWithItems(false)
        if (count > 0) {
            const otherBox = boxes.find(b => b.id !== box.id)
            if (otherBox) setMoveToBoxId(String(otherBox.id))
        }
    }

    async function handleDeleteConfirm() {
        if (!deletingBox) return
        setDeleteLoading(true)
        setError(null)
        try {
            if (deletingBox.count > 0 && moveToBoxId) {
                await api.moveBoxContents(deletingBox.box.id, Number(moveToBoxId))
            }
            await api.deleteBox(deletingBox.box.id, {deleteItems: deleteWithItems})
            setBoxes(prev => prev.filter(b => b.id !== deletingBox.box.id))
            setItemsByBox(prev => {
                const next = new Map(prev)
                if (moveToBoxId) {
                    const moved = next.get(deletingBox.box.id) ?? []
                    const targetId = Number(moveToBoxId)
                    const targetItems = next.get(targetId) ?? []
                    next.set(targetId, [...targetItems, ...moved.map(i => ({...i, box_id: targetId}))])
                }
                next.delete(deletingBox.box.id)
                return next
            })
            setDeletingBox(null)
            setMoveToBoxId('')
            setDeleteWithItems(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete box.')
        } finally {
            setDeleteLoading(false)
        }
    }

    // ── Drag and drop ──────────────────────────────────────────────────────────

    function handleItemDragStart( e: React.DragEvent, item: InventoryItem ) {
        setDragging({itemId: item.id, fromBoxId: item.box_id})
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(item.id))
    }

    function handleItemDragEnd() {
        setDragging(null)
        setDragOverBoxId(null)
    }

    function handleBoxDragOver( e: React.DragEvent, boxId: number ) {
        if (!dragging || dragging.fromBoxId === boxId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverBoxId(boxId)
    }

    function handleBoxDragLeave( e: React.DragEvent ) {
        // Only clear if leaving the box element itself (not a child)
        const related = e.relatedTarget as Element | null
        if (related && e.currentTarget.contains(related)) return
        setDragOverBoxId(null)
    }

    async function handleBoxDrop( e: React.DragEvent, targetBoxId: number ) {
        e.preventDefault()
        setDragOverBoxId(null)
        if (!dragging || dragging.fromBoxId === targetBoxId) return

        const {itemId, fromBoxId} = dragging
        setDragging(null)

        // Optimistic update
        setItemsByBox(prev => {
            const next = new Map(prev)
            const fromItems = (next.get(fromBoxId) ?? []).filter(i => i.id !== itemId)
            const item = (prev.get(fromBoxId) ?? []).find(i => i.id === itemId)
            if (!item) return prev
            const toItems = [...(next.get(targetBoxId) ?? []), {...item, box_id: targetBoxId}]
            next.set(fromBoxId, fromItems)
            next.set(targetBoxId, toItems)
            return next
        })

        try {
            await api.updateInventoryItem(itemId, {box_id: targetBoxId})
        } catch {
            // Revert on failure
            await loadData()
        }
    }

    // ── Delete modal content ───────────────────────────────────────────────────

    function renderDeleteModalContent() {
        if (!deletingBox || deletingBox.count === 0) return null

        const otherBoxes = boxes.filter(b => b.id !== deletingBox.box.id)
        if (otherBoxes.length > 0) {
            return (
                <div className="space-y-2 pt-4">
                    <p className="text-sm text-amber-300">
                        This box contains {deletingBox.count} item(s). Please select a new box to move them to.
                    </p>
                    <Select value={moveToBoxId} onValueChange={setMoveToBoxId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a box…"/>
                        </SelectTrigger>
                        <SelectContent>
                            {otherBoxes.map(b => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )
        }

        return (
            <div className="space-y-3 pt-4">
                <p className="text-sm text-amber-300">
                    This box contains {deletingBox.count} item(s), but there are no other boxes to move them to.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={deleteWithItems}
                        onChange={e => setDeleteWithItems(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Also delete items</span>
                </label>
            </div>
        )
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-100">Boxes</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                    </p>
                </div>
                <div className="flex gap-2 self-start">
                    <Button type="button" variant="secondary" onClick={loadData}>
                        <RefreshCw className="h-4 w-4"/>
                        Refresh
                    </Button>
                    <Button type="button" onClick={openCreateForm}>
                        <Plus className="h-4 w-4"/>
                        Create Box
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-900/40 text-red-300 border border-red-700 flex-shrink-0">
                    <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                    {error}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={showForm} onOpenChange={open => {
                if (!open) {
                    setShowForm(false)
                    setEditingBox(null)
                    setBoxName('')
                    setBoxDesc('')
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBox ? 'Edit Box' : 'New Box'}</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <form onSubmit={handleSaveBox} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="box-name">Name <span className="text-red-400">*</span></Label>
                                <Input
                                    id="box-name"
                                    type="text"
                                    value={boxName}
                                    onChange={e => setBoxName(e.target.value)}
                                    placeholder="e.g. Resistors 0402"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="box-desc">Description</Label>
                                <Textarea
                                    id="box-desc"
                                    value={boxDesc}
                                    onChange={e => setBoxDesc(e.target.value)}
                                    placeholder="Optional description…"
                                    rows={3}
                                    className="resize-none"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={formLoading || !boxName.trim()}>
                                    {formLoading ? 'Saving…' : editingBox ? 'Update Box' : 'Create Box'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deletingBox} onOpenChange={open => { if (!open) setDeletingBox(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Box</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the box "{deletingBox?.box.name}"? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-6">
                        {renderDeleteModalContent()}
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setDeletingBox(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteLoading || ((deletingBox?.count ?? 0) > 0 && !moveToBoxId && !deleteWithItems)}
                        >
                            {deleteLoading ? 'Deleting…' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Boxes board */}
            {loading ? (
                <Card className="p-10 flex items-center justify-center gap-3 text-muted-foreground flex-shrink-0">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    Loading boxes…
                </Card>
            ) : boxes.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground flex-shrink-0">
                    No boxes yet. Create one to start organising your components.
                </Card>
            ) : (
                <div
                    ref={boardRef}
                    className="overflow-x-auto overflow-y-visible flex-1 min-h-0 -mx-4 md:-mx-6 px-4 md:px-6 pt-1 pb-2">
                    <div className="flex gap-4 h-full min-h-0 pb-4" style={{minWidth: 'max-content'}}>
                        {boxes.map(box => {
                            const items = itemsByBox.get(box.id) ?? []
                            const isFlashing = flashingBoxId === box.id

                            return (
                                <div
                                    key={box.id}
                                    ref={el => {
                                        if (el) boxRefs.current.set(box.id, el)
                                        else boxRefs.current.delete(box.id)
                                    }}
                                    className={[
                                        'w-72 h-full max-h-[600px] flex flex-col rounded-lg border bg-card transition-colors duration-150',
                                        dragOverBoxId === box.id
                                            ? 'border-primary/70 bg-primary/5'
                                            : 'border-border',
                                        isFlashing ? 'animate-flash-outline' : '',
                                    ].join(' ')}
                                    onDragOver={e => handleBoxDragOver(e, box.id)}
                                    onDragLeave={handleBoxDragLeave}
                                    onDrop={e => handleBoxDrop(e, box.id)}
                                >
                                    {/* Box header */}
                                    <div className="p-4 flex-shrink-0 border-b border-border">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/20 text-blue-400 flex-shrink-0">
                                                    <Package className="h-4 w-4"/>
                                                </div>
                                                <h3 className="font-semibold text-slate-100 truncate">{box.name}</h3>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-600"
                                                    onClick={() => openEditForm(box)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5"/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-slate-600"
                                                    onClick={() => handleDeleteClick(box)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5"/>
                                                </Button>
                                            </div>
                                        </div>
                                        {box.description && (
                                            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{box.description}</p>
                                        )}
                                        <div className="mt-2">
                                            <Badge className="text-xs">
                                                {items.length} {items.length === 1 ? 'item' : 'items'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Items list */}
                                    <div
                                        ref={el => {
                                            if (el) listRefs.current.set(box.id, el)
                                            else listRefs.current.delete(box.id)
                                        }}
                                        className="flex-1 min-h-0 overflow-y-auto pb-1"
                                    >
                                        {items.length === 0 ? (
                                            <div className={[
                                                'h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center transition-colors',
                                                dragOverBoxId === box.id ? 'text-primary' : '',
                                            ].join(' ')}>
                                                {dragOverBoxId === box.id ? 'Drop here' : 'Empty box'}
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-border/50 pb-1">
                                                {items.map(item => {
                                                    const isItemFlashing = flashingItemId === item.id
                                                    const isDraggingThis = dragging?.itemId === item.id
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            ref={el => {
                                                                if (el) itemRefs.current.set(item.id, el)
                                                                else itemRefs.current.delete(item.id)
                                                            }}
                                                            draggable
                                                            onDragStart={e => handleItemDragStart(e, item)}
                                                            onDragEnd={handleItemDragEnd}
                                                            className={[
                                                                'px-3 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors',
                                                                isDraggingThis ? 'opacity-40' : 'hover:bg-secondary/40',
                                                                isItemFlashing ? 'animate-flash-row' : '',
                                                            ].join(' ')}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-mono text-blue-400 truncate">
                                                                        {item.component?.lcsc_part_no ?? '—'}
                                                                    </p>
                                                                    <p className="text-sm text-slate-200 truncate mt-0.5">
                                                                        {item.component?.name ?? 'Unknown'}
                                                                    </p>
                                                                    {item.component?.value && (
                                                                        <p className="text-xs text-slate-400 truncate">
                                                                            {item.component.value}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className="text-xs font-medium text-slate-300 flex-shrink-0 bg-secondary/60 px-1.5 py-0.5 rounded">
                                                                    ×{item.quantity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}