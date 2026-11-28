import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  Sliders,
  SquaresFour,
  ListBullets,
  CaretDown,
  PaperPlaneRight,
  Tray,
  Users,
  Funnel,
  Terminal,
  GearSix,
  Broadcast,
  Fire,
  Pulse,
  UserCheck,
  Info
} from '@phosphor-icons/react';
import { Campaign, Contact, Resume } from '../types';
import { Glass } from '../components/glass/Glass';
import { ImportWizard } from '../components/ImportWizard';
import { PipelineFunnel } from '../components/visual/PipelineFunnel';
import { CampaignsSkeleton, CampaignCockpitSkeleton } from '../components/skeleton';

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<Campaign | null>(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState<boolean>(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // View controllers
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [campaignListFilter, setCampaignListFilter] = useState<'ALL' | 'SENDING' | 'PAUSED' | 'COMPLETED' | 'DRAFT'>('ALL');
  const [detailTab, setDetailTab] = useState<'contacts' | 'import' | 'template' | 'exclusions' | 'logs'>('contacts');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

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

  // Gmail Modal states
  const [isDeletingGmail, setIsDeletingGmail] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [gmailSearchTerm, setGmailSearchTerm] = useState('');
  const [selectedGmailIds, setSelectedGmailIds] = useState<number[]>([]);
  const [copiedGmailList, setCopiedGmailList] = useState(false);

  // Staggered reveal animations
  useEffect(() => {
    if (!containerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.campaign-reveal',
        { y: 16, opacity: 0, filter: 'blur(4px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.4,
          stagger: 0.04,
          ease: 'power3.out',
        }
      );
    });
    return () => mm.revert();
  }, [selectedCampId, campaigns.length, viewMode, campaignListFilter, detailTab]);

  const fetchActivityLogs = async () => {
    try {
      const res = await fetch('/api/logs?limit=40');
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
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Debounce campaign search
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
    if (!campaignDetails || campaignDetails.id !== id) {
      setIsLoadingDetails(true);
    }
    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();
      setCampaignDetails(data);
    } catch (err) {
      console.error('Failed to fetch campaign details', err);
    } finally {
      setIsLoadingDetails(false);
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

      alert(data.message || 'Email folder and contacts imported successfully!');
      setShowImportSharedModal(false);
      setImportShareInput('');
      setSharedPreviewData(null);
      await fetchCampaigns();
      if (data.campaignId) {
        setSelectedCampId(data.campaignId);
        setDetailTab('contacts');
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

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((camp) => {
      if (campaignListFilter === 'ALL') return true;
      return camp.status === campaignListFilter;
    });
  }, [campaigns, campaignListFilter]);

  const filteredContacts = useMemo(() => {
    return (campaignDetails?.contacts || []).filter((contact) => {
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
  }, [campaignDetails?.contacts, contactSearch, contactStatusFilter]);

  useEffect(() => {
    setVisibleContactsCount(50);
  }, [selectedCampId, contactSearch, contactStatusFilter]);

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
      alert('Folder configuration saved successfully!');
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
      // First save the current excludedEmails if modified
      await fetch(`/api/campaigns/${selectedCampId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludedEmails: editExcludedEmails,
        }),
      });

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
    if (!confirm(`Are you sure you want to delete email folder "${name}"? This deletes all associated contacts.`)) return;

    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
      if (selectedCampId === id) setSelectedCampId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAction = async (action: 'start' | 'pause' | 'cancel' | 'retry' | 'generate') => {
    if (!selectedCampId) return;

    const prevCampaignDetails = campaignDetails;
    const prevCampaigns = campaigns;

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

  // Aggregated campaign overview metrics for the executive bar
  const totalCampaigns = campaigns.length;
  const activeSendingCount = campaigns.filter(c => c.status === 'SENDING').length;
  const totalContactsAcrossAll = campaigns.reduce((acc, c) => acc + (c.metrics?.total || 0), 0);
  const totalSentAcrossAll = campaigns.reduce((acc, c) => acc + (c.metrics?.sent || 0), 0);

  return (
    <div ref={containerRef} className="p-4 md:p-8 max-w-7xl mx-auto space-y-7">
      {!selectedCampId ? (
        isLoadingCampaigns ? (
          <CampaignsSkeleton />
        ) : (
        // =========================================================================
        // GROUND-UP REDESIGNED CAMPAIGNS HUB (LIST VIEW)
        // =========================================================================
        <>
          {/* Top Command Center Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 campaign-reveal">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 border border-white/90 text-[10px] font-bold text-[#735E50] uppercase tracking-widest shadow-2xs mb-2">
                <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-pulse"></span>
                <span>Outreach Operations Deck</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-[#2A1A0F] tracking-tight">Email Folders Hub</h1>
              <p className="text-xs md:text-sm text-[#735E50] mt-1.5 max-w-2xl leading-relaxed">
                Coordinate automated multi-channel sequences, monitor delivery velocity, and orchestrate verified recruiter connections.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowImportSharedModal(true)}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] hover:border-[#7C3AED]/40 font-bold rounded-[16px] text-xs text-[#2A1A0F] transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                title="Import campaign contacts shared by another user via link or code"
              >
                <ShareNetwork className="w-4 h-4 text-[#7C3AED]" weight="duotone" />
                <span>Import Shared Link</span>
              </button>
              
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2.5 px-5 py-3 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[16px] text-xs transition-all shadow-[0_10px_24px_-4px_rgba(255,107,26,0.38)] cursor-pointer active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" weight="bold" />
                <span>New Email Folder</span>
              </button>
            </div>
          </div>

          {/* Executive Overview Bento Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 campaign-reveal">
            <Glass variant="surface" radius="outer" className="p-4 md:p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#735E50] block">Active Pipelines</span>
                <div className="text-2xl font-black text-[#2A1A0F] mt-1">{totalCampaigns}</div>
                <div className="text-[10.5px] text-[#735E50] mt-0.5">Email Folders</div>
              </div>
              <div className="w-11 h-11 rounded-[14px] bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center">
                <Broadcast className="w-5 h-5" weight="duotone" />
              </div>
            </Glass>

            <Glass variant="surface" radius="outer" className="p-4 md:p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1DA365] block">Live Dispatching</span>
                <div className="text-2xl font-black text-[#1DA365] mt-1 flex items-center gap-1.5">
                  {activeSendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-[#1DA365] animate-ping inline-block" />}
                  {activeSendingCount}
                </div>
                <div className="text-[10.5px] text-[#735E50] mt-0.5">Currently sending emails</div>
              </div>
              <div className="w-11 h-11 rounded-[14px] bg-[#1DA365]/10 text-[#1DA365] flex items-center justify-center">
                <PaperPlaneRight className="w-5 h-5" weight="fill" />
              </div>
            </Glass>

            <Glass variant="surface" radius="outer" className="p-4 md:p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#735E50] block">Recruiter Emails</span>
                <div className="text-2xl font-black text-[#2A1A0F] mt-1">{totalContactsAcrossAll}</div>
                <div className="text-[10.5px] text-[#735E50] mt-0.5">In targeted pools</div>
              </div>
              <div className="w-11 h-11 rounded-[14px] bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
                <Users className="w-5 h-5" weight="duotone" />
              </div>
            </Glass>

            <Glass variant="surface" radius="outer" className="p-4 md:p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#735E50] block">Delivered Letters</span>
                <div className="text-2xl font-black text-[#2A1A0F] mt-1">{totalSentAcrossAll}</div>
                <div className="text-[10.5px] text-[#1DA365] font-semibold mt-0.5">
                  {totalContactsAcrossAll > 0 ? `${Math.round((totalSentAcrossAll / totalContactsAcrossAll) * 100)}% overall completion` : 'Ready to start'}
                </div>
              </div>
              <div className="w-11 h-11 rounded-[14px] bg-[#2A1A0F]/5 text-[#2A1A0F] flex items-center justify-center">
                <CheckCircle className="w-5 h-5" weight="fill" />
              </div>
            </Glass>
          </div>

          {/* Interactive Filter & View Controller Bar */}
          <Glass variant="surface" radius="inner" className="p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 campaign-reveal">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', label: 'All', count: campaigns.length },
                { id: 'SENDING', label: 'Sending', count: campaigns.filter(c => c.status === 'SENDING').length },
                { id: 'PAUSED', label: 'Paused', count: campaigns.filter(c => c.status === 'PAUSED').length },
                { id: 'COMPLETED', label: 'Completed', count: campaigns.filter(c => c.status === 'COMPLETED').length },
                { id: 'DRAFT', label: 'Drafts', count: campaigns.filter(c => c.status === 'DRAFT').length },
              ].map((tab) => {
                const isActive = campaignListFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCampaignListFilter(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#2A1A0F] text-white shadow-xs'
                        : 'bg-white/60 hover:bg-white text-[#735E50] hover:text-[#2A1A0F]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[rgba(42,26,15,0.06)] text-[#735E50]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & View Mode Toggles */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <MagnifyingGlass className="w-4 h-4 text-[#735E50] absolute left-3.5 top-1/2 -translate-y-1/2" weight="bold" />
                <input
                  type="text"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  placeholder="Search email folders or recruiter emails..."
                  className="w-full pl-9 pr-8 py-2 rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white/90 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                />
                {campaignSearch && (
                  <button
                    type="button"
                    onClick={() => setCampaignSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#735E50] hover:text-[#2A1A0F] rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" weight="bold" />
                  </button>
                )}
              </div>

              {/* View Switcher: Grid vs Table */}
              <div className="flex items-center bg-white/80 p-1 rounded-[12px] border border-[rgba(42,26,15,0.08)] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-[9px] transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#2A1A0F] text-white shadow-2xs'
                      : 'text-[#735E50] hover:text-[#2A1A0F]'
                  }`}
                  title="Bento Grid View"
                >
                  <SquaresFour className="w-4 h-4" weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-[9px] transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-[#2A1A0F] text-white shadow-2xs'
                      : 'text-[#735E50] hover:text-[#2A1A0F]'
                  }`}
                  title="Dense Table View"
                >
                  <ListBullets className="w-4 h-4" weight="bold" />
                </button>
              </div>
            </div>
          </Glass>

          {/* New Campaign Creation Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 z-50 bg-[#2A1A0F]/50 backdrop-blur-md flex items-center justify-center p-4">
              <Glass variant="strong" radius="outer" className="w-full max-w-xl p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] text-[#2A1A0F] max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-[rgba(42,26,15,0.08)]">
                  <div>
                    <h3 className="text-base font-extrabold text-[#2A1A0F] tracking-tight">Create Email Folder</h3>
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
                    <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Email Folder Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Q4 Senior Fullstack Outreach"
                      className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                      Attached Resume PDF *
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
                        Auto-Send Extension Emails
                      </div>
                      <div className="text-[10.5px] text-[#735E50] mt-0.5">
                        Automatically generate email & dispatch via Gmail when emails are added via extension.
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
                        Auto-Remove @gmail Emails
                      </div>
                      <div className="text-[10.5px] text-[#735E50] mt-0.5">
                        Automatically drop personal @gmail.com addresses when emails are synced from Chrome extension.
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
                      {isSubmitting ? 'Creating...' : 'Create Email Folder'}
                    </button>
                  </div>
                </form>
              </Glass>
            </div>
          )}

          {/* Render Mode: Bento Grid View vs Table View */}
          {filteredCampaigns.length === 0 ? (
            <Glass variant="surface" radius="outer" className="border-2 border-dashed border-[rgba(42,26,15,0.15)] p-12 text-center text-[#735E50] text-xs space-y-3 campaign-reveal">
              {campaignSearch.trim() ? (
                <>
                  <EnvelopeSimple className="w-10 h-10 text-[#9C8E84] mx-auto" weight="duotone" />
                  <p className="font-bold text-sm text-[#2A1A0F]">No email folders match "{campaignSearch}"</p>
                  <p className="text-[11px] text-[#735E50]">Try searching for a different email address or folder name.</p>
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
                  <p className="font-bold text-sm text-[#2A1A0F]">No email folders match this filter.</p>
                  <p className="text-[11px] text-[#735E50]">Click "New Email Folder" above to launch your first job outreach pipeline.</p>
                </>
              )}
            </Glass>
          ) : viewMode === 'grid' ? (
            // BENTO GRID CARDS
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((camp) => {
                const total = camp.metrics?.total || 0;
                const sent = camp.metrics?.sent || 0;
                const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

                return (
                  <Glass 
                    key={camp.id} 
                    variant="surface"
                    radius="outer"
                    interactive
                    onClick={() => {
                      setSelectedCampId(camp.id);
                      setDetailTab('contacts');
                    }}
                    className="p-6 md:p-7 flex flex-col justify-between campaign-reveal transition-all duration-200 group"
                  >
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-black text-[#2A1A0F] text-base tracking-tight truncate group-hover:text-[#FF6B1A] transition-colors">
                            {camp.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {camp.resume?.name && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#735E50] bg-white/80 border border-[rgba(42,26,15,0.08)] px-2 py-0.5 rounded-[6px]">
                                <FilePdf className="w-3 h-3 text-[#FF6B1A]" weight="duotone" />
                                <span className="truncate max-w-[120px]">{camp.resume.name}</span>
                              </span>
                            )}
                          </div>
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

                      <p className="text-[11.5px] text-[#735E50] line-clamp-2 leading-relaxed">
                        {camp.description || 'No description provided.'}
                      </p>

                      {/* Visual Progress Bar */}
                      <div className="space-y-1.5 bg-white/50 p-3 rounded-[14px] border border-[rgba(42,26,15,0.06)]">
                        <div className="flex justify-between items-center text-[10.5px] font-bold">
                          <span className="text-[#735E50] uppercase tracking-wider">Outreach Progress</span>
                          <span className="font-mono text-[#2A1A0F]">{sent} / {total} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-[rgba(42,26,15,0.06)]">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              camp.status === 'SENDING' ? 'bg-[#1DA365]' : 'bg-[#FF6B1A]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Matching Contacts chip if searched */}
                      {camp.matchingContacts && camp.matchingContacts.length > 0 && (
                        <div className="p-2.5 rounded-[12px] bg-[#7C3AED]/5 border border-[#7C3AED]/20 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <div className="text-[10px] font-bold text-[#7C3AED] flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <EnvelopeSimple className="w-3.5 h-3.5" weight="duotone" />
                              <span>Matching email:</span>
                            </span>
                            <span className="font-mono">{camp.matchingContacts.length} found</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {camp.matchingContacts.slice(0, 3).map((mc: any) => (
                              <button
                                key={mc.id}
                                type="button"
                                onClick={() => {
                                  setContactSearch(mc.email);
                                  setSelectedCampId(camp.id);
                                  setDetailTab('contacts');
                                }}
                                className="px-2 py-0.5 rounded-[6px] bg-white text-[9.5px] font-mono border border-[rgba(42,26,15,0.08)] hover:border-[#7C3AED] text-[#2A1A0F] truncate max-w-[180px]"
                              >
                                {mc.email}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Automation Switches */}
                      <div className="space-y-2 pt-1 border-t border-[rgba(42,26,15,0.06)]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#2A1A0F]">
                          <span className="flex items-center gap-1.5 text-[10.5px]">
                            <Lightning className={`w-3.5 h-3.5 ${camp.autoSendExtension ? 'text-[#FF6B1A]' : 'text-[#735E50]'}`} weight={camp.autoSendExtension ? 'fill' : 'regular'} />
                            Auto-Send Emails
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleAutoSendExtension(camp.id, Boolean(camp.autoSendExtension), e)}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              camp.autoSendExtension ? 'bg-[#1DA365]' : 'bg-[rgba(42,26,15,0.18)]'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${camp.autoSendExtension ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-[#2A1A0F]">
                          <span className="flex items-center gap-1.5 text-[10.5px]">
                            <EnvelopeSimple className={`w-3.5 h-3.5 ${camp.autoRemoveGmailExtension !== false ? 'text-[#E63946]' : 'text-[#735E50]'}`} weight="duotone" />
                            Drop @gmail Emails
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleAutoRemoveGmailExtension(camp.id, camp.autoRemoveGmailExtension !== false, e)}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              camp.autoRemoveGmailExtension !== false ? 'bg-[#E63946]' : 'bg-[rgba(42,26,15,0.18)]'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${camp.autoRemoveGmailExtension !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 pt-3.5 border-t border-[rgba(42,26,15,0.08)] flex justify-between items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedCampId(camp.id);
                          setDetailTab('contacts');
                        }}
                        className="px-4 py-2 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white rounded-[12px] text-xs font-bold transition-all cursor-pointer shadow-[0_4px_12px_-2px_rgba(255,107,26,0.3)] active:scale-[0.98] flex items-center gap-1.5"
                      >
                        <span>Open Cockpit</span>
                        <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
                      </button>

                      <div className="flex items-center gap-1">
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
                          title="Share Email Folder Contacts"
                        >
                          <ShareNetwork className="w-3.5 h-3.5" weight="duotone" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                          className="p-2 bg-white/80 hover:bg-[#E63946]/10 border border-[rgba(42,26,15,0.12)] hover:border-[#E63946]/30 text-[#735E50] hover:text-[#E63946] rounded-[10px] transition-all cursor-pointer shadow-2xs"
                          title="Delete Email Folder"
                        >
                          <Trash className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      </div>
                    </div>
                  </Glass>
                );
              })}
            </div>
          ) : (
            // DENSE TABLE VIEW
            <Glass variant="surface" radius="outer" className="overflow-hidden shadow-sm campaign-reveal">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[rgba(42,26,15,0.08)] bg-white/50 text-[#735E50] uppercase font-bold text-[9.5px] tracking-wider">
                      <th className="p-4">Email Folder Name</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Resume Attached</th>
                      <th className="p-4">Progress & Delivery</th>
                      <th className="p-4">Automation Toggles</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(42,26,15,0.05)]">
                    {filteredCampaigns.map((camp) => {
                      const total = camp.metrics?.total || 0;
                      const sent = camp.metrics?.sent || 0;
                      const percent = total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0;

                      return (
                        <tr 
                          key={camp.id} 
                          onClick={() => {
                            setSelectedCampId(camp.id);
                            setDetailTab('contacts');
                          }}
                          className="hover:bg-white/60 transition-colors cursor-pointer group"
                        >
                          <td className="p-4">
                            <div className="font-extrabold text-[#2A1A0F] text-sm group-hover:text-[#FF6B1A] transition-colors">{camp.name}</div>
                            <div className="text-[11px] text-[#735E50] truncate max-w-xs mt-0.5">{camp.description || 'No description'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-[8px] text-[9.5px] font-bold border uppercase inline-flex items-center gap-1.5 ${
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
                          </td>
                          <td className="p-4 text-[#735E50]">
                            {camp.resume?.name ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2A1A0F]">
                                <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                                {camp.resume.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9C8E84]">None</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="w-36 space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-[#735E50]">
                                <span>{sent} sent</span>
                                <span>{total} emails ({percent}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-white/80 rounded-full overflow-hidden border border-[rgba(42,26,15,0.06)]">
                                <div className="h-full bg-[#FF6B1A] rounded-full" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => handleToggleAutoSendExtension(camp.id, Boolean(camp.autoSendExtension), e)}
                                className={`px-2 py-0.5 rounded-[6px] text-[9.5px] font-bold border transition-colors ${
                                  camp.autoSendExtension ? 'bg-[#1DA365]/10 text-[#1DA365] border-[#1DA365]/30' : 'bg-white/60 text-[#735E50] border-[rgba(42,26,15,0.08)]'
                                }`}
                              >
                                Auto-Send: {camp.autoSendExtension ? 'ON' : 'OFF'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleToggleAutoRemoveGmailExtension(camp.id, camp.autoRemoveGmailExtension !== false, e)}
                                className={`px-2 py-0.5 rounded-[6px] text-[9.5px] font-bold border transition-colors ${
                                  camp.autoRemoveGmailExtension !== false ? 'bg-[#E63946]/10 text-[#E63946] border-[#E63946]/30' : 'bg-white/60 text-[#735E50] border-[rgba(42,26,15,0.08)]'
                                }`}
                              >
                                Filter Gmail: {camp.autoRemoveGmailExtension !== false ? 'ON' : 'OFF'}
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedCampId(camp.id);
                                  setDetailTab('contacts');
                                }}
                                className="px-3 py-1.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[8px] text-[10px] shadow-2xs"
                              >
                                Manage
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportCampaignCsv(camp.id, camp.name)}
                                className="p-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.08)] text-[#735E50] rounded-[8px]"
                                title="Export CSV"
                              >
                                <DownloadSimple className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                                className="p-1.5 bg-white/80 hover:bg-[#E63946]/10 text-[#735E50] hover:text-[#E63946] rounded-[8px]"
                                title="Delete Email Folder"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Glass>
          )}
        </>
        )
      ) : (
        // =========================================================================
        // GROUND-UP REDESIGNED CAMPAIGN COCKPIT (DETAIL WORKSPACE)
        // =========================================================================
        <>
          {campaignDetails ? (
            <div className="space-y-6">
              {/* Cockpit Executive Command Header */}
              <Glass variant="surface" radius="outer" className="p-5 md:p-6 shadow-sm campaign-reveal relative z-30 overflow-visible">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Breadcrumbs & Title */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      onClick={() => {
                        setSelectedCampId(null);
                        setContactSearch('');
                        setContactStatusFilter('ALL');
                      }}
                      className="p-2.5 bg-white/90 hover:bg-white text-[#2A1A0F] border border-[rgba(42,26,15,0.12)] hover:border-[#FF6B1A] rounded-[14px] transition-all flex-shrink-0 cursor-pointer shadow-xs active:scale-[0.97]"
                      title="Back to all campaigns"
                    >
                      <ArrowLeft className="w-4 h-4" weight="bold" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl md:text-2xl font-black text-[#2A1A0F] tracking-tight truncate">
                          {campaignDetails.name}
                        </h2>
                        <span className={`px-2.5 py-0.5 rounded-[8px] text-[10px] font-bold border uppercase shrink-0 ${
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
                    </div>
                  </div>

                  {/* Right: High-Impact Primary Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Primary Start / Pause Toggle */}
                    {campaignDetails.status !== 'SENDING' ? (
                      <button
                        onClick={() => triggerAction('start')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] active:scale-[0.98]"
                      >
                        <Play className="w-4 h-4" weight="fill" />
                        <span>Start to Send</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerAction('pause')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#D97706]/10 border border-[#D97706]/30 text-[#D97706] hover:bg-[#D97706]/20 font-bold rounded-[14px] text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        <Pause className="w-4 h-4" weight="fill" />
                        <span>Pause Sequence</span>
                      </button>
                    )}

                    {/* Skip Queue Button for next email */}
                    <button
                      onClick={handleSkipQueue}
                      disabled={isSkippingQueue || (campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND' || c.status === 'FAILED').length || 0) === 0}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#7C3AED] font-bold rounded-[14px] text-xs transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                      title="Skip queue delay for the next email only (single use). Normal delays resume for following emails."
                    >
                      <FastForward className="w-4 h-4 text-[#7C3AED]" weight="bold" />
                      <span>{isSkippingQueue ? 'Skipping...' : 'Skip Queue Delay'}</span>
                    </button>

                    {/* Grouped Secondary Action Dropdown */}
                    <div className="relative z-50">
                      <button
                        type="button"
                        onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[14px] text-xs transition-all cursor-pointer shadow-2xs"
                      >
                        <Sliders className="w-4 h-4" weight="bold" />
                        <span>Tools</span>
                        <CaretDown className="w-3.5 h-3.5" weight="bold" />
                      </button>

                      {actionsMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => setActionsMenuOpen(false)} 
                          />
                          <div className="absolute right-0 top-full mt-2 w-56 rounded-[16px] bg-white border border-[rgba(42,26,15,0.12)] shadow-[0_16px_40px_rgba(42,26,15,0.22)] py-2 z-50 text-xs text-[#2A1A0F] space-y-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                handleExportCampaignCsv(campaignDetails.id, campaignDetails.name);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium"
                            >
                              <DownloadSimple className="w-4 h-4 text-[#735E50]" weight="bold" />
                              <span>Export CSV</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                openShareModal({ id: campaignDetails.id, name: campaignDetails.name, contactsCount: campaignDetails.contacts?.length || 0 });
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium text-[#7C3AED]"
                            >
                              <ShareNetwork className="w-4 h-4" weight="duotone" />
                              <span>Share Contacts</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                triggerAction('retry');
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium"
                            >
                              <ArrowCounterClockwise className="w-4 h-4 text-[#735E50]" weight="bold" />
                              <span>Retry Failed Mails</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                handleClearEmails();
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium text-[#E63946]"
                            >
                              <Trash className="w-4 h-4" weight="bold" />
                              <span>Clear Generated Drafts</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                handleDeleteFailedContacts();
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium text-[#E63946]"
                            >
                              <Trash className="w-4 h-4" weight="bold" />
                              <span>Delete Failed / Skipped Emails</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActionsMenuOpen(false);
                                handleOpenGmailModal();
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 font-medium text-[#E63946]"
                            >
                              <UserMinus className="w-4 h-4" weight="bold" />
                              <span>Review & Remove @gmail Emails</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Glass>

              {/* Visual Pipeline Funnel Command Deck */}
              <Glass variant="surface" radius="outer" className="p-6 md:p-7 shadow-sm space-y-4 campaign-reveal">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(42,26,15,0.08)] pb-3">
                  <div className="flex items-center gap-2">
                    <Funnel className="w-4 h-4 text-[#FF6B1A]" weight="fill" />
                    <h3 className="text-xs font-bold text-[#2A1A0F] uppercase tracking-wider">Folder Pipeline Funnel</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#735E50]">
                    Total Emails Delivered: {campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0} / {campaignDetails.contacts?.length || 0} Delivered
                  </span>
                </div>

                <PipelineFunnel
                  contactsCount={campaignDetails.contacts?.length || 0}
                  draftsCount={campaignDetails.contacts?.filter(c => c.emailSubject || c.status === 'READY_TO_SEND' || c.status === 'SENT').length || 0}
                  reviewCount={campaignDetails.contacts?.filter(c => c.status === 'READY_TO_SEND').length || 0}
                  sentCount={campaignDetails.contacts?.filter(c => c.status === 'SENT').length || 0}
                />
              </Glass>

              {/* Workspace Navigation Tabs (Ground-up Structure) */}
              <div className="flex items-center gap-2 border-b border-[rgba(42,26,15,0.1)] pb-2 overflow-x-auto campaign-reveal">
                {[
                  { id: 'contacts', label: 'Recruiter Emails Table', icon: <Users className="w-4 h-4" weight="duotone" />, count: campaignDetails.contacts?.length || 0 },
                  { id: 'import', label: 'Add & Import Emails', icon: <Plus className="w-4 h-4" weight="bold" /> },
                  { id: 'template', label: 'Email Template & Rules', icon: <GearSix className="w-4 h-4" weight="duotone" /> },
                  { id: 'exclusions', label: 'Do Not Contact List', icon: <Prohibit className="w-4 h-4" weight="bold" />, count: (editExcludedEmails ? editExcludedEmails.split(',').filter(x => x.trim().length > 0).length : 0) },
                  { id: 'logs', label: 'Live Dispatch Console', icon: <Terminal className="w-4 h-4" weight="duotone" />, count: activityLogs.length },
                ].map((tab) => {
                  const isActive = detailTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-[#2A1A0F] text-white shadow-md'
                          : 'bg-white/70 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] border border-[rgba(42,26,15,0.06)]'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#735E50]'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ========================================================= */}
              {/* TAB 1: CONTACTS & EMAILS DATATABLE */}
              {/* ========================================================= */}
              {detailTab === 'contacts' && (
                <Glass variant="surface" radius="outer" className="overflow-hidden shadow-sm space-y-0 campaign-reveal">
                  {/* Table Control Bar */}
                  <div className="p-5 border-b border-[rgba(42,26,15,0.08)] bg-white/40 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#2A1A0F] tracking-tight">Active Recruiter Queue</h3>
                        <p className="text-[11px] text-[#735E50] mt-0.5">
                          Inspect AI-drafted subject lines, review personalized pitches, and track single-candidate delivery.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const gmailCount = (campaignDetails.contacts || []).filter(c => isGmailEmail(c.email) && c.status !== 'SENT').length;
                          if (gmailCount === 0) return null;
                          return (
                            <button
                              type="button"
                              onClick={handleOpenGmailModal}
                              className="px-3 py-1.5 rounded-[10px] bg-[#E63946]/10 hover:bg-[#E63946]/20 text-[#E63946] border border-[#E63946]/25 text-[10.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            >
                              <UserMinus className="w-3.5 h-3.5" weight="bold" />
                              <span>Remove {gmailCount} @gmail</span>
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={() => setDetailTab('import')}
                          className="px-3.5 py-1.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white rounded-[10px] text-[10.5px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" weight="bold" />
                          <span>Add More Emails</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                      <div className="relative flex-1">
                        <MagnifyingGlass className="w-3.5 h-3.5 text-[#735E50] absolute left-3 top-1/2 -translate-y-1/2" weight="bold" />
                        <input
                          type="text"
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          placeholder="Search candidate by name, company, role, or recruiter email..."
                          className="w-full pl-9 pr-8 py-2 rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white/90 text-xs text-[#2A1A0F] placeholder-[#9C8E84] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                        />
                        {contactSearch && (
                          <button
                            type="button"
                            onClick={() => setContactSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#735E50] hover:text-[#2A1A0F] rounded-full cursor-pointer"
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
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datatable Body */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[rgba(42,26,15,0.08)] bg-white/50 text-[#735E50] uppercase font-bold text-[9.5px] tracking-wider">
                          <th className="p-4">Recruiter Email</th>
                          <th className="p-4">Target Company</th>
                          <th className="p-4">Hiring Position</th>
                          <th className="p-4">Recruiter Classifier</th>
                          <th className="p-4">Dispatch Status</th>
                          <th className="p-4">Generated Email Pitch</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(42,26,15,0.05)]">
                        {(!campaignDetails.contacts || campaignDetails.contacts.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-[#735E50] text-xs space-y-2">
                              <Users className="w-8 h-8 text-[#9C8E84] mx-auto" weight="duotone" />
                              <p className="font-bold text-[#2A1A0F]">No emails found in this campaign.</p>
                              <p className="text-[11px]">Click "Add & Import Emails" tab above to upload CSV or paste emails.</p>
                            </td>
                          </tr>
                        ) : filteredContacts.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-[#735E50] text-xs space-y-2">
                              <EnvelopeSimple className="w-8 h-8 text-[#9C8E84] mx-auto" weight="duotone" />
                              <p className="font-bold text-[#2A1A0F]">No emails match your filter criteria.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setContactSearch('');
                                  setContactStatusFilter('ALL');
                                }}
                                className="px-3.5 py-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[12px] text-[10px] transition-colors cursor-pointer"
                              >
                                Clear Filter
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredContacts.slice(0, visibleContactsCount).map((contact) => (
                            <tr key={contact.id} className="hover:bg-white/60 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-[#2A1A0F] text-sm flex items-center gap-1.5">
                                  <span>{contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : 'Recruiter'}</span>
                                  {contact.linkedin && (
                                    <a href={contact.linkedin} target="_blank" rel="noreferrer" className="text-[#0A66C2] hover:opacity-80">
                                      <ArrowSquareOut className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                                <div className={`text-[10.5px] font-mono mt-0.5 inline-block ${
                                  contactSearch.trim() && contact.email.toLowerCase().includes(contactSearch.trim().toLowerCase())
                                    ? 'text-[#FF6B1A] bg-[#FF6B1A]/10 border border-[#FF6B1A]/25 px-1.5 py-0.5 rounded-[6px]'
                                    : 'text-[#735E50]'
                                }`}>
                                  {contact.email}
                                </div>
                              </td>

                              <td className="p-4">
                                <span className="font-semibold text-[#2A1A0F] bg-white/70 border border-[rgba(42,26,15,0.08)] px-2.5 py-1 rounded-[8px]">
                                  {contact.company || '—'}
                                </span>
                              </td>

                              <td className="p-4 text-[#735E50] font-medium">
                                {contact.title || contact.role || '—'}
                              </td>

                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-[8px] text-[9px] font-bold uppercase border shadow-2xs ${
                                  contact.isTechnical 
                                    ? 'bg-[#1DA365]/10 text-[#146C43] border-[#1DA365]/25' 
                                    : 'bg-white/80 text-[#735E50] border-[rgba(42,26,15,0.08)]'
                                }`}>
                                  {contact.isTechnical ? 'Technical Recruiter' : 'General HR'}
                                </span>
                              </td>

                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-[8px] text-[9.5px] font-bold uppercase border inline-flex items-center gap-1 ${
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
                                  {contact.status === 'SENT' && <Check className="w-3 h-3" weight="bold" />}
                                  {contact.status}
                                </span>
                              </td>

                              <td className="p-4">
                                {contact.emailSubject ? (
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={() => openContactEditor(contact)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-[#FF6B1A] hover:text-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[10px] text-[10.5px] transition-all cursor-pointer shadow-2xs group"
                                    >
                                      <Sparkle className="w-3.5 h-3.5 text-[#FF6B1A] group-hover:text-white" weight="fill" />
                                      <span>Review Email</span>
                                    </button>
                                    <button
                                      onClick={() => handleRegenerateContactDirect(contact.id)}
                                      className="p-1.5 bg-white/70 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] rounded-[8px] border border-[rgba(42,26,15,0.08)] transition-colors cursor-pointer"
                                      title="Regenerate this specific email using AI"
                                    >
                                      <ArrowCounterClockwise className="w-3.5 h-3.5" weight="bold" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleRegenerateContactDirect(contact.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B1A]/10 hover:bg-[#FF6B1A] hover:text-white border border-[#FF6B1A]/25 text-[#FF6B1A] font-bold rounded-[10px] text-[10.5px] transition-all cursor-pointer shadow-2xs"
                                    title="Generate email for this contact using AI"
                                  >
                                    <Sparkle className="w-3.5 h-3.5" weight="fill" />
                                    <span>Draft Pitch</span>
                                  </button>
                                )}
                              </td>

                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="p-1.5 text-[#735E50] hover:text-[#E63946] hover:bg-[#E63946]/10 rounded-[8px] transition-colors cursor-pointer"
                                  title="Remove contact"
                                >
                                  <UserMinus className="w-4 h-4" weight="bold" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Infinite Scroll Sentinel */}
                  {filteredContacts.length > visibleContactsCount && (
                    <div 
                      ref={loadMoreSentinelRef}
                      className="p-4 bg-white/40 border-t border-[rgba(42,26,15,0.08)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#735E50]"
                    >
                      <span className="text-[11px] font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF6B1A] animate-ping" />
                        Showing {Math.min(visibleContactsCount, filteredContacts.length)} of {filteredContacts.length} loaded
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVisibleContactsCount(prev => prev + 50)}
                          className="px-4 py-2 bg-white/90 hover:bg-[#FF6B1A] hover:text-white border border-[rgba(42,26,15,0.12)] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                        >
                          Load 50 More (+50)
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisibleContactsCount(filteredContacts.length)}
                          className="px-4 py-2 bg-white/70 hover:bg-white text-[#2A1A0F] font-bold rounded-[12px] text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border border-[rgba(42,26,15,0.08)] shadow-2xs"
                        >
                          Load All ({filteredContacts.length})
                        </button>
                      </div>
                    </div>
                  )}
                </Glass>
              )}

              {/* ========================================================= */}
              {/* TAB 2: ADD & IMPORT EMAILS */}
              {/* ========================================================= */}
              {detailTab === 'import' && (
                <div className="campaign-reveal space-y-4">
                  <Glass variant="surface" radius="inner" className="p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#2A1A0F]">Email Importer & Sync Engine</h3>
                      <p className="text-[11px] text-[#735E50] mt-0.5">
                        Add candidates via spreadsheet, bulk email paste, manual entry, or shared campaign code.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailTab('contacts')}
                      className="px-3.5 py-1.5 bg-white/80 hover:bg-white border border-[rgba(42,26,15,0.12)] text-[#2A1A0F] font-bold rounded-[10px] text-xs shadow-2xs"
                    >
                      Return to Emails Queue
                    </button>
                  </Glass>

                  <ImportWizard 
                    campaignId={selectedCampId} 
                    onImportComplete={() => {
                      fetchCampaignDetails(selectedCampId);
                      setDetailTab('contacts');
                    }} 
                  />
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: EMAIL TEMPLATE & SETTINGS */}
              {/* ========================================================= */}
              {detailTab === 'template' && (
                <Glass variant="surface" radius="outer" className="p-6 md:p-8 space-y-6 shadow-sm campaign-reveal text-[#2A1A0F]">
                  <div className="flex justify-between items-center pb-3 border-b border-[rgba(42,26,15,0.08)]">
                    <div>
                      <h3 className="text-base font-extrabold text-[#2A1A0F]">Folder Configuration & AI Prompts</h3>
                      <p className="text-[11px] text-[#735E50] mt-0.5">Customize candidate variables, attached resume, auto-send toggles, and outreach templates.</p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateCampaignSettings} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Email Folder Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <FilePdf className="w-3.5 h-3.5 text-[#FF6B1A]" weight="duotone" />
                          Attached Resume PDF
                        </label>
                        <select
                          value={editResumeId || ''}
                          onChange={(e) => setEditResumeId(e.target.value ? Number(e.target.value) : null)}
                          className="rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white/90 px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:bg-white focus:border-[#FF6B1A] transition-all shadow-inner"
                        >
                          <option value="">No Resume Attachment</option>
                          {resumes.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Automation switches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Glass variant="nested" radius="control" className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                            <Lightning className="w-4 h-4 text-[#FF6B1A]" weight="fill" />
                            Auto-Send Extension Emails
                          </div>
                          <div className="text-[10.5px] text-[#735E50] mt-0.5">
                            Auto-generate email & dispatch via Gmail as emails enter from Chrome extension
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAutoSendExtension(!editAutoSendExtension)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editAutoSendExtension ? 'bg-[#1DA365]' : 'bg-[rgba(42,26,15,0.18)]'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${editAutoSendExtension ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </Glass>

                      <Glass variant="nested" radius="control" className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-[#2A1A0F] flex items-center gap-1.5">
                            <EnvelopeSimple className="w-4 h-4 text-[#E63946]" weight="duotone" />
                            Auto-Remove @gmail Emails
                          </div>
                          <div className="text-[10.5px] text-[#735E50] mt-0.5">
                            Automatically drop personal @gmail.com addresses synced from extension
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditAutoRemoveGmailExtension(!editAutoRemoveGmailExtension)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editAutoRemoveGmailExtension ? 'bg-[#E63946]' : 'bg-[rgba(42,26,15,0.18)]'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${editAutoRemoveGmailExtension ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </Glass>
                    </div>

                    {/* Template Subject & Body */}
                    <Glass variant="nested" radius="inner" className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#2A1A0F] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkle className="w-4 h-4 text-[#FF6B1A]" weight="fill" />
                          Outreach Template Engine
                        </span>
                        <div className="flex items-center gap-1 text-[9.5px] text-[#735E50] font-mono">
                          <span>Allowed:</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border">{"{firstName}"}</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border">{"{company}"}</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border">{"{role}"}</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border">{"{name}"}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Subject Line Template</label>
                        <input
                          type="text"
                          value={editTemplateSubject}
                          onChange={(e) => setEditTemplateSubject(e.target.value)}
                          placeholder="Opportunities at {company} - {role}"
                          className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white px-3.5 py-2.5 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] transition-all shadow-inner"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] text-[#735E50] font-bold uppercase tracking-wider">Email Pitch Body</label>
                        <textarea
                          placeholder="Hi {firstName}, ..."
                          value={editTemplateBody}
                          onChange={(e) => setEditTemplateBody(e.target.value)}
                          rows={7}
                          className="rounded-[12px] border border-[rgba(42,26,15,0.12)] bg-white p-3.5 text-xs text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] font-mono leading-relaxed transition-all shadow-inner"
                        />
                      </div>
                    </Glass>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingSettings}
                        className="px-6 py-2.5 bg-[#FF6B1A] hover:bg-[#E55A0F] text-white font-bold rounded-[14px] text-xs transition-all shadow-[0_8px_20px_-4px_rgba(255,107,26,0.35)] cursor-pointer disabled:opacity-40"
                      >
                        {isUpdatingSettings ? 'Saving Configuration...' : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                </Glass>
              )}

              {/* ========================================================= */}
              {/* TAB 4: DO NOT CONTACT LIST (EXCLUDED DOMAINS & EMAILS) */}
              {/* ========================================================= */}
              {detailTab === 'exclusions' && (
                <Glass variant="surface" radius="outer" className="p-6 md:p-8 space-y-6 shadow-sm campaign-reveal text-[#2A1A0F]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(42,26,15,0.08)]">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#E63946]/10 text-[#E63946] text-[10px] font-bold uppercase tracking-wider">
                        <Prohibit className="w-3.5 h-3.5" weight="bold" />
                        <span>Safety & Exclusion Gate</span>
                      </div>
                      <h3 className="text-base md:text-lg font-black text-[#2A1A0F] tracking-tight">
                        DO NOT CONTACT LIST (EXCLUDED DOMAINS & EMAILS)
                      </h3>
                      <p className="text-xs text-[#735E50] max-w-2xl leading-relaxed">
                        Emails matching these domain patterns will be automatically skipped by the dispatcher.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSkipExcluded}
                        disabled={isSkippingExcluded}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#E63946] hover:bg-[#D42B38] text-white font-bold rounded-[14px] text-xs uppercase tracking-wider transition-all shadow-[0_8px_20px_-4px_rgba(230,57,70,0.35)] cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                      >
                        <Prohibit className="w-4 h-4" weight="bold" />
                        <span>{isSkippingExcluded ? 'Scanning & Skipping...' : 'Apply & Skip Matching Emails'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleUpdateCampaignSettings}
                        disabled={isUpdatingSettings}
                        className="px-4 py-2.5 bg-[#2A1A0F] hover:bg-[#3D2817] text-white font-bold rounded-[14px] text-xs transition-all shadow-sm cursor-pointer disabled:opacity-40"
                      >
                        {isUpdatingSettings ? 'Saving...' : 'Save Exclusions'}
                      </button>
                    </div>
                  </div>

                  {/* Form & Controls */}
                  <div className="space-y-5">
                    <div className="p-5 rounded-[18px] bg-white/70 border border-[rgba(42,26,15,0.08)] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-[11px] text-[#2A1A0F] font-bold uppercase tracking-wider flex items-center gap-2">
                          <span>Excluded Domains & Address Patterns</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E63946]/10 text-[#E63946]">
                            {editExcludedEmails ? editExcludedEmails.split(',').map(s => s.trim()).filter(Boolean).length : 0} Rules Active
                          </span>
                        </label>
                        <span className="text-[10.5px] text-[#735E50]">Separate domains with commas or newlines</span>
                      </div>

                      <textarea
                        value={editExcludedEmails}
                        onChange={(e) => setEditExcludedEmails(e.target.value)}
                        placeholder="e.g. @competitor.com, .corp.example.com, .edu, hr@company.com, @tempmail.com"
                        rows={4}
                        className="w-full rounded-[14px] border border-[rgba(42,26,15,0.12)] bg-white px-4 py-3 text-xs text-[#2A1A0F] font-mono leading-relaxed focus:outline-none focus:border-[#FF6B1A] focus:ring-2 focus:ring-[#FF6B1A]/20 shadow-inner transition-all"
                      />

                      {/* Quick domain helper chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#735E50] mr-1">Quick Add:</span>
                        {[
                          { label: '+ @gmail.com', domain: '@gmail.com' },
                          { label: '+ @yahoo.com', domain: '@yahoo.com' },
                          { label: '+ @hotmail.com', domain: '@hotmail.com' },
                          { label: '+ .edu', domain: '.edu' },
                          { label: '+ @intern.com', domain: '@intern.com' },
                        ].map((preset) => {
                          const currentList = editExcludedEmails.split(',').map(s => s.trim()).filter(Boolean);
                          const isAlreadyAdded = currentList.includes(preset.domain);
                          return (
                            <button
                              key={preset.domain}
                              type="button"
                              disabled={isAlreadyAdded}
                              onClick={() => {
                                if (isAlreadyAdded) return;
                                const updated = currentList.length > 0 ? `${editExcludedEmails.trim().replace(/,+$/, '')}, ${preset.domain}` : preset.domain;
                                setEditExcludedEmails(updated);
                              }}
                              className={`text-[10.5px] font-medium px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                                isAlreadyAdded 
                                  ? 'bg-stone-100 text-[#9C8E84] cursor-not-allowed border border-transparent' 
                                  : 'bg-white hover:bg-orange-50 text-[#735E50] hover:text-[#FF6B1A] border border-[rgba(42,26,15,0.1)] hover:border-[#FF6B1A]/30'
                              }`}
                            >
                              {preset.label} {isAlreadyAdded && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Parsed Active Badges */}
                    {(() => {
                      const parsed = (editExcludedEmails || '').split(',').map(s => s.trim()).filter(Boolean);
                      if (parsed.length === 0) return null;
                      return (
                        <div className="p-4 rounded-[16px] bg-[#E63946]/5 border border-[#E63946]/15 space-y-2.5">
                          <span className="text-[10.5px] font-bold text-[#A01B26] uppercase tracking-wider block">
                            Active Pattern Filters ({parsed.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {parsed.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[10px] bg-white border border-[#E63946]/20 text-[#A01B26] text-xs font-mono font-medium shadow-2xs"
                              >
                                <span>{item}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = parsed.filter((_, i) => i !== idx).join(', ');
                                    setEditExcludedEmails(next);
                                  }}
                                  className="hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 cursor-pointer"
                                  title="Remove this exclusion pattern"
                                >
                                  <X className="w-3 h-3" weight="bold" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Information Card */}
                    <div className="p-4 rounded-[16px] bg-[#2A1A0F]/5 border border-[rgba(42,26,15,0.08)] flex items-start gap-3">
                      <Info className="w-5 h-5 text-[#FF6B1A] shrink-0 mt-0.5" weight="duotone" />
                      <div className="text-xs text-[#735E50] leading-relaxed">
                        <strong className="text-[#2A1A0F]">Dispatcher Safety Guarantee:</strong> Before sending each email, the dispatch engine evaluates the recipient domain against this exclusion list and your account safety rules. Contacts with matching domains are instantly stamped as <strong className="text-[#E63946]">SKIPPED</strong> in your pipeline, ensuring you never email competitors, personal domains, or internal addresses.
                      </div>
                    </div>
                  </div>
                </Glass>
              )}

              {/* ========================================================= */}
              {/* TAB 5: LIVE DISPATCH CONSOLE */}
              {/* ========================================================= */}
              {detailTab === 'logs' && (
                <Glass variant="strong" radius="outer" className="overflow-hidden shadow-sm space-y-0 text-white bg-[#2A1A0F] border border-[#3D2817] campaign-reveal">
                  <div className="bg-[#24160C] px-5 py-3.5 border-b border-[#3D2817] flex justify-between items-center">
                    <span className="text-xs font-bold text-[#E5D5C5] uppercase tracking-widest flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1DA365] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1DA365]"></span>
                      </span>
                      Live Dispatch Engine Terminal
                    </span>
                    <button
                      type="button"
                      onClick={() => fetchActivityLogs()}
                      className="text-[10px] font-mono text-[#A69282] hover:text-white px-2 py-1 rounded bg-[#3D2817]"
                    >
                      Refresh Feed
                    </button>
                  </div>
                  <div className="p-5 max-h-[360px] overflow-y-auto space-y-2 font-mono text-xs leading-relaxed text-[#D2C3B4] select-text">
                    {activityLogs.length === 0 ? (
                      <div className="text-[#8A796B] text-center py-12">No recent outreach events. Start drafting or sending to stream live activity.</div>
                    ) : (
                      activityLogs.map((log) => {
                        const timeStr = new Date(log.timestamp).toLocaleTimeString();
                        const isError = log.level === 'ERROR';
                        const isWarn = log.level === 'WARN';
                        return (
                          <div key={log.id} className="flex gap-3 items-start hover:bg-white/5 p-1 rounded">
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
              )}

              {/* Review Generated Email Modal */}
              {editContact && (
                <div className="fixed inset-0 z-50 bg-[#2A1A0F]/50 backdrop-blur-md flex items-center justify-center p-4">
                  <Glass variant="strong" radius="outer" className="w-full max-w-2xl p-6 md:p-8 space-y-4 shadow-[0_24px_60px_-15px_rgba(42,26,15,0.25)] text-[#2A1A0F] max-h-[92vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-[rgba(42,26,15,0.08)] pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#2A1A0F] uppercase tracking-wider">Review Personalized Email Pitch</h3>
                        <p className="text-[11px] text-[#735E50]">Candidate Recipient: <span className="font-mono text-[#2A1A0F] font-bold">{editContact.email}</span></p>
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
            <CampaignCockpitSkeleton />
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
                <h3 className="text-lg font-extrabold text-[#2A1A0F]">Share Email Folder Contacts</h3>
                <p className="text-xs text-[#735E50] font-medium truncate max-w-[320px]">
                  {shareModalCampaign.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#735E50] leading-relaxed">
              Anyone with this shareable link or code can import this email folder&apos;s contacts into their Outreach-AI account and immediately start sending outreach emails.
            </p>

            {isGeneratingShare ? (
              <div className="py-8 flex flex-col items-center justify-center text-[#735E50] gap-2">
                <CircleNotch className="w-6 h-6 animate-spin text-[#7C3AED]" />
                <span className="text-xs font-semibold">Generating secure share link...</span>
              </div>
            ) : shareToken ? (
              <div className="space-y-4">
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
                <h3 className="text-lg font-extrabold text-[#2A1A0F]">Import Shared Email Folder</h3>
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
                      <span className="text-[10px] uppercase font-bold text-[#7C3AED] tracking-wider">Email Folder</span>
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
                      New Email Folder Name in your workspace
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
              <button
                onClick={() => setShowGmailModal(false)}
                className="absolute top-5 right-5 text-[#735E50] hover:text-[#2A1A0F] transition-colors p-1 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" weight="bold" />
              </button>

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
