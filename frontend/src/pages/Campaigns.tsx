import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  Plus,
  Trash,
  Play,
  Pause,
  ArrowCounterClockwise,
  Cpu,
  ArrowLeft,
  UserMinus,
  Sparkle,
  PencilSimple,
  Question,
  Lightning,
  CheckCircle,
  MagnifyingGlass,
  X,
  EnvelopeSimple,
  DownloadSimple,
  ShareNetwork,
  Copy,
  Check,
  FileCsv,
  ArrowSquareOut,
  CircleNotch,
  WarningCircle,
  FastForward,
  Prohibit,
  Clock,
  ShieldCheck,
  FilePdf,
  Buildings,
  IdentificationBadge,
  Eye,
  Sliders
} from '@phosphor-icons/react';
import { Campaign, Contact, Resume } from '../types';
import { Glass } from '../components/glass/Glass';
import { ImportWizard } from '../components/ImportWizard';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Campaign | null>(null);

  // Search & filter states
  const [campaignSearch, setCampaignSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('ALL');

  // Share & Export states
  const [shareModalCampaign, setShareModalCampaign] = useState<{ id: number; name: string; contactsCount?: number } | null>(null);
  const [shareToken, setShareToken] = useState<string>('');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Import Shared Campaign Modal states
  const [showImportSharedModal, setShowImportSharedModal] = useState(false);
  const [importShareInput, setImportShareInput] = useState('');
  const [sharedPreviewData, setSharedPreviewData] = useState<any | null>(null);
  const [isLoadingSharedPreview, setIsLoadingSharedPreview] = useState(false);
  const [isImportingShared, setIsImportingShared] = useState(false);
  const [newImportCampName, setNewImportCampName] = useState('');
  
  // Contact list pagination state (50 contacts per batch for smooth scrolling)
  const [visibleContactsCount, setVisibleContactsCount] = useState(50);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create campaign modal form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newResumeId, setNewResumeId] = useState<number | null>(null);
  const [newTemplateType, setNewTemplateType] = useState<'SAVED_TEMPLATE'>('SAVED_TEMPLATE');
  const [newTemplateSubject, setNewTemplateSubject] = useState('Opportunities at {company} - {role} Application');
  const [newTemplateBody, setNewTemplateBody] = useState('Hi {firstName},\n\nI have been following your engineering team at {company} and would love to express interest in the {role} role.\n\nI have attached my resume for your review. You can view my portfolio at {portfolio} and GitHub at {github}.\n\nBest regards,\n{name}');
  const [newAutoSendExtension, setNewAutoSendExtension] = useState(false);
  const [newAutoRemoveGmailExtension, setNewAutoRemoveGmailExtension] = useState(true);
  const [newExcludedEmails, setNewExcludedEmails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit campaign settings state
  const [showSettingsEdit, setShowSettingsEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editResumeId, setEditResumeId] = useState<number | null>(null);
  const [editTemplateType, setEditTemplateType] = useState<string>('SAVED_TEMPLATE');
  const [editTemplateSubject, setEditTemplateSubject] = useState('');
  const [editTemplateBody, setEditTemplateBody] = useState('');
  const [editAutoSendExtension, setEditAutoSendExtension] = useState(false);
  const [editAutoRemoveGmailExtension, setEditAutoRemoveGmailExtension] = useState(true);
  const [editExcludedEmails, setEditExcludedEmails] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isSkippingExcluded, setIsSkippingExcluded] = useState(false);

  // Edit contact modal state
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactBody, setContactBody] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Active generation tracking
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);
  const [isSkippingQueue, setIsSkippingQueue] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Staggered reveal animations
  useEffect(() => {
    if (!containerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.campaign-reveal',
        { y: 18, opacity: 0, filter: 'blur(5px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.45,
          stagger: 0.05,
          ease: 'power3.out',
        }
      );
    });
    return () => mm.revert();
  }, [selectedCampId, campaigns.length]);

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=30');
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const filtered = arr.filter((l: any) => l.source === 'EMAIL_GENERATION' || l.source === 'EMAIL_SENDING');
        setActivityLogs(filtered);
      }
    } catch (err) {
      console.error('Failed to load activity logs', err);
      setActivityLogs([]);
    }
  };

  const fetchCampaigns = async (overrideSearch?: string) => {
    try {
      const q = overrideSearch !== undefined ? overrideSearch : campaignSearch;
      const url = q.trim() ? `/api/campaigns?search=${encodeURIComponent(q.trim())}` : '/api/campaigns';
      const response = await fetch(url);
      if (!response.ok) {
        setCampaigns([]);
        return;
      }
      const data = await response.json();
      setCampaigns(Array.isArray(data) ? data : (data?.campaigns && Array.isArray(data.campaigns) ? data.campaigns : []));
    } catch (err) {
      console.error('Failed to load campaigns list', err);
      setCampaigns([]);
    }
  };

  // Debounce campaign & email search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCampaigns(campaignSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [campaignSearch]);

  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      if (!response.ok) {
        setResumes([]);
        return;
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.resumes && Array.isArray(data.resumes) ? data.resumes : []);
      setResumes(list);
      if (list.length > 0 && !newResumeId) {
        setNewResumeId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load resumes', err);
      setResumes([]);
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
    fetchResumes();

    // Check for shared campaign link in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('import_share') || urlParams.get('share');
    if (shareParam) {
      setImportShareInput(shareParam);
      setShowImportSharedModal(true);
      fetchSharedPreview(shareParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Export contacts as CSV file
  const handleExportCampaignCsv = async (campaignId: number, campaignName: string) => {
    setIsExportingCsv(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/export`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to export CSV');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = campaignName.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `campaign-${cleanName}-contacts.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download contacts CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Open Share modal & generate share token
  const openShareModal = async (camp: { id: number; name: string; contactsCount?: number }) => {
    setShareModalCampaign(camp);
    setShareToken('');
    setCopiedLink(false);
    setCopiedCode(false);
    setCopiedEmails(false);
    setIsGeneratingShare(true);

    try {
      const res = await fetch(`/api/campaigns/${camp.id}/share`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create share link');
      setShareToken(data.shareToken);
    } catch (err: any) {
      alert(err.message || 'Failed to generate share link');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  // Copy all contact emails to clipboard
  const handleCopyEmails = async (campaignId: number) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/export?format=json`);
      const data = await res.json();
      const emails = (data.contacts || []).map((c: any) => c.email).filter(Boolean);
      if (emails.length === 0) {
        alert('No contacts in this campaign to copy.');
        return;
      }
      await navigator.clipboard.writeText(emails.join(', '));
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 2000);
    } catch (err) {
      alert('Failed to copy emails to clipboard');
    }
  };

  // Fetch preview for shared campaign
  const fetchSharedPreview = async (inputToken?: string) => {
    const raw = (inputToken || importShareInput).trim();
    if (!raw) return;

    let clean = raw;
    if (clean.includes('import_share=')) {
      clean = clean.split('import_share=')[1].split('&')[0];
    } else if (clean.includes('share=')) {
      clean = clean.split('share=')[1].split('&')[0];
    }

    setIsLoadingSharedPreview(true);
    try {
      const res = await fetch(`/api/campaigns/share-preview/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load shared campaign preview');
      setSharedPreviewData(data);
      setNewImportCampName(`${data.campaignName} (Shared)`);
    } catch (err: any) {
      alert(err.message || 'Invalid or expired share link/code');
      setSharedPreviewData(null);
    } finally {
      setIsLoadingSharedPreview(false);
    }
  };

  // Confirm import of shared campaign
  const handleConfirmImportShared = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importShareInput.trim()) return;

    setIsImportingShared(true);
    try {
      const res = await fetch('/api/campaigns/import-shared', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken: importShareInput.trim(),
          createNewCampaign: true,
          newCampaignName: newImportCampName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import shared contacts');

      alert(data.message || 'Campaign and contacts imported successfully!');
      setShowImportSharedModal(false);
      setImportShareInput('');
      setSharedPreviewData(null);
      await fetchCampaigns();
      if (data.campaignId) {
        setSelectedCampId(data.campaignId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to import shared campaign');
    } finally {
      setIsImportingShared(false);
    }
  };

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
        fetchCampaigns(campaignSearch);
        fetchActivityLogs();
      }, intervalMs);

      return () => clearInterval(timer);
    } else {
      setCampaignDetails(null);
    }
  }, [selectedCampId, campaignDetails?.status, campaignDetails?.contacts?.filter(c => c.status === 'GENERATING').length, isGeneratingEmails, campaignSearch]);

  // Filtered contacts within the active campaign
  const filteredContacts = (campaignDetails?.contacts || []).filter((contact) => {
    const query = contactSearch.trim().toLowerCase();
    const matchesSearch = !query ||
      contact.email.toLowerCase().includes(query) ||
      (contact.firstName && contact.firstName.toLowerCase().includes(query)) ||
      (contact.lastName && contact.lastName.toLowerCase().includes(query)) ||
      (`${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase().includes(query)) ||
      (contact.company && contact.company.toLowerCase().includes(query)) ||
      (contact.role && contact.role.toLowerCase().includes(query)) ||
      (contact.title && contact.title.toLowerCase().includes(query));

    const matchesStatus = contactStatusFilter === 'ALL' || contact.status === contactStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Reset pagination count when switching campaigns or searching contacts
  useEffect(() => {
    setVisibleContactsCount(50);
  }, [selectedCampId, contactSearch, contactStatusFilter]);

  // Infinite scroll observer to append next 50 contacts when user scrolls down
  useEffect(() => {
    if (!selectedCampId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleContactsCount((prev) => prev + 50);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentSentinel = loadMoreSentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [selectedCampId, filteredContacts.length, visibleContactsCount]);

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
      setEditTemplateType('SAVED_TEMPLATE');
      setEditTemplateSubject(campaignDetails.templateSubject || '');
      setEditTemplateBody(campaignDetails.templateBody || '');
      setEditAutoSendExtension(Boolean(campaignDetails.autoSendExtension));
      setEditAutoRemoveGmailExtension(campaignDetails.autoRemoveGmailExtension !== false);
      setEditExcludedEmails(campaignDetails.excludedEmails || '');
    }
  }, [campaignDetails?.id]);

  const handleToggleAutoSendExtension = async (campaignId: number, currentVal: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newVal = !currentVal;

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, autoSendExtension: newVal } : c));
    if (campaignDetails?.id === campaignId) {
      setCampaignDetails(prev => prev ? { ...prev, autoSendExtension: newVal } : null);
      setEditAutoSendExtension(newVal);
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSendExtension: newVal }),
      });
      if (!response.ok) throw new Error('Failed to toggle auto-send');
    } catch (err: any) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, autoSendExtension: currentVal } : c));
      if (campaignDetails?.id === campaignId) {
        setCampaignDetails(prev => prev ? { ...prev, autoSendExtension: currentVal } : null);
        setEditAutoSendExtension(currentVal);
      }
      alert('Failed to update Auto-Send toggle settings.');
    }
  };

  const handleToggleAutoRemoveGmailExtension = async (campaignId: number, currentVal: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newVal = !currentVal;

    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, autoRemoveGmailExtension: newVal } : c));
    if (campaignDetails?.id === campaignId) {
      setCampaignDetails(prev => prev ? { ...prev, autoRemoveGmailExtension: newVal } : null);
      setEditAutoRemoveGmailExtension(newVal);
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRemoveGmailExtension: newVal }),
      });
      if (!response.ok) throw new Error('Failed to toggle auto-remove @gmail setting');
    } catch (err: any) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, autoRemoveGmailExtension: currentVal } : c));
      if (campaignDetails?.id === campaignId) {
        setCampaignDetails(prev => prev ? { ...prev, autoRemoveGmailExtension: currentVal } : null);
        setEditAutoRemoveGmailExtension(currentVal);
      }
      alert('Failed to update Auto-Remove @gmail toggle.');
    }
  };

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
          templateBody: newTemplateBody,
          autoSendExtension: newAutoSendExtension,
          autoRemoveGmailExtension: newAutoRemoveGmailExtension,
          excludedEmails: newExcludedEmails,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create campaign');

      setNewName('');
      setNewDesc('');
      setNewExcludedEmails('');
      setNewAutoSendExtension(false);
      setNewAutoRemoveGmailExtension(true);
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
          autoSendExtension: editAutoSendExtension,
          autoRemoveGmailExtension: editAutoRemoveGmailExtension,
          excludedEmails: editExcludedEmails,
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

  const handleSkipExcluded = async () => {
    if (!selectedCampId) return;
    setIsSkippingExcluded(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/skip-excluded`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to skip excluded contacts');
      }
      alert(data.message || `Marked ${data.skippedCount || 0} contact(s) as SKIPPED.`);
      await fetchCampaignDetails(selectedCampId);
      await fetchCampaigns();
    } catch (err: any) {
      alert(err.message || 'Failed to scan excluded contacts');
    } finally {
      setIsSkippingExcluded(false);
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

    const prevCampaignDetails = campaignDetails;
    const prevCampaigns = campaigns;

    // Instant optimistic UI updates
    if (action === 'start') {
      setCampaignDetails(prev => prev ? { ...prev, status: 'SENDING' } : null);
      setCampaigns(prev => prev.map(c => c.id === selectedCampId ? { ...c, status: 'SENDING' } : c));
    } else if (action === 'pause') {
      setCampaignDetails(prev => prev ? { ...prev, status: 'PAUSED' } : null);
      setCampaigns(prev => prev.map(c => c.id === selectedCampId ? { ...c, status: 'PAUSED' } : c));
    } else if (action === 'cancel') {
      setCampaignDetails(prev => prev ? { ...prev, status: 'DRAFT' } : null);
      setCampaigns(prev => prev.map(c => c.id === selectedCampId ? { ...c, status: 'DRAFT' } : c));
    } else if (action === 'generate') {
      setIsGeneratingEmails(true);
      setCampaignDetails(prev => prev ? {
        ...prev,
        status: 'GENERATING',
        contacts: prev.contacts?.map(c => (c.status === 'PENDING' || c.status === 'FAILED') ? { ...c, status: 'GENERATING' } : c)
      } : null);
      setCampaigns(prev => prev.map(c => c.id === selectedCampId ? { ...c, status: 'GENERATING' } : c));
    } else if (action === 'retry') {
      setCampaignDetails(prev => prev ? {
        ...prev,
        status: 'SENDING',
        contacts: prev.contacts?.map(c => c.status === 'FAILED' ? { ...c, status: 'READY_TO_SEND' } : c)
      } : null);
      setCampaigns(prev => prev.map(c => c.id === selectedCampId ? { ...c, status: 'SENDING' } : c));
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
      setCampaignDetails(prevCampaignDetails);
      setCampaigns(prevCampaigns);
      if (action === 'generate') {
        setIsGeneratingEmails(false);
      }
      alert(err.message || 'Operation failed.');
    }
  };

  const handleSkipQueue = async () => {
    if (!selectedCampId) return;
    setIsSkippingQueue(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/skip-queue`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to skip queue for next email');
      }
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
      fetchActivityLogs();
    } catch (err: any) {
      alert(err.message || 'Failed to skip queue for next email');
    } finally {
      setIsSkippingQueue(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!confirm('Remove this contact from the campaign?')) return;
    const prevCampaignDetails = campaignDetails;

    setCampaignDetails(prev => prev ? {
      ...prev,
      contacts: prev.contacts?.filter(c => c.id !== contactId)
    } : null);

    try {
      await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (selectedCampId) {
        fetchCampaignDetails(selectedCampId);
        fetchCampaigns();
      }
    } catch (err) {
      setCampaignDetails(prevCampaignDetails);
      console.error(err);
    }
  };

  const openContactEditor = (contact: Contact) => {
    setEditContact(contact);
    setContactSubject(contact.emailSubject || '');
    setContactBody(contact.emailBody || '');
  };

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
          status: 'READY_TO_SEND'
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

    const prevCampaignDetails = campaignDetails;

    setCampaignDetails(prev => prev ? {
      ...prev,
      contacts: prev.contacts?.map(c => c.status !== 'SENT' ? { ...c, emailSubject: null, emailBody: null, status: 'PENDING' } : c)
    } : null);

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/clear-emails`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to clear emails');
      
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      setCampaignDetails(prevCampaignDetails);
      alert(err.message || 'Operation failed.');
    }
  };

  const handleDeleteFailedContacts = async () => {
    if (!selectedCampId) return;
    const failedCount = campaignDetails?.contacts?.filter(c => c.status === 'FAILED' || c.status === 'SKIPPED').length || 0;
    if (failedCount === 0) {
      alert('No failed or skipped contacts to delete.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${failedCount} failed/skipped contact email(s) from this campaign?`)) return;

    const prevCampaignDetails = campaignDetails;
    const prevCampaigns = campaigns;

    setCampaignDetails(prev => prev ? {
      ...prev,
      contacts: prev.contacts?.filter(c => c.status !== 'FAILED' && c.status !== 'SKIPPED')
    } : null);
    setCampaigns(prev => prev.map(c => c.id === selectedCampId ? {
      ...c,
      metrics: c.metrics ? {
        ...c.metrics,
        total: Math.max(0, c.metrics.total - failedCount),
        failed: 0,
        skipped: 0,
      } : undefined
    } : c));

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/failed-contacts`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete failed/skipped contacts');
      
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      setCampaignDetails(prevCampaignDetails);
      setCampaigns(prevCampaigns);
      alert(err.message || 'Operation failed.');
    }
  };

  const isGmailEmail = (email?: string | null): boolean => {
    if (!email) return false;
    const lower = email.toLowerCase().trim();
    return lower.endsWith('@gmail.com') || lower.endsWith('@googlemail.com');
  };

  const [isDeletingGmail, setIsDeletingGmail] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailSearchTerm, setGmailSearchTerm] = useState('');
  const [selectedGmailIds, setSelectedGmailIds] = useState<number[]>([]);
  const [copiedGmailList, setCopiedGmailList] = useState(false);

  const handleOpenGmailModal = () => {
    if (!campaignDetails) return;
    const gmailContacts = (campaignDetails.contacts || []).filter(
      c => isGmailEmail(c.email) && c.status !== 'SENT'
    );
    if (gmailContacts.length === 0) {
      alert('No un-sent @gmail.com contacts found in this campaign.');
      return;
    }
    setSelectedGmailIds(gmailContacts.map(c => c.id));
    setGmailSearchTerm('');
    setCopiedGmailList(false);
    setShowGmailModal(true);
  };

  const handleCopyGmailEmails = async () => {
    if (!campaignDetails) return;
    const gmailContacts = (campaignDetails.contacts || []).filter(
      c => isGmailEmail(c.email) && c.status !== 'SENT'
    );
    const emails = gmailContacts.map(c => c.email).filter(Boolean);
    if (emails.length === 0) return;

    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopiedGmailList(true);
      setTimeout(() => setCopiedGmailList(false), 2000);
    } catch {
      alert('Failed to copy emails to clipboard');
    }
  };

  const handleConfirmRemoveGmail = async () => {
    if (!selectedCampId || !campaignDetails || selectedGmailIds.length === 0) return;

    const idsToRemove = new Set(selectedGmailIds);
    const toRemoveContacts = (campaignDetails.contacts || []).filter(c => idsToRemove.has(c.id));
    const totalToRemove = toRemoveContacts.length;
    const readyToRemove = toRemoveContacts.filter(c => c.status === 'READY_TO_SEND').length;
    const pendingToRemove = toRemoveContacts.filter(c => c.status === 'PENDING').length;

    setIsDeletingGmail(true);
    const prevCampaignDetails = campaignDetails;
    const prevCampaigns = campaigns;

    setCampaignDetails(prev => prev ? {
      ...prev,
      contacts: prev.contacts?.filter(c => !idsToRemove.has(c.id))
    } : null);

    setCampaigns(prev => prev.map(c => c.id === selectedCampId ? {
      ...c,
      metrics: c.metrics ? {
        ...c.metrics,
        total: Math.max(0, c.metrics.total - totalToRemove),
        ready: Math.max(0, c.metrics.ready - readyToRemove),
        pending: Math.max(0, c.metrics.pending - pendingToRemove),
      } : undefined
    } : c));

    try {
      const response = await fetch(`/api/campaigns/${selectedCampId}/gmail-contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedGmailIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove @gmail.com contacts');

      alert(data.message || `Successfully removed ${totalToRemove} @gmail.com contact(s).`);
      setShowGmailModal(false);
      fetchCampaignDetails(selectedCampId);
      fetchCampaigns();
    } catch (err: any) {
      setCampaignDetails(prevCampaignDetails);
      setCampaigns(prevCampaigns);
      alert(err.message || 'Operation failed.');
    } finally {
      setIsDeletingGmail(false);
    }
  };

  return (
    <div ref={containerRef} className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {!selectedCampId ? (
        // ==========================================
        // CAMPAIGNS LIST VIEW
        // ==========================================
        <>
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 campaign-reveal">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-white/90 text-[10px] font-bold text-[#735E50] uppercase tracking-widest shadow-2xs mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B1A] animate-pulse"></span>
                <span>Outreach Workspaces</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#2A1A0F] tracking-tight">Campaigns</h1>
              <p className="text-xs md:text-sm text-[#735E50] mt-1">
                Create, orchestrate, and track high-converting outreach pipelines.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowImportSharedModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] hover:border-[#7C3AED]/50 font-bold rounded-[14px] text-xs text-[#2A1A0F] transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                title="Import campaign contacts shared by another user via link or code"
              >
                <ShareNetwork className="w-4 h-4 text-[#7C3AED]" weight="duotone" />
                <span>Import Shared</span>
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" weight="bold" />
                <span>Create Campaign</span>
              </button>
            </div>
          </div>

          {/* Campaign & Email ID Search Bar */}
          <Glass variant="surface" radius="inner" className="p-3 shadow-sm flex flex-col sm:flex-row items-center gap-3 campaign-reveal">
            <div className="relative flex-1 w-full">
              <MagnifyingGlass className="w-4 h-4 text-[#735E50] absolute left-3.5 top-1/2 -translate-y-1/2" weight="bold" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search campaigns by name, or find an email ID (e.g. recruiter@company.com)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white/80 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
              />
              {campaignSearch && (
                <button
                  type="button"
                  onClick={() => setCampaignSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#735E50] hover:text-[#2A1A0F] rounded-full cursor-pointer hover:bg-black/5"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" weight="bold" />
                </button>
              )}
            </div>
            {campaignSearch.trim() && (
              <div className="text-[11px] font-mono text-[#735E50] flex items-center gap-1.5 self-start sm:self-center px-2 py-1 rounded-[8px] bg-white/60 border border-[rgba(42,26,15,0.06)] shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#1DA365]"></span>
                <span>{campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} matched</span>
              </div>
            )}
          </Glass>

          {/* New Campaign Creation Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 z-50 bg-[#2A1A0F]/50 backdrop-blur-md flex items-center justify-center p-4">
              <Glass variant="strong" radius="outer" className="w-full max-w-xl p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] text-[#2A1A0F] max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-[rgba(42,26,15,0.08)]">
                  <div>
                    <h3 className="text-base font-bold text-[#2A1A0F] tracking-tight">New Outreach Campaign</h3>
                    <p className="text-[11px] text-[#735E50] mt-0.5">Configure your outreach target, resume attachment, and automated actions.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="p-1.5 rounded-full hover:bg-[rgba(42,26,15,0.06)] text-[#735E50] hover:text-[#2A1A0F] transition-colors"
                  >
                    <X className="w-4 h-4" weight="bold" />
                  </button>
                </div>
                
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Campaign Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. July Product Startups"
                      className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Brief description of targeted positions or locations..."
                      rows={2}
                      className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                      Select Resume PDF *
                    </label>
                    {resumes.length === 0 ? (
                      <div className="text-[11px] text-[#D97706] bg-[#D97706]/10 p-3 rounded-[14px] border border-[#D97706]/20">
                        No resumes uploaded yet. Please upload a PDF resume in Settings or Resumes tab first.
                      </div>
                    ) : (
                      <select
                        value={newResumeId || ''}
                        onChange={(e) => setNewResumeId(Number(e.target.value))}
                        className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                      >
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Auto-Send Switch */}
                  <Glass variant="nested" radius="control" className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                        <Lightning className="w-4 h-4 text-[#FF6B1A]" weight="fill" />
                        Auto-Send Extension Leads
                      </div>
                      <div className="text-[10.5px] text-[#735E50] mt-0.5">
                        Automatically generate email & dispatch via Gmail when leads are added via extension.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewAutoSendExtension(!newAutoSendExtension)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        newAutoSendExtension ? 'bg-[#1DA365]' : 'bg-[rgba(42,26,15,0.18)]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          newAutoSendExtension ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </Glass>

                  {/* Template Editor Box */}
                  <Glass variant="nested" radius="control" className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#2A1A0F] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                        Custom Email Template
                      </span>
                      <span className="text-[9.5px] text-[#735E50] font-mono">{"{firstName}"}, {"{company}"}, {"{role}"}, {"{name}"}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Subject Template</label>
                      <input
                        type="text"
                        value={newTemplateSubject}
                        onChange={(e) => setNewTemplateSubject(e.target.value)}
                        placeholder="Opportunities at {company} - {role}"
                        className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white px-3.5 py-2 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] transition-all shadow-inner"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Body Template</label>
                      <textarea
                        placeholder="Hi {firstName}, ..."
                        value={newTemplateBody}
                        onChange={(e) => setNewTemplateBody(e.target.value)}
                        rows={4}
                        className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white p-3 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] font-mono transition-all shadow-inner leading-relaxed"
                      />
                    </div>
                  </Glass>

                  {/* Auto-Remove @gmail Switch */}
                  <Glass variant="nested" radius="control" className="p-3.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                        <EnvelopeSimple className="w-4 h-4 text-[#E63946]" weight="duotone" />
                        Auto-Remove @gmail from Extension
                      </div>
                      <div className="text-[10.5px] text-[#735E50] mt-0.5">
                        Automatically drop personal @gmail.com addresses when leads are synced from Chrome extension.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewAutoRemoveGmailExtension(!newAutoRemoveGmailExtension)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        newAutoRemoveGmailExtension ? 'bg-[#E63946]' : 'bg-[rgba(42,26,15,0.18)]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          newAutoRemoveGmailExtension ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </Glass>

                  {/* Excluded Domains Textarea */}
                  <div className="flex flex-col gap-1.5 p-3.5 rounded-[16px] bg-[#E63946]/5 border border-[#E63946]/20">
                    <label className="text-[10px] text-[#A01B26] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Prohibit className="w-3.5 h-3.5 text-[#E63946]" weight="bold" />
                      Excluded Domains & Emails (Do Not Contact)
                    </label>
                    <textarea
                      value={newExcludedEmails}
                      onChange={(e) => setNewExcludedEmails(e.target.value)}
                      placeholder="e.g. @competitor.com, .corp.example.com, .edu, hr@company.com"
                      rows={2}
                      className="rounded-[12px] border border-[#E63946]/20 bg-white px-3.5 py-2 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:border-[#E63946] font-mono transition-all shadow-inner"
                    />
                    <span className="text-[10px] text-[#735E50]">
                      Domain suffixes (e.g. <code className="text-[#2A1A0F] font-bold">@competitor.com</code>) or exact emails to block. The engine will skip them.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2.5 bg-white/80 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] font-bold rounded-[14px] text-xs border border-[rgba(42,26,15,0.12)] transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || resumes.length === 0}
                      className="px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] cursor-pointer disabled:opacity-40"
                    >
                      {isSubmitting ? 'Creating...' : 'Create Campaign'}
                    </button>
                  </div>
                </form>
              </Glass>
            </div>
          )}

          {/* Campaigns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.length === 0 ? (
              <Glass variant="surface" radius="outer" className="col-span-2 border-2 border-dashed border-[rgba(42,26,15,0.15)] p-12 text-center text-[#735E50] text-xs space-y-3 campaign-reveal">
                {campaignSearch.trim() ? (
                  <>
                    <EnvelopeSimple className="w-10 h-10 text-[#9C8E84] mx-auto" weight="duotone" />
                    <p className="font-bold text-sm text-[#2A1A0F]">No campaigns or email IDs match "{campaignSearch}"</p>
                    <p className="text-[11px] text-[#735E50]">Try searching for a different email address or campaign name.</p>
                    <button
                      type="button"
                      onClick={() => setCampaignSearch('')}
                      className="mt-2 px-4 py-2 bg-white/90 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-xs transition-colors cursor-pointer shadow-2xs"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <EnvelopeSimple className="w-10 h-10 text-[#FF6B1A] mx-auto" weight="duotone" />
                    <p className="font-bold text-sm text-[#2A1A0F]">No outreach campaigns created yet.</p>
                    <p className="text-[11px] text-[#735E50]">Click "Create Campaign" above to launch your first job outreach pipeline.</p>
                  </>
                )}
              </Glass>
            ) : (
              campaigns.map((camp) => (
                <Glass 
                  key={camp.id} 
                  variant="surface"
                  radius="outer"
                  interactive
                  className="p-6 md:p-7 flex flex-col justify-between campaign-reveal transition-all duration-200"
                >
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="font-extrabold text-[#2A1A0F] text-base tracking-tight">{camp.name}</h3>
                        <p className="text-[11.5px] text-[#735E50] line-clamp-2 leading-relaxed mt-1">
                          {camp.description || 'No description provided.'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-[10px] text-[10px] font-bold border uppercase shrink-0 flex items-center gap-1.5 ${
                        camp.status === 'SENDING' 
                          ? 'bg-[#1DA365]/10 border-[#1DA365]/30 text-[#1DA365]' 
                          : camp.status === 'COMPLETED'
                          ? 'bg-[#2A1A0F]/10 border-[#2A1A0F]/20 text-[#2A1A0F]'
                          : camp.status === 'PAUSED'
                          ? 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
                          : 'bg-[rgba(42,26,15,0.06)] border-[rgba(42,26,15,0.12)] text-[#735E50]'
                      }`}>
                        {camp.status === 'SENDING' && <span className="w-1.5 h-1.5 rounded-full bg-[#1DA365] animate-ping" />}
                        {camp.status}
                      </span>
                    </div>

                    {/* Matching Email IDs chip list if searched */}
                    {camp.matchingContacts && camp.matchingContacts.length > 0 && (
                      <Glass variant="nested" radius="control" className="mt-2.5 p-3 space-y-2 bg-[#7C3AED]/5 border-[#7C3AED]/20">
                        <div className="text-[10px] font-bold text-[#7C3AED] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <EnvelopeSimple className="w-3.5 h-3.5 text-[#7C3AED]" weight="duotone" />
                            <span>Matching leads found in this campaign:</span>
                          </span>
                          <span className="text-[9.5px] font-mono text-[#7C3AED] font-bold">
                            {camp.matchingContacts.length} matched
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {camp.matchingContacts.map((mc: any) => (
                            <button
                              key={mc.id}
                              type="button"
                              onClick={() => {
                                setContactSearch(mc.email);
                                setSelectedCampId(camp.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#FF6B1A] hover:text-white border border-[rgba(42,26,15,0.12)] hover:border-[#FF6B1A] rounded-[8px] text-[10px] font-medium text-[#2A1A0F] transition-all cursor-pointer shadow-2xs group"
                              title={`Open campaign and view contact: ${mc.email}`}
                            >
                              <span className="font-mono">{mc.email}</span>
                              <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                mc.status === 'SENT' ? 'bg-[#1DA365]/15 text-[#146C43] group-hover:bg-white/20 group-hover:text-white' :
                                mc.status === 'READY_TO_SEND' ? 'bg-[rgba(42,26,15,0.08)] text-[#2A1A0F] group-hover:bg-white/20 group-hover:text-white' :
                                mc.status === 'FAILED' ? 'bg-[#E63946]/15 text-[#A01B26] group-hover:bg-white/20 group-hover:text-white' :
                                'bg-[rgba(42,26,15,0.06)] text-[#735E50] group-hover:bg-white/20 group-hover:text-white'
                              }`}>
                                {mc.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      </Glass>
                    )}

                    {/* Auto-Send Extension Lead Toggle */}
                    <div className="pt-3 border-t border-[rgba(42,26,15,0.08)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2A1A0F]">
                        <Lightning className={`w-3.5 h-3.5 ${camp.autoSendExtension ? 'text-[#FF6B1A]' : 'text-[#735E50]'}`} weight={camp.autoSendExtension ? 'fill' : 'regular'} />
                        <span>Auto-Send Extension Leads</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoSendExtension(camp.id, Boolean(camp.autoSendExtension), e)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          camp.autoSendExtension ? 'bg-[#1DA365]' : 'bg-[rgba(42,26,15,0.18)]'
                        }`}
                        title={camp.autoSendExtension ? 'Auto-Send ON: Extension leads auto-generate & send mail' : 'Auto-Send OFF: Extension leads added as pending'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            camp.autoSendExtension ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Auto-Remove @gmail Extension Lead Toggle */}
                    <div className="pt-2 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#2A1A0F]">
                        <EnvelopeSimple className={`w-3.5 h-3.5 ${camp.autoRemoveGmailExtension !== false ? 'text-[#E63946]' : 'text-[#735E50]'}`} weight="duotone" />
                        <span>Auto-Remove @gmail Leads</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleToggleAutoRemoveGmailExtension(camp.id, camp.autoRemoveGmailExtension !== false, e)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          camp.autoRemoveGmailExtension !== false ? 'bg-[#E63946]' : 'bg-[rgba(42,26,15,0.18)]'
                        }`}
                        title={camp.autoRemoveGmailExtension !== false ? 'Auto-Remove ON: @gmail.com leads from extension are automatically dropped' : 'Auto-Remove OFF: @gmail.com leads from extension are kept'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            camp.autoRemoveGmailExtension !== false ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Metrics & Actions */}
                  <div className="mt-5 pt-3.5 border-t border-[rgba(42,26,15,0.08)] flex justify-between items-center gap-2">
                    <div className="text-[11px] text-[#735E50] font-bold uppercase tracking-wider">
                      Contacts: <span className="text-[#2A1A0F] font-extrabold">{camp.metrics?.total || 0}</span> | Sent: <span className="text-[#1DA365] font-extrabold">{camp.metrics?.sent || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (campaignSearch.trim()) {
                            setContactSearch(campaignSearch.trim());
                          }
                          setSelectedCampId(camp.id);
                        }}
                        className="px-3.5 py-1.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white rounded-[10px] text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                      >
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCampaignCsv(camp.id, camp.name)}
                        className="p-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#735E50] hover:text-[#2A1A0F] rounded-[10px] transition-all cursor-pointer shadow-2xs"
                        title="Export Contacts as CSV"
                      >
                        <DownloadSimple className="w-3.5 h-3.5" weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareModal({ id: camp.id, name: camp.name, contactsCount: camp.metrics?.total || 0 })}
                        className="p-2 bg-white/80 hover:bg-[#7C3AED]/10 border border-[rgba(42,26,15,0.12)] hover:border-[#7C3AED]/30 text-[#735E50] hover:text-[#7C3AED] rounded-[10px] transition-all cursor-pointer shadow-2xs"
                        title="Share Campaign Contacts"
                      >
                        <ShareNetwork className="w-3.5 h-3.5" weight="duotone" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                        className="p-2 bg-white/80 hover:bg-[#E63946]/10 border border-[rgba(42,26,15,0.12)] hover:border-[#E63946]/30 text-[#735E50] hover:text-[#E63946] rounded-[10px] transition-all cursor-pointer shadow-2xs"
                        title="Delete Campaign"
                      >
                        <Trash className="w-3.5 h-3.5" weight="bold" />
                      </button>
                    </div>
                  </div>
                </Glass>
              ))
            )}
          </div>
        </>
      ) : (
        // ==========================================
        // CAMPAIGN DETAILS VIEW
        // ==========================================
        <>
          {campaignDetails ? (
            <div className="space-y-6">
              {/* Header Cockpit */}
              <Glass variant="surface" radius="outer" className="p-5 md:p-6 shadow-sm campaign-reveal">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[rgba(42,26,15,0.08)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      onClick={() => {
                        setSelectedCampId(null);
                        setShowSettingsEdit(false);
                        setContactSearch('');
                        setContactStatusFilter('ALL');
                      }}
                      className="p-2.5 bg-white/90 hover:bg-white text-[#2A1A0F] border border-[rgba(42,26,15,0.12)] hover:border-[#FF6B1A] rounded-[14px] transition-all flex-shrink-0 cursor-pointer shadow-xs active:scale-[0.97]"
                      title="Back to all campaigns"
                    >
                      <ArrowLeft className="w-4 h-4" weight="bold" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-extrabold text-[#2A1A0F] tracking-tight truncate">{campaignDetails.name}</h2>
                        <span className={`px-2 py-0.5 rounded-[8px] text-[9.5px] font-bold border uppercase shrink-0 ${
                          campaignDetails.status === 'SENDING' 
                            ? 'bg-[#1DA365]/10 border-[#1DA365]/30 text-[#1DA365]' 
                            : campaignDetails.status === 'COMPLETED'
                            ? 'bg-[#2A1A0F]/10 border-[#2A1A0F]/20 text-[#2A1A0F]'
                            : campaignDetails.status === 'PAUSED'
                            ? 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
                            : 'bg-[rgba(42,26,15,0.06)] border-[rgba(42,26,15,0.12)] text-[#735E50]'
                        }`}>
                          {campaignDetails.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#735E50] flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
                        <span className="inline-flex items-center gap-1">
                          <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                          Resume: <strong className="text-[#2A1A0F] font-bold">{campaignDetails.resume?.name || 'None'}</strong>
                        </span>
                        <span>•</span>
                        <span>Mode: <strong className="text-[#2A1A0F] font-bold">Custom Template</strong></span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Lightning className={`w-3.5 h-3.5 ${campaignDetails.autoSendExtension ? 'text-[#FF6B1A]' : 'text-[#735E50]'}`} weight={campaignDetails.autoSendExtension ? 'fill' : 'regular'} />
                          <span>Auto-Send: <strong className={campaignDetails.autoSendExtension ? 'text-[#1DA365] font-bold' : 'text-[#735E50]'}>{campaignDetails.autoSendExtension ? 'ON' : 'OFF'}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <EnvelopeSimple className={`w-3.5 h-3.5 ${campaignDetails.autoRemoveGmailExtension !== false ? 'text-[#E63946]' : 'text-[#735E50]'}`} weight="duotone" />
                          <span>Auto-Remove @gmail: <strong className={campaignDetails.autoRemoveGmailExtension !== false ? 'text-[#E63946] font-bold' : 'text-[#735E50]'}>{campaignDetails.autoRemoveGmailExtension !== false ? 'ON' : 'OFF'}</strong></span>
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Edit Settings Toggle */}
                    <button
                      onClick={() => setShowSettingsEdit(!showSettingsEdit)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-[12px] text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                        showSettingsEdit 
                          ? 'bg-[#2A1A0F] border-[#2A1A0F] text-white'
                          : 'bg-white/80 border-[rgba(42,26,15,0.12)] text-[#2A1A0F] hover:bg-white hover:border-[#2A1A0F]'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" weight="bold" />
                      <span>Configure Mode</span>
                    </button>

                    {/* Campaign controls */}
                    {campaignDetails.status !== 'SENDING' ? (
                      <button
                        onClick={() => triggerAction('start')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_12px_-2px_rgba(255,107,26,0.35)] active:scale-[0.98]"
                      >
                        <Play className="w-3.5 h-3.5" weight="fill" />
                        <span>Start Send</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerAction('pause')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#D97706]/10 border border-[#D97706]/30 text-[#D97706] hover:bg-[#D97706]/20 font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Pause className="w-3.5 h-3.5" weight="fill" />
                        <span>Pause</span>
                      </button>
                    )}

                    {/* Skip Queue Button for next email */}
                    <button
                      onClick={handleSkipQueue}
                      disabled={isSkippingQueue || (campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND' || c.status === 'FAILED').length || 0) === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                      title="Skip queue delay for the next email only (single use). Normal delays resume for following emails."
                    >
                      <FastForward className="w-3.5 h-3.5 text-[#7C3AED]" weight="bold" />
                      <span>{isSkippingQueue ? 'Skipping...' : 'Skip Queue (Next)'}</span>
                    </button>

                    <button
                      onClick={() => triggerAction('generate')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                    >
                      <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                      <span>Generate</span>
                    </button>

                    <button
                      onClick={() => triggerAction('retry')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Retry failures"
                    >
                      <ArrowCounterClockwise className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />
                      <span>Retry</span>
                    </button>

                    <button
                      onClick={() => triggerAction('cancel')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-[#E63946]/10 border border-[rgba(42,26,15,0.12)] hover:border-[#E63946]/30 text-[#735E50] hover:text-[#E63946] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Reset to draft"
                    >
                      <span>Reset</span>
                    </button>

                    <button
                      onClick={handleClearEmails}
                      disabled={campaignDetails.status === 'SENDING'}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-[#E63946]/10 border border-[rgba(42,26,15,0.12)] hover:border-[#E63946]/30 text-[#735E50] hover:text-[#E63946] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Wipe generated email subjects and bodies back to pending"
                    >
                      <Trash className="w-3.5 h-3.5 text-[#E63946]" weight="bold" />
                      <span>Clear Drafts</span>
                    </button>

                    <button
                      onClick={handleDeleteFailedContacts}
                      disabled={campaignDetails.status === 'SENDING' || (campaignDetails.contacts?.filter(c => c.status === 'FAILED' || c.status === 'SKIPPED').length || 0) === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#E63946]/10 hover:bg-[#E63946]/20 border border-[#E63946]/25 text-[#E63946] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Delete all failed or skipped contact email ids from this campaign"
                    >
                      <Trash className="w-3.5 h-3.5 text-[#E63946]" weight="bold" />
                      <span>Delete Failed ({campaignDetails.contacts?.filter(c => c.status === 'FAILED' || c.status === 'SKIPPED').length || 0})</span>
                    </button>

                    {/* Remove @gmail.com Contacts Button */}
                    {(() => {
                      const gmailCount = (campaignDetails.contacts || []).filter(
                        c => isGmailEmail(c.email) && c.status !== 'SENT'
                      ).length;

                      return (
                        <button
                          onClick={handleOpenGmailModal}
                          disabled={campaignDetails.status === 'SENDING' || gmailCount === 0 || isDeletingGmail}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#E63946]/10 hover:bg-[#E63946]/20 border border-[#E63946]/25 text-[#E63946] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs active:scale-[0.98]"
                          title={gmailCount > 0 ? `Review & remove ${gmailCount} @gmail.com contacts` : 'No @gmail.com contacts to remove'}
                        >
                          <UserMinus className="w-3.5 h-3.5 text-[#E63946]" weight="bold" />
                          <span>{isDeletingGmail ? 'Removing...' : `Remove @gmail (${gmailCount})`}</span>
                        </button>
                      );
                    })()}

                    {/* Toggle: Auto-Remove @gmail from extension */}
                    <button
                      type="button"
                      onClick={() => handleToggleAutoRemoveGmailExtension(campaignDetails.id, campaignDetails.autoRemoveGmailExtension !== false)}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-[12px] text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98] ${
                        campaignDetails.autoRemoveGmailExtension !== false
                          ? 'bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]'
                          : 'bg-white/80 border-[rgba(42,26,15,0.12)] text-[#735E50] hover:bg-white'
                      }`}
                    >
                      <EnvelopeSimple className="w-3.5 h-3.5" weight="duotone" />
                      <span>Auto-Remove @gmail: <strong>{campaignDetails.autoRemoveGmailExtension !== false ? 'ON' : 'OFF'}</strong></span>
                    </button>

                    {/* Export Contacts CSV */}
                    <button
                      onClick={() => handleExportCampaignCsv(campaignDetails.id, campaignDetails.name)}
                      disabled={isExportingCsv}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Export contacts as CSV file"
                    >
                      <DownloadSimple className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />
                      <span>Export CSV</span>
                    </button>

                    {/* Share Contacts */}
                    <button
                      onClick={() => openShareModal({ id: campaignDetails.id, name: campaignDetails.name, contactsCount: campaignDetails.contacts?.length || 0 })}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                      title="Share campaign contacts with others via link or code"
                    >
                      <ShareNetwork className="w-3.5 h-3.5 text-[#7C3AED]" weight="duotone" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* Do-Not-Contact / Excluded Domains Banner */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2.5 bg-[#E63946]/10 text-[#E63946] rounded-[14px] border border-[#E63946]/20 shrink-0">
                      <Prohibit className="w-4 h-4" weight="bold" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-2">
                        <span>Excluded Domains & Emails (Do Not Contact)</span>
                        {campaignDetails.excludedEmails ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/25">
                            {campaignDetails.excludedEmails.split(/[\n,;]+/).filter(Boolean).length} rule(s) configured
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#735E50] font-normal">None configured yet</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#735E50] mt-0.5 leading-snug">
                        Domain suffixes (e.g. <code className="font-mono text-[#2A1A0F] bg-white/70 px-1 py-0.5 rounded">@competitor.com</code>) or exact emails are automatically skipped.
                      </p>
                      {campaignDetails.excludedEmails && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {campaignDetails.excludedEmails.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean).slice(0, 5).map((pat, idx) => (
                            <span key={idx} className="inline-flex items-center text-[9px] font-mono bg-white/80 text-[#2A1A0F] px-2 py-0.5 rounded-[6px] border border-[rgba(42,26,15,0.08)]">
                              {pat}
                            </span>
                          ))}
                          {campaignDetails.excludedEmails.split(/[\n,;]+/).filter(Boolean).length > 5 && (
                            <span className="text-[9px] text-[#735E50] self-center">
                              +{campaignDetails.excludedEmails.split(/[\n,;]+/).filter(Boolean).length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setShowSettingsEdit(true)}
                      className="px-3.5 py-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                    >
                      {campaignDetails.excludedEmails ? 'Edit Exclusions' : '+ Add Exclusion'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipExcluded}
                      disabled={isSkippingExcluded || !campaignDetails.excludedEmails}
                      className="px-3.5 py-1.5 bg-[#E63946]/10 hover:bg-[#E63946]/20 border border-[#E63946]/25 text-[#E63946] font-bold rounded-[12px] text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                      title="Scan this campaign now and mark matching un-sent leads as SKIPPED"
                    >
                      {isSkippingExcluded ? 'Scanning...' : 'Apply & Skip Leads'}
                    </button>
                  </div>
                </div>
              </Glass>

              {/* Edit Settings Panel Block */}
              {showSettingsEdit && (
                <Glass variant="surface" radius="outer" className="p-6 md:p-8 space-y-4 shadow-sm text-[#2A1A0F] campaign-reveal">
                  <div className="flex justify-between items-center pb-2 border-b border-[rgba(42,26,15,0.08)]">
                    <h3 className="text-sm font-bold text-[#2A1A0F] uppercase tracking-wider">Configure Campaign Properties</h3>
                    <button
                      type="button"
                      onClick={() => setShowSettingsEdit(false)}
                      className="text-[#735E50] hover:text-[#2A1A0F] p-1"
                    >
                      <X className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleUpdateCampaignSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Campaign Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Campaign Description</label>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Outreach Template Mode</label>
                        <select
                          value={editTemplateType}
                          onChange={(e) => setEditTemplateType(e.target.value)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                        >
                          <option value="SAVED_TEMPLATE">Custom Template</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                          Attach Resume PDF
                        </label>
                        <select
                          value={editResumeId || ''}
                          onChange={(e) => setEditResumeId(e.target.value ? Number(e.target.value) : null)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                        >
                          <option value="">No Resume Attachment</option>
                          {resumes.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                          ))}
                        </select>
                      </div>

                      <Glass variant="nested" radius="control" className="p-3.5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                            <Lightning className="w-4 h-4 text-[#FF6B1A]" weight="fill" />
                            Auto-Send Extension Leads
                          </div>
                          <div className="text-[10px] text-[#735E50] mt-0.5">
                            Auto-generate email & send mail via Gmail when leads added by extension
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAutoSendExtension(!editAutoSendExtension)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editAutoSendExtension ? 'bg-[#1DA365]' : 'bg-[rgba(42,26,15,0.18)]'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              editAutoSendExtension ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </Glass>
                    </div>

                    <Glass variant="nested" radius="control" className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                          <EnvelopeSimple className="w-4 h-4 text-[#E63946]" weight="duotone" />
                          Auto-Remove @gmail from Extension
                        </div>
                        <div className="text-[10px] text-[#735E50] mt-0.5">
                          Automatically drop personal @gmail.com addresses when leads are synced from extension
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditAutoRemoveGmailExtension(!editAutoRemoveGmailExtension)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          editAutoRemoveGmailExtension ? 'bg-[#E63946]' : 'bg-[rgba(42,26,15,0.18)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            editAutoRemoveGmailExtension ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </Glass>

                    <Glass variant="nested" radius="control" className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#2A1A0F] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                          Custom Email Template
                        </span>
                        <span className="text-[9.5px] text-[#735E50] font-mono">Variables: {"{firstName}"}, {"{company}"}, {"{role}"}, {"{name}"}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Subject Template</label>
                        <input
                          type="text"
                          value={editTemplateSubject}
                          onChange={(e) => setEditTemplateSubject(e.target.value)}
                          placeholder="Opportunities at {company} - {role}"
                          className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white px-3.5 py-2 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] transition-all shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Body Template</label>
                        <textarea
                          placeholder="Hi {firstName}, ..."
                          value={editTemplateBody}
                          onChange={(e) => setEditTemplateBody(e.target.value)}
                          rows={6}
                          className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white p-3 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] font-mono transition-all shadow-inner leading-relaxed"
                        />
                      </div>
                    </Glass>

                    <div className="flex flex-col gap-1.5 p-3.5 rounded-[16px] bg-[#E63946]/5 border border-[#E63946]/20">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-[#A01B26] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Prohibit className="w-3.5 h-3.5 text-[#E63946]" weight="bold" />
                          Excluded Domains & Emails (Do Not Contact)
                        </label>
                        <button
                          type="button"
                          onClick={handleSkipExcluded}
                          disabled={isSkippingExcluded}
                          className="text-[9.5px] font-bold px-2.5 py-1 bg-white hover:bg-[#E63946]/10 text-[#E63946] border border-[#E63946]/25 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
                          title="Scan active contacts and immediately set matching ones to SKIPPED"
                        >
                          {isSkippingExcluded ? 'Scanning...' : 'Skip Matching Leads Now'}
                        </button>
                      </div>
                      <textarea
                        value={editExcludedEmails}
                        onChange={(e) => setEditExcludedEmails(e.target.value)}
                        placeholder="e.g. @competitor.com, .corp.example.com, .edu, hr@company.com"
                        rows={2}
                        className="rounded-[12px] border border-[#E63946]/20 bg-white px-3.5 py-2 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:border-[#E63946] font-mono transition-all shadow-inner"
                      />
                      <span className="text-[10px] text-[#735E50]">
                        Enter domain suffixes like <code className="text-[#A01B26] bg-white px-1 rounded border border-[#E63946]/20 font-mono">@competitor.com</code> or specific emails to block (comma/newline separated).
                      </span>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowSettingsEdit(false)}
                        className="px-4 py-2.5 bg-white/80 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] font-bold rounded-[14px] text-xs border border-[rgba(42,26,15,0.12)] transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingSettings}
                        className="px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] cursor-pointer disabled:opacity-40"
                      >
                        {isUpdatingSettings ? 'Saving Settings...' : 'Save Settings'}
                      </button>
                    </div>
                  </form>
                </Glass>
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
                    <Glass variant="surface" radius="inner" className="p-5 space-y-2.5 shadow-sm campaign-reveal">
                      <div className="flex justify-between items-center text-[10.5px] uppercase font-bold tracking-wider">
                        <span className="text-[#FF6B1A] animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-ping" />
                          Generative Email Drafting in Progress...
                        </span>
                        <span className="text-[#735E50] font-mono">{completed} / {total} Completed ({percent}%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden border border-[rgba(42,26,15,0.08)]">
                        <div 
                          className="h-full bg-[#FF6B1A] rounded-full transition-all duration-500 shadow-sm" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </Glass>
                  );
                }

                if (isSendingActive) {
                  const completed = sent + failed;
                  const percent = Math.min(100, Math.round((completed / total) * 100));
                  return (
                    <Glass variant="surface" radius="inner" className="p-5 space-y-3 shadow-sm campaign-reveal">
                      <div className="flex flex-wrap justify-between items-center gap-2 text-[10.5px] uppercase font-bold tracking-wider">
                        <span className="text-[#1DA365] animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#1DA365] animate-ping" />
                          Campaign Sending Sequence Active...
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSkipQueue}
                            disabled={isSkippingQueue || (campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND' || c.status === 'FAILED').length || 0) === 0}
                            className="flex items-center gap-1 px-3 py-1 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] rounded-[8px] text-[9.5px] font-bold uppercase tracking-wider transition-all shadow-2xs cursor-pointer disabled:opacity-40"
                            title="Skip the queue wait time for the next email only"
                          >
                            <FastForward className="w-3 h-3 text-[#7C3AED]" weight="bold" />
                            <span>{isSkippingQueue ? 'Skipping...' : 'Skip Queue (Next)'}</span>
                          </button>
                          <span className="text-[#735E50] font-mono">{completed} / {total} Delivered ({percent}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden border border-[rgba(42,26,15,0.08)]">
                        <div 
                          className="h-full bg-[#1DA365] rounded-full transition-all duration-500 shadow-sm" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </Glass>
                  );
                }

                return null;
              })()}

              {/* Status Metrics Ribbon (7 Bento Tiles) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 campaign-reveal">
                {[
                  { label: 'Total', count: campaignDetails.contacts?.length || 0, color: 'text-[#2A1A0F]' },
                  { label: 'Pending AI', count: campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0, color: 'text-[#735E50]' },
                  { label: 'Generating', count: campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0, color: 'text-[#FF6B1A] animate-pulse' },
                  { label: 'Ready', count: campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND').length || 0, color: 'text-[#2A1A0F]' },
                  { label: 'Sent', count: campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0, color: 'text-[#1DA365]' },
                  { label: 'Failed', count: campaignDetails.contacts?.filter(c => c.status === 'FAILED').length || 0, color: 'text-[#E63946]' },
                  { label: 'Skipped', count: campaignDetails.contacts?.filter(c => c.status === 'SKIPPED').length || 0, color: 'text-[#D97706]' }
                ].map((stat, idx) => (
                  <Glass key={idx} variant="surface" radius="inner" className="p-3.5 text-center shadow-xs">
                    <span className="text-[9.5px] text-[#735E50] uppercase tracking-widest font-bold block">{stat.label}</span>
                    <span className={`text-xl font-extrabold mt-1 block ${stat.color}`}>{stat.count}</span>
                  </Glass>
                ))}
              </div>

              {/* Live Activity Console (Deep Warm Glass Terminal) */}
              <Glass variant="strong" radius="outer" className="overflow-hidden shadow-sm space-y-0 text-white bg-[#2A1A0F] border border-[#3D2817] campaign-reveal">
                <div className="bg-[#24160C] px-5 py-3 border-b border-[#3D2817] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#E5D5C5] uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DA365] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DA365]"></span>
                    </span>
                    Live Campaign Console
                  </span>
                  <span className="text-[9.5px] text-[#A69282] font-mono">Real-time activity logs</span>
                </div>
                <div className="p-4 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[10.5px] leading-relaxed text-[#D2C3B4] select-text">
                  {activityLogs.length === 0 ? (
                    <div className="text-[#8A796B] text-center py-6">No recent outreach events. Start drafting or sending to stream live activity.</div>
                  ) : (
                    activityLogs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString();
                      const isError = log.level === 'ERROR';
                      const isWarn = log.level === 'WARN';
                      return (
                        <div key={log.id} className="flex gap-2.5 items-start">
                          <span className="text-[#8A796B] flex-shrink-0">[{timeStr}]</span>
                          <span className={`flex-shrink-0 font-bold ${isError ? 'text-[#FF6B6B]' : isWarn ? 'text-[#FBBF24]' : 'text-[#E5D5C5]'}`}>
                            [{log.source}]
                          </span>
                          <span className={isError ? 'text-[#FFA8A8]' : isWarn ? 'text-[#FDE68A]' : 'text-[#F5EDE4]'}>
                            {log.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </Glass>

              {/* Import Contacts Section */}
              <div className="campaign-reveal space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <UserMinus className="w-4 h-4 text-[#FF6B1A]" weight="duotone" />
                  <h3 className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider">Add Contacts</h3>
                </div>
                <ImportWizard 
                  campaignId={selectedCampId} 
                  onImportComplete={() => fetchCampaignDetails(selectedCampId)} 
                />
              </div>

              {/* Contacts Table List */}
              <Glass variant="surface" radius="outer" className="overflow-hidden shadow-sm campaign-reveal">
                <div className="p-5 border-b border-[rgba(42,26,15,0.08)] bg-white/40 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <h3 className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider flex items-center gap-2">
                      <span>Contact List</span>
                      <span className="text-[10.5px] font-mono font-medium text-[#735E50] lowercase">
                        ({campaignDetails.contacts?.length || 0} total)
                      </span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExportCampaignCsv(campaignDetails.id, campaignDetails.name)}
                        className="text-[10px] text-[#2A1A0F] hover:text-[#FF6B1A] font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-white/80 hover:bg-white px-3 py-1.5 rounded-[10px] border border-[rgba(42,26,15,0.12)] shadow-2xs"
                        title="Export Contacts as CSV"
                      >
                        <DownloadSimple className="w-3 h-3 text-[#735E50]" weight="bold" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openShareModal({ id: campaignDetails.id, name: campaignDetails.name, contactsCount: campaignDetails.contacts?.length || 0 })}
                        className="text-[10px] text-[#7C3AED] hover:text-[#6D28D9] font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-white/80 hover:bg-white px-3 py-1.5 rounded-[10px] border border-[#7C3AED]/25 shadow-2xs"
                        title="Share Campaign Contacts"
                      >
                        <ShareNetwork className="w-3 h-3 text-[#7C3AED]" weight="duotone" />
                        <span>Share</span>
                      </button>
                      {(campaignDetails.contacts?.filter(c => c.status === 'FAILED' || c.status === 'SKIPPED').length || 0) > 0 && (
                        <button
                          onClick={handleDeleteFailedContacts}
                          className="text-[10px] text-[#E63946] hover:text-[#A01B26] font-bold flex items-center gap-1 transition-colors cursor-pointer px-2 py-1"
                        >
                          <Trash className="w-3 h-3" weight="bold" />
                          <span>Remove {campaignDetails.contacts?.filter(c => c.status === 'FAILED' || c.status === 'SKIPPED').length} Failed</span>
                        </button>
                      )}
                      {(() => {
                        const gmailCount = (campaignDetails.contacts || []).filter(
                          c => isGmailEmail(c.email) && c.status !== 'SENT'
                        ).length;
                        if (gmailCount === 0) return null;
                        return (
                          <button
                            type="button"
                            onClick={handleOpenGmailModal}
                            disabled={isDeletingGmail}
                            className="text-[10px] text-[#E63946] hover:text-[#A01B26] font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-[#E63946]/10 hover:bg-[#E63946]/20 px-3 py-1.5 rounded-[10px] border border-[#E63946]/25 shadow-2xs"
                            title="Review and remove @gmail.com contacts"
                          >
                            <UserMinus className="w-3 h-3 text-[#E63946]" weight="bold" />
                            <span>Remove {gmailCount} @gmail</span>
                          </button>
                        );
                      })()}
                      {(() => {
                        const allContactsCount = campaignDetails.contacts?.length || 0;
                        const filteredCount = filteredContacts.length;
                        const displayedCount = Math.min(visibleContactsCount, filteredCount);
                        const isFiltered = contactSearch.trim() || contactStatusFilter !== 'ALL';
                        return (
                          <span className="text-[10px] text-[#735E50] font-medium font-mono">
                            {isFiltered ? (
                              <span>Showing {displayedCount} of {filteredCount} filtered ({allContactsCount} total)</span>
                            ) : (
                              <span>Showing {displayedCount} of {allContactsCount} contacts</span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Search Email ID & Filter Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                    <div className="relative flex-1">
                      <MagnifyingGlass className="w-3.5 h-3.5 text-[#735E50] absolute left-3 top-1/2 -translate-y-1/2" weight="bold" />
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Search email ID in campaign (e.g. name@company.com), name, or company..."
                        className="w-full pl-9 pr-8 py-2 rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white/90 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                      />
                      {contactSearch && (
                        <button
                          type="button"
                          onClick={() => setContactSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#735E50] hover:text-[#2A1A0F] rounded-full cursor-pointer"
                          title="Clear email search"
                        >
                          <X className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={contactStatusFilter}
                        onChange={(e) => setContactStatusFilter(e.target.value)}
                        className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3 py-2 text-xs font-semibold text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] transition-all shadow-2xs cursor-pointer"
                      >
                        <option value="ALL">All Statuses ({campaignDetails.contacts?.length || 0})</option>
                        <option value="READY_TO_SEND">Ready to Send ({campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND').length || 0})</option>
                        <option value="PENDING">Pending AI ({campaignDetails.contacts?.filter(c => c.status === 'PENDING').length || 0})</option>
                        <option value="GENERATING">Generating ({campaignDetails.contacts?.filter(c => c.status === 'GENERATING').length || 0})</option>
                        <option value="SENT">Sent ({campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0})</option>
                        <option value="FAILED">Failed ({campaignDetails.contacts?.filter(c => c.status === 'FAILED').length || 0})</option>
                        <option value="SKIPPED">Skipped ({campaignDetails.contacts?.filter(c => c.status === 'SKIPPED').length || 0})</option>
                      </select>

                      {(contactSearch.trim() || contactStatusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setContactSearch('');
                            setContactStatusFilter('ALL');
                          }}
                          className="px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10px] transition-all cursor-pointer shrink-0 shadow-2xs"
                          title="Reset search and filters"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[rgba(42,26,15,0.08)] bg-white/50 text-[#735E50] uppercase font-bold text-[9.5px] tracking-wider">
                        <th className="p-4">Contact</th>
                        <th className="p-4">Company</th>
                        <th className="p-4">Role/Title</th>
                        <th className="p-4">Recruiter Filter</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Email Details</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(42,26,15,0.05)]">
                      {(!campaignDetails.contacts || campaignDetails.contacts.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#735E50] text-xs">
                            No contacts in this campaign. Upload CSV or paste email list above.
                          </td>
                        </tr>
                      ) : filteredContacts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#735E50] text-xs space-y-2">
                            <EnvelopeSimple className="w-7 h-7 text-[#9C8E84] mx-auto" weight="duotone" />
                            <p className="font-bold text-[#2A1A0F]">
                              No contacts match "{contactSearch}"{contactStatusFilter !== 'ALL' ? ` with status ${contactStatusFilter}` : ''}
                            </p>
                            <p className="text-[11px] text-[#735E50]">Try searching for a different email ID or resetting filters.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setContactSearch('');
                                setContactStatusFilter('ALL');
                              }}
                              className="mt-2 px-3.5 py-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10px] transition-colors cursor-pointer"
                            >
                              Clear Filter
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredContacts.slice(0, visibleContactsCount).map((contact) => (
                          <tr key={contact.id} className="hover:bg-white/60 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-[#2A1A0F]">
                                {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : 'Recruiter'}
                              </div>
                              <div className={`text-[10.5px] font-mono font-medium mt-0.5 inline-block ${
                                contactSearch.trim() && contact.email.toLowerCase().includes(contactSearch.trim().toLowerCase())
                                  ? 'text-[#FF6B1A] bg-[#FF6B1A]/10 border border-[#FF6B1A]/25 px-1.5 py-0.5 rounded-[6px]'
                                  : 'text-[#735E50]'
                              }`}>
                                {contact.email}
                              </div>
                            </td>
                            <td className="p-4 text-[#2A1A0F] font-semibold">{contact.company || '—'}</td>
                            <td className="p-4 text-[#735E50] font-medium">{contact.title || contact.role || '—'}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-[8px] text-[9px] font-bold border border-[rgba(42,26,15,0.1)] bg-white/70 text-[#2A1A0F] uppercase shadow-2xs">
                                {contact.isTechnical ? 'Technical' : 'General'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-[8px] text-[9.5px] font-bold uppercase border ${
                                contact.status === 'SENT' 
                                  ? 'bg-[#1DA365]/10 border-[#1DA365]/30 text-[#1DA365]'
                                  : contact.status === 'READY_TO_SEND'
                                  ? 'bg-[#2A1A0F]/10 border-[#2A1A0F]/20 text-[#2A1A0F]'
                                  : contact.status === 'FAILED'
                                  ? 'bg-[#E63946]/10 border-[#E63946]/30 text-[#E63946]'
                                  : contact.status === 'SKIPPED'
                                  ? 'bg-[#D97706]/10 border-[#D97706]/30 text-[#D97706]'
                                  : 'bg-[rgba(42,26,15,0.06)] border-[rgba(42,26,15,0.12)] text-[#735E50]'
                              }`}>
                                {contact.status}
                              </span>
                            </td>
                            <td className="p-4">
                              {contact.emailSubject ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => openContactEditor(contact)}
                                    className="flex items-center gap-1.5 text-[10.5px] text-[#2A1A0F] hover:text-[#FF6B1A] font-bold transition-colors cursor-pointer"
                                  >
                                    <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                                    <span>Review Email</span>
                                  </button>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1 text-[10px] text-[#735E50] hover:text-[#2A1A0F] font-semibold transition-colors cursor-pointer"
                                    title="Regenerate this specific email using AI"
                                  >
                                    <ArrowCounterClockwise className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />
                                    <span>Regen</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-[10px] text-[#9C8E84]">
                                    <Question className="w-3 h-3" />
                                    <span>No Email Gen</span>
                                  </span>
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 text-[10px] text-[#FF6B1A] hover:text-[#E55A0F] font-bold transition-colors cursor-pointer"
                                    title="Generate email for this contact using AI"
                                  >
                                    <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                                    <span>Generate</span>
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="p-1.5 text-[#735E50] hover:text-[#E63946] hover:bg-[#E63946]/10 rounded-[8px] transition-colors cursor-pointer"
                                title="Remove contact"
                              >
                                <UserMinus className="w-3.5 h-3.5" weight="bold" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Progressive Infinite Scroll Sentinel & Load Controls */}
                {(() => {
                  const allCount = filteredContacts.length;
                  const displayedCount = Math.min(visibleContactsCount, allCount);

                  if (allCount === 0) return null;

                  if (visibleContactsCount < allCount) {
                    return (
                      <div 
                        ref={loadMoreSentinelRef}
                        className="p-4 bg-white/40 border-t border-[rgba(42,26,15,0.08)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#735E50] font-medium"
                      >
                        <span className="text-[11px] text-[#735E50] font-mono flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B1A] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF6B1A]"></span>
                          </span>
                          Scroll down to load next 50 contacts ({displayedCount} / {allCount} loaded)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVisibleContactsCount(prev => Math.min(prev + 50, allCount))}
                            className="px-4 py-2 bg-white/90 hover:bg-[#FF6B1A] hover:text-white border border-[rgba(42,26,15,0.12)] font-bold rounded-[12px] text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                          >
                            Load 50 More (+50)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisibleContactsCount(allCount)}
                            className="px-4 py-2 bg-white/70 hover:bg-white text-[#2A1A0F] font-bold rounded-[12px] text-[10px] uppercase tracking-wider transition-all cursor-pointer border border-[rgba(42,26,15,0.08)] shadow-2xs"
                          >
                            Load All ({allCount})
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (allCount > 50) {
                    return (
                      <div className="p-3 bg-white/40 border-t border-[rgba(42,26,15,0.08)] text-center text-[10px] font-mono text-[#735E50] uppercase tracking-wider">
                        All {allCount} contacts loaded
                      </div>
                    );
                  }

                  return null;
                })()}
              </Glass>

              {/* Edit Contact / Email Preview modal overlay */}
              {editContact && (
                <div className="fixed inset-0 z-50 bg-[#2A1A0F]/50 backdrop-blur-md flex items-center justify-center p-4">
                  <Glass variant="strong" radius="outer" className="w-full max-w-2xl p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] text-[#2A1A0F] max-h-[92vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-[rgba(42,26,15,0.08)] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-[#2A1A0F] uppercase tracking-wider">Review Generated Outreach Email</h3>
                        <p className="text-[11px] text-[#735E50]">Contact: <span className="font-mono text-[#2A1A0F] font-bold">{editContact.email}</span></p>
                      </div>
                      <button
                        onClick={() => handleRegenerateContactAI()}
                        disabled={isSavingContact}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[10.5px] text-[#2A1A0F] font-bold rounded-[12px] transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                      >
                        <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A]" weight="fill" />
                        <span>Regen with AI</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Subject Line</label>
                        <input
                          type="text"
                          value={contactSubject}
                          onChange={(e) => setContactSubject(e.target.value)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Body Email (HTML/Text)</label>
                        <textarea
                          value={contactBody}
                          onChange={(e) => setContactBody(e.target.value)}
                          rows={10}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 p-3.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] font-mono leading-relaxed transition-all shadow-inner"
                        />
                        <div className="flex items-start gap-2 p-2.5 bg-white/50 border border-[rgba(42,26,15,0.08)] rounded-[12px]">
                          <span className="text-[10px] text-[#735E50] font-semibold uppercase tracking-wider shrink-0">Footer:</span>
                          <span className="text-[10px] text-[#735E50] italic leading-tight">
                            "If you'd prefer not to hear from me regarding this, please reply 'unsubscribe' or <u className="underline cursor-pointer">click here to unsubscribe</u> and I will not contact you again."
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-[rgba(42,26,15,0.08)]">
                      <button
                        onClick={async () => {
                          const text = `Subject: ${contactSubject}\n\n${contactBody}`;
                          if (!navigator.clipboard) {
                            const textArea = document.createElement('textarea');
                            textArea.value = text;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          } else {
                            try {
                              await navigator.clipboard.writeText(text);
                            } catch (e) {
                              const textArea = document.createElement('textarea');
                              textArea.value = text;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                            }
                          }
                          alert('Email details copied to clipboard!');
                        }}
                        type="button"
                        className="px-3.5 py-2 bg-white/80 border border-[rgba(42,26,15,0.12)] hover:bg-white text-[#2A1A0F] font-bold rounded-[12px] text-[10.5px] transition-colors cursor-pointer shadow-2xs"
                      >
                        Copy to Clipboard
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditContact(null)}
                          className="px-4 py-2 bg-white/80 border border-[rgba(42,26,15,0.12)] hover:bg-white text-[#735E50] font-bold rounded-[12px] text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveContactEdits}
                          disabled={isSavingContact}
                          className="px-5 py-2 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[12px] text-xs transition-all cursor-pointer shadow-[0_4px_12px_-2px_rgba(255,107,26,0.35)] disabled:opacity-40"
                        >
                          {isSavingContact ? 'Saving...' : 'Save & Set Ready'}
                        </button>
                      </div>
                    </div>
                  </Glass>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-16">
              <CircleNotch className="w-8 h-8 animate-spin text-[#FF6B1A] mx-auto" />
              <p className="text-xs text-[#735E50] mt-2 font-medium">Loading campaign details...</p>
            </div>
          )}
        </>
      )}

      {/* Share Campaign Modal */}
      {shareModalCampaign && (
        <div className="fixed inset-0 bg-[#2A1A0F]/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Glass variant="strong" radius="outer" className="max-w-lg w-full p-6 md:p-8 space-y-5 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] relative text-[#2A1A0F]">
            <button
              onClick={() => {
                setShareModalCampaign(null);
                setShareToken('');
              }}
              className="absolute top-5 right-5 text-[#735E50] hover:text-[#2A1A0F] transition-colors p-1"
            >
              <X className="w-5 h-5" weight="bold" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center text-[#7C3AED]">
                <ShareNetwork className="w-6 h-6" weight="duotone" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2A1A0F]">Share Campaign Contacts</h3>
                <p className="text-xs text-[#735E50] font-medium truncate max-w-[320px]">
                  {shareModalCampaign.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#735E50] leading-relaxed">
              Anyone with this shareable link or code can import this campaign&apos;s contacts into their Outreach-AI account and immediately start sending outreach emails.
            </p>

            {isGeneratingShare ? (
              <div className="py-8 flex flex-col items-center justify-center text-[#735E50] gap-2">
                <CircleNotch className="w-6 h-6 animate-spin text-[#7C3AED]" />
                <span className="text-xs font-semibold">Generating secure share link...</span>
              </div>
            ) : shareToken ? (
              <div className="space-y-4">
                {/* Share Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider">
                    Shareable Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/campaigns?import_share=${shareToken}`}
                      className="flex-1 bg-white/90 border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] rounded-[12px] px-3.5 py-2 text-xs font-mono focus:outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/campaigns?import_share=${shareToken}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-[12px] text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-white" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="bold" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Share Code / Token */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider">
                    Share Code (Token)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareToken}
                      className="flex-1 bg-white/90 border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] rounded-[12px] px-3.5 py-2 text-xs font-mono truncate focus:outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(shareToken);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-white/80 hover:bg-white text-[#2A1A0F] border border-[rgba(42,26,15,0.12)] font-bold rounded-[12px] text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[#1DA365]" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="bold" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick actions: CSV export & copy emails */}
                <div className="pt-2 border-t border-[rgba(42,26,15,0.08)] grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCampaignCsv(shareModalCampaign.id, shareModalCampaign.name)}
                    disabled={isExportingCsv}
                    className="px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <DownloadSimple className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />
                    <span>{isExportingCsv ? 'Exporting...' : 'Export CSV File'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyEmails(shareModalCampaign.id)}
                    className="px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedEmails ? <Check className="w-3.5 h-3.5 text-[#1DA365]" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />}
                    <span>{copiedEmails ? 'Emails Copied!' : 'Copy All Emails'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#E63946] font-medium">Failed to generate share link. Please try again.</p>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShareModalCampaign(null);
                  setShareToken('');
                }}
                className="px-5 py-2.5 bg-[#2A1A0F] hover:bg-[#1E120A] text-white font-bold rounded-[14px] text-xs transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </Glass>
        </div>
      )}

      {/* Import Shared Campaign Modal */}
      {showImportSharedModal && (
        <div className="fixed inset-0 bg-[#2A1A0F]/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Glass variant="strong" radius="outer" className="max-w-lg w-full p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] relative max-h-[90vh] overflow-y-auto text-[#2A1A0F]">
            <button
              onClick={() => {
                setShowImportSharedModal(false);
                setImportShareInput('');
                setSharedPreviewData(null);
              }}
              className="absolute top-5 right-5 text-[#735E50] hover:text-[#2A1A0F] transition-colors p-1"
            >
              <X className="w-5 h-5" weight="bold" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-[16px] bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center text-[#7C3AED]">
                <ShareNetwork className="w-6 h-6" weight="duotone" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#2A1A0F]">Import Shared Campaign</h3>
                <p className="text-xs text-[#735E50] font-medium">
                  Paste a share link or share code to import contacts and start outreach.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmImportShared} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider block mb-1.5">
                  Share Link or Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={importShareInput}
                    onChange={(e) => {
                      setImportShareInput(e.target.value);
                      if (sharedPreviewData) setSharedPreviewData(null);
                    }}
                    placeholder="Paste link (https://.../campaigns?import_share=...) or share code"
                    className="flex-1 bg-white/90 border border-[rgba(42,26,15,0.12)] rounded-[12px] px-3.5 py-2 text-xs font-mono focus:outline-none focus:border-[#7C3AED] text-[#2A1A0F] shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => fetchSharedPreview()}
                    disabled={isLoadingSharedPreview || !importShareInput.trim()}
                    className="px-4 py-2 bg-[#2A1A0F] hover:bg-[#1E120A] text-white font-bold rounded-[12px] text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                  >
                    {isLoadingSharedPreview ? <CircleNotch className="w-4 h-4 animate-spin" /> : 'Inspect'}
                  </button>
                </div>
              </div>

              {sharedPreviewData && (
                <Glass variant="nested" radius="inner" className="p-4 space-y-3 bg-[#7C3AED]/5 border-[#7C3AED]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#7C3AED] tracking-wider">Campaign</span>
                      <h4 className="text-sm font-bold text-[#2A1A0F]">{sharedPreviewData.campaignName}</h4>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-[#7C3AED]/25 text-[#7C3AED] font-bold rounded-[10px] text-xs shadow-2xs">
                      {sharedPreviewData.totalContacts} Contacts
                    </span>
                  </div>

                  {sharedPreviewData.description && (
                    <p className="text-xs text-[#735E50]">{sharedPreviewData.description}</p>
                  )}

                  <div>
                    <label className="text-xs font-bold text-[#2A1A0F] block mb-1">
                      New Campaign Name in your workspace
                    </label>
                    <input
                      type="text"
                      required
                      value={newImportCampName}
                      onChange={(e) => setNewImportCampName(e.target.value)}
                      className="w-full bg-white border border-[rgba(42,26,15,0.12)] rounded-[12px] px-3.5 py-2 text-xs font-bold text-[#2A1A0F] focus:outline-none focus:border-[#7C3AED] shadow-inner"
                    />
                  </div>

                  {sharedPreviewData.previewContacts && sharedPreviewData.previewContacts.length > 0 && (
                    <div className="pt-2 border-t border-[rgba(42,26,15,0.08)]">
                      <span className="text-[10px] uppercase font-bold text-[#735E50] tracking-wider block mb-1.5">
                        Sample Contacts
                      </span>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {sharedPreviewData.previewContacts.map((c: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white/90 p-2 rounded-[8px] border border-[rgba(42,26,15,0.06)]">
                            <div>
                              <span className="font-semibold text-[#2A1A0F]">{c.name || 'Unnamed'}</span>
                              <span className="text-[#735E50] ml-1.5 text-[11px] font-mono">{c.email}</span>
                            </div>
                            <span className="text-[#735E50] text-[11px] truncate max-w-[120px]">{c.company || c.role || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-[12px] text-[#7C3AED] text-xs">
                    Imported contacts will be added with <strong>PENDING</strong> status. Duplicate contacts across campaigns will automatically be flagged.
                  </div>
                </Glass>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgba(42,26,15,0.08)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportSharedModal(false);
                    setImportShareInput('');
                    setSharedPreviewData(null);
                  }}
                  className="px-4 py-2 bg-white/80 border border-[rgba(42,26,15,0.12)] hover:bg-white text-[#735E50] font-bold rounded-[12px] text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingShared || (!sharedPreviewData && !importShareInput.trim())}
                  className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-[12px] text-xs transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
                >
                  {isImportingShared ? (
                    <>
                      <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <span>Import Contacts</span>
                  )}
                </button>
              </div>
            </form>
          </Glass>
        </div>
      )}

      {/* Review & Remove @gmail.com Emails Modal */}
      {showGmailModal && campaignDetails && (() => {
        const allGmailContacts = (campaignDetails.contacts || []).filter(
          c => isGmailEmail(c.email) && c.status !== 'SENT'
        );
        const filteredGmailContacts = allGmailContacts.filter(c => {
          if (!gmailSearchTerm.trim()) return true;
          const term = gmailSearchTerm.toLowerCase();
          const email = (c.email || '').toLowerCase();
          const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
          const company = (c.company || '').toLowerCase();
          return email.includes(term) || name.includes(term) || company.includes(term);
        });

        const readyCount = allGmailContacts.filter(c => c.status === 'READY_TO_SEND').length;
        const pendingCount = allGmailContacts.filter(c => c.status === 'PENDING').length;
        const isAllSelected = allGmailContacts.length > 0 && selectedGmailIds.length === allGmailContacts.length;

        const handleToggleSelectAll = () => {
          if (isAllSelected) {
            setSelectedGmailIds([]);
          } else {
            setSelectedGmailIds(allGmailContacts.map(c => c.id));
          }
        };

        const handleToggleContact = (id: number) => {
          setSelectedGmailIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          );
        };

        return (
          <div className="fixed inset-0 bg-[#2A1A0F]/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <Glass variant="strong" radius="outer" className="max-w-2xl w-full p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] relative max-h-[90vh] flex flex-col text-[#2A1A0F]">
              {/* Close Button */}
              <button
                onClick={() => setShowGmailModal(false)}
                className="absolute top-5 right-5 text-[#735E50] hover:text-[#2A1A0F] transition-colors p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" weight="bold" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-[16px] bg-[#E63946]/10 border border-[#E63946]/25 flex items-center justify-center text-[#E63946] shrink-0">
                  <UserMinus className="w-6 h-6" weight="bold" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#2A1A0F]">Review & Remove @gmail.com Emails</h3>
                  <p className="text-xs text-[#735E50] font-medium">
                    {allGmailContacts.length} personal Gmail addresses found in <strong className="text-[#2A1A0F]">{campaignDetails.name}</strong>
                  </p>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-3 gap-2.5">
                <Glass variant="nested" radius="control" className="p-3 text-center">
                  <span className="text-[9.5px] font-bold text-[#735E50] uppercase tracking-wider block">Total Gmail</span>
                  <span className="text-base font-extrabold text-[#2A1A0F]">{allGmailContacts.length}</span>
                </Glass>
                <Glass variant="nested" radius="control" className="p-3 text-center bg-[#1DA365]/10 border-[#1DA365]/20">
                  <span className="text-[9.5px] font-bold text-[#1DA365] uppercase tracking-wider block">Ready to Send</span>
                  <span className="text-base font-extrabold text-[#1DA365]">{readyCount}</span>
                </Glass>
                <Glass variant="nested" radius="control" className="p-3 text-center bg-[#7C3AED]/10 border-[#7C3AED]/20">
                  <span className="text-[9.5px] font-bold text-[#7C3AED] uppercase tracking-wider block">Pending</span>
                  <span className="text-base font-extrabold text-[#7C3AED]">{pendingCount}</span>
                </Glass>
              </div>

              {/* Filter & Copy Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#735E50]" weight="bold" />
                  <input
                    type="text"
                    value={gmailSearchTerm}
                    onChange={(e) => setGmailSearchTerm(e.target.value)}
                    placeholder="Search in Gmail list..."
                    className="w-full bg-white/90 border border-[rgba(42,26,15,0.12)] rounded-[12px] pl-8 pr-3 py-2 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#E63946] shadow-inner"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyGmailEmails}
                    className="px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Copy all @gmail.com email addresses to clipboard"
                  >
                    {copiedGmailList ? <Check className="w-3.5 h-3.5 text-[#1DA365]" weight="bold" /> : <Copy className="w-3.5 h-3.5 text-[#735E50]" weight="bold" />}
                    <span>{copiedGmailList ? 'Emails Copied!' : 'Copy All Emails'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Scrollable Email List */}
              <div className="flex-1 overflow-y-auto border border-[rgba(42,26,15,0.08)] rounded-[16px] divide-y divide-[rgba(42,26,15,0.05)] bg-white/50 max-h-[300px]">
                {filteredGmailContacts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#735E50]">
                    No contacts matching search query.
                  </div>
                ) : (
                  filteredGmailContacts.map((contact) => {
                    const isSelected = selectedGmailIds.includes(contact.id);
                    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed Contact';

                    return (
                      <div
                        key={contact.id}
                        onClick={() => handleToggleContact(contact.id)}
                        className={`p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                          isSelected ? 'bg-[#E63946]/10 hover:bg-[#E63946]/15' : 'hover:bg-white/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleContact(contact.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-[rgba(42,26,15,0.2)] text-[#E63946] focus:ring-0 w-4 h-4 cursor-pointer shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-[#2A1A0F] truncate">
                              {contact.email}
                            </span>
                            <span className={`px-2 py-0.5 rounded-[6px] text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              contact.status === 'READY_TO_SEND'
                                ? 'bg-[#1DA365]/15 text-[#146C43] border border-[#1DA365]/25'
                                : contact.status === 'PENDING'
                                ? 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/25'
                                : contact.status === 'FAILED'
                                ? 'bg-[#E63946]/15 text-[#E63946] border border-[#E63946]/25'
                                : 'bg-[rgba(42,26,15,0.06)] text-[#735E50] border border-[rgba(42,26,15,0.1)]'
                            }`}>
                              {contact.status === 'READY_TO_SEND' ? 'Ready' : contact.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#735E50] mt-0.5 truncate flex items-center gap-2">
                            <span className="font-semibold text-[#2A1A0F]">{name}</span>
                            {contact.company && (
                              <>
                                <span>•</span>
                                <span>{contact.company}</span>
                              </>
                            )}
                            {contact.role && (
                              <>
                                <span>•</span>
                                <span className="text-[#735E50]">{contact.role}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-[#E63946]/10 border border-[#E63946]/20 rounded-[14px] text-[#A01B26] text-xs flex items-start gap-2">
                <WarningCircle className="w-4 h-4 text-[#E63946] shrink-0 mt-0.5" weight="fill" />
                <span>
                  Removing these contacts will permanently delete them from this campaign (including those in Ready status). They will not receive any outreach emails.
                </span>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(42,26,15,0.08)] shrink-0">
                <span className="text-xs text-[#735E50] font-medium">
                  {selectedGmailIds.length} of {allGmailContacts.length} selected for removal
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGmailModal(false)}
                    className="px-4 py-2 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#735E50] font-bold rounded-[12px] text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemoveGmail}
                    disabled={isDeletingGmail || selectedGmailIds.length === 0}
                    className="px-5 py-2 bg-[#E63946] hover:bg-[#D32F2F] text-white font-bold rounded-[12px] text-xs transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
                  >
                    {isDeletingGmail ? (
                      <>
                        <CircleNotch className="w-3.5 h-3.5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <Trash className="w-3.5 h-3.5" weight="bold" />
                        <span>Remove {selectedGmailIds.length} Email{selectedGmailIds.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Glass>
          </div>
        );
      })()}
    </div>
  );
};
