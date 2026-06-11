import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Copy, Check, Reply } from 'lucide-react';

export default function BubbleMessage({ msg, fromMe, onReply, onReaction, onToggleReaction, showRepliedForId, formatTimestamp }) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const bubbleRef = useRef(null);
  const doubleTapTimeout = useRef(null);

  // 3D tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-10, 10], [2, -2]);
  const rotateY = useTransform(x, [-10, 10], [-2, 2]);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 20 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e) => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    x.set(offsetX / 15);
    y.set(offsetY / 15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovering(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1500);
  };

  // Double‑tap toggles ❤️ reaction
  const handleDoubleTap = () => {
    if (onToggleReaction) {
      onToggleReaction(msg.id, '❤️');
    } else {
      onReaction?.(msg.id, '❤️');
    }
  };

  const handleTap = (e) => {
    if (doubleTapTimeout.current) {
      clearTimeout(doubleTapTimeout.current);
      doubleTapTimeout.current = null;
      handleDoubleTap();
      e.stopPropagation();
    } else {
      doubleTapTimeout.current = setTimeout(() => {
        doubleTapTimeout.current = null;
      }, 300);
    }
  };

  let statusContent = null;
  if (fromMe) {
    if (showRepliedForId === msg.id) {
      statusContent = <span className="text-purple-400 animate-pulse text-xs">✨ replied</span>;
    } else if (msg.status === 'read') {
      statusContent = <span className="text-blue-400 text-xs">👁 seen</span>;
    } else if (msg.status === 'delivered') {
      statusContent = <span className="text-gray-500 dark:text-gray-400 text-xs">◡ landed</span>;
    } else if (msg.status === 'sent') {
      statusContent = <span className="text-gray-400 text-xs">✓ sent</span>;
    } else if (msg.status === 'pending') {
      statusContent = <span className="text-gray-400 animate-pulse text-xs">⋯ floating</span>;
    } else if (msg.status === 'failed') {
      statusContent = <span className="text-red-400 text-xs">✗ failed</span>;
    }
  }

  const reactions = msg.reactions || {};
  const myReaction = msg.myReaction;

  return (
    <div
      className={`flex ${fromMe ? 'justify-end' : 'justify-start'} mb-4 w-full items-start`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Message bubble */}
      <motion.div
        ref={bubbleRef}
        className="relative max-w-[70%] cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleTap}
        whileTap={{ scale: 0.97 }}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          x: springX,
          y: springY,
          transformStyle: 'preserve-3d',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div
          className={`px-4 py-2 rounded-2xl shadow-sm ${
            fromMe
              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
          }`}
        >
          {msg.replyTo && (
            <div className="text-xs opacity-70 mb-1 border-l-2 border-gray-400 pl-2 italic">
              ↳ {msg.replyTo.text.slice(0, 60)}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
          
          {/* Reactions row */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={`${msg.id}-reaction-${emoji}`}
                  onClick={() => onReaction?.(msg.id, emoji)}
                  className={`text-xs px-1.5 py-0.5 rounded-full transition ${
                    fromMe
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/20'
                  } ${myReaction === emoji ? 'ring-2 ring-blue-400' : ''}`}
                >
                  {emoji} {count}
                </button>
              ))}
            </div>
          )}
          
          <div className={`flex items-center justify-end gap-1 mt-1 ${fromMe ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
            <span className="text-[10px]">{formatTimestamp(msg.timestamp)}</span>
            {fromMe && <span className="text-[10px]">{statusContent}</span>}
          </div>
        </div>
      </motion.div>

      {/* Action buttons – only Reply and Copy, on hover, always on right side */}
      <div className={`flex items-start gap-1 ml-2 transition-all duration-200 ${isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
        <div className="flex gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onReply(msg)}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="Reply"
          >
            <Reply size={14} className="text-purple-600 dark:text-purple-400" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="Copy"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-600 dark:text-gray-300" />}
          </button>
        </div>
      </div>

      {showTooltip && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-20">
          Copied!
        </div>
      )}
    </div>
  );
}