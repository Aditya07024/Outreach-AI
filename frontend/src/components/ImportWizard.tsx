import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  UploadSimple,
  FileCsv,
  ClipboardText,
  UserPlus,
  WarningCircle,
  CheckCircle,
  ShareNetwork,
  LinkSimple,
  CircleNotch,
  Check,
  EnvelopeSimple,
  Buildings,
  IdentificationBadge,
  Phone,
  LinkedinLogo,
  GlobeHemisphereWest,
  Plus
} from '@phosphor-icons/react';
import { Glass } from './glass/Glass';

interface ImportWizardProps {
  campaignId: number;
  onImportComplete: () => void;
  initialShareCode?: string;
}

type TabType = 'csv' | 'paste' | 'manual' | 'shared';

export const ImportWizard: React.FC<ImportWizardProps> = ({ campaignId, onImportComplete, initialShareCode }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialShareCode ? 'shared' : 'csv');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Paste import state
  const [pasteText, setPasteText] = useState('');

  // Shared campaign import state
  const [shareInput, setShareInput] = useState(initialShareCode || '');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [sharedPreview, setSharedPreview] = useState<{
    campaignName: string;
    campaignDescription?: string;
    totalContacts: number;
    contactsPreview: any[];
  } | null>(null);

  // Results status
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: { imported: number; duplicates: number; skipped?: number; errors?: number };
  } | null>(null);

  // Manual form integration
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      title: '',
      company: '',
      phone: '',
      linkedin: '',
      country: ''
    }
  });

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setStatusMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleFetchSharePreview = async (tokenToFetch?: string) => {
    const raw = (tokenToFetch || shareInput).trim();
    if (!raw) return;

    let clean = raw;
    if (clean.includes('import_share=')) {
      clean = clean.split('import_share=')[1].split('&')[0];
    } else if (clean.includes('share=')) {
      clean = clean.split('share=')[1].split('&')[0];
    }

    setIsLoadingPreview(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/campaigns/share-preview/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load shared campaign');
      setSharedPreview(data);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Invalid or expired share link/code.' });
      setSharedPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (initialShareCode) {
      setShareInput(initialShareCode);
      setActiveTab('shared');
      handleFetchSharePreview(initialShareCode);
    }
  }, [initialShareCode]);

  // Shared Campaign Import submission
  const handleSharedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareInput.trim()) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/campaigns/import-shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: shareInput.trim(),
          targetCampaignId: campaignId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import shared contacts');

      setStatusMsg({
        type: 'success',
        text: data.message || `Successfully imported ${data.importedCount} contacts into this campaign.`,
        details: {
          imported: data.importedCount,
          duplicates: data.duplicateCount,
        },
      });

      setShareInput('');
      setSharedPreview(null);
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error importing shared contacts.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Import submission
  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('campaignId', campaignId.toString());

    try {
      const response = await fetch('/api/contacts/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import CSV');

      setStatusMsg({
        type: 'success',
        text: 'CSV imported successfully.',
        details: {
          imported: data.imported,
          duplicates: data.duplicates,
          skipped: data.skipped,
        }
      });
      setCsvFile(null);
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during CSV upload.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paste list import submission
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/contacts/import-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailsText: pasteText,
          campaignId: campaignId
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import email list');

      setStatusMsg({
        type: 'success',
        text: 'Email list imported successfully.',
        details: {
          imported: data.imported,
          duplicates: data.duplicates,
          errors: data.errors,
        }
      });
      setPasteText('');
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during paste import.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual entry submission
  const onSubmitManual = async (formData: any) => {
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/contacts/import-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          ...formData
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add contact');

      setStatusMsg({
        type: 'success',
        text: `Successfully added ${data.email}.`,
        details: {
          imported: 1,
          duplicates: data.duplicateStatus ? 1 : 0,
        }
      });
      reset();
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error adding contact manually.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'csv', label: 'CSV File Upload', icon: <FileCsv className="w-4 h-4" weight="duotone" /> },
    { id: 'paste', label: 'Paste Email List', icon: <ClipboardText className="w-4 h-4" weight="duotone" /> },
    { id: 'manual', label: 'Manual Entry', icon: <UserPlus className="w-4 h-4" weight="duotone" /> },
    { id: 'shared', label: 'Shared Link / Code', icon: <ShareNetwork className="w-4 h-4 text-[#7C3AED]" weight="duotone" /> },
  ];

  return (
    <Glass variant="surface" radius="outer" className="w-full overflow-hidden shadow-[0_16px_36px_-12px_rgba(42,26,15,0.06)] border border-white/90">
      {/* Tabs bar */}
      <div className="flex border-b border-[rgba(42,26,15,0.08)] bg-white/40 backdrop-blur-sm overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-[#FF6B1A] text-[#2A1A0F] bg-white/70 shadow-2xs'
                  : 'border-transparent text-[#735E50] hover:text-[#2A1A0F] hover:bg-white/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-6 md:p-7">
        {/* Results Toast Alerts */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-[18px] flex items-start gap-3 border text-xs leading-relaxed transition-all ${
              statusMsg.type === 'success'
                ? 'bg-[#1DA365]/10 border-[#1DA365]/25 text-[#146C43]'
                : 'bg-[#E63946]/10 border-[#E63946]/25 text-[#A01B26]'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-[#1DA365] mt-0.5" weight="fill" />
            ) : (
              <WarningCircle className="w-5 h-5 flex-shrink-0 text-[#E63946] mt-0.5" weight="fill" />
            )}
            <div className="flex-1">
              <span className="font-bold text-sm block">{statusMsg.text}</span>
              {statusMsg.details && (
                <div className="mt-2.5 grid grid-cols-3 gap-3 border-t border-[rgba(42,26,15,0.08)] pt-2.5 font-semibold text-[10px] text-[#735E50] uppercase tracking-wider">
                  <div>Added: <span className="text-[#2A1A0F] font-bold">{statusMsg.details.imported}</span></div>
                  <div>Duplicates: <span className="text-[#2A1A0F] font-bold">{statusMsg.details.duplicates}</span></div>
                  {statusMsg.details.skipped !== undefined && (
                    <div>Skipped: <span className="text-[#2A1A0F] font-bold">{statusMsg.details.skipped}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV File Upload Form */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-[rgba(42,26,15,0.15)] hover:border-[#FF6B1A]/60 rounded-[20px] p-8 flex flex-col items-center justify-center gap-3 bg-white/40 hover:bg-white/60 cursor-pointer relative group transition-all">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <div className="w-12 h-12 rounded-[16px] bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center transition-transform group-hover:scale-105">
                <UploadSimple className="w-6 h-6" weight="bold" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-[#2A1A0F]">
                  {csvFile ? csvFile.name : 'Click or drag CSV file to upload'}
                </p>
                <p className="text-[11px] text-[#735E50] mt-1 max-w-md">
                  Supported columns: First Name, Last Name, Company, Title, Active Email, Phone, LinkedIn, Country
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !csvFile}
                className="px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all disabled:opacity-40 cursor-pointer shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] active:scale-[0.98] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="w-4 h-4 animate-spin" />
                    <span>Importing CSV...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Start Import</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Paste Email List Form */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <EnvelopeSimple className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                Recruiter Emails
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="hr@company.com&#10;jobs@company.com&#10;careers@company.com, engineering@company.com"
                rows={5}
                className="w-full rounded-[16px] border border-[rgba(42,26,15,0.12)] bg-white/80 p-3.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all font-mono leading-relaxed shadow-inner"
                required
              />
              <span className="text-[10px] text-[#735E50]">
                You can separate emails using newlines, commas, semicolons or spaces.
              </span>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !pasteText.trim()}
                className="px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all disabled:opacity-40 cursor-pointer shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] active:scale-[0.98] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Import Emails</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Manual Entry Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit(onSubmitManual)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <EnvelopeSimple className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                  Active Email *
                </label>
                <input
                  type="email"
                  {...register('email', { required: 'Email address is required' })}
                  placeholder="recruiter@company.com"
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
                {errors.email && <span className="text-[10px] text-[#E63946] font-bold">{errors.email.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Buildings className="w-3.5 h-3.5 text-[#735E50]" weight="duotone" />
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  {...register('company')}
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane"
                    {...register('firstName')}
                    className="w-full rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    placeholder="Doe"
                    {...register('lastName')}
                    className="w-full rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <IdentificationBadge className="w-3.5 h-3.5 text-[#735E50]" weight="duotone" />
                  Job Title / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Recruiter"
                  {...register('title')}
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#735E50]" weight="duotone" />
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  {...register('phone')}
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <LinkedinLogo className="w-3.5 h-3.5 text-[#0A66C2]" weight="duotone" />
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  {...register('linkedin')}
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GlobeHemisphereWest className="w-3.5 h-3.5 text-[#735E50]" weight="duotone" />
                  Country
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  {...register('country')}
                  className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all disabled:opacity-40 cursor-pointer shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] active:scale-[0.98] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="w-4 h-4 animate-spin" />
                    <span>Saving Contact...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Save Contact</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Shared Campaign / Code Form */}
        {activeTab === 'shared' && (
          <form onSubmit={handleSharedSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShareNetwork className="w-3.5 h-3.5 text-[#7C3AED]" weight="duotone" />
                Paste Campaign Share Link or Share Code
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkSimple className="w-4 h-4 text-[#735E50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={shareInput}
                    onChange={(e) => setShareInput(e.target.value)}
                    placeholder="e.g. https://outreach-ai.com/campaigns?import_share=... or share token"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/80 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all font-mono shadow-inner"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchSharePreview()}
                  disabled={isLoadingPreview || !shareInput.trim()}
                  className="px-4 py-2.5 bg-white/90 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[14px] text-xs transition-all cursor-pointer disabled:opacity-40 shrink-0 flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98]"
                >
                  {isLoadingPreview ? (
                    <>
                      <CircleNotch className="w-4 h-4 animate-spin text-[#7C3AED]" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    'Preview Contacts'
                  )}
                </button>
              </div>
              <span className="text-[10px] text-[#735E50]">
                Paste a link or code shared by someone else to import their contacts directly into this campaign.
              </span>
            </div>

            {/* Live Shared Contacts Preview */}
            {sharedPreview && (
              <Glass variant="nested" radius="inner" className="p-4 space-y-3 bg-[#7C3AED]/5 border-[#7C3AED]/20">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] block">
                      Shared Source Campaign
                    </span>
                    <h4 className="text-sm font-bold text-[#2A1A0F]">{sharedPreview.campaignName}</h4>
                    {sharedPreview.campaignDescription && (
                      <p className="text-[11px] text-[#735E50] mt-0.5">{sharedPreview.campaignDescription}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono font-bold text-[#7C3AED] bg-white px-2.5 py-1 rounded-[10px] border border-[#7C3AED]/20 self-start sm:self-auto shadow-2xs">
                    {sharedPreview.totalContacts} Contacts Available
                  </span>
                </div>

                {sharedPreview.contactsPreview && sharedPreview.contactsPreview.length > 0 && (
                  <div className="border border-[rgba(42,26,15,0.08)] rounded-[14px] overflow-hidden bg-white/90 text-xs shadow-2xs">
                    <div className="px-3.5 py-2 bg-white/60 border-b border-[rgba(42,26,15,0.08)] text-[10px] font-bold text-[#735E50] uppercase tracking-wider">
                      Previewing first {sharedPreview.contactsPreview.length} contacts
                    </div>
                    <div className="divide-y divide-[rgba(42,26,15,0.05)] max-h-36 overflow-y-auto font-mono text-[11px]">
                      {sharedPreview.contactsPreview.map((c: any) => (
                        <div key={c.id} className="px-3.5 py-2 flex justify-between items-center text-[#2A1A0F]">
                          <span className="font-medium truncate mr-2">{c.email}</span>
                          <span className="text-[10px] text-[#735E50] font-sans truncate">{c.company || c.title || 'Contact'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Glass>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !shareInput.trim()}
                className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-[14px] text-xs transition-all disabled:opacity-40 cursor-pointer shadow-[0_8px_20px_-4px_rgba(124,58,237,0.35)] active:scale-[0.98] flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <CircleNotch className="w-4 h-4 animate-spin" />
                    <span>Importing Contacts...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>{sharedPreview ? `Import ${sharedPreview.totalContacts} Contacts` : 'Import Shared Contacts'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Glass>
  );
};
