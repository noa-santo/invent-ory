import type { SubmitEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import BoxCard from '../components/BoxCard'
import * as api from '../services/api'
import type { Box, InventoryItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BoxWithCount {
    box: Box;
    count: number;
}

export default function BoxesPage() {
    const [boxes, setBoxes] = useState<BoxWithCount[]>([])
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

    // Box detail view
    const [selectedBox, setSelectedBox] = useState<Box | null>(null)
    const [boxContents, setBoxContents] = useState<InventoryItem[]>([])
    const [contentsLoading, setContentsLoading] = useState(false)

    const loadBoxes = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [bxs, inv] = await Promise.all([api.getBoxes(), api.getInventory()])
            const countMap = new Map<number, number>()
            for (const item of inv) {
                countMap.set(item.box_id, (countMap.get(item.box_id) ?? 0) + 1)
            }
            setBoxes(bxs.map(( box ) => ({box, count: countMap.get(box.id) ?? 0})))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load boxes.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadBoxes().then()
    }, [loadBoxes])

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
                setBoxes(prev => prev.map(b => b.box.id === updated.id ? {...b, box: updated} : b))
            } else {
                const created = await api.createBox({name: boxName.trim(), description: boxDesc.trim()})
                setBoxes(( prev ) => [...prev, {box: created, count: 0}])
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

    async function handleBoxClick( box: Box ) {
        setSelectedBox(box)
        setContentsLoading(true)
        try {
            const contents = await api.getBoxContents(box.id)
            setBoxContents(contents)
        } catch {
            setBoxContents([])
        } finally {
            setContentsLoading(false)
        }
    }

    function handleDeleteClick( boxWithCount: BoxWithCount ) {
        setDeletingBox(boxWithCount)
        setDeleteWithItems(false)
        if (boxWithCount.count > 0) {
            const otherBox = boxes.find(b => b.box.id !== boxWithCount.box.id)
            if (otherBox) setMoveToBoxId(String(otherBox.box.id))
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
            // Clear the selected box if it was deleted
            if (selectedBox?.id === deletingBox.box.id) {
                setSelectedBox(null)
                setBoxContents([])
            }
            setDeletingBox(null)
            setMoveToBoxId('')
            setDeleteWithItems(false)
            // Reload the boxes list to refresh the UI
            await loadBoxes()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete box.')
        } finally {
            setDeleteLoading(false)
        }
    }

    function renderDeleteModalContent() {
        if (!deletingBox || deletingBox.count === 0) return null

        const otherBoxes = boxes.filter(b => b.box.id !== deletingBox.box.id)
        if (otherBoxes.length > 0) {
            return (
                <div className="space-y-2">
                    <p className="text-sm text-amber-300">
                        This box contains {deletingBox.count} item(s). Please select a new box to move them
                        to.
                    </p>
                    <Select value={moveToBoxId} onValueChange={setMoveToBoxId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a box..."/>
                        </SelectTrigger>
                        <SelectContent>
                            {otherBoxes.map(b => (
                                <SelectItem key={b.box.id} value={String(b.box.id)}>
                                    {b.box.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )
        }

        return (
            <div className="space-y-3">
                <p className="text-sm text-amber-300">
                    This box contains {deletingBox.count} item(s), but there are no other boxes to move them to.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={deleteWithItems}
                        onChange={( e ) => setDeleteWithItems(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Also delete items</span>
                </label>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-100">Boxes</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {boxes.length} box{boxes.length !== 1 ? 'es' : ''}
                    </p>
                </div>
                <div className="flex gap-2 self-start">
                    <Button type="button" variant="secondary" onClick={loadBoxes}>
                        <RefreshCw className="h-4 w-4"/>
                        Refresh
                    </Button>
                    <Button
                        type="button"
                        onClick={openCreateForm}
                    >
                        <Plus className="h-4 w-4"/>
                        Create Box
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-900/40 text-red-300 border border-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0"/>
                    {error}
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog
                open={showForm}
                onOpenChange={( open ) => {
                    if (!open) {
                        setShowForm(false)
                        setEditingBox(null)
                        setBoxName('')
                        setBoxDesc('')
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBox ? 'Edit Box' : 'New Box'}</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <form onSubmit={handleSaveBox} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="box-name">
                                    Name <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    id="box-name"
                                    type="text"
                                    value={boxName}
                                    onChange={( e ) => setBoxName(e.target.value)}
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
                                    onChange={( e ) => setBoxDesc(e.target.value)}
                                    placeholder="Optional description…"
                                    rows={3}
                                    className="resize-none"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={formLoading || !boxName.trim()}>
                                    {formLoading ? 'Saving…' : (editingBox ? 'Update Box' : 'Create Box')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={!!deletingBox}
                onOpenChange={( open ) => {
                    if (!open) setDeletingBox(null)
                }}
            >
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

            {/* Boxes grid */}
            {loading ? (
                <Card className="p-10 flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    Loading boxes…
                </Card>
            ) : boxes.length === 0 ? (
                <Card className="p-10 text-center text-muted-foreground">
                    No boxes yet. Create one to start organising your components.
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {boxes.map(( boxWithCount ) => (
                        <BoxCard
                            key={boxWithCount.box.id}
                            box={boxWithCount.box}
                            itemCount={boxWithCount.count}
                            onClick={() => handleBoxClick(boxWithCount.box)}
                            onEdit={() => openEditForm(boxWithCount.box)}
                            onDelete={() => handleDeleteClick(boxWithCount)}
                        />
                    ))}
                </div>
            )}

            {/* Box detail dialog */}
            <Dialog
                open={!!selectedBox}
                onOpenChange={( open ) => {
                    if (!open) {
                        setSelectedBox(null)
                        setBoxContents([])
                    }
                }}
            >
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader>
                        <DialogTitle>{selectedBox?.name}</DialogTitle>
                        {selectedBox?.description && (
                            <DialogDescription>{selectedBox.description}</DialogDescription>
                        )}
                    </DialogHeader>

                    {/* Contents */}
                    <div className="flex-1 overflow-y-auto">
                        {contentsLoading ? (
                            <div className="flex items-center justify-center gap-3 p-10 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin"/>
                                Loading contents…
                            </div>
                        ) : boxContents.length === 0 ? (
                            <div className="p-10 text-center text-muted-foreground">This box is empty.</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                <tr className="border-b border-border bg-card/60">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Part
                                        No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                {boxContents.map(( item ) => (
                                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
                                        <td className="px-4 py-3 font-mono text-blue-400 whitespace-nowrap">
                                            {item.component?.lcsc_part_no ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                                            {item.component?.name ?? 'Unknown component'}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                            {item.component?.value ?? ''}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-slate-200">
                                            {item.quantity}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}