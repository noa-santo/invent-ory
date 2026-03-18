export interface Component {
  id: number;
  lcsc_part_no: string;
  name: string;
  value: string;
  footprint: string;
  description: string;
  manufacturer: string;
  created_at: string;
  updated_at: string;
}

export interface Box {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  component_id: number;
  box_id: number;
  quantity: number;
  component: Component;
  box: Box;
  created_at: string;
  updated_at: string;
}

export interface LCSCLookupResult {
  lcsc_part_no: string;
  name: string;
  value: string;
  footprint: string;
  description: string;
  manufacturer: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  error?: string;
}
