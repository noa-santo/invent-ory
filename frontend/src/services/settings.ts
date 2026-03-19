/**
 * Settings service for managing user preferences stored in localStorage
 */

const STORAGE_KEY = 'invent-ory:settings'
const DEFAULT_API_URL = 'http://localhost:8080/api/v1'

export interface Settings {
    apiUrl: string
}

export function getSettings(): Settings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            return {
                apiUrl: parsed.apiUrl || DEFAULT_API_URL,
            }
        }
    } catch (error) {
        console.error('Failed to load settings from localStorage:', error)
    }
    return {
        apiUrl: DEFAULT_API_URL,
    }
}

export function saveSettings( settings: Settings ): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (error) {
        console.error('Failed to save settings to localStorage:', error)
        throw error
    }
}

export function getApiUrl(): string {
    // Check if there's an environment variable first
    const envUrl = import.meta.env.VITE_API_URL
    if (envUrl) {
        return envUrl
    }
    // Fall back to settings
    return getSettings().apiUrl
}

export function resetSettings(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.error('Failed to reset settings:', error)
    }
}

