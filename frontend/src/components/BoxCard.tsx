import type { Box } from "../types";

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
      className="card text-left w-full p-5 hover:border-blue-500 hover:bg-slate-700/60 active:bg-slate-700 transition-colors duration-150 group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
    >
      {/* Icon + count row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600/30 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            />
          </svg>
        </div>
        <span className="badge bg-slate-700 text-slate-300 group-hover:bg-slate-600 transition-colors">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
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
    </button>
  );
}
