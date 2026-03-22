import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Flame, Settings, Zap } from 'lucide-react'

interface BomControlPanelProps {
    pcbCount: number;
    setPcbCount: ( count: number ) => void;
    calculateMaxPossible: () => void;
    loading: boolean;
    confirmSubtract: boolean;
    setConfirmSubtract: ( confirm: boolean ) => void;
    handleQuickSubtract: () => void;
    isSolderingMode: boolean;
    setIsSolderingMode: ( mode: boolean ) => void;
    prepareSolderingSummary: () => void;
}

export const BomControlPanel: React.FC<BomControlPanelProps> = ( {
                                                                     pcbCount,
                                                                     setPcbCount,
                                                                     calculateMaxPossible,
                                                                     loading,
                                                                     confirmSubtract,
                                                                     setConfirmSubtract,
                                                                     handleQuickSubtract,
                                                                     isSolderingMode,
                                                                     setIsSolderingMode,
                                                                     prepareSolderingSummary,
                                                                 } ) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration */}
            <Card className="p-5 flex flex-col justify-center gap-4">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Settings className="w-4 h-4"/> Production Settings
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <label className="text-xs text-slate-400 mb-1 block">PCBs to Build</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="1"
                                value={pcbCount}
                                onChange={( e ) => setPcbCount(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-24 text-center font-mono text-lg"
                            />
                            <span className="text-sm text-muted-foreground">units</span>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={calculateMaxPossible}
                            className="h-10 border-dashed text-xs">
                        Calculate Max
                    </Button>
                </div>
            </Card>

            {/* Actions */}
            <Card className="p-5 flex flex-col justify-center gap-4 lg:col-span-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Zap className="w-4 h-4"/> Quick Actions
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button
                        disabled={loading}
                        variant={confirmSubtract ? 'destructive' : 'secondary'}
                        onClick={() => {
                            if (confirmSubtract) {
                                handleQuickSubtract()
                            } else {
                                setConfirmSubtract(true)
                            }
                        }}
                        onMouseLeave={() => setConfirmSubtract(false)}
                    >
                        {loading ? 'Processing...' : (confirmSubtract ? 'Confirm Subtract?' : 'Quick Subtract Stock')}
                    </Button>

                    <Button
                        variant={isSolderingMode ? 'default' : 'outline'}
                        className={isSolderingMode ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        onClick={() => setIsSolderingMode(!isSolderingMode)}
                    >
                        <Flame className={`w-4 h-4 mr-2 ${isSolderingMode ? 'fill-current' : ''}`}/>
                        {isSolderingMode ? 'Exit Soldering Mode' : 'Enter Soldering Mode'}
                    </Button>

                    {isSolderingMode && (
                        <Button className="ml-auto bg-blue-600 hover:bg-blue-700" onClick={prepareSolderingSummary}>
                            <CheckCircle2 className="w-4 h-4 mr-2"/>
                            Finish & Subtract
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}
