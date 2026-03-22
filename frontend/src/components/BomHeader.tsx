import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface BomHeaderProps {
    bomName: string;
    isSolderingMode: boolean;
    uniqueParts: number;
    totalPartsNeeded: number;
    onClearBom: () => void;
}

export const BomHeader: React.FC<BomHeaderProps> = ( {
                                                         bomName,
                                                         isSolderingMode,
                                                         uniqueParts,
                                                         totalPartsNeeded,
                                                         onClearBom,
                                                     } ) => {
    return (
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
                <Button variant="destructive" size="sm" onClick={onClearBom}>
                    <X className="w-4 h-4 mr-2"/>
                    Close BOM
                </Button>
            </div>
        </div>
    )
}
