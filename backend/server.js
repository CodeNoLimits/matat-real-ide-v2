// 🔮 MATAT REAL IDE - Backend Server
// Dual CLI Support: Gemini (Free) + Claude ($200/month)
// Real PTY Terminal + WebSocket + File Management

require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const OpenRouterAI = require('./services/openrouter-ai');

class MatatRealServer {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // Active terminals
        this.terminals = new Map();
        this.cliProcesses = new Map();

        // OpenRouter AI Integration
        this.openRouterAPI = process.env.OPENROUTER_API_KEY ?
            new OpenRouterAI(process.env.OPENROUTER_API_KEY) : null;

        // Project workspace
        this.workspaceRoot = process.env.WORKSPACE_ROOT || path.join(process.cwd(), 'workspace');

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.setupFileWatcher();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Create workspace if not exists
        fs.ensureDirSync(this.workspaceRoot);
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                terminals: this.terminals.size,
                workspace: this.workspaceRoot,
                timestamp: new Date().toISOString()
            });
        });

        // File System API
        this.app.get('/api/files', async (req, res) => {
            try {
                const { dir = '' } = req.query;
                const fullPath = path.join(this.workspaceRoot, dir);
                const files = await this.getDirectoryContents(fullPath);
                res.json(files);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Get file content
        this.app.get('/api/file', async (req, res) => {
            try {
                const { path: relativePath } = req.query;
                if (!relativePath) {
                    return res.status(400).json({ error: 'Path parameter required' });
                }

                const filePath = path.join(this.workspaceRoot, relativePath);
                const content = await fs.readFile(filePath, 'utf8');
                const stats = await fs.stat(filePath);

                res.json({
                    content,
                    size: stats.size,
                    modified: stats.mtime,
                    path: relativePath
                });
            } catch (error) {
                res.status(404).json({ error: 'File not found' });
            }
        });

        // Save file content
        this.app.post('/api/file', async (req, res) => {
            try {
                const { path: relativePath, content } = req.body;
                if (!relativePath) {
                    return res.status(400).json({ error: 'Path parameter required' });
                }

                const filePath = path.join(this.workspaceRoot, relativePath);

                await fs.ensureDir(path.dirname(filePath));
                await fs.writeFile(filePath, content, 'utf8');

                res.json({ success: true, path: relativePath });
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // OpenRouter AI Endpoints
        this.app.post('/api/ai/chat', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({
                        error: 'OpenRouter API not configured',
                        suggestion: 'Set OPENROUTER_API_KEY environment variable'
                    });
                }

                const { message, context = {} } = req.body;
                const response = await this.openRouterAPI.chat([
                    { role: 'user', content: message }
                ], { maxTokens: 2048 });

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/code-review', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({ error: 'OpenRouter API not configured' });
                }

                const { code, language, context = {} } = req.body;
                const response = await this.openRouterAPI.codeReview(code, language, context);

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/explain', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({ error: 'OpenRouter API not configured' });
                }

                const { code, language, context = {} } = req.body;
                const response = await this.openRouterAPI.explainCode(code, language, context);

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/optimize', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({ error: 'OpenRouter API not configured' });
                }

                const { code, language, context = {} } = req.body;
                const response = await this.openRouterAPI.optimizeCode(code, language, context);

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/debug', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({ error: 'OpenRouter API not configured' });
                }

                const { error: errorMsg, code, language, context = {} } = req.body;
                const response = await this.openRouterAPI.debugHelp(errorMsg, code, language, context);

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/ai/generate', async (req, res) => {
            try {
                if (!this.openRouterAPI) {
                    return res.status(503).json({ error: 'OpenRouter API not configured' });
                }

                const { description, language, context = {} } = req.body;
                const response = await this.openRouterAPI.generateCode(description, language, context);

                res.json(response);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Client connected: ${socket.id}`);

            // Terminal Management
            socket.on('terminal:create', (data) => {
                this.createTerminal(socket, data);
            });

            socket.on('terminal:input', (data) => {
                const terminal = this.terminals.get(data.terminalId);
                if (terminal) {
                    terminal.ptyProcess.write(data.input);
                }
            });

            socket.on('terminal:resize', (data) => {
                const terminal = this.terminals.get(data.terminalId);
                if (terminal) {
                    terminal.ptyProcess.resize(data.cols, data.rows);
                }
            });

            // CLI Management (Gemini & Claude)
            socket.on('cli:start', (data) => {
                this.startCLI(socket, data);
            });

            socket.on('cli:command', (data) => {
                this.sendCLICommand(socket, data);
            });

            socket.on('cli:stop', (data) => {
                this.stopCLI(socket, data);
            });

            // File Operations
            socket.on('file:watch', (data) => {
                this.watchFile(socket, data.path);
            });

            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.cleanup(socket);
            });
        });
    }

    createTerminal(socket, data = {}) {
        const terminalId = data.terminalId || `terminal_${Date.now()}`;
        const shell = this.getShell();

        console.log(`🖥️  Creating terminal: ${terminalId}`);

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: data.cols || 120,
            rows: data.rows || 30,
            cwd: data.cwd || this.workspaceRoot,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                MATAT_IDE: 'true'
            }
        });

        // Store terminal
        this.terminals.set(terminalId, {
            id: terminalId,
            ptyProcess,
            socket,
            createdAt: new Date()
        });

        // Handle terminal output
        ptyProcess.onData((data) => {
            socket.emit('terminal:output', {
                terminalId,
                data
            });
        });

        // Handle terminal exit
        ptyProcess.onExit(({ exitCode, signal }) => {
            console.log(`Terminal ${terminalId} exited with code ${exitCode}`);
            socket.emit('terminal:exit', {
                terminalId,
                exitCode,
                signal
            });
            this.terminals.delete(terminalId);
        });

        socket.emit('terminal:created', {
            terminalId,
            shell,
            cwd: data.cwd || this.workspaceRoot
        });

        return terminalId;
    }

    startCLI(socket, data) {
        const { type, terminalId } = data; // type: 'gemini' or 'claude'
        const terminal = this.terminals.get(terminalId);

        if (!terminal) {
            socket.emit('cli:error', { error: 'Terminal not found' });
            return;
        }

        console.log(`🤖 Starting ${type} CLI in terminal: ${terminalId}`);

        // Check if CLI is available
        this.checkCLIAvailability(type)
            .then(available => {
                if (available) {
                    // Start the CLI
                    terminal.ptyProcess.write(`${type}\r`);

                    // Mark as CLI active
                    this.cliProcesses.set(terminalId, {
                        type,
                        active: true,
                        startedAt: new Date()
                    });

                    socket.emit('cli:started', {
                        terminalId,
                        type,
                        message: `${type} CLI started successfully`
                    });
                } else {
                    socket.emit('cli:error', {
                        error: `${type} CLI not installed`,
                        suggestion: type === 'gemini'
                            ? 'Install with: npm install -g @google/gemini-cli'
                            : 'Install with: npm install -g @anthropic-ai/claude-cli'
                    });
                }
            })
            .catch(error => {
                socket.emit('cli:error', { error: error.message });
            });
    }

    sendCLICommand(socket, data) {
        const { terminalId, command, context } = data;
        const terminal = this.terminals.get(terminalId);
        const cliProcess = this.cliProcesses.get(terminalId);

        if (!terminal || !cliProcess) {
            socket.emit('cli:error', { error: 'CLI not active' });
            return;
        }

        console.log(`📤 Sending command to ${cliProcess.type}: ${command}`);

        // Build enriched prompt with context
        const enrichedCommand = this.buildEnrichedPrompt(command, context);

        // Send to CLI
        terminal.ptyProcess.write(`${enrichedCommand}\r`);

        socket.emit('cli:command_sent', {
            terminalId,
            command: enrichedCommand,
            type: cliProcess.type
        });
    }

    buildEnrichedPrompt(command, context = {}) {
        let prompt = '';

        // Add context information
        if (context.currentFile) {
            prompt += `📁 Current file: ${context.currentFile}\n`;
        }

        if (context.selectedCode) {
            prompt += `🎯 Selected code:\n\`\`\`\n${context.selectedCode}\n\`\`\`\n\n`;
        }

        if (context.projectInfo) {
            prompt += `📂 Project: ${context.projectInfo}\n\n`;
        }

        // Add the actual command
        prompt += command;

        return prompt;
    }

    stopCLI(socket, data) {
        const { terminalId } = data;
        const cliProcess = this.cliProcesses.get(terminalId);

        if (cliProcess) {
            console.log(`🛑 Stopping ${cliProcess.type} CLI in terminal: ${terminalId}`);

            // Send exit command
            const terminal = this.terminals.get(terminalId);
            if (terminal) {
                terminal.ptyProcess.write('\x03'); // Ctrl+C
            }

            this.cliProcesses.delete(terminalId);

            socket.emit('cli:stopped', {
                terminalId,
                type: cliProcess.type
            });
        }
    }

    async checkCLIAvailability(type) {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            const child = spawn(type, ['--version'], { stdio: 'ignore' });

            child.on('close', (code) => {
                resolve(code === 0);
            });

            child.on('error', () => {
                resolve(false);
            });
        });
    }

    async getDirectoryContents(dirPath) {
        const items = await fs.readdir(dirPath);
        const result = [];

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stats = await fs.stat(fullPath);

            result.push({
                name: item,
                path: path.relative(this.workspaceRoot, fullPath),
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size,
                modified: stats.mtime
            });
        }

        return result.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    setupFileWatcher() {
        this.watcher = chokidar.watch(this.workspaceRoot, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });

        this.watcher.on('change', (filePath) => {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            this.io.emit('file:changed', { path: relativePath });
        });

        this.watcher.on('add', (filePath) => {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            this.io.emit('file:added', { path: relativePath });
        });

        this.watcher.on('unlink', (filePath) => {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            this.io.emit('file:removed', { path: relativePath });
        });
    }

    watchFile(socket, filePath) {
        // Individual file watching for real-time collaboration
        const fullPath = path.join(this.workspaceRoot, filePath);

        const fileWatcher = chokidar.watch(fullPath);

        fileWatcher.on('change', async () => {
            try {
                const content = await fs.readFile(fullPath, 'utf8');
                socket.emit('file:content_changed', {
                    path: filePath,
                    content
                });
            } catch (error) {
                socket.emit('file:error', {
                    path: filePath,
                    error: error.message
                });
            }
        });

        // Cleanup on disconnect
        socket.on('disconnect', () => {
            fileWatcher.close();
        });
    }

    getShell() {
        if (process.platform === 'win32') {
            return 'powershell.exe';
        } else {
            return process.env.SHELL || 'bash';
        }
    }

    cleanup(socket) {
        // Clean up terminals for this socket
        for (const [terminalId, terminal] of this.terminals.entries()) {
            if (terminal.socket === socket) {
                console.log(`🧹 Cleaning up terminal: ${terminalId}`);
                terminal.ptyProcess.kill();
                this.terminals.delete(terminalId);
                this.cliProcesses.delete(terminalId);
            }
        }
    }

    start(port = 3001) {
        this.server.listen(port, () => {
            console.log(`🚀 MATAT REAL IDE Server running on port ${port}`);
            console.log(`📁 Workspace: ${this.workspaceRoot}`);
            console.log(`🔗 Socket.io ready for connections`);
            console.log(`💡 Dual CLI Support: Gemini (Free) + Claude ($200/month)`);
        });
    }
}

// Start server
if (require.main === module) {
    const server = new MatatRealServer();
    server.start(process.env.PORT || 3001);
}

module.exports = MatatRealServer;