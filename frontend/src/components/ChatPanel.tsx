import React, { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface ChatPanelProps {
  socket: Socket | null;
  cliActive: { type: string; active: boolean } | null;
  onSendCommand: (command: string, context?: any) => void;
  currentFile: string | null;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  source?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  socket,
  cliActive,
  onSendCommand,
  currentFile
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '🔮 MATAT REAL IDE Chat Assistant Ready!\n\nStart by clicking a CLI button above (Gemini Free or Claude $200/m), then ask questions about your code.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('cli:started', (data) => {
        addMessage({
          type: 'system',
          content: `🤖 ${data.type} CLI activated! You can now ask questions and get AI assistance.`,
          timestamp: new Date()
        });
      });

      socket.on('cli:stopped', (data) => {
        addMessage({
          type: 'system',
          content: `🛑 ${data.type} CLI stopped. Click a CLI button to restart.`,
          timestamp: new Date()
        });
      });

      socket.on('cli:command_sent', (data) => {
        addMessage({
          type: 'system',
          content: `📤 Command sent to ${data.type}: ${data.command}`,
          timestamp: new Date()
        });
      });

      return () => {
        socket.off('cli:started');
        socket.off('cli:stopped');
        socket.off('cli:command_sent');
      };
    }
  }, [socket]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    if (!cliActive) {
      addMessage({
        type: 'system',
        content: '⚠️ No CLI active. Please start Gemini (Free) or Claude ($200/m) first.',
        timestamp: new Date()
      });
      return;
    }

    const userMessage = inputValue.trim();

    addMessage({
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    // Build context for AI
    const context = {
      currentFile,
      projectInfo: 'MATAT REAL IDE - React TypeScript + Node.js Backend',
      timestamp: new Date().toISOString()
    };

    // Send to CLI via terminal
    onSendCommand(userMessage, context);

    setInputValue('');
    setIsLoading(true);

    // Reset loading after timeout (CLI response handling would be via terminal output)
    setTimeout(() => setIsLoading(false), 2000);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user': return '👤';
      case 'assistant': return cliActive?.type === 'gemini' ? '💎' : '🤖';
      case 'system': return '🔮';
      default: return '💬';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#161b22',
      border: '1px solid #30363d'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #30363d',
        backgroundColor: '#0d1117'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            margin: 0,
            color: '#f0f6fc',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💬 AI Chat
            {cliActive && (
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: cliActive.type === 'gemini' ? '#6f42c1' : '#0969da',
                borderRadius: '4px',
                color: 'white'
              }}>
                {cliActive.type} active
              </span>
            )}
          </h3>
          {currentFile && (
            <span style={{
              fontSize: '11px',
              color: '#8b949e',
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              📁 {currentFile}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: message.type === 'user'
                ? '#1f2937'
                : message.type === 'system'
                ? '#0f1419'
                : '#1a1a2e',
              border: `1px solid ${
                message.type === 'user'
                  ? '#374151'
                  : message.type === 'system'
                  ? '#30363d'
                  : '#58a6ff20'
              }`
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{ fontSize: '14px' }}>
                {getMessageIcon(message.type)}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#8b949e',
                fontWeight: 'bold'
              }}>
                {message.type === 'user' ? 'You' :
                 message.type === 'system' ? 'System' :
                 cliActive?.type || 'Assistant'}
              </span>
              <span style={{
                fontSize: '11px',
                color: '#6e7681',
                marginLeft: 'auto'
              }}>
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <div style={{
              color: '#f0f6fc',
              fontSize: '13px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {message.content}
            </div>
            {message.source && (
              <div style={{
                fontSize: '11px',
                color: '#58a6ff',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                Source: {message.source}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #30363d',
        backgroundColor: '#0d1117'
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              cliActive
                ? `Ask ${cliActive.type} anything about your code...`
                : "Start a CLI first (Gemini or Claude)"
            }
            disabled={!cliActive || isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#21262d',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#f0f6fc',
              fontSize: '13px',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#58a6ff';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#30363d';
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !cliActive || isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: cliActive ? '#238636' : '#6e7681',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              cursor: cliActive && !isLoading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isLoading ? '⏳' : '📤'} Send
          </button>
        </form>

        {/* Quick Actions */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '6px' }}>
            Quick Commands:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              'Explain this code',
              'Find bugs',
              'Optimize performance',
              'Add documentation',
              'Refactor this'
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  if (cliActive) {
                    setInputValue(cmd);
                  }
                }}
                disabled={!cliActive}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  color: '#58a6ff',
                  cursor: cliActive ? 'pointer' : 'not-allowed',
                  opacity: cliActive ? 1 : 0.5
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;