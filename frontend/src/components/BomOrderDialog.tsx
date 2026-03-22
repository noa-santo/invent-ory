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
import { Button } from '@/components/ui/button'
import { ShoppingCart } from 'lucide-react'
import { OrderItem } from '@/types/bom'

interface BomOrderDialogProps {
    open: boolean;
    onOpenChange: ( open: boolean ) => void;
    pcbCount: number;
    orderList: OrderItem[];
    setOrderList: React.Dispatch<React.SetStateAction<OrderItem[]>>;
    handleLcscExport: () => void;
}

export const BomOrderDialog: React.FC<BomOrderDialogProps> = ( {
                                                                   open,
                                                                   onOpenChange,
                                                                   pcbCount,
                                                                   orderList,
                                                                   setOrderList,
                                                                   handleLcscExport,
                                                               } ) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
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
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => { void handleLcscExport() }}
                            className="bg-blue-600 hover:bg-blue-700 text-white">
                        <ShoppingCart className="w-4 h-4 mr-2"/>
                        Order on LCSC
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
