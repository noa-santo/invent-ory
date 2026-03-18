import { useEffect, useMemo, useState } from "react";
import ComponentModal from "../components/ComponentModal";
import * as api from "../services/api";
import type { Box, InventoryItem } from "../types";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [inv, bxs] = await Promise.all([api.getInventory(), api.getBoxes()]);
      setItems(inv);
      setBoxes(bxs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.component.lcsc_part_no.toLowerCase().includes(q) ||
        item.component.name.toLowerCase().includes(q) ||
        item.component.value.toLowerCase().includes(q) ||
        item.box.name.toLowerCase().includes(q)
    );
  }, [items, query]);

  async function handleSave(data: { quantity: number; box_id: number }) {
    if (!selectedItem) return;
    try {
      const updated = await api.updateInventoryItem(selectedItem.id, data);
      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
      );
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteInventoryItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Inventory</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {items.length} component{items.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <button type="button" onClick={loadData} className="btn-secondary self-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by part no, name, value…"
          className="input-field pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-900/40 text-red-300 border border-red-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card p-10 flex items-center justify-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading inventory…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {query ? "No items match your search." : "No inventory items yet. Scan a barcode to add one."}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">LCSC Part No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Footprint</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Box</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-700/40 transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-blue-400 whitespace-nowrap">
                      {item.component.lcsc_part_no}
                    </td>
                    <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                      {item.component.name}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {item.component.value}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[180px] truncate text-xs">
                      {item.component.footprint}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-slate-700 text-slate-300">
                        {item.box.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                          aria-label="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {deleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              className="px-2 py-1 rounded text-xs bg-red-700 hover:bg-red-600 text-white transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(null)}
                              className="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                            aria-label="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modalOpen && selectedItem && (
        <ComponentModal
          item={selectedItem}
          isNew={false}
          boxes={boxes}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
