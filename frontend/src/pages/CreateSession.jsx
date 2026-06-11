import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, ArrowRight, Sparkles, AlertCircle, Check, Copy, LogIn } from 'lucide-react';
import QRCode from 'qrcode';
import { createSession, joinSession } from '../services/api';
import useSessionStore from '../store/sessionStore';

const CreateSession = () => {
  const navigate = useNavigate();
  const { setSession, setDeviceName, setPeerId, setToken, setPeerCount, setStatus } = useSessionStore();
  const [step, setStep] = useState(1);
  const [tempName, setTempName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(10);

  const handleCreateSession = async () => {
    if (!tempName.trim()) {
      setError('Please enter a device name');
      return;
    }
    setError('');
    try {
      // 1. Create session
      const createData = await createSession();
      if (!createData || !createData.session_id) throw new Error('Failed to create session');
      
      const { session_id, otp, expires_at } = createData;
      
      // 2. Join as the creator (to get peerId + token)
      const joinData = await joinSession(session_id, otp);
      if (!joinData || !joinData.peer_id) throw new Error('Failed to join own session');
      
      const { peer_id, token, ws_url } = joinData;
      
      // 3. Store everything in Zustand
      setDeviceName(tempName);
      setSession(session_id, otp, true);
      setPeerId(peer_id);
      setToken(token);
      setPeerCount(1);
      setStatus('connected');
      
      setSessionInfo({ sessionId: session_id, otp });
      
      // 4. Generate QR code
      const joinUrl = `${window.location.origin}/join?session=${session_id}&otp=${otp}`;
      const qr = await QRCode.toDataURL(joinUrl);
      setQrCodeUrl(qr);
      
      setStep(2);
      setCountdown(10); // 10 seconds before auto-redirect
    } catch (err) {
      console.error(err);
      setError('Failed to create session. Please try again.');
    }
  };

  // Auto-redirect after 10 seconds (only when step 2)
  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === 2 && countdown === 0) {
      navigate(`/session/${sessionInfo?.sessionId}`);
    }
  }, [step, countdown, navigate, sessionInfo]);

  const goToRoom = () => {
    navigate(`/session/${sessionInfo?.sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {step === 1 ? (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-purple-500/20 rounded-full px-4 py-2 mb-4">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm">Step 1 of 2</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Name Your Device
              </h1>
              <p className="text-purple-200">
                Choose a name so your collaborator knows who they're chatting with
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                  placeholder="e.g., My Laptop, John's Phone"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateSession}
                disabled={!tempName.trim()}
                className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Create Session <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-300 font-medium">Important!</p>
                  <p className="text-blue-200 text-sm">
                    You'll be the first to enter the room. Wait for your collaborator to join.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center"
          >
            <div className="inline-flex items-center gap-2 bg-green-500/20 rounded-full px-4 py-2 mb-4">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm">Session Created!</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Share with your collaborator</h2>
            <p className="text-purple-200 mb-6">
              They can scan the QR code or enter the session details
            </p>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center mb-6">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 rounded-xl bg-white p-2" />
              </div>
            )}

            {/* Session ID with copy button */}
            <div className="bg-black/30 rounded-xl p-4 mb-4 max-w-md mx-auto">
              <p className="text-purple-300 text-sm mb-2">Session ID</p>
              <div className="flex items-center justify-between gap-4">
                <code className="text-white font-mono text-lg break-all">{sessionInfo?.sessionId}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sessionInfo?.sessionId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                  title="Copy Session ID"
                >
                  {copiedId ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-purple-400" />}
                </button>
              </div>
            </div>

            {/* OTP with copy button */}
            <div className="bg-black/30 rounded-xl p-4 mb-6 max-w-md mx-auto">
              <p className="text-purple-300 text-sm mb-2">One-Time Password (OTP)</p>
              <div className="flex items-center justify-between gap-4">
                <code className="text-white font-mono text-2xl tracking-wider">{sessionInfo?.otp}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sessionInfo?.otp);
                    setCopiedOtp(true);
                    setTimeout(() => setCopiedOtp(false), 2000);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition flex-shrink-0"
                  title="Copy OTP"
                >
                  {copiedOtp ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-purple-400" />}
                </button>
              </div>
            </div>

            {/* Countdown and manual button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <p className="text-purple-300 text-sm">
                Redirecting in <span className="font-bold text-white">{countdown}</span> seconds...
              </p>
              <button
                onClick={goToRoom}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition"
              >
                <LogIn size={16} />
                Go to Room Now
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CreateSession;