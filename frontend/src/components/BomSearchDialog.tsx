import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InventoryItem } from '@/types'

interface BomSearchDialogProps {
    open: boolean;
    onOpenChange: ( open: boolean ) => void;
    searchQuery: string;
    onSearchQueryChange: ( query: string ) => void;
    filteredInventory: InventoryItem[];
    onMatchSelect: ( invItem: InventoryItem ) => void;
}

export const BomSearchDialog: React.FC<BomSearchDialogProps> = ( {
                                                                     open,
                                                                     onOpenChange,
                                                                     searchQuery,
                                                                     onSearchQueryChange,
                                                                     filteredInventory,
                                                                     onMatchSelect,
                                                                 } ) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Component</DialogTitle>
                    <DialogDescription>Search inventory to manually match this BOM item.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4">
                    <Input
                        placeholder="Search by name, LCSC part #, value..."
                        value={searchQuery}
                        onChange={( e ) => onSearchQueryChange(e.target.value)}
                    />
                    <div className="h-64 overflow-y-auto border rounded-md p-2 space-y-2">
                        {filteredInventory.map(inv => (
                            <div key={inv.id}
                                 onClick={() => onMatchSelect(inv)}
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
