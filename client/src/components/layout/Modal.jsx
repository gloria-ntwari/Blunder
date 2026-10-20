import { useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * Modal — renders via a portal into document.body so the backdrop blur
 * covers the ENTIRE viewport (sidebar, topbar, everything).
 *
 * Usage:
 *   <Modal onClose={() => setOpen(false)}>
 *     <h3>Title</h3>
 *     ...
 *   </Modal>
 */
export default function Modal({ children, onClose, maxWidth = 'max-w-md' }) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Full-viewport backdrop — blurs everything behind it */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Card */}
      <div
        className={`relative bg-white rounded-lg border border-slate-200/80 shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
