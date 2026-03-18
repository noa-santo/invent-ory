import { useEffect, useState } from "react";
import type { Box, InventoryItem } from "../types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComponentModalProps {
  item: InventoryItem | null;
  isNew: boolean;
  boxes: Box[];
  onSave: (data: { quantity: number; box_id: number }) => void;
  onClose: () => void;
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div>
      <dt className="text-xs text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-slate-200 truncate" title={value}>
        {value || <span className="text-slate-500 italic">—</span>}
      </dd>
    </div>
  );
}

export default function ComponentModal({
  item,
  isNew,
  boxes,
  onSave,
  onClose,
}: ComponentModalProps) {
  const [quantity, setQuantity] = useState<number>(item?.quantity ?? 1);
  const [boxId, setBoxId] = useState<number>(item?.box_id ?? boxes[0]?.id ?? 0);

  useEffect(() => {
    setQuantity(item?.quantity ?? 1);
    setBoxId(item?.box_id ?? boxes[0]?.id ?? 0);
  }, [item, boxes]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ quantity, box_id: boxId });
  }

  const component = item?.component;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add to Inventory" : "Edit Inventory Item"}
          </DialogTitle>
          {component && (
            <DialogDescription>{component.lcsc_part_no}</DialogDescription>
          )}
        </DialogHeader>

        {/* Read-only component details */}
        {component && (
          <dl className="px-6 py-4 border-b border-border grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailRow label="Name" value={component.name} />
            <DetailRow label="Value" value={component.value} />
            <DetailRow label="Manufacturer" value={component.manufacturer} />
            <DetailRow label="Footprint" value={component.footprint} />
            <div className="col-span-2">
              <DetailRow label="Description" value={component.description} />
            </div>
          </dl>
        )}

        {/* Editable fields */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="modal-qty">Quantity</Label>
            <Input
              id="modal-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="modal-box">Box</Label>
            {boxes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No boxes available. Create a box first.
              </p>
            ) : (
              <Select
                value={String(boxId)}
                onValueChange={(val) => setBoxId(Number(val))}
              >
                <SelectTrigger id="modal-box">
                  <SelectValue placeholder="Select a box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes.map((box) => (
                    <SelectItem key={box.id} value={String(box.id)}>
                      {box.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={boxes.length === 0}>
              {isNew ? "Add to Inventory" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
