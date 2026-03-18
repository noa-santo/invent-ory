import { useEffect, useRef, useState } from "react";
import type { Box, InventoryItem } from "../types";

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
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuantity(item?.quantity ?? 1);
    setBoxId(item?.box_id ?? boxes[0]?.id ?? 0);
  }, [item, boxes]);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ quantity, box_id: boxId });
  }

  const component = item?.component;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="card w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {isNew ? "Add to Inventory" : "Edit Inventory Item"}
            </h2>
            {component && (
              <p className="text-sm text-slate-400 mt-0.5">{component.lcsc_part_no}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Read-only component details */}
        {component && (
          <dl className="px-6 py-4 border-b border-slate-700 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
          <div>
            <label htmlFor="modal-qty" className="block text-sm font-medium text-slate-300 mb-1.5">
              Quantity
            </label>
            <input
              id="modal-qty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="modal-box" className="block text-sm font-medium text-slate-300 mb-1.5">
              Box
            </label>
            {boxes.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No boxes available. Create a box first.
              </p>
            ) : (
              <select
                id="modal-box"
                value={boxId}
                onChange={(e) => setBoxId(Number(e.target.value))}
                className="input-field"
                required
              >
                {boxes.map((box) => (
                  <option key={box.id} value={box.id}>
                    {box.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={boxes.length === 0}
              className="btn-primary"
            >
              {isNew ? "Add to Inventory" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
