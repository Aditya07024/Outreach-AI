import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Cpu, 
  ArrowLeft, 
  UserMinus,
  Sparkles,
  Edit,
  MailQuestion
} from 'lucide-react';
import { Campaign, Contact, Resume } from '../types';
import { ImportWizard } from '../components/ImportWizard';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Campaign | null>(null);
  
  // Create campaign modal form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newResumeId, setNewResumeId] = useState<number | null>(null);
  const [newTemplateType, setNewTemplateType] = useState<'AI_GENERATED' | 'SAVED_TEMPLATE' | 'MANUAL'>('AI_GENERATED');
  const [newTemplateSubject, setNewTemplateSubject] = useState('Opportunities at {company} - {role} Application');
  const [newTemplateBody, setNewTemplateBody] = useState('Hi {firstName},\n\nI have been following your engineering team at {company} and would love to express interest in the {role} role.\n\nI have attached my resume for your review. You can view my portfolio at {portfolio} and GitHub at {github}.\n\nBest regards,\n{name}');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit campaign settings state
  const [showSettingsEdit, setShowSettingsEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editResumeId, setEditResumeId] = useState<number | null>(null);
  const [editTemplateType, setEditTemplateType] = useState<string>('AI_GENERATED');
  const [editTemplateSubject, setEditTemplateSubject] = useState('');
  const [editTemplateBody, setEditTemplateBody] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Edit contact modal state
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      console.error('Failed to load campaigns list', err);
    }
  };

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      const data = await response.json();
      setResumes(data);
      if (data.length > 0 && !newResumeId) {
        setNewResumeId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load resumes', err);
    }
  };

  const fetchCampaignDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();
      setCampaignDetails(data);
    } catch (err) {
      console.error('Failed to fetch campaign details', err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchResumes();
  }, []);

  useEffect(() => {
    if (selectedCampId) {
      fetchCampaignDetails(selectedCampId);
      
      const hasActiveProcess = 
        campaignDetails?.status === 'SENDING' || 
        campaignDetails?.contacts?.some(c => c.status === 'GENERATING');

      const intervalMs = hasActiveProcess ? 3000 : 8000;

      const timer = setInterval(() => {
        fetchCampaignDetails(selectedCampId);
        fetchCampaigns();
      }, intervalMs);

      return () => clearInterval(timer);
    } else {
      setCampaignDetails(null);
    }
  }, [selectedCampId, campaignDetails?.status, campaignDetails?.contacts?.filter(c => c.status === 'GENERATING').length]);

  useEffect(() => {
    if (campaignDetails) {
      setEditName(campaignDetails.name);
      setEditDesc(campaignDetails.description || '');
      setEditResumeId(campaignDetails.resumeId);
      setEditTemplateType(campaignDetails.templateType || 'AI_GENERATED');
      setEditTemplateSubject(campaignDetails.templateSubject || '');
      setEditTemplateBody(campaignDetails.templateBody || '');
    }
  }, [campaignDetails?.id]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          resumeId: newResumeId,
          templateType: newTemplateType,
          templateSubject: newTemplateSubject,
          templateBody: newTemplateBody
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create campaign');

      setNewName('');
      setNewDesc('');
      setShowCreateForm(false);
      fetchCampaigns();
    } catch (err) {
      alert(err || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCampaignSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampId || !editName.trim()) return;

    setIsUpdatingSettings(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          resumeId: editResumeId,
          templateType: editTemplateType,
          templateSubject: editTemplateSubject,
          templateBody: editTemplateBody,
        }),
      });

      if (!response.ok) throw new Error('Failed to update campaign settings');
      setShowSettingsEdit(false);
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to update campaign settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleDeleteCampaign = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"? This deletes all associated contacts.`)) return;

    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAction = async (action: 'start' | 'pause' | 'cancel' | 'retry' | 'generate') => {
    if (!selectedCampId) return;

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to run ${action}`);
      
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Remove this contact from the campaign?')) return;
    try {
      await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (selectedCampId) fetchCampaignDetails(selectedCampId);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit contact dialog
  const openContactEditor = (contact: Contact) => {
    setEditContact(contact);
    setContactSubject(contact.emailSubject || '');
    setContactBody(contact.emailBody || '');
  };

  // Save reviewed details
  const saveContactEdits = async () => {
    if (!editContact) return;
    setIsSavingContact(true);

    try {
      const response = await fetch(`/api/contacts/${editContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSubject: contactSubject,
          emailBody: contactBody,
          status: 'READY_TO_SEND' // Auto set to ready when edited
        }),
      });

      if (!response.ok) throw new Error('Failed to update contact');

      setEditContact(null);
      if (selectedCampId) fetchCampaignDetails(selectedCampId);
    } catch (err) {
      alert(err || 'Failed to save updates');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleRegenerateContactAI = async () => {
    if (!editContact) return;
    setIsSavingContact(true);

    try {
      const response = await fetch(`/api/contacts/${editContact.id}/regenerate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate email');

      setContactSubject(data.emailSubject || '');
      setContactBody(data.emailBody || '');
      if (selectedCampId) fetchCampaignDetails(selectedCampId);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate email');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleRegenerateContactDirect = async (contactId: number) => {
    try {
      const response = await fetch(`/api/contacts/${contactId}/regenerate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate email');
      
      if (selectedCampId) {
        fetchCampaignDetails(selectedCampId);
        fetchCampaigns();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate email');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {!selectedCampId ? (
        // CAMPAIGNS LIST VIEW
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Campaigns</h2>
              <p className="text-xs text-neutral-400 mt-1">Manage and track your job outreach campaigns.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>

          {/* New Campaign Creation Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <form 
                onSubmit={handleCreateCampaign}
                className="w-full max-w-md border border-neutral-800 bg-zinc-900/90 rounded-xl p-6 space-y-4 shadow-xl"
              >
                <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider">New Outreach Campaign</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. July Product Startups"
                    className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of targeted positions or locations..."
                    rows={3}
                    className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Select Resume PDF *</label>
                  {resumes.length === 0 ? (
                    <div className="text-[10px] text-amber-400 bg-amber-950/20 p-2 rounded border border-amber-800/40">
                      No resumes uploaded. Please upload a PDF resume in settings or resumes tab first.
                    </div>
                  ) : (
                    <>
                      <select
                        value={newResumeId || ''}
                        onChange={(e) => setNewResumeId(Number(e.target.value))}
                        className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      {(() => {
                        const selectedResume = resumes.find(r => r.id === newResumeId);
                        if (selectedResume?.description) {
                          return (
                            <div className="text-[10px] text-neutral-450 bg-neutral-900/50 p-2 rounded border border-neutral-850 mt-1.5 italic">
                              <span className="font-bold text-neutral-350 block not-italic mb-0.5">Resume Description:</span>
                              {selectedResume.description}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Outreach Template Mode</label>
                  <select
                    value={newTemplateType}
                    onChange={(e) => setNewTemplateType(e.target.value as any)}
                    className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
                  >
                    <option value="AI_GENERATED">AI Generated (Grok)</option>
                    <option value="SAVED_TEMPLATE">Saved Custom Template</option>
                    <option value="MANUAL">Manual Setup (Review Individually)</option>
                  </select>
                </div>

                {newTemplateType === 'SAVED_TEMPLATE' && (
                  <div className="space-y-3 p-3 bg-zinc-955/20 border border-neutral-800/60 rounded-lg">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Subject Template</label>
                      <input
                        type="text"
                        value={newTemplateSubject}
                        onChange={(e) => setNewTemplateSubject(e.target.value)}
                        placeholder="Opportunities at {company} - {role}"
                        className="rounded-md border border-neutral-800 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-105 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Body Template</label>
                      <textarea
                        value={newTemplateBody}
                        onChange={(e) => setNewTemplateBody(e.target.value)}
                        rows={5}
                        className="rounded-md border border-neutral-800 bg-zinc-950 p-2 text-xs text-neutral-105 focus:outline-none font-mono"
                      />
                      <span className="text-[8px] text-neutral-500 leading-normal">
                        Supports: {"{firstName}, {lastName}, {company}, {role}, {name}, {portfolio}, {github}"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-md text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || resumes.length === 0}
                    className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.length === 0 ? (
              <div className="col-span-2 border border-dashed border-neutral-800 rounded-xl p-12 text-center text-neutral-500 text-xs">
                No outreach campaigns created yet. Click "Create Campaign" to get started.
              </div>
            ) : (
              campaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="border border-neutral-800 bg-zinc-900/20 hover:border-neutral-700 rounded-xl p-6 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-neutral-200 text-sm tracking-tight">{camp.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        camp.status === 'SENDING' 
                          ? 'bg-blue-950/20 border-blue-800/40 text-blue-400' 
                          : camp.status === 'COMPLETED'
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                          : camp.status === 'PAUSED'
                          ? 'bg-amber-950/20 border-amber-800/40 text-amber-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{camp.description || 'No description provided.'}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-900/60 flex justify-between items-center">
                    <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
                      Contacts: <span className="text-neutral-300 font-bold">{camp.metrics?.total || 0}</span> | Sent: <span className="text-neutral-300 font-bold">{camp.metrics?.sent || 0}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCampId(camp.id)}
                        className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-md text-[10px] font-semibold text-neutral-300 transition-colors"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                        className="p-1.5 bg-neutral-900 hover:bg-rose-950/30 border border-neutral-800 hover:border-rose-800/40 text-neutral-400 hover:text-rose-400 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        // CAMPAIGN DETAILS VIEW
        <>
          {campaignDetails ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedCampId(null);
                      setShowSettingsEdit(false);
                    }}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 rounded-md transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-neutral-100 tracking-tight">{campaignDetails.name}</h2>
                    <span className="text-[10px] text-neutral-550 flex items-center gap-2 mt-0.5">
                      <span>Resume: <strong className="text-neutral-450 font-medium">{campaignDetails.resume?.name || 'None'}</strong></span>
                      <span>•</span>
                      <span>Mode: <strong className="text-neutral-450 font-medium">{campaignDetails.templateType === 'AI_GENERATED' ? 'AI (Grok)' : campaignDetails.templateType === 'SAVED_TEMPLATE' ? 'Saved Template' : 'Manual'}</strong></span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit Settings Toggle */}
                  <button
                    onClick={() => setShowSettingsEdit(!showSettingsEdit)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      showSettingsEdit 
                        ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                        : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Configure Mode
                  </button>

                  {/* Campaign controls */}
                  {campaignDetails.status !== 'SENDING' ? (
                    <button
                      onClick={() => triggerAction('start')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Send
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerAction('pause')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/20 border border-amber-800/40 text-amber-400 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  )}

                  <button
                    onClick={() => triggerAction('generate')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Generate Emails
                  </button>

                  <button
                    onClick={() => triggerAction('retry')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                    title="Retry failures"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Fail
                  </button>

                  <button
                    onClick={() => triggerAction('cancel')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-rose-400 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                    title="Reset to draft"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Edit Settings Panel Block */}
              {showSettingsEdit && (
                <form 
                  onSubmit={handleUpdateCampaignSettings} 
                  className="bg-zinc-900/40 border border-neutral-800 rounded-xl p-5 space-y-4 shadow-inner"
                >
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Configure Campaign Properties</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Campaign Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Campaign Description</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-105 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Outreach Template Mode</label>
                      <select
                        value={editTemplateType}
                        onChange={(e) => setEditTemplateType(e.target.value)}
                        className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
                      >
                        <option value="AI_GENERATED">AI Generated (Grok)</option>
                        <option value="SAVED_TEMPLATE">Saved Custom Template</option>
                        <option value="MANUAL">Manual Setup (Review Individually)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Attach Resume</label>
                      <select
                        value={editResumeId || ''}
                        onChange={(e) => setEditResumeId(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-md border border-neutral-855 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
                      >
                        <option value="">No Resume Attachment</option>
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      {(() => {
                        const selectedResume = resumes.find(r => r.id === editResumeId);
                        if (selectedResume?.description) {
                          return (
                            <div className="text-[10px] text-neutral-450 bg-zinc-950/40 p-2.5 rounded border border-neutral-850 mt-1.5 italic md:col-span-2">
                              <span className="font-bold text-neutral-450 block not-italic mb-0.5">Resume Description:</span>
                              {selectedResume.description}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {editTemplateType === 'SAVED_TEMPLATE' && (
                    <div className="space-y-4 p-4 bg-zinc-950/40 border border-neutral-850 rounded-lg">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Subject Template</label>
                        <input
                          type="text"
                          value={editTemplateSubject}
                          onChange={(e) => setEditTemplateSubject(e.target.value)}
                          placeholder="Opportunities at {company} - {role}"
                          className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-100 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Body Template</label>
                        <textarea
                          value={editTemplateBody}
                          onChange={(e) => setEditTemplateBody(e.target.value)}
                          rows={6}
                          className="rounded-md border border-neutral-850 bg-zinc-950 p-3 text-xs text-neutral-100 focus:outline-none font-mono"
                        />
                        <span className="text-[9px] text-neutral-500 leading-relaxed block">
                          Supports dynamic variables: {"{firstName}, {lastName}, {company}, {role}, {name}, {portfolio}, {github}, {linkedin}, {phone}, {location}"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsEdit(false)}
                      className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-md text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingSettings}
                      className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40"
                    >
                      {isUpdatingSettings ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                  </div>
                </form>
              )}

              {/* Progress Bars */}
              {(() => {
                const total = campaignDetails.contacts?.length || 0;
                if (total === 0) return null;

                const pendingAI = campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0;
                const generating = campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0;
                const sent = campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0;
                const failed = campaignDetails.contacts?.filter(c => c.status === 'FAILED').length || 0;

                const isSendingActive = campaignDetails.status === 'SENDING';

                if (generating > 0) {
                  const completed = total - pendingAI - generating;
                  const percent = Math.min(100, Math.round((completed / total) * 105)) > 100 ? 100 : Math.min(100, Math.round((completed / total) * 100));
                  return (
                    <div className="bg-zinc-900/30 border border-neutral-900 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                        <span className="text-indigo-400 animate-pulse flex items-center gap-1.5 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                          Generative Email Drafting in Progress...
                        </span>
                        <span className="text-neutral-450 font-mono">{completed} / {total} Completed ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-neutral-900">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                if (isSendingActive) {
                  const completed = sent + failed;
                  const percent = Math.min(100, Math.round((completed / total) * 100));
                  return (
                    <div className="bg-zinc-900/30 border border-neutral-900 rounded-xl p-4 space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                        <span className="text-emerald-400 animate-pulse flex items-center gap-1.5 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Campaign Sending Sequence Active...
                        </span>
                        <span className="text-neutral-450 font-mono">{completed} / {total} Delivered ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-neutral-900">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              {/* Status Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {[
                  { label: 'Total', count: campaignDetails.contacts?.length || 0, color: 'text-neutral-400' },
                  { label: 'Pending AI', count: campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0, color: 'text-neutral-500' },
                  { label: 'Generating', count: campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0, color: 'text-indigo-400 animate-pulse' },
                  { label: 'Ready', count: campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND').length || 0, color: 'text-sky-400' },
                  { label: 'Sent', count: campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0, color: 'text-emerald-400' },
                  { label: 'Failed', count: campaignDetails.contacts?.filter(c => c.status === 'FAILED').length || 0, color: 'text-rose-400' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-zinc-900/30 border border-neutral-900 rounded-lg p-3 text-center">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold block">{stat.label}</span>
                    <span className={`text-base font-bold mt-1 block ${stat.color}`}>{stat.count}</span>
                  </div>
                ))}
              </div>

              {/* Import Contacts Section */}
              <div>
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3">Add Contacts</h3>
                <ImportWizard 
                  campaignId={selectedCampId} 
                  onImportComplete={() => fetchCampaignDetails(selectedCampId)} 
                />
              </div>

              {/* Contacts Table List */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-zinc-950/20">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-zinc-950/40">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Contact List</h3>
                  <span className="text-[10px] text-neutral-500 font-medium">Showing {campaignDetails.contacts?.length || 0} entries</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-900 bg-zinc-950/40 text-neutral-500 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="p-4">Contact</th>
                        <th className="p-4">Company</th>
                        <th className="p-4">Role/Title</th>
                        <th className="p-4">Recruiter Filter</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Email Details</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900">
                      {campaignDetails.contacts?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-neutral-500 text-xs">
                            No contacts in this campaign. Upload CSV or paste email list above.
                          </td>
                        </tr>
                      ) : (
                        campaignDetails.contacts?.map((contact) => (
                          <tr key={contact.id} className="hover:bg-neutral-900/30 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-neutral-200">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : 'Recruiter'}
                              </div>
                              <div className="text-[10px] text-neutral-500 font-medium mt-0.5">{contact.email}</div>
                              {contact.duplicateStatus && (
                                <span className={`inline-block text-[8px] font-bold uppercase mt-1 px-1 rounded border ${
                                  contact.duplicateStatus === 'PREVIOUS_CAMPAIGN' 
                                    ? 'bg-amber-950/10 border-amber-900/25 text-amber-500'
                                    : 'bg-zinc-900 border-neutral-800 text-neutral-400'
                                }`}>
                                  Dup: {contact.duplicateStatus}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-neutral-300 font-medium">{contact.company || '—'}</td>
                            <td className="p-4 text-neutral-400 font-medium">{contact.title || contact.role || '—'}</td>
                            <td className="p-4">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                contact.isTechnical
                                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                                  : 'bg-zinc-900 border-neutral-800 text-neutral-500'
                              }`}>
                                {contact.isTechnical ? 'Technical' : 'General'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                contact.status === 'SENT' 
                                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                                  : contact.status === 'READY_TO_SEND'
                                  ? 'bg-sky-950/20 border-sky-800/40 text-sky-400'
                                  : contact.status === 'FAILED'
                                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-400'
                                  : contact.status === 'GENERATING'
                                  ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-400 animate-pulse'
                                  : 'bg-zinc-900 border-neutral-800 text-neutral-400'
                              }`}>
                                {contact.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {contact.emailSubject ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => openContactEditor(contact)}
                                    className="flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-neutral-200 transition-colors"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                                    <span>Review Email</span>
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 text-[10px] text-neutral-450 hover:text-indigo-400 transition-colors"
                                    title="Regenerate this specific email using AI"
                                  >
                                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Regen</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-[10px] text-neutral-600">
                                    <MailQuestion className="w-3 h-3" />
                                    <span>No Email Gen</span>
                                  </span>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 text-[10px] text-neutral-450 hover:text-indigo-400 transition-colors"
                                    title="Generate email for this contact using AI"
                                  >
                                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Generate</span>
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/25 border border-transparent hover:border-rose-900/30 rounded transition-all"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit Contact / Email Preview modal overlay */}
              {editContact && (
                <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-2xl border border-neutral-800 bg-zinc-900/95 rounded-xl p-6 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Review Generated Outreach Email</h3>
                        <p className="text-[10px] text-neutral-500">Contact: {editContact.email}</p>
                      </div>
                      <button
                        onClick={() => handleRegenerateContactAI()}
                        disabled={isSavingContact}
                        className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-[10px] text-neutral-300 font-semibold rounded-md transition-colors disabled:opacity-40"
                      >
                        <Cpu className="w-3.5 h-3.5 text-sky-400" />
                        Regen with AI
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Subject Line</label>
                        <input
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Body Email (HTML/Text)</label>
                        <textarea
                          value={contactBody}
                          onChange={(e) => setContactBody(e.target.value)}
                          rows={10}
                          className="rounded-md border border-neutral-800 bg-zinc-950/40 p-3 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700 font-mono leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${contactSubject}\n\n${contactBody}`);
                          alert('Email details copied to clipboard!');
                        }}
                        type="button"
                        className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 font-medium rounded-md text-[10px] transition-colors"
                      >
                        Copy to Clipboard
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditContact(null)}
                          className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-md text-xs transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveContactEdits}
                          disabled={isSavingContact}
                          className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40"
                        >
                          {isSavingContact ? 'Saving...' : 'Save & Set Ready'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-400 mx-auto"></div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
