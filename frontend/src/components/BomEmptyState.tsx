import React from 'react'
import { Card } from '@/components/ui/card'
import { FileText, History, UploadCloud } from 'lucide-react'
import { SavedBom } from '@/types/bom'

interface BomEmptyStateProps {
    onFileUpload: ( e: React.ChangeEvent<HTMLInputElement> ) => void;
    savedBoms: SavedBom[];
    onLoadFromHistory: ( saved: SavedBom ) => void;
}

export const BomEmptyState: React.FC<BomEmptyStateProps> = ( {
                                                                 onFileUpload,
                                                                 savedBoms,
                                                                 onLoadFromHistory,
                                                             } ) => {
    return (
        <div className="flex flex-col h-full space-y-5 p-6">
            <h1 className="text-2xl font-bold text-slate-100">BOM Upload</h1>

            <Card
                className="border-2 border-dashed border-gray-600 bg-card/50 rounded-xl p-16 text-center hover:bg-card/80 transition-all cursor-pointer relative group flex flex-col items-center justify-center gap-4">
                <input
                    type="file"
                    accept=".xlsx, .csv"
                    onChange={onFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                    <UploadCloud className="w-10 h-10 text-primary"/>
                </div>
                <div>
                    <p className="text-lg font-medium text-slate-200">Click or drag file to this area to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">Support for .xlsx and .csv files</p>
                </div>
            </Card>

            {savedBoms.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                        <History className="w-5 h-5"/> Recent BOMs
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedBoms.map(( saved, idx ) => (
                            <Card key={idx} className="p-4 hover:bg-secondary/20 cursor-pointer transition-colors"
                                  onClick={() => onLoadFromHistory(saved)}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="font-medium text-slate-200">{saved.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {new Date(saved.date).toLocaleDateString()} • {saved.data.length} components
                                        </div>
                                    </div>
                                    <FileText className="w-8 h-8 text-muted-foreground/50"/>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
