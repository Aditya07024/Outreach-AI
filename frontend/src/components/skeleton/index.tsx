import React from 'react';
import { Glass } from '../glass/Glass';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base atomic Skeleton component with subtle warm pulse & shimmer
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-[#2A1A0F]/[0.07] rounded-[10px] ${className}`}
      {...props}
    />
  );
};

/**
 * Dashboard full-page skeleton matching the light warm glass bento layout
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header greeting skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="space-y-2">
          <Skeleton className="h-8 sm:h-9 w-72 sm:w-96 rounded-[14px]" />
          <Skeleton className="h-4 w-60 sm:w-80 rounded-[8px]" />
        </div>
      </div>

      {/* 2. Hero 12-col Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (7 cols): Daily Limit Gauge */}
        <Glass
          variant="surface"
          radius="outer"
          className="lg:col-span-7 p-6 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-52 rounded-[10px]" />
            <Skeleton className="h-3.5 w-64 rounded-[8px]" />

            {/* Gauge visual mock */}
            <div className="flex flex-col items-center justify-center py-6">
              <Skeleton className="w-36 h-36 rounded-full mb-3" />
              <Skeleton className="h-4 w-32 rounded-full" />
            </div>

            {/* Subcards row */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-3 rounded-[14px] bg-white/50 border border-white/70 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
              <div className="p-3 rounded-[14px] bg-white/50 border border-white/70 space-y-1.5">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between">
            <Skeleton className="h-3 w-44 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        </Glass>

        {/* Right Column (5 cols): Spotlight Next Email to Review */}
        <Glass
          variant="surface"
          radius="outer"
          className="lg:col-span-5 p-6 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-48 rounded-[10px]" />
            <Skeleton className="h-3.5 w-72 rounded-[8px]" />

            {/* Queued emails card skeleton */}
            <div className="my-3 p-4 rounded-[20px] bg-white/80 border border-white/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                </div>
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>

              {/* 3 email preview rows */}
              <div className="space-y-2 pt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-2.5 rounded-[12px] bg-stone-50/70 border border-stone-100 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-3.5 w-24 rounded-md" />
                        <Skeleton className="h-3 w-20 rounded-md" />
                      </div>
                      <Skeleton className="h-3 w-40 rounded-md" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Skeleton className="h-10 w-full rounded-[12px] mt-2" />
        </Glass>
      </div>

      {/* 3. Outreach Progress Ribbon */}
      <Glass variant="surface" radius="outer" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-3.5 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-[16px] bg-white/60 border border-white/80 space-y-2">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </Glass>

      {/* 4. Campaigns Bento Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-6 w-44 rounded-[10px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-48 rounded-[14px]" />
            <Skeleton className="h-9 w-28 rounded-[14px]" />
          </div>
        </div>

        {/* Campaign cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Glass key={i} variant="surface" radius="inner" className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-3 w-24 rounded-md" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Skeleton className="h-10 rounded-[12px]" />
                <Skeleton className="h-10 rounded-[12px]" />
                <Skeleton className="h-10 rounded-[12px]" />
              </div>
              <div className="pt-2 flex items-center justify-between border-t border-[rgba(42,26,15,0.06)]">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-[10px]" />
              </div>
            </Glass>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Campaigns list skeleton
 */
export const CampaignsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-48 rounded-[14px]" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-28 rounded-[12px]" />
          <Skeleton className="h-9 w-36 rounded-[12px]" />
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Glass variant="surface" radius="inner" className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <Skeleton className="h-9 w-full md:w-80 rounded-[12px]" />
        <div className="flex items-center gap-2 w-full md:w-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-18 rounded-full" />
          ))}
        </div>
      </Glass>

      {/* Grid of campaign cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Glass key={i} variant="surface" radius="inner" className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
              </div>
              <Skeleton className="h-5 w-18 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-2 py-1">
              <Skeleton className="h-10 rounded-[12px]" />
              <Skeleton className="h-10 rounded-[12px]" />
              <Skeleton className="h-10 rounded-[12px]" />
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-[rgba(42,26,15,0.06)]">
              <Skeleton className="h-3 w-24 rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-16 rounded-[10px]" />
                <Skeleton className="h-7 w-7 rounded-[10px]" />
              </div>
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
};

/**
 * Campaign Cockpit (Single Campaign Detail) Skeleton
 */
export const CampaignCockpitSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 rounded-md" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-60 rounded-[12px]" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-80 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-[12px]" />
            <Skeleton className="h-9 w-32 rounded-[12px]" />
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-[rgba(42,26,15,0.08)] pb-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-[10px]" />
        ))}
      </div>

      {/* Funnel Ribbon */}
      <Glass variant="surface" radius="inner" className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 rounded-[14px] bg-white/60 space-y-1.5">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </Glass>

      {/* Table search & action bar */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-72 rounded-[12px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-[10px]" />
          <Skeleton className="h-8 w-28 rounded-[10px]" />
        </div>
      </div>

      {/* Contacts Table Skeleton */}
      <Glass variant="surface" radius="inner" className="overflow-hidden">
        <div className="p-4 border-b border-[rgba(42,26,15,0.08)] bg-white/60 flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
        </div>
        <div className="divide-y divide-[rgba(42,26,15,0.06)]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-44 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-32 rounded-md hidden sm:block" />
              <Skeleton className="h-4 w-28 rounded-md hidden md:block" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-[10px]" />
            </div>
          ))}
        </div>
      </Glass>
    </div>
  );
};

/**
 * Outbox page skeleton
 */
export const OutboxSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-44 rounded-[12px]" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-48 rounded-[12px]" />
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Queue List */}
        <div className="border border-stone-200 bg-white/80 rounded-[20px] p-5 space-y-3.5 h-fit shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3.5 rounded-[14px] bg-stone-50/80 border border-stone-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-36 rounded-md" />
              <Skeleton className="h-3 w-24 rounded-md" />
            </div>
          ))}
        </div>

        {/* Right Column: Email Preview & Editor */}
        <div className="lg:col-span-2 border border-stone-200 bg-white/80 rounded-[20px] p-6 space-y-5 shadow-xs">
          {/* Recruiter Banner */}
          <div className="p-4 rounded-[14px] bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-52 rounded-md" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-[12px]" />
          </div>

          {/* Body Field */}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-52 w-full rounded-[14px]" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <Skeleton className="h-9 w-24 rounded-[12px]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-28 rounded-[12px]" />
              <Skeleton className="h-9 w-36 rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Resumes page skeleton
 */
export const ResumesSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52 rounded-[12px]" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Upload Zone Card */}
      <Glass variant="surface" radius="inner" className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
        </div>
        <div className="border-2 border-dashed border-stone-300 rounded-[20px] p-8 flex flex-col items-center justify-center space-y-3 bg-stone-50/50">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="h-4 w-48 rounded-md" />
          <Skeleton className="h-3 w-32 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44 rounded-[12px]" />
      </Glass>

      {/* Resumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Glass key={i} variant="surface" radius="inner" className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-[12px]" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
            <div className="pt-3 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between">
              <Skeleton className="h-7 w-20 rounded-[10px]" />
              <Skeleton className="h-7 w-16 rounded-[10px]" />
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
};

/**
 * Table skeleton rows for History, Logs, AdminPortal
 */
export const TableRowsSkeleton: React.FC<{ columns: number; rows?: number }> = ({
  columns,
  rows = 5,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-stone-100 hover:bg-stone-50/40">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} className="p-4">
              <Skeleton
                className={`h-4 rounded-md ${
                  cIdx === 0 ? 'w-36' : cIdx === 1 ? 'w-24' : cIdx === 2 ? 'w-48' : 'w-20'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

/**
 * Subscription page skeleton
 */
export const SubscriptionSkeleton: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6 animate-fadeIn">
      <div className="text-center space-y-2 mb-8">
        <Skeleton className="h-8 w-64 mx-auto rounded-[12px]" />
        <Skeleton className="h-4 w-80 mx-auto rounded-md" />
      </div>

      <Glass variant="surface" radius="outer" className="p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-md" />
            <Skeleton className="h-3.5 w-32 rounded-md" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-4 h-4 rounded-full shrink-0" />
              <Skeleton className="h-4 w-72 rounded-md" />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <Skeleton className="h-9 w-32 rounded-[12px]" />
          <Skeleton className="h-10 w-40 rounded-[12px]" />
        </div>
      </Glass>
    </div>
  );
};

/**
 * Global AppShell Session Loading Skeleton
 */
export const AppShellSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDF8F3] text-[#2A1A0F] font-sans flex">
      {/* Left Sidebar Skeleton (hidden on mobile, visible on desktop) */}
      <aside className="hidden lg:flex w-72 flex-col justify-between p-6 border-r border-[rgba(42,26,15,0.06)] bg-white/70 backdrop-blur-md">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-[14px]" />
            <Skeleton className="h-5 w-32 rounded-md" />
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[14px]">
                <Skeleton className="w-5 h-5 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* User profile card */}
        <div className="p-3 rounded-[16px] bg-stone-50 border border-stone-200 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>
      </aside>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 border-b border-[rgba(42,26,15,0.06)] bg-white/60 backdrop-blur-md px-6 flex items-center justify-between">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </header>

        {/* Body content */}
        <main className="flex-grow p-6 max-w-7xl w-full mx-auto">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
};
