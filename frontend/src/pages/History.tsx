import React, { useEffect, useState } from 'react';
import { Search, Eye, AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import { EmailHistory } from '../types';

export const History: React.FC = () => {
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EmailHistory | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/history?search=${encodeURIComponent(search)}`);
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Outreach History</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Search and view details of all previously sent or failed outreach applications.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, email, or campaign..."
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-neutral-850 bg-zinc-950 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
          />
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Main List */}
      <div className="border border-neutral-800 bg-zinc-950/20 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-900 bg-zinc-950/40 text-neutral-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="p-4">Recipient</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Email Subject</th>
                <th className="p-4">Sent Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-neutral-400 mx-auto"></div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-neutral-500">
                    No matching outreach records found in history.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-neutral-200">
                        {item.contact?.firstName ? `${item.contact.firstName} ${item.contact.lastName || ''}` : 'Recruiter'}
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{item.contact?.email || '—'}</div>
                      <div className="text-[10px] text-neutral-400 font-medium mt-0.5">{item.contact?.company || '—'}</div>
                    </td>
                    <td className="p-4 text-neutral-300 font-medium truncate max-w-[120px]">
                      {item.campaign?.name || '—'}
                    </td>
                    <td className="p-4 text-neutral-400 truncate max-w-[180px]">
                      {item.subject}
                    </td>
                    <td className="p-4 text-neutral-500 font-medium">
                      {new Date(item.sentAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase flex items-center gap-1 w-fit ${
                        item.status === 'SENT' 
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' 
                          : 'bg-rose-950/20 border-rose-800/40 text-rose-400'
                      }`}>
                        {item.status === 'SENT' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <AlertOctagon className="w-2.5 h-2.5" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 border border-neutral-900 rounded transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Item Details Modal Overlay */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl border border-neutral-800 bg-zinc-900/95 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-350 uppercase tracking-wider">Outreach Details</h3>
                <p className="text-[10px] text-neutral-500">Sent to: {selectedItem.contact?.email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${
                selectedItem.status === 'SENT'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                  : 'bg-rose-950/20 border-rose-800/40 text-rose-400'
              }`}>
                {selectedItem.status}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-950/40 p-3 rounded-lg border border-neutral-850">
                <div>
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Sent Date</span>
                  <span className="text-neutral-300 font-medium block mt-0.5">
                    {new Date(selectedItem.sentAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">Gmail Message ID</span>
                  <span className="text-neutral-350 font-mono block mt-0.5 truncate select-all" title={selectedItem.gmailMessageId || ''}>
                    {selectedItem.gmailMessageId || 'N/A'}
                  </span>
                </div>
              </div>

              {selectedItem.errorMsg && (
                <div className="bg-rose-950/10 border border-rose-900/30 p-3 rounded-lg text-rose-400 text-[11px] font-medium leading-relaxed">
                  <span className="font-bold block uppercase text-[9px] tracking-wider mb-1">Execution Failure Error</span>
                  {selectedItem.errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Subject Line</span>
                <div className="bg-zinc-950/40 p-2.5 rounded border border-neutral-850 text-neutral-200 font-semibold">
                  {selectedItem.subject}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">Email Content</span>
                <div className="bg-zinc-950/40 p-4 rounded border border-neutral-850 text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                  {selectedItem.body}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-md text-xs transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
