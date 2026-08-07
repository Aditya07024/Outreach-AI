import React from 'react';
import { ArrowRight, X, Shield, Check } from 'lucide-react';

interface GoogleVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  isLoading?: boolean;
}

export const GoogleVerificationModal: React.FC<GoogleVerificationModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-xl overflow-hidden flex flex-col my-6 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-800">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Connect Gmail Account
              </h2>
              <p className="text-[11px] text-slate-500">
                2 quick clicks on Google's warning page
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-slate-700 text-xs">
          
          {/* Simple Clean Note */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900 text-[11px]">
            <Check className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span className="font-bold">Safe & secure. Outreach AI only sends emails you schedule.</span>
          </div>

          {/* 2 Simple Steps */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              What to click on Google's page:
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              
              {/* Step 1 */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-xs">
                <span className="text-slate-900 font-bold underline">
                  Advanced
                </span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  1. Click "Advanced"
                </span>
              </div>

              {/* Step 2 */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs shadow-xs">
                <span className="text-slate-900 font-bold underline">
                  Go to Outreach AI (unsafe)
                </span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                  2. Click "Go to Outreach AI"
                </span>
              </div>

            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Note: "Unsafe" is just Google's standard label while developer verification is in progress.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={isLoading}
            className="px-5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-xs"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Continue to Google <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
