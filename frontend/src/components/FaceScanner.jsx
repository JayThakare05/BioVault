import { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

export default function FaceScanner({ onScanComplete, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState('initializing'); // initializing | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [debugMsg, setDebugMsg] = useState('Loading models...');

  useEffect(() => {
    let active = true;

    async function loadModelsAndStart() {
      try {
        setDebugMsg('Loading Face AI...');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        if (!active) return;

        setDebugMsg('Accessing Camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: 640, height: 480 } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setPhase('scanning');
        setDebugMsg('Position your face...');

        detectFace();

      } catch (err) {
        if (!active) return;
        console.error("Face Scanner initialization failed:", err);
        setPhase('error');
        setErrorMsg('Setup failed: ' + (err.message || 'Check camera permissions.'));
      }
    }

    async function detectFace() {
        if (!active || !videoRef.current) return;

        try {
            const result = await faceapi.detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (result) {
                setPhase('success');
                setDebugMsg('Face Locked!');
                
                // Convert descriptor to a unique string for database matching
                // In a production app, you'd send the actual descriptor (float32 array)
                const descriptorString = Array.from(result.descriptor).slice(0, 32).join(',');
                
                setTimeout(() => {
                    if (active) {
                        cleanup();
                        onScanComplete(descriptorString);
                    }
                }, 1500);
            } else {
                // Keep trying until a face is found
                requestAnimationFrame(detectFace);
            }
        } catch (err) {
            console.error("Detection error:", err);
            // Optionally retry or fail
            requestAnimationFrame(detectFace);
        }
    }

    loadModelsAndStart();

    return () => {
      active = false;
      cleanup();
    };
  }, [onScanComplete]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-fadeIn" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="glass-card w-full max-w-sm mx-4 overflow-hidden relative flex flex-col items-center p-6" style={{ background: 'rgba(13,17,23,0.95)', border: '1px solid rgba(124,58,237,0.3)' }}>
        
        <h2 className="font-space font-bold text-xl mb-6 text-white text-center">
          {phase === 'error' ? 'Face ID Failed' : 'Biometric Face ID'}
        </h2>

        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden flex items-center justify-center mb-6 shadow-xl" 
             style={{ 
               border: `3px solid ${phase === 'success' ? '#06ffb4' : phase === 'error' ? '#ff4757' : '#7c3aed'}`,
               boxShadow: `0 0 30px ${phase === 'success' ? 'rgba(6,255,180,0.4)' : phase === 'error' ? 'rgba(255,71,87,0.4)' : 'rgba(124,58,237,0.4)'}`
             }}>
          
          {phase === 'initializing' && (
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-t-transparent border-purple-500 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Loading AI...</p>
            </div>
          )}

          {phase === 'error' ? (
            <div className="flex flex-col items-center gap-3 px-4 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="#ff4757"/></svg>
                <p className="text-xs text-[#ff4757]">{errorMsg}</p>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-500 ${phase === 'initializing' ? 'opacity-0' : 'opacity-100'}`} 
            />
          )}

          {/* Scanning Animation */}
          {phase === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-center">
                <div className="w-full relative" style={{ height: '2px', background: 'rgba(6,255,180,0.5)', boxShadow: '0 0 15px #06ffb4', animation: 'scan-line 2.5s ease-in-out infinite' }} />
                <div className="absolute inset-0 border-[20px] border-black/40 rounded-full" />
            </div>
          )}

          {/* Success overlay */}
          {phase === 'success' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-fadeIn">
                <div className="rounded-full bg-[#06ffb420] p-4 border border-[#06ffb4]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L19 7" stroke="#06ffb4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
          )}
        </div>

        <div className="h-6 flex flex-col items-center justify-center text-center">
            <p className={`text-sm font-medium ${phase === 'success' ? 'text-[#06ffb4]' : 'text-[#00d4ff]'} transition-colors`}>
                {debugMsg}
            </p>
        </div>

        <button 
          onClick={handleCancel}
          disabled={phase === 'success'}
          className="mt-6 text-xs font-medium text-gray-500 hover:text-white transition-colors py-2 tracking-widest uppercase"
        >
          {phase === 'error' ? 'Close Scanner' : 'Abort Authentication'}
        </button>
      </div>
    </div>
  );
}
