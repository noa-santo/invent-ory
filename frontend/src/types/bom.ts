import { InventoryItem } from './index'

export interface BomItem {
    id: string;
    designator: string;
    footprint: string;
    quantity: number;
    value: string;
    lcscPartNumber: string;
    matchedInventoryItem?: InventoryItem;
    manualMatch?: boolean;
    selected?: boolean;
    placed?: boolean;
    soldered?: boolean;
}

export interface SavedBom {
    name: string;
    date: string;
    data: BomItem[];
}

export interface SolderingSummaryItem {
    id: number;
    name: string;
    quantity: number;
}

export interface OrderItem {
    lcscPartNumber: string;
    quantity: number;
    stock: number;
    needed: number;
    toOrder: number;
}
