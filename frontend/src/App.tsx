import React, { useState, useEffect } from 'react';
import Terminal from './components/Terminal';
import FileExplorer from './components/FileExplorer';
import ChatPanel from './components/ChatPanel';
import { io, Socket } from 'socket.io-client';
import './App.css';

interface AppState {
  connected: boolean;
  currentFile: string | null;
  terminalReady: boolean;
  cliActive: { type: string; active: boolean } | null;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<AppState>({
    connected: false,
    currentFile: null,
    terminalReady: false,
    cliActive: null
  });

  useEffect(() => {
    // Connect to backend
    const newSocket = io('http://localhost:3001');

    newSocket.on('connect', () => {
      console.log('🔗 Connected to MATAT REAL Backend');
      setState(prev => ({ ...prev, connected: true }));
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from backend');
      setState(prev => ({ ...prev, connected: false }));
    });

    // Terminal events
    newSocket.on('terminal:created', (data) => {
      console.log('✅ Terminal created:', data.terminalId);
      setState(prev => ({ ...prev, terminalReady: true }));
    });

    // CLI events
    newSocket.on('cli:started', (data) => {
      console.log(`🤖 ${data.type} CLI started`);
      setState(prev => ({ ...prev, cliActive: { type: data.type, active: true } }));
    });

    newSocket.on('cli:stopped', (data) => {
      console.log(`🛑 ${data.type} CLI stopped`);
      setState(prev => ({ ...prev, cliActive: null }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleStartCLI = (type: 'gemini' | 'claude') => {
    if (socket && state.terminalReady) {
      socket.emit('cli:start', {
        type,
        terminalId: 'main-terminal'
      });
    }
  };

  const handleSendCommand = (command: string, context?: any) => {
    if (socket && state.cliActive) {
      socket.emit('cli:command', {
        terminalId: 'main-terminal',
        command,
        context
      });
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🔮</span>
            <span className="logo-text">MATAT REAL IDE</span>
            <span className="version">v2.0 - Live PTY</span>
          </div>
          <div className="status-indicators">
            <div className={`status-item ${state.connected ? 'online' : 'offline'}`}>
              <div className="status-dot"></div>
              <span>Backend</span>
            </div>
            <div className={`status-item ${state.terminalReady ? 'online' : 'offline'}`}>
              <div className="status-dot"></div>
              <span>Terminal</span>
            </div>
            <div className={`status-item ${state.cliActive ? 'online' : 'offline'}`}>
              <div className="status-dot"></div>
              <span>{state.cliActive ? `${state.cliActive.type} CLI` : 'AI CLI'}</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button
            className={`cli-btn gemini ${state.cliActive?.type === 'gemini' ? 'active' : ''}`}
            onClick={() => handleStartCLI('gemini')}
            disabled={!state.terminalReady || state.cliActive?.type === 'gemini'}
          >
            💎 Gemini (Free)
          </button>
          <button
            className={`cli-btn claude ${state.cliActive?.type === 'claude' ? 'active' : ''}`}
            onClick={() => handleStartCLI('claude')}
            disabled={!state.terminalReady || state.cliActive?.type === 'claude'}
          >
            🤖 Claude ($200/m)
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Sidebar - File Explorer */}
        <aside className="sidebar">
          <FileExplorer
            socket={socket}
            onFileSelect={(file) => setState(prev => ({ ...prev, currentFile: file }))}
          />
        </aside>

        {/* Center - Terminal */}
        <main className="terminal-area">
          <div className="terminal-header">
            <div className="terminal-tabs">
              <div className="terminal-tab active">
                <span>💻 Live Terminal PTY</span>
                {state.cliActive && (
                  <span className="cli-indicator">{state.cliActive.type}</span>
                )}
              </div>
            </div>
          </div>
          <div className="terminal-container">
            <Terminal socket={socket} />
          </div>
        </main>

        {/* Right - AI Chat */}
        <aside className="chat-area">
          <ChatPanel
            socket={socket}
            cliActive={state.cliActive}
            onSendCommand={handleSendCommand}
            currentFile={state.currentFile}
          />
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="status-left">
          <span className="status-item">
            {state.connected ? '✅ Connected to Backend' : '❌ Disconnected'}
          </span>
          <span className="separator">•</span>
          <span className="status-item">
            Terminal: {state.terminalReady ? 'Ready' : 'Initializing...'}
          </span>
          {state.currentFile && (
            <>
              <span className="separator">•</span>
              <span className="status-item">📁 {state.currentFile}</span>
            </>
          )}
        </div>
        <div className="status-right">
          <span className="status-item">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
