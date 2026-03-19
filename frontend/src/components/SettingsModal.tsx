import { useState } from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { getSettings, resetSettings, saveSettings } from '../services/settings'

interface SettingsModalProps {
    open: boolean
    onOpenChange: ( open: boolean ) => void
}

export function SettingsModal( {open, onOpenChange}: SettingsModalProps ) {
    const currentSettings = getSettings()
    const [apiUrl, setApiUrl] = useState(currentSettings.apiUrl)
    const [isSaved, setIsSaved] = useState(false)

    const handleSave = async () => {
        try {
            saveSettings({apiUrl})
            setIsSaved(true)
            setTimeout(() => {
                setIsSaved(false)
                // Optionally reload the page to apply new settings
                window.location.reload()
            }, 1500)
        } catch (error) {
            console.error('Failed to save settings:', error)
        }
    }

    const handleReset = () => {
        if (window.confirm('Reset backend URL to default?')) {
            resetSettings()
            setApiUrl('http://localhost:8080/api/v1')
            setIsSaved(true)
            setTimeout(() => {
                setIsSaved(false)
                window.location.reload()
            }, 1500)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <div className="p-2">
                    <h2 className="text-xl font-semibold mb-1">Settings</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Configure the backend server URL
                    </p>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="api-url" className="text-base font-medium">
                                Backend API URL
                            </Label>
                            <p className="text-xs text-slate-400 mb-2">
                                The address of your backend server
                            </p>
                            <Input
                                id="api-url"
                                type="url"
                                value={apiUrl}
                                onChange={( e ) => setApiUrl(e.target.value)}
                                placeholder="http://localhost:8080/api/v1"
                                className="font-mono text-sm"
                            />
                        </div>

                        {isSaved && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                <p className="text-sm text-green-400">✓ Settings saved</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleSave}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                Save
                            </Button>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="flex-1"
                            >
                                Reset
                            </Button>
                            <Button
                                onClick={() => onOpenChange(false)}
                                variant="outline"
                                className="flex-1"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
