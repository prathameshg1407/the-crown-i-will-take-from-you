'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import ReportModal from './ReportModal';

export default function ReportButton() {
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      {/* Report Icon - Bottom Left */}
      <button
        onClick={() => setShowReport(true)}
        className="fixed bottom-6 left-6 z-40 bg-rose-900/80 hover:bg-rose-800 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="Report an issue"
        title="Report an issue"
      >
        <Flag size={20} />
      </button>

      {/* Modal */}
      <ReportModal 
        isOpen={showReport} 
        onClose={() => setShowReport(false)} 
      />
    </>
  );
}