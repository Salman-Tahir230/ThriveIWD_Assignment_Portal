import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { useAuth } from '../hooks/useAuth';

const TIER_LABEL = {
  Flex: 'Web Flex',
  Connect: 'Web Connect',
  Live: 'Web Live',
};

export default function CertificatePage() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const certRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!certRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(certRef.current, {
        pixelRatio: 2, // export at 2x for a crisp download, not a blurry 1:1 screen capture
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `thrive-vap-certificate-${student.fullName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  const tierLabel = TIER_LABEL[student?.tier] || student?.tier;

  return (
    <div className="min-h-screen px-4 py-10 flex flex-col items-center">
      <button
        onClick={() => navigate('/')}
        className="self-start mb-6 text-sm text-thrive-ink/50 hover:text-thrive-ink transition"
      >
        ← Back to dashboard
      </button>

      <div
        ref={certRef}
        className="w-full max-w-2xl aspect-[1.414/1] bg-white border-[3px] border-thrive-accent
                   rounded-lg flex flex-col items-center justify-center text-center px-10 py-12"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-thrive-accent font-medium">
          Certificate of Completion
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-thrive-ink mt-4">
          {student?.fullName}
        </h1>
        <p className="mt-4 text-thrive-ink/70 max-w-md leading-relaxed">
          has successfully completed the Thrive Volunteer &amp; Ambassador
          Program
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-thrive-accent">
          Thrive IWD {tierLabel}
        </p>
        <div className="mt-8 h-px w-24 bg-thrive-line" />
        <p className="mt-3 text-xs text-thrive-ink/40">
          Thrive IWD · thriveiwd.com
        </p>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="mt-6 rounded-lg bg-thrive-accent px-5 py-2.5 font-medium
                   text-white hover:bg-thrive-accent/90 transition
                   disabled:opacity-50"
      >
        {exporting ? 'Preparing image…' : 'Download as PNG'}
      </button>
    </div>
  );
}
