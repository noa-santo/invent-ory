import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SolderingSummaryItem } from '@/types/bom'

interface BomSolderingSummaryDialogProps {
    open: boolean;
    onOpenChange: ( open: boolean ) => void;
    solderingSummary: SolderingSummaryItem[];
    setSolderingSummary: React.Dispatch<React.SetStateAction<SolderingSummaryItem[]>>;
    loading: boolean;
    confirmSolderingSubtract: () => void;
}

export const BomSolderingSummaryDialog: React.FC<BomSolderingSummaryDialogProps> = ( {
                                                                                         open,
                                                                                         onOpenChange,
                                                                                         solderingSummary,
                                                                                         setSolderingSummary,
                                                                                         loading,
                                                                                         confirmSolderingSubtract,
                                                                                     } ) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => { void confirmSolderingSubtract() }} disabled={loading}>
                        {loading ? 'Processing...' : 'Confirm & Update Stock'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
