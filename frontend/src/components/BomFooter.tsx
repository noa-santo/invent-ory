import React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, Plus, ShoppingCart } from 'lucide-react'

interface BomFooterProps {
    isSolderingMode: boolean;
    missingCount: number;
    onAddItem: () => void;
    onPrepareOrder: () => void;
}

export const BomFooter: React.FC<BomFooterProps> = ( {
                                                         isSolderingMode,
                                                         missingCount,
                                                         onAddItem,
                                                         onPrepareOrder,
                                                     } ) => {
    if (isSolderingMode) return null

    return (
        <div className="p-4 border-t border-border bg-secondary/20 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={onAddItem}>
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
                <Button onClick={onPrepareOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ShoppingCart className="w-4 h-4 mr-2"/>
                    Review & Order
                </Button>
            )}
        </div>
    )
}
