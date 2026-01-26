'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, RefreshCw, ArrowLeft } from 'lucide-react';

interface Report {
  id: string;
  message: string;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'forbidden'>('loading');
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setStatus('loading');
    
    try {
      const res = await fetch('/api/reports', {
        credentials: 'include',
      });

      if (res.status === 401) {
        // Not logged in - redirect to login
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        // Not admin
        setStatus('forbidden');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      setReports(data.reports || []);
      setStatus('success');
    } catch (error) {
      console.error('Error fetching reports:', error);
      setStatus('error');
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    setDeleting(id);

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    } finally {
      setDeleting(null);
    }
  };

  // Loading State
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="animate-spin text-amber-500" size={24} />
          <p className="text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Forbidden State
  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don&apos;t have permission to view this page. This area is restricted to administrators only.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-gray-400 mb-6">Failed to load reports. Please try again.</p>
          <button
            onClick={fetchReports}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 mb-4 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-500">
              Reports Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              {reports.length} {reports.length === 1 ? 'report' : 'reports'} received
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-gray-800">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-400">No reports yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <p className="text-white whitespace-pre-wrap flex-1">
                    {report.message}
                  </p>

                  <button
                    onClick={() => deleteReport(report.id)}
                    disabled={deleting === report.id}
                    className="text-gray-500 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete report"
                  >
                    {deleting === report.id ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    {report.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}