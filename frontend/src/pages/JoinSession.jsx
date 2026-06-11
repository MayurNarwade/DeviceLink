import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, ArrowRight, Sparkles, AlertCircle, LogIn } from 'lucide-react';
import { joinSession } from '../services/api';
import useSessionStore from '../store/sessionStore';

const JoinSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    setSession, 
    setDeviceName, 
    setPeerId, 
    setToken, 
    setPeerCount, 
    setStatus 
  } = useSessionStore();
  
  const [tempName, setTempName] = useState('');
  const [sessionId, setSessionId] = useState(searchParams.get('session') || '');
  const [otp, setOtp] = useState(searchParams.get('otp') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!tempName.trim() || !sessionId.trim() || !otp.trim()) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await joinSession(sessionId, otp);
      if (!data || !data.peer_id) throw new Error('Invalid session ID or OTP');
      
      // Store joiner's device name
      setDeviceName(tempName);
      
      // Store session info (isInitiator = false because joiner)
      setSession(sessionId, otp, false);
      
      // Store peer credentials (these are the joiner's own peerId + token)
      setPeerId(data.peer_id);
      setToken(data.token);
      setPeerCount(1);        // only joiner initially, creator not yet connected
      setStatus('connected');
      
      // Navigate to session room
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Invalid session ID or OTP');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-purple-300 text-sm">Join Session</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Enter Collaboration Room
            </h1>
            <p className="text-purple-200">
              Enter your device name and the session details
            </p>
          </div>

          <div className="space-y-6 max-w-md mx-auto">
            <div>
              <label className="block text-purple-200 mb-2">Your Device Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="e.g., My Phone, Office Laptop"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-purple-200 mb-2">Session ID</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-purple-200 mb-2">One-Time Password (OTP)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition font-mono text-center text-xl tracking-wider"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={!tempName.trim() || !sessionId.trim() || !otp.trim() || loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Joining...' : 'Join Session'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </div>

          <div className="mt-8 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-300 font-medium">Note for Joiners</p>
                <p className="text-yellow-200 text-sm">
                  The session creator must enter the room first. If the room isn't ready, wait a moment and try again.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinSession;