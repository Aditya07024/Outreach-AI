export interface Settings {
  id: number;
  name: string;
  phone: string;
  portfolio: string;
  github: string;
  linkedin: string;
  preferredRole: string;
  desiredSalary: string;
  location: string;
  defaultResumeId: number | null;
  customPrompt: string;
  delayMin: number;
  delayMax: number;
  technicalFilter: boolean;
}

export interface GmailCredentials {
  id: number;
  email: string;
  connectedAt: string;
}

export interface Resume {
  id: number;
  name: string;
  filePath: string;
  description?: string | null;
  uploadedAt: string;
}

export interface CampaignMetrics {
  total: number;
  pending: number;
  generating: number;
  ready: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'SENDING' | 'GENERATING' | 'PAUSED' | 'COMPLETED';
  resumeId: number | null;
  resume?: Resume | null;
  templateType?: 'AI_GENERATED' | 'SAVED_TEMPLATE' | 'MANUAL';
  templateSubject?: string | null;
  templateBody?: string | null;
  contacts?: Contact[];
  createdAt: string;
  updatedAt: string;
  metrics?: CampaignMetrics;
}

export interface Contact {
  id: number;
  campaignId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  role: string | null;
  company: string | null;
  phone: string | null;
  linkedin: string | null;
  country: string | null;
  isTechnical: boolean;
  status: 'PENDING' | 'GENERATING' | 'READY_TO_SEND' | 'SENT' | 'FAILED' | 'SKIPPED';
  duplicateStatus: 'DUPLICATE_EMAIL' | 'DUPLICATE_COMPANY' | 'PREVIOUS_CAMPAIGN' | null;
  emailSubject: string | null;
  emailBody: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailHistory {
  id: number;
  contactId: number;
  contact?: Contact;
  campaignId: number;
  campaign?: Campaign;
  subject: string;
  body: string;
  status: 'SENT' | 'FAILED';
  errorMsg: string | null;
  gmailMessageId: string | null;
  sentAt: string;
}

export interface Log {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: 'CSV_IMPORT' | 'EMAIL_GENERATION' | 'EMAIL_SENDING' | 'OAUTH' | 'API';
  message: string;
  details: string | null;
  timestamp: string;
}
