import React from 'react';
import { ArrowRight, X, ShieldCheck, CheckCircle, Warning } from '@phosphor-icons/react';
import { Glass } from './glass/Glass';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1A0F]/30 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div 
        className="w-full max-w-md my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <Glass variant="strong" radius="outer" className="overflow-hidden shadow-2xl border-white/95">
          {/* Header */}
          <div className="p-6 border-b border-[rgba(42,26,15,0.06)] flex items-center justify-between bg-white/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[14px] bg-[#FF6B1A]/10 border border-[#FF6B1A]/20 flex items-center justify-center text-[#FF6B1A]">
                <ShieldCheck weight="duotone" className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#2A1A0F]">
                  Connect Gmail Account
                </h2>
                <p className="text-xs text-[#735E50]">
                  2 quick clicks on Google's permission screen
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-[12px] text-[#735E50] hover:text-[#2A1A0F] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4 text-xs">
            {/* Friendly Safety Note */}
            <div className="p-3.5 rounded-[16px] bg-[#1DA365]/10 border border-[#1DA365]/20 flex items-start gap-2.5 text-[#1DA365]">
              <CheckCircle weight="fill" className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium text-[#2A1A0F] leading-relaxed">
                <strong className="text-[#1DA365] font-semibold">100% Safe & Private:</strong> Outreach AI only sends emails that you explicitly review and approve.
              </span>
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-[#735E50] uppercase tracking-wider block">
                What to click on Google's sign-in page:
              </span>

              <div className="p-4 rounded-[20px] bg-white/70 border border-white/90 space-y-2.5 shadow-2xs">
                {/* Step 1 */}
                <div className="p-3 rounded-[14px] bg-white border border-[rgba(42,26,15,0.08)] flex items-center justify-between shadow-2xs">
                  <span className="text-[#2A1A0F] font-bold underline decoration-[#FF6B1A] decoration-2">
                    Advanced
                  </span>
                  <span className="text-[11px] font-semibold text-[#2A1A0F] bg-[#FDF8F3] border border-[rgba(42,26,15,0.08)] px-2.5 py-1 rounded-[10px]">
                    1. Click "Advanced"
                  </span>
                </div>

                {/* Step 2 */}
                <div className="p-3 rounded-[14px] bg-white border border-[rgba(42,26,15,0.08)] flex items-center justify-between shadow-2xs">
                  <span className="text-[#2A1A0F] font-bold underline decoration-[#FF6B1A] decoration-2">
                    Go to Outreach AI
                  </span>
                  <span className="text-[11px] font-semibold text-[#2A1A0F] bg-[#FDF8F3] border border-[rgba(42,26,15,0.08)] px-2.5 py-1 rounded-[10px]">
                    2. Click "Go to Outreach AI"
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-[14px] bg-[#D99B00]/10 border border-[#D99B00]/20 text-[#735E50]">
              <Warning weight="fill" className="w-4 h-4 text-[#D99B00] shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Google shows this standard notice for newly registered apps while developer verification is in progress.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-5 border-t border-[rgba(42,26,15,0.06)] bg-white/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-[#735E50] hover:text-[#2A1A0F] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onProceed}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#FF6B1A] hover:bg-[#E55B10] text-white text-xs font-semibold shadow-md shadow-[#FF6B1A]/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Continue to Google <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </Glass>
      </div>
    </div>
  );
};
