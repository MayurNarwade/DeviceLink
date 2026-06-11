import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
import { Smile, Send } from 'lucide-react';

import useChatStore from '../store/chatStore';
import usePeerStore from '../store/peerStore';
import useTransferStore from '../store/transferStore';
import BubbleMessage from './BubbleMessage';
import { formatTimestamp } from '../utils/format';

const GhostTyping = () => (
  <motion.div className="flex space-x-1 px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 w-fit">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 bg-gray-500 rounded-full"
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
      />
    ))}
  </motion.div>
);

const useRepliedIndicator = () => {
  const [repliedMsgId, setRepliedMsgId] = useState(null);
  const timeoutRef = useRef(null);
  const showReplied = (messageId) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRepliedMsgId(messageId);
    timeoutRef.current = setTimeout(() => setRepliedMsgId(null), 3000);
  };
  return { repliedMsgId, showReplied };
};

export default function ChatPanel({ dataChannel }) {
  const [input, setInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [peerGhostTyping, setPeerGhostTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const typingTimeoutRef = useRef(null);
  const ghostTypingTimeoutRef = useRef(null);
  const fileTransferRef = useRef(null);
  const processedMessagesRef = useRef(new Set());
  const lastSentMsgIdRef = useRef(null);

  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);
  const setReply = useChatStore((s) => s.setReply);

  const dataChannelState = usePeerStore((s) => s.dataChannelState);

  const addOutgoingFile = useTransferStore((s) => s.addOutgoingFile);
  const setOutgoingComplete = useTransferStore((s) => s.setOutgoingComplete);
  const setOutgoingError = useTransferStore((s) => s.setOutgoingError);

  const [autoScroll, setAutoScroll] = useState(true);
  const { repliedMsgId, showReplied } = useRepliedIndicator();

  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll]);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setAutoScroll(atBottom);
  }, []);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !dataChannel || dataChannel.readyState !== 'open') return;
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const messageData = {
      type: 'chat',
      id,
      text: input.trim(),
      timestamp: Date.now(),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text } : null,
    };
    addMessage({ ...messageData, from: 'me', status: 'pending' });
    lastSentMsgIdRef.current = id;
    if (replyingTo) setReplyingTo(null);
    try {
      dataChannel.send(JSON.stringify(messageData));
      updateMessageStatus(id, 'sent');
    } catch (err) {
      updateMessageStatus(id, 'failed');
    }
    setInput('');
  }, [input, replyingTo, dataChannel, addMessage, updateMessageStatus]);

  const handleReaction = useCallback((messageId, emoji) => {
    if (!dataChannel || dataChannel.readyState !== 'open') return;
    dataChannel.send(JSON.stringify({ type: 'reaction', messageId, emoji }));
    addReaction(messageId, emoji, true);
  }, [dataChannel, addReaction]);

  const handleToggleReaction = useCallback((messageId, emoji) => {
    if (!dataChannel || dataChannel.readyState !== 'open') return;
    const msg = messages.find(m => m.id === messageId);
    const hasReaction = msg?.myReaction === emoji;
    const actionType = hasReaction ? 'remove_reaction' : 'reaction';
    dataChannel.send(JSON.stringify({ type: actionType, messageId, emoji }));
    if (hasReaction) {
      removeReaction(messageId, emoji, true);
    } else {
      addReaction(messageId, emoji, true);
    }
  }, [dataChannel, messages, addReaction, removeReaction]);

  useEffect(() => {
    if (!dataChannel) return;
    const handleMessage = (event) => {
      if (typeof event.data !== 'string') return;
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'chat') {
        if (processedMessagesRef.current.has(msg.id)) return;
        processedMessagesRef.current.add(msg.id);
        addMessage({ ...msg, from: 'peer', status: 'pending' });
        if (lastSentMsgIdRef.current) showReplied(lastSentMsgIdRef.current);
        if (dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify({ type: 'delivered', messageId: msg.id }));
          setTimeout(() => {
            if (dataChannel?.readyState === 'open') {
              dataChannel.send(JSON.stringify({ type: 'read', messageId: msg.id }));
            }
          }, 300);
        }
        if (msg.replyTo) setReply(msg.id, msg.replyTo.id, msg.replyTo.text);
      }
      else if (msg.type === 'delivered') updateMessageStatus(msg.messageId, 'delivered');
      else if (msg.type === 'read') updateMessageStatus(msg.messageId, 'read');
      else if (msg.type === 'reaction') addReaction(msg.messageId, msg.emoji, false);
      else if (msg.type === 'remove_reaction') removeReaction(msg.messageId, msg.emoji, false);
      else if (msg.type === 'ghost_typing') {
        setPeerGhostTyping(true);
        if (ghostTypingTimeoutRef.current) clearTimeout(ghostTypingTimeoutRef.current);
        ghostTypingTimeoutRef.current = setTimeout(() => setPeerGhostTyping(false), msg.duration || 2000);
      }
    };

    dataChannel.addEventListener('message', handleMessage);
    return () => dataChannel.removeEventListener('message', handleMessage);
  }, [dataChannel, addMessage, updateMessageStatus, addReaction, removeReaction, setReply, showReplied]);

  const sendGhostTyping = useCallback((duration = 1500) => {
    if (!dataChannel || dataChannel.readyState !== 'open') return;
    dataChannel.send(JSON.stringify({ type: 'ghost_typing', duration }));
  }, [dataChannel]);

  const handleInputFocus = () => sendGhostTyping(2000);
  const handleInputDelete = () => sendGhostTyping(800);
  const handleInputBlur = () => sendGhostTyping(500);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (e.target.value.length < (input.length || 0)) handleInputDelete();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') setInput('');
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length && dataChannel?.readyState === 'open') {
      import('../lib/fileTransfer').then((module) => {
        const FileTransfer = module.default;
        if (!fileTransferRef.current) {
          fileTransferRef.current = new FileTransfer(dataChannel, () => {}, () => {}, () => {}, () => {});
        }
        files.forEach((file) => {
          const id = addOutgoingFile(file);
          fileTransferRef.current
            .sendFile(file)
            .then(() => setOutgoingComplete(id))
            .catch((err) => setOutgoingError(id, err.message));
        });
      });
    }
  }, [dataChannel, addOutgoingFile, setOutgoingComplete, setOutgoingError]);

  const onEmojiSelect = (emojiData) => {
    setInput(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
    setShowEmojiPicker(false);
  };

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiButtonRef.current && !emojiButtonRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <AnimatePresence>
        {peerGhostTyping && (
          <motion.div
            className="fixed bottom-20 left-4 z-20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <GhostTyping />
          </motion.div>
        )}
      </AnimatePresence>

      {replyingTo && (
        <div className="sticky top-0 z-10 bg-gray-200 dark:bg-gray-800 p-2 text-sm flex justify-between items-center border-b">
          <span className="truncate">Replying to: {replyingTo.text.slice(0, 40)}</span>
          <button onClick={() => setReplyingTo(null)} className="text-red-500 flex-shrink-0 ml-2">✕</button>
        </div>
      )}

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex-1 overflow-y-auto p-4 space-y-2 transition-colors ${
          dragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
      >
        {messages.map((msg) => (
          <BubbleMessage
            key={msg.id}
            msg={msg}
            fromMe={msg.from === 'me'}
            onReply={(m) => setReplyingTo({ id: m.id, text: m.text })}
            onReaction={handleReaction}
            onToggleReaction={handleToggleReaction}
            showRepliedForId={repliedMsgId}
            formatTimestamp={formatTimestamp}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t dark:border-gray-700 p-2 sm:p-3 bg-white dark:bg-gray-900">
        <div className="flex gap-2 items-end max-w-full relative">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0"
          >
            <Smile size={20} className="text-gray-500" />
          </button>

          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-0"
            rows={1}
            placeholder={dataChannelState === 'open' ? 'Type a message...' : 'Waiting for connection...'}
            value={input}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={dataChannelState !== 'open'}
          />

          <button
            onClick={sendMessage}
            disabled={dataChannelState !== 'open' || !input.trim()}
            className="p-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-50 flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Emoji picker - absolutely positioned above the input bar */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50 w-full sm:w-auto sm:min-w-[340px]">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-700">
                <span className="text-sm font-medium text-black dark:text-white">Pick an emoji</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-lg px-2 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
                >
                  ✕
                </button>
              </div>
              <EmojiPicker
                onEmojiClick={onEmojiSelect}
                theme="auto"
                width="100%"
                height={400}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}