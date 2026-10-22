import ReactDOM from 'react-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — portal-rendered confirmation dialog.
 * Replaces window.confirm() everywhere.
 *
 * Props:
 *   open        boolean
 *   onConfirm   () => void
 *   onCancel    () => void
 *   title       string   (default: "Are you sure?")
 *   message     string   (default: "This action cannot be undone.")
 *   confirmLabel string  (default: "Delete")
 *   danger      boolean  (default: true — red confirm button)
 */
export default function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  danger = true,
}) {
  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Card */}
      <div
        className="relative bg-white rounded-lg border border-slate-200/80 shadow-2xl w-full max-w-sm animate-fade-in p-6 space-y-4 font-['Outfit']"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[15px] text-[#0f172a]">{title}</h3>
            <p className="text-xs text-[#64748b] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#64748b] hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1a2b49] hover:bg-[#14223b]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
