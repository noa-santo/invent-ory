import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComponentModal from "../components/ComponentModal";
import * as api from "../services/api";
import type { Box, InventoryItem } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RefreshCw, Search, AlertCircle, Loader2, Pencil, Trash2 } from "lucide-react";

export default function InventoryPage() {
  const navigate = useNavigate();
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
          <p className="mt-0.5 text-sm text-muted-foreground">
            {items.length} component{items.length !== 1 ? "s" : ""} in stock
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={loadData} className="self-start">
          <RefreshCw className="h-4 w-4"/>
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by part no, name, value…"
          className="pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-900/40 text-red-300 border border-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0"/>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Card className="p-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin"/>
          Loading inventory…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          {query ? "No items match your search." : "No inventory items yet. Scan a barcode to add one."}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">LCSC Part No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Footprint</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Box</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-secondary/40 transition-colors group"
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
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate text-xs">
                      {item.component.footprint}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200 whitespace-nowrap">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className="cursor-pointer hover:bg-primary/80 transition-colors"
                        onClick={() => navigate("/boxes", { state: { highlightBoxId: item.box_id, highlightItemId: item.id } })}
                      >
                        {item.box.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item);
                            setModalOpen(true);
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4"/>
                        </Button>
                        {deleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            className="hover:text-red-400"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
