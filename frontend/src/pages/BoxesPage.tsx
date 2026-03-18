import { useEffect, useState } from "react";
import BoxCard from "../components/BoxCard";
import * as api from "../services/api";
import type { Box, InventoryItem } from "../types";

interface BoxWithCount {
  box: Box;
  count: number;
}

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<BoxWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create box form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Box detail view
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [boxContents, setBoxContents] = useState<InventoryItem[]>([]);
  const [contentsLoading, setContentsLoading] = useState(false);

  async function loadBoxes() {
    setLoading(true);
    setError(null);
    try {
      const [bxs, inv] = await Promise.all([api.getBoxes(), api.getInventory()]);
      const countMap = new Map<number, number>();
      for (const item of inv) {
        countMap.set(item.box_id, (countMap.get(item.box_id) ?? 0) + 1);
      }
      setBoxes(bxs.map((box) => ({ box, count: countMap.get(box.id) ?? 0 })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boxes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoxes();
  }, []);

  async function handleCreateBox(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await api.createBox({ name: newName.trim(), description: newDesc.trim() });
      setBoxes((prev) => [...prev, { box: created, count: 0 }]);
      setNewName("");
      setNewDesc("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create box.");
    } finally {
      setCreating(false);
    }
  }

  async function handleBoxClick(box: Box) {
    setSelectedBox(box);
    setContentsLoading(true);
    try {
      const contents = await api.getBoxContents(box.id);
      setBoxContents(contents);
    } catch {
      setBoxContents([]);
    } finally {
      setContentsLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Boxes</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {boxes.length} box{boxes.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button type="button" onClick={loadBoxes} className="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {showForm ? "Cancel" : "Create Box"}
          </button>
        </div>
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

      {/* Create box form */}
      {showForm && (
        <form onSubmit={handleCreateBox} className="card p-5 space-y-4 max-w-md">
          <h2 className="font-semibold text-slate-200">New Box</h2>
          <div>
            <label htmlFor="box-name" className="block text-sm font-medium text-slate-300 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="box-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Resistors 0402"
              className="input-field"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="box-desc" className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              id="box-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="input-field resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(""); setNewDesc(""); }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={creating || !newName.trim()} className="btn-primary">
              {creating ? "Creating…" : "Create Box"}
            </button>
          </div>
        </form>
      )}

      {/* Boxes grid */}
      {loading ? (
        <div className="card p-10 flex items-center justify-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading boxes…
        </div>
      ) : boxes.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          No boxes yet. Create one to start organising your components.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boxes.map(({ box, count }) => (
            <BoxCard
              key={box.id}
              box={box}
              itemCount={count}
              onClick={() => handleBoxClick(box)}
            />
          ))}
        </div>
      )}

      {/* Box detail drawer / modal */}
      {selectedBox && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-b-none sm:rounded-b-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">{selectedBox.name}</h2>
                {selectedBox.description && (
                  <p className="text-sm text-slate-400 mt-0.5">{selectedBox.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSelectedBox(null); setBoxContents([]); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contents */}
            <div className="flex-1 overflow-y-auto">
              {contentsLoading ? (
                <div className="flex items-center justify-center gap-3 p-10 text-slate-400">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Loading contents…
                </div>
              ) : boxContents.length === 0 ? (
                <div className="p-10 text-center text-slate-500">This box is empty.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Part No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Value</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {boxContents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-400 whitespace-nowrap">
                          {item.component.lcsc_part_no}
                        </td>
                        <td className="px-4 py-3 text-slate-200 max-w-[200px] truncate">
                          {item.component.name}
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                          {item.component.value}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-200">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
