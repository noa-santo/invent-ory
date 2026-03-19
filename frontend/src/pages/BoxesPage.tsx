import * as React from 'react'
import { useEffect, useState } from 'react'
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

    // Box detail view
    const [selectedBox, setSelectedBox] = useState<Box | null>(null)
    const [boxContents, setBoxContents] = useState<InventoryItem[]>([])
    const [contentsLoading, setContentsLoading] = useState(false)

    async function loadBoxes() {
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
    }

    useEffect(() => {
        loadBoxes().then()
    }, [])

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

    async function handleSaveBox( e: React.SubmitEvent ) {
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
                    <form onSubmit={handleSaveBox} className="space-4">
                        <div className="space-y-1.5 p-4">
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
                        <div className="space-y-1.5 px-4">
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
                    {boxes.map(( {box, count} ) => (
                        <BoxCard
                            key={box.id}
                            box={box}
                            itemCount={count}
                            onClick={() => handleBoxClick(box)}
                            onEdit={() => openEditForm(box)}
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
                                            {item.component.lcsc_part_no}
                                        </td>
                                        <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                                            {item.component.name}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                                            {item.component.value}
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
