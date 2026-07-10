import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  ChevronsRight, 
  Cpu, 
  Check, 
  AlertTriangle,
  FileEdit,
  MailWarning
} from 'lucide-react';
import { Campaign, Contact } from '../types';

export const Outbox: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<number | string>('all');
  const [queue, setQueue] = useState<Contact[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Edit fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      let url = '/api/contacts';
      
      // If we filtered by campaign, fetch that campaign's contacts, otherwise we query all campaigns
      if (selectedCampId !== 'all') {
        const res = await fetch(`/api/campaigns/${selectedCampId}`);
        const data = await res.json();
        // Filter out only contacts in READY_TO_SEND or PENDING status
        const filtered = (data.contacts || []).filter(
          (c: Contact) => c.status === 'READY_TO_SEND' || c.status === 'FAILED'
        );
        setQueue(filtered);
      } else {
        // Fetch all campaigns and aggregate their ready contacts
        const res = await fetch('/api/campaigns');
        const data: Campaign[] = await res.json();
        
        let allReady: Contact[] = [];
        for (const camp of data) {
          const detailsRes = await fetch(`/api/campaigns/${camp.id}`);
          const details = await detailsRes.json();
          const ready = (details.contacts || []).filter(
            (c: Contact) => c.status === 'READY_TO_SEND' || c.status === 'FAILED'
          );
          allReady = [...allReady, ...ready];
        }
        setQueue(allReady);
      }
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load outbox queue', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [selectedCampId]);

  const currentContact = queue[currentIndex] || null;

  // Update text editor when step moves
  useEffect(() => {
    if (currentContact) {
      setSubject(currentContact.emailSubject || '');
      setBody(currentContact.emailBody || '');
    } else {
      setSubject('');
      setBody('');
    }
  }, [currentContact, currentIndex]);

  const handleSaveEdits = async () => {
    if (!currentContact) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/contacts/${currentContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSubject: subject,
          emailBody: body,
          status: 'READY_TO_SEND',
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      // Update local state
      const updatedQueue = [...queue];
      updatedQueue[currentIndex] = {
        ...updatedQueue[currentIndex],
        emailSubject: subject,
        emailBody: body,
        status: 'READY_TO_SEND'
      };
      setQueue(updatedQueue);
      alert('Email edits saved.');
    } catch (err) {
      alert(err || 'Failed to save changes');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!currentContact) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/contacts/${currentContact.id}/regenerate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate email');

      setSubject(data.emailSubject || '');
      setBody(data.emailBody || '');

      const updatedQueue = [...queue];
      updatedQueue[currentIndex] = data;
      setQueue(updatedQueue);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate email');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async () => {
    if (!currentContact) return;
    setIsUpdating(true);

    try {
      // Set status to SKIPPED
      const response = await fetch(`/api/contacts/${currentContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SKIPPED' }),
      });

      if (!response.ok) throw new Error('Failed to skip contact');

      // Remove from queue locally
      const updatedQueue = queue.filter((_, idx) => idx !== currentIndex);
      setQueue(updatedQueue);
      if (currentIndex >= updatedQueue.length && currentIndex > 0) {
        setCurrentIndex(updatedQueue.length - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    alert('Subject and body copied to clipboard!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Outbox Queue Review</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Review, edit, copy, or step through your generated emails before sending them.
          </p>
        </div>

        {/* Campaign Filter Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Filter Campaign:</span>
          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-700"
          >
            <option value="all">All Campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-400 mx-auto"></div>
        </div>
      ) : queue.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-xl p-12 text-center text-neutral-500 text-xs">
          <MailWarning className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
          No emails in the outbox queue. Import contacts and click "AI Gen Email" in Campaigns.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* QUEUE NAVIGATION LIST */}
          <div className="border border-neutral-800 bg-zinc-900/10 rounded-xl p-5 space-y-4 h-fit max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Pending Queue ({queue.length})
            </h3>
            
            <div className="flex flex-col gap-2">
              {queue.map((contact, index) => (
                <button
                  key={contact.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                    index === currentIndex
                      ? 'bg-neutral-900 border-neutral-700 text-neutral-100 font-semibold'
                      : 'bg-zinc-950/20 border-neutral-900/40 text-neutral-400 hover:bg-neutral-900/40 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-semibold truncate max-w-[150px]">
                      {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : 'Recruiter'}
                    </span>
                    <span className={`text-[8px] font-bold px-1 rounded border uppercase ${
                      contact.status === 'FAILED' 
                        ? 'bg-rose-950/25 border-rose-800/40 text-rose-400' 
                        : 'bg-neutral-900 border-neutral-800 text-sky-400'
                    }`}>
                      {contact.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-1">{contact.email}</div>
                  <div className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">{contact.company || 'Unknown Company'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* EMAIL PREVIEW AND EDITOR */}
          <div className="lg:col-span-2 border border-neutral-800 bg-zinc-900/10 rounded-xl p-6 flex flex-col gap-5 justify-between">
            {/* Header info */}
            <div className="border-b border-neutral-900 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-200">
                    To: {currentContact.firstName ? `${currentContact.firstName} ${currentContact.lastName || ''}` : 'Recruiter'} ({currentContact.email})
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Company: <span className="text-neutral-400 font-medium">{currentContact.company || '—'}</span> | Role: <span className="text-neutral-400 font-medium">{currentContact.title || currentContact.role || '—'}</span>
                  </p>
                </div>
                
                {/* Tech Badge */}
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${
                  currentContact.isTechnical
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                    : 'bg-zinc-900 border-neutral-800 text-neutral-500'
                }`}>
                  {currentContact.isTechnical ? 'Technical' : 'General'}
                </span>
              </div>
            </div>

            {/* Editor fields */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Body Email (HTML/Text)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 p-4 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700 font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-wrap gap-3 justify-between items-center border-t border-neutral-900 pt-4 mt-2">
              <div className="flex gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 rounded-md text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 transition-all"
                  title="Copy subject and body"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 rounded-md text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 transition-all"
                >
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  Regenerate
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSkip}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-rose-950/20 hover:border-rose-900/30 text-rose-400 font-semibold rounded-md text-[10px] uppercase tracking-wider transition-all"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                  Skip
                </button>

                <button
                  onClick={handleSaveEdits}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-md text-[10px] uppercase tracking-wider transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Edits
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
