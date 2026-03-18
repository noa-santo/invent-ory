import { useEffect, useState } from "react";
import BoxCard from "../components/BoxCard";
import * as api from "../services/api";
import type { Box, InventoryItem } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RefreshCw, Plus, AlertCircle, Loader2 } from "lucide-react";

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
          <p className="mt-0.5 text-sm text-muted-foreground">
            {boxes.length} box{boxes.length !== 1 ? "es" : ""}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button type="button" variant="secondary" onClick={loadBoxes}>
            <RefreshCw className="h-4 w-4"/>
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus className="h-4 w-4"/>
            {showForm ? "Cancel" : "Create Box"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-red-900/40 text-red-300 border border-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0"/>
          {error}
        </div>
      )}

      {/* Create box form */}
      {showForm && (
        <form onSubmit={handleCreateBox} className="max-w-md">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-slate-200">New Box</h2>
            <div className="space-y-1.5">
              <Label htmlFor="box-name">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="box-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Resistors 0402"
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="box-desc">Description</Label>
              <Textarea
                id="box-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description…"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowForm(false); setNewName(""); setNewDesc(""); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Creating…" : "Create Box"}
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Boxes grid */}
      {loading ? (
        <Card className="p-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin"/>
          Loading boxes…
        </Card>
      ) : boxes.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No boxes yet. Create one to start organising your components.
        </Card>
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

      {/* Box detail dialog */}
      <Dialog
        open={!!selectedBox}
        onOpenChange={(open) => { if (!open) { setSelectedBox(null); setBoxContents([]); } }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader>
            <DialogTitle>{selectedBox?.name}</DialogTitle>
            {selectedBox?.description && (
              <DialogDescription>{selectedBox.description}</DialogDescription>
            )}
          </DialogHeader>

          {/* Contents */}
          <div className="flex-1 overflow-y-auto">
            {contentsLoading ? (
              <div className="flex items-center justify-center gap-3 p-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin"/>
                Loading contents…
              </div>
            ) : boxContents.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">This box is empty.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Part No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {boxContents.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/40 transition-colors">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
