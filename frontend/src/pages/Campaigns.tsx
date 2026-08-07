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

  // Active generation tracking
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=30');
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter((l: any) => l.source === 'EMAIL_GENERATION' || l.source === 'EMAIL_SENDING');
        setActivityLogs(filtered);
      }
    } catch (err) {
      console.error('Failed to load activity logs', err);
    }
  };

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
      fetchActivityLogs();
      
      const hasActiveProcess = 
        campaignDetails?.status === 'SENDING' || 
        campaignDetails?.status === 'GENERATING' ||
        campaignDetails?.contacts?.some(c => c.status === 'GENERATING') ||
        isGeneratingEmails;

      const intervalMs = hasActiveProcess ? 3000 : 8000;

      const timer = setInterval(() => {
        fetchCampaignDetails(selectedCampId);
        fetchCampaigns();
        fetchActivityLogs();
      }, intervalMs);

      return () => clearInterval(timer);
    } else {
      setCampaignDetails(null);
    }
  }, [selectedCampId, campaignDetails?.status, campaignDetails?.contacts?.filter(c => c.status === 'GENERATING').length, isGeneratingEmails]);

  // Turn off generation tracking when all pending/generating items are completed
  useEffect(() => {
    if (isGeneratingEmails && campaignDetails) {
      const pendingCount = campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0;
      const generatingCount = campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0;
      if (pendingCount === 0 && generatingCount === 0) {
        setIsGeneratingEmails(false);
      }
    }
  }, [campaignDetails, isGeneratingEmails]);

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

    if (action === 'generate') {
      setIsGeneratingEmails(true);
    }

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Failed to run ${action}`);
      
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      if (action === 'generate') {
        setIsGeneratingEmails(false);
      }
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

  const handleClearEmails = async () => {
    if (!selectedCampId) return;
    if (!confirm('Are you sure you want to delete all generated email drafts for this campaign? Already sent emails will not be affected.')) return;

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/clear-emails`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to clear emails');
      
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Operation failed.');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {!selectedCampId ? (
        // CAMPAIGNS LIST VIEW
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Campaigns</h2>
              <p className="text-xs text-neutral-400 mt-1">Manage and track your job outreach campaigns.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>

          {/* New Campaign Creation Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <form 
                onSubmit={handleCreateCampaign}
                className="w-full max-w-md border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-xl text-slate-900"
              >
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">New Outreach Campaign</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. July Product Startups"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of targeted positions or locations..."
                    rows={3}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Resume PDF *</label>
                  {resumes.length === 0 ? (
                    <div className="text-[10px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      No resumes uploaded. Please upload a PDF resume in settings or resumes tab first.
                    </div>
                  ) : (
                    <>
                      <select
                        value={newResumeId || ''}
                        onChange={(e) => setNewResumeId(Number(e.target.value))}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Outreach Template Mode</label>
                  <select
                    value={newTemplateType}
                    onChange={(e) => setNewTemplateType(e.target.value as any)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  >
                    <option value="AI_GENERATED">AI Generated (Grok)</option>
                    <option value="SAVED_TEMPLATE">Saved Custom Template</option>
                    <option value="MANUAL">Manual Setup (Review Individually)</option>
                  </select>
                </div>

                {newTemplateType === 'SAVED_TEMPLATE' && (
                  <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject Template</label>
                      <input
                        type="text"
                        value={newTemplateSubject}
                        onChange={(e) => setNewTemplateSubject(e.target.value)}
                        placeholder="Opportunities at {company} - {role}"
                        className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Body Template</label>
                      <textarea
                        placeholder="Hi {firstName}, ..."
                        value={newTemplateBody}
                        onChange={(e) => setNewTemplateBody(e.target.value)}
                        rows={5}
                        className="rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || resumes.length === 0}
                    className="px-5 py-2 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40"
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
              <div className="col-span-2 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 text-xs bg-white">
                No outreach campaigns created yet. Click "Create Campaign" to get started.
              </div>
            ) : (
              campaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="border border-slate-200/80 bg-white hover:border-slate-300 rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">{camp.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        camp.status === 'SENDING' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : camp.status === 'COMPLETED'
                          ? 'bg-slate-100 border-slate-300 text-slate-800'
                          : camp.status === 'PAUSED'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}>
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{camp.description || 'No description provided.'}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      Contacts: <span className="text-slate-900 font-bold">{camp.metrics?.total || 0}</span> | Sent: <span className="text-slate-900 font-bold">{camp.metrics?.sent || 0}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCampId(camp.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-800 transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-700 rounded-xl transition-colors cursor-pointer"
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button 
                    onClick={() => {
                      setSelectedCampId(null);
                      setShowSettingsEdit(false);
                    }}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 rounded-md transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-neutral-100 tracking-tight truncate">{campaignDetails.name}</h2>
                    <span className="text-[10px] text-neutral-550 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span>Resume: <strong className="text-neutral-450 font-medium">{campaignDetails.resume?.name || 'None'}</strong></span>
                      <span className="hidden sm:inline">•</span>
                      <span>Mode: <strong className="text-neutral-450 font-medium">{campaignDetails.templateType === 'AI_GENERATED' ? 'AI (Grok)' : campaignDetails.templateType === 'SAVED_TEMPLATE' ? 'Saved Template' : 'Manual'}</strong></span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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
                      className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Send
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerAction('pause')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  )}

                  <button
                    onClick={() => triggerAction('generate')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                    Generate Emails
                  </button>

                  <button
                    onClick={() => triggerAction('retry')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    title="Retry failures"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                    Retry Fail
                  </button>

                  <button
                    onClick={() => triggerAction('cancel')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    title="Reset to draft"
                  >
                    Reset
                  </button>

                  <button
                    onClick={handleClearEmails}
                    disabled={campaignDetails.status === 'SENDING'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer"
                    title="Wipe generated email subjects and bodies back to pending"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Clear Drafts
                  </button>
                </div>
              </div>

              {/* Edit Settings Panel Block */}
              {showSettingsEdit && (
                <form 
                  onSubmit={handleUpdateCampaignSettings} 
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm text-slate-900"
                >
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Configure Campaign Properties</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Campaign Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Campaign Description</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Outreach Template Mode</label>
                      <select
                        value={editTemplateType}
                        onChange={(e) => setEditTemplateType(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      >
                        <option value="AI_GENERATED">AI Generated (Grok)</option>
                        <option value="SAVED_TEMPLATE">Saved Custom Template</option>
                        <option value="MANUAL">Manual Setup (Review Individually)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Attach Resume</label>
                      <select
                        value={editResumeId || ''}
                        onChange={(e) => setEditResumeId(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                      >
                        <option value="">No Resume Attachment</option>
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editTemplateType === 'SAVED_TEMPLATE' && (
                    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject Template</label>
                        <input
                          type="text"
                          value={editTemplateSubject}
                          onChange={(e) => setEditTemplateSubject(e.target.value)}
                          placeholder="Opportunities at {company} - {role}"
                          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Body Template</label>
                        <textarea
                          placeholder="Hi {firstName}, ..."
                          value={editTemplateBody}
                          onChange={(e) => setEditTemplateBody(e.target.value)}
                          rows={6}
                          className="rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSettingsEdit(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingSettings}
                      className="px-5 py-2 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40"
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
                const isGeneratingActive = campaignDetails.status === 'GENERATING' || generating > 0 || (isGeneratingEmails && (generating > 0 || pendingAI > 0));

                if (isGeneratingActive) {
                  const completed = total - pendingAI - generating;
                  const percent = Math.min(100, Math.round((completed / total) * 100));
                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                        <span className="text-slate-800 animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                          Generative Email Drafting in Progress...
                        </span>
                        <span className="text-slate-500 font-mono">{completed} / {total} Completed ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-slate-900 rounded-full transition-all duration-500" 
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
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 shadow-sm">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                        <span className="text-emerald-700 animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                          Campaign Sending Sequence Active...
                        </span>
                        <span className="text-slate-500 font-mono">{completed} / {total} Delivered ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div 
                          className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
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
                  { label: 'Total', count: campaignDetails.contacts?.length || 0, color: 'text-slate-900' },
                  { label: 'Pending AI', count: campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0, color: 'text-slate-500' },
                  { label: 'Generating', count: campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0, color: 'text-slate-800 animate-pulse' },
                  { label: 'Ready', count: campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND').length || 0, color: 'text-slate-900' },
                  { label: 'Sent', count: campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0, color: 'text-emerald-700' },
                  { label: 'Failed', count: campaignDetails.contacts?.filter(c => c.status === 'FAILED').length || 0, color: 'text-rose-700' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-3.5 text-center shadow-xs">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block">{stat.label}</span>
                    <span className={`text-lg font-black mt-1 block ${stat.color}`}>{stat.count}</span>
                  </div>
                ))}
              </div>

              {/* Live Activity logs terminal */}
              <div className="border border-slate-200 bg-slate-900 rounded-2xl overflow-hidden shadow-sm space-y-0 text-white">
                <div className="bg-slate-800/80 px-4 py-2.5 border-b border-slate-700 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Campaign Console
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Real-time activity logs</span>
                </div>
                <div className="p-4 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-300 select-text">
                  {activityLogs.length === 0 ? (
                    <div className="text-slate-500 text-center py-6">No recent outreach events. Start drafting or sending to stream live activity.</div>
                  ) : (
                    activityLogs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString();
                      const isError = log.level === 'ERROR';
                      const isWarn = log.level === 'WARN';
                      return (
                        <div key={log.id} className="flex gap-2.5 items-start">
                          <span className="text-slate-500 flex-shrink-0">[{timeStr}]</span>
                          <span className={`flex-shrink-0 font-bold ${isError ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-slate-300'}`}>
                            [{log.source}]
                          </span>
                          <span className={isError ? 'text-rose-300' : isWarn ? 'text-amber-300' : 'text-slate-200'}>
                            {log.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Import Contacts Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Add Contacts</h3>
                <ImportWizard 
                  campaignId={selectedCampId} 
                  onImportComplete={() => fetchCampaignDetails(selectedCampId)} 
                />
              </div>

              {/* Contacts Table List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Contact List</h3>
                  <span className="text-[10px] text-slate-500 font-medium">Showing {campaignDetails.contacts?.length || 0} entries</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                        <th className="p-4">Contact</th>
                        <th className="p-4">Company</th>
                        <th className="p-4">Role/Title</th>
                        <th className="p-4">Recruiter Filter</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Email Details</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {campaignDetails.contacts?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                            No contacts in this campaign. Upload CSV or paste email list above.
                          </td>
                        </tr>
                      ) : (
                        campaignDetails.contacts?.map((contact) => (
                          <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-900">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : 'Recruiter'}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">{contact.email}</div>
                            </td>
                            <td className="p-4 text-slate-800 font-medium">{contact.company || '—'}</td>
                            <td className="p-4 text-slate-600 font-medium">{contact.title || contact.role || '—'}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                                {contact.isTechnical ? 'Technical' : 'General'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                contact.status === 'SENT' 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : contact.status === 'READY_TO_SEND'
                                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                                  : contact.status === 'FAILED'
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {contact.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {contact.emailSubject ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => openContactEditor(contact)}
                                    className="flex items-center gap-1.5 text-[10px] text-slate-700 hover:text-slate-900 font-bold transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                                    <span>Review Email</span>
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                                    title="Regenerate this specific email using AI"
                                  >
                                    <Cpu className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Regen</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <MailQuestion className="w-3 h-3" />
                                    <span>No Email Gen</span>
                                  </span>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 text-[10px] text-slate-700 hover:text-slate-900 font-bold transition-colors cursor-pointer"
                                    title="Generate email for this contact using AI"
                                  >
                                    <Cpu className="w-3.5 h-3.5 text-slate-700" />
                                    <span>Generate</span>
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-2xl border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-xl text-slate-900">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Review Generated Outreach Email</h3>
                        <p className="text-[10px] text-slate-500">Contact: {editContact.email}</p>
                      </div>
                      <button
                        onClick={() => handleRegenerateContactAI()}
                        disabled={isSavingContact}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] text-slate-800 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <Cpu className="w-3.5 h-3.5 text-slate-700" />
                        Regen with AI
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject Line</label>
                        <input
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Body Email (HTML/Text)</label>
                        <textarea
                          value={contactBody}
                          onChange={(e) => setContactBody(e.target.value)}
                          rows={10}
                          className="rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 font-mono leading-relaxed transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Subject: ${contactSubject}\n\n${contactBody}`);
                          alert('Email details copied to clipboard!');
                        }}
                        type="button"
                        className="px-3.5 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[10px] transition-colors cursor-pointer"
                      >
                        Copy to Clipboard
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditContact(null)}
                          className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveContactEdits}
                          disabled={isSavingContact}
                          className="px-5 py-2 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-40"
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
