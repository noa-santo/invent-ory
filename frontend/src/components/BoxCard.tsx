import type { Box } from "../types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

interface BoxCardProps {
  box: Box;
  itemCount: number;
  onClick: () => void;
}

export default function BoxCard({ box, itemCount, onClick }: BoxCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-xl"
    >
      <Card className="p-5 hover:border-primary/60 hover:bg-slate-700/60 active:bg-slate-700 transition-colors duration-150 group">
        {/* Icon + count row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/20 text-blue-400 group-hover:bg-primary/30 transition-colors">
            <Package className="h-5 w-5" />
          </div>
          <Badge className="group-hover:bg-slate-600 transition-colors">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-slate-100 truncate group-hover:text-white transition-colors">
          {box.name}
        </h3>

        {/* Description */}
        {box.description ? (
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{box.description}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-600 italic">No description</p>
        )}

        {/* Created date */}
        <p className="mt-3 text-xs text-slate-600">
          Created {new Date(box.created_at).toLocaleDateString()}
        </p>
      </Card>
    </button>
  );
}
