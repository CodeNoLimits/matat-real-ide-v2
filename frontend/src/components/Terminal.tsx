import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';

interface TerminalProps {
  socket: Socket | null;
}

const Terminal: React.FC<TerminalProps> = ({ socket }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalIdRef = useRef<string>('main-terminal');

  useEffect(() => {
    if (!terminalRef.current) return;

    // Cleanup any existing terminal
    if (xtermRef.current) {
      xtermRef.current.dispose();
    }

    // Create Xterm instance
    const xterm = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#f0f6fc',
        cursor: '#00ff88',
        cursorAccent: '#0d1117',
        selectionBackground: 'rgba(0, 255, 136, 0.3)',
        black: '#484f58',
        red: '#ff6b6b',
        green: '#00ff88',
        yellow: '#ffdd44',
        blue: '#1f6feb',
        magenta: '#8b5cf6',
        cyan: '#39d0d6',
        white: '#f0f6fc',
        brightBlack: '#6e7681',
        brightRed: '#ff8e8e',
        brightGreen: '#44ffaa',
        brightYellow: '#ffee66',
        brightBlue: '#4488ff',
        brightMagenta: '#aa77ff',
        brightCyan: '#66ddee',
        brightWhite: '#ffffff'
      },
      fontFamily: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      convertEol: true,
      scrollback: 1000,
      tabStopWidth: 4
    });

    // Create fit addon
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    // Open terminal
    xterm.open(terminalRef.current);

    // Wait for DOM to be ready before fitting with proper dimensions
    setTimeout(() => {
      try {
        // Ensure terminal container has proper dimensions
        if (terminalRef.current) {
          const rect = terminalRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            fitAddon.fit();
            console.log(`✅ Terminal fitted: ${xterm.cols}x${xterm.rows} (${rect.width}x${rect.height}px)`);
          } else {
            throw new Error('Terminal container has no dimensions');
          }
        }
      } catch (error) {
        console.warn('FitAddon fit failed:', error);
        // Retry with proper dimension check
        setTimeout(() => {
          try {
            const rect = terminalRef.current?.getBoundingClientRect();
            if (rect && rect.width > 0) {
              fitAddon.fit();
              console.log(`✅ Terminal fitted on retry: ${xterm.cols}x${xterm.rows}`);
            }
          } catch (retryError) {
            console.warn('FitAddon retry failed:', retryError);
            // Fallback to fixed dimensions
            xterm.resize(120, 30);
            console.log('📐 Using fallback dimensions: 120x30');
          }
        }, 150);
      }
    }, 100);

    // Store references
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Welcome message
    xterm.writeln('\x1b[32m🔮 MATAT REAL IDE - Live PTY Terminal\x1b[0m');
    xterm.writeln('\x1b[90mConnecting to backend...\x1b[0m');
    xterm.writeln('');

    // Setup socket listeners
    if (socket) {
      setupSocketListeners(xterm, socket);
    }

    // Handle input from terminal
    xterm.onData((data) => {
      if (socket) {
        socket.emit('terminal:input', {
          terminalId: terminalIdRef.current,
          input: data
        });
      }
    });

    // Handle resize
    const handleResize = () => {
      try {
        fitAddon.fit();
        if (socket) {
          socket.emit('terminal:resize', {
            terminalId: terminalIdRef.current,
            cols: xterm.cols,
            rows: xterm.rows
          });
        }
      } catch (error) {
        console.warn('Resize failed:', error);
      }
    };

    // Auto-fit on window resize
    window.addEventListener('resize', handleResize);

    // Create terminal on backend
    if (socket?.connected) {
      createTerminal(socket);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [socket]);

  const setupSocketListeners = (xterm: XTerm, socket: Socket) => {
    // Terminal output
    socket.on('terminal:output', (data) => {
      if (data.terminalId === terminalIdRef.current) {
        xterm.write(data.data);
      }
    });

    // Terminal created
    socket.on('terminal:created', (data) => {
      console.log('✅ Terminal created:', data);
      xterm.clear();
      xterm.writeln('\x1b[32m✅ Terminal ready! Type commands to get started.\x1b[0m');
      xterm.writeln('\x1b[90mTip: Use the CLI buttons above to start Gemini or Claude AI\x1b[0m');
      xterm.writeln('');
    });

    // Terminal exit
    socket.on('terminal:exit', (data) => {
      if (data.terminalId === terminalIdRef.current) {
        xterm.writeln(`\x1b[33m⚠️ Terminal process exited with code ${data.exitCode}\x1b[0m`);
      }
    });

    // CLI events
    socket.on('cli:started', (data) => {
      if (data.terminalId === terminalIdRef.current) {
        xterm.writeln(`\x1b[32m🤖 ${data.type} CLI started successfully!\x1b[0m`);
      }
    });

    socket.on('cli:stopped', (data) => {
      if (data.terminalId === terminalIdRef.current) {
        xterm.writeln(`\x1b[33m🛑 ${data.type} CLI stopped\x1b[0m`);
      }
    });

    socket.on('cli:error', (error) => {
      xterm.writeln(`\x1b[31m❌ CLI Error: ${error.error}\x1b[0m`);
      if (error.suggestion) {
        xterm.writeln(`\x1b[90m💡 Suggestion: ${error.suggestion}\x1b[0m`);
      }
    });

    socket.on('cli:command_sent', (data) => {
      if (data.terminalId === terminalIdRef.current) {
        xterm.writeln(`\x1b[36m📤 Command sent to ${data.type}: ${data.command}\x1b[0m`);
      }
    });

    // Connection events
    socket.on('connect', () => {
      xterm.writeln('\x1b[32m🔗 Connected to MATAT REAL Backend\x1b[0m');
      createTerminal(socket);
    });

    socket.on('disconnect', () => {
      xterm.writeln('\x1b[31m🔌 Disconnected from backend. Attempting to reconnect...\x1b[0m');
    });
  };

  const createTerminal = (socket: Socket) => {
    socket.emit('terminal:create', {
      terminalId: terminalIdRef.current,
      cols: xtermRef.current?.cols || 120,
      rows: xtermRef.current?.rows || 30
    });
  };

  // Fit terminal when socket changes or component updates
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch (error) {
          console.warn('Socket useEffect fit failed:', error);
        }
      }, 200);
    }
  }, [socket]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0d1117'
      }}
    />
  );
};

export default Terminal;