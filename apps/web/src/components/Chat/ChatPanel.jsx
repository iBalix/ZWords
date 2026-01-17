/**
 * Panneau Chat + Logs
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Activity, Send } from 'lucide-react';
import MessageItem from './MessageItem';
import LogItem from './LogItem';

const TABS = {
  ALL: 'all',
  CHAT: 'chat',
  LOGS: 'logs',
};

export default function ChatPanel({
  messages,
  onSendMessage,
  myPseudo,
  myColor,
}) {
  const [activeTab, setActiveTab] = useState(TABS.ALL);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef(null);
  
  // Filtrer les messages selon l'onglet
  const filteredMessages = messages.filter(msg => {
    if (activeTab === TABS.ALL) return true;
    if (activeTab === TABS.CHAT) return msg.type === 'chat';
    return msg.type !== 'chat'; // logs
  });
  
  // Auto-scroll vers le bas
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredMessages.length]);
  
  // Envoyer un message
  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="glass rounded-xl flex flex-col max-h-[400px]">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab(TABS.ALL)}
          className={`
            flex-1 py-2 px-2 text-xs font-medium transition-colors
            ${activeTab === TABS.ALL 
              ? 'bg-gray-800/50 text-white border-b-2 border-zwords-accent' 
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          Tout
        </button>
        <button
          onClick={() => setActiveTab(TABS.CHAT)}
          className={`
            flex-1 py-2 px-2 text-xs font-medium transition-colors flex items-center justify-center gap-1
            ${activeTab === TABS.CHAT 
              ? 'bg-gray-800/50 text-white border-b-2 border-zwords-accent' 
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          <MessageCircle className="w-3 h-3" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab(TABS.LOGS)}
          className={`
            flex-1 py-2 px-2 text-xs font-medium transition-colors flex items-center justify-center gap-1
            ${activeTab === TABS.LOGS 
              ? 'bg-gray-800/50 text-white border-b-2 border-zwords-accent' 
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          <Activity className="w-3 h-3" />
          Logs
        </button>
      </div>
      
      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        <AnimatePresence initial={false}>
          {filteredMessages.map((msg, i) => (
            <motion.div
              key={msg.id || `${msg.createdAt}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {msg.type === 'chat' ? (
                <MessageItem
                  pseudo={msg.pseudo}
                  color={msg.color}
                  content={msg.content}
                  isMe={msg.pseudo === myPseudo}
                />
              ) : (
                <LogItem
                  type={msg.type}
                  content={msg.content}
                  pseudo={msg.pseudo}
                  color={msg.color}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredMessages.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {activeTab === TABS.CHAT && "Pas encore de messages"}
            {activeTab === TABS.LOGS && "Pas encore d'actions"}
            {activeTab === TABS.ALL && "La partie démarre..."}
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="p-2 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            maxLength={500}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm
                     focus:outline-none focus:ring-1 focus:ring-zwords-accent"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2 bg-zwords-accent hover:bg-zwords-accent-light rounded-lg
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
