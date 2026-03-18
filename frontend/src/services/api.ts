import type { Box, Component, InventoryItem, LCSCLookupResult } from '../types'

// @ts-ignore
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

function unwrapApiData<T>( payload: unknown ): T {
    if (
        payload !== null &&
        typeof payload === 'object' &&
        'data' in (payload as Record<string, unknown>)
    ) {
        return (payload as { data: T }).data
    }
    return payload as T
}

async function request<T>(
    path: string,
    options?: RequestInit,
): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {'Content-Type': 'application/json', ...options?.headers},
        ...options,
    })
    if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(
            `API error ${res.status}: ${body || res.statusText}`,
        )
    }
    if (res.status === 204) return undefined as unknown as T
    const json = await res.json()
    return unwrapApiData<T>(json)
}

// ── Components ────────────────────────────────────────────────────────────────

export function getComponents(): Promise<Component[]> {
    return request<Component[]>('/components')
}

export function getComponent( id: number ): Promise<Component> {
    return request<Component>(`/components/${id}`)
}

export function createComponent(
    data: Omit<Component, 'id' | 'created_at' | 'updated_at'>,
): Promise<Component> {
    return request<Component>('/components', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function updateComponent(
    id: number,
    data: Partial<Omit<Component, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Component> {
    return request<Component>(`/components/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export function deleteComponent( id: number ): Promise<void> {
    return request<void>(`/components/${id}`, {method: 'DELETE'})
}

// ── Boxes ─────────────────────────────────────────────────────────────────────

export function getBoxes(): Promise<Box[]> {
    return request<Box[]>('/boxes')
}

export function getBox( id: number ): Promise<Box> {
    return request<Box>(`/boxes/${id}`)
}

export function createBox(
    data: Omit<Box, 'id' | 'created_at' | 'updated_at'>,
): Promise<Box> {
    return request<Box>('/boxes', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function updateBox(
    id: number,
    data: Partial<Omit<Box, 'id' | 'created_at' | 'updated_at'>>,
): Promise<Box> {
    return request<Box>(`/boxes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export function deleteBox( id: number ): Promise<void> {
    return request<void>(`/boxes/${id}`, {method: 'DELETE'})
}

export function getBoxContents( id: number ): Promise<InventoryItem[]> {
    return request<InventoryItem[]>(`/boxes/${id}/contents`)
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function getInventory(): Promise<InventoryItem[]> {
    return request<InventoryItem[]>('/inventory')
}

export function createInventoryItem(
    data: Omit<InventoryItem, 'id' | 'component' | 'box' | 'created_at' | 'updated_at'>,
): Promise<InventoryItem> {
    return request<InventoryItem>('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export function updateInventoryItem(
    id: number,
    data: Partial<
        Omit<InventoryItem, 'id' | 'component' | 'box' | 'created_at' | 'updated_at'>
    >,
): Promise<InventoryItem> {
    return request<InventoryItem>(`/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export function deleteInventoryItem( id: number ): Promise<void> {
    return request<void>(`/inventory/${id}`, {method: 'DELETE'})
}

export function upsertByLCSC(
    lcscPartNo: string,
    quantity: number,
    boxId: number,
): Promise<InventoryItem> {
    return request<InventoryItem>('/inventory/upsert-by-lcsc', {
        method: 'POST',
        body: JSON.stringify({lcsc_part_no: lcscPartNo, quantity, box_id: boxId}),
    })
}

export function lookupLCSC( scanData: string ): Promise<LCSCLookupResult> {
    return request<LCSCLookupResult>('/lcsc/lookup', {
        method: 'POST',
        body: JSON.stringify({scan_data: scanData}),
    })
}
