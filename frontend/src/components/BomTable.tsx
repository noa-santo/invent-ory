import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Trash2 } from 'lucide-react'
import { BomItem } from '@/types/bom'

interface BomTableProps {
    items: BomItem[];
    pcbCount: number;
    isSolderingMode: boolean;
    solderingStatus: Record<string, { placed: boolean, soldered: boolean }>;
    onToggleSolderingStatus: ( designator: string, field: 'placed' | 'soldered' ) => void;
    onOpenMatchDialog: ( itemId: string ) => void;
    onDeleteItem: ( itemId: string ) => void;
}

export const BomTable: React.FC<BomTableProps> = ( {
                                                       items,
                                                       pcbCount,
                                                       isSolderingMode,
                                                       solderingStatus,
                                                       onToggleSolderingStatus,
                                                       onOpenMatchDialog,
                                                       onDeleteItem,
                                                   } ) => {
    return (
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
                {items.map(( item, idx ) => {
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
                                        <div className="text-sm font-medium text-slate-200">{match.component.name}</div>
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
                                        onChange={() => onToggleSolderingStatus(designator, 'placed')}
                                        className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-offset-gray-900"
                                    />
                                </td>
                            )}
                            {isSolderingMode && (
                                <td className="p-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={sStatus.soldered}
                                        onChange={() => onToggleSolderingStatus(designator, 'soldered')}
                                        className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-offset-gray-900"
                                    />
                                </td>
                            )}
                            <td className="p-3 text-right">
                                {!isSolderingMode && (
                                    <div className="flex justify-end gap-2">
                                        <Button size="icon" variant="ghost"
                                                onClick={() => onOpenMatchDialog(item.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-white">
                                            <Search className="w-4 h-4"/>
                                        </Button>
                                        <Button size="icon" variant="ghost"
                                                onClick={() => onDeleteItem(item.id)}
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
    )
}
