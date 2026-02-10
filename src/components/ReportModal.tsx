'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    setStatus('loading');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          userid: user?.id || null
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setStatus('success');
      setMessage('');
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch {
      setStatus('error');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      setStatus('idle');
      setMessage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 relative">
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            setStatus('idle');
            setMessage('');
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-amber-500 mb-4">
          Report an Issue
        </h2>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="text-green-500 text-4xl mb-3">✓</div>
            <p className="text-green-400">Report submitted successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none"
            />

            {status === 'error' && (
              <p className="text-red-500 text-sm">Failed to submit. Try again.</p>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !message.trim()}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {status === 'loading' ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}