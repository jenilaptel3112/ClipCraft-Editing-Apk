import React from 'react';
import { X, RotateCcw } from 'lucide-react';

interface BottomDrawerProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onReset?: () => void;
  children: React.ReactNode;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  title,
  onClose,
  onReset,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200">
      {/* Tap backdrop to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer sheet container (occupies ~40-45% screen with smooth rounded top) */}
      <div className="w-full max-h-[50dvh] bg-[#141722] rounded-t-3xl border-t border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Drawer drag affordance pill & header */}
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white font-display">{title}</span>
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 ml-2 px-2 py-1 rounded bg-amber-500/10 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer body with thumb-friendly controls */}
        <div className="p-4 overflow-y-auto space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};
