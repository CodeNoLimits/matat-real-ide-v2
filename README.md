# 🔮 MATAT REAL IDE v2

**Un IDE moderne avec terminal PTY réel, dual CLI AI, et interface cyberpunk**

## ✨ Fonctionnalités

### 🖥️ Terminal PTY Authentique
- **Vrai terminal** avec node-pty (pas de mock)
- **Exécution réelle** de commandes shell
- **Interface Xterm.js** avec thème cyberpunk
- **WebSocket temps réel** pour I/O

### 🤖 Dual AI Integration
- **Claude CLI** : Votre abonnement $200/mois via terminal PTY
- **ChatGPT Nano 5** : Via OpenRouter API pour fonctions spécialisées
- **Basculement automatique** selon le contexte

### 🎨 Interface Professionnelle
- **Theme cyberpunk** avec animations fluides
- **Layout 3 panneaux** : Files + Terminal + Chat
- **Responsive design** adaptatif
- **Status indicators** temps réel

### 📁 Gestion de Fichiers
- **File Explorer** fonctionnel
- **File watcher** temps réel avec chokidar
- **API REST** pour CRUD fichiers
- **Navigation intuitive**

## 🚀 Architecture

### Frontend (React TypeScript)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Terminal.tsx      # Terminal PTY avec Xterm.js
│   │   ├── FileExplorer.tsx  # Navigation fichiers
│   │   └── ChatPanel.tsx     # Interface AI
│   ├── App.tsx               # Application principale
│   └── App.css              # Thème cyberpunk
└── build/                   # Build de production
```

### Backend (Node.js + Express)
```
backend/
├── services/
│   └── openrouter-ai.js     # ChatGPT Nano 5 integration
├── server.js                # Serveur principal
├── .env                     # Configuration
└── workspace/               # Espace de travail PTY
```

## 🔧 Installation & Démarrage

### Prérequis
- Node.js 18+
- Claude CLI installé
- Gemini CLI installé (optionnel)
- Clé API OpenRouter

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurer OPENROUTER_API_KEY dans .env
npm start
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 🌐 Déploiement

### Architecture de Production
- **Frontend** : Netlify (statique)
- **Backend** : Railway/Render (WebSocket + PTY)

### Variables d'environnement
```bash
OPENROUTER_API_KEY=sk-or-v1-...
PORT=3001
NODE_ENV=production
WORKSPACE_ROOT=./workspace
```

## 🎯 Utilisation

1. **Démarrer l'IDE** : Ouvrir http://localhost:3000
2. **Activer AI** : Cliquer sur "Claude" ou "Gemini"
3. **Terminal PTY** : Taper des commandes réelles
4. **Chat AI** : Poser questions avec contexte auto
5. **Files** : Naviguer et éditer via l'explorateur

## 🔐 Sécurité

- Pas de credentials hardcodés
- Variables d'environnement chiffrées
- Headers de sécurité configurés
- Rate limiting sur APIs
- Validation des entrées utilisateur

## 📊 Monitoring

- Logs structurés avec timestamps
- Métriques de performance WebSocket
- Status health checks
- Error tracking et recovery

## 🛠️ Technologies

**Frontend :**
- React 18 + TypeScript
- Xterm.js pour terminal
- Socket.io-client pour WebSocket
- CSS Grid pour layout

**Backend :**
- Node.js + Express
- Socket.io pour WebSocket
- node-pty pour terminal PTY
- chokidar pour file watching

**AI Integration :**
- Claude CLI via PTY
- OpenRouter pour ChatGPT Nano 5
- Prompts contextuels intelligents

## 📝 License

MIT © MATAT REAL IDE Team

---

**Fait avec ❤️ et Claude Code**