import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface FileExplorerProps {
  socket: Socket | null;
  onFileSelect: (file: string) => void;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: Date;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ socket, onFileSelect }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (socket) {
      loadFiles();
    }
  }, [socket]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/files?dir=${currentPath}`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
      loadFiles();
    } else {
      onFileSelect(file.path);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') return '📁';

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return '📄';
      case 'ts': case 'tsx': return '📘';
      case 'py': return '🐍';
      case 'json': return '📋';
      case 'md': return '📝';
      case 'css': return '🎨';
      case 'html': return '🌐';
      default: return '📄';
    }
  };

  return (
    <div style={{ padding: '10px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#f0f6fc', fontSize: '14px' }}>📁 Files</h3>
        <button
          onClick={loadFiles}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: '1px solid #30363d',
            color: '#f0f6fc',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔄
        </button>
      </div>

      {currentPath && (
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={() => {
              setCurrentPath('');
              loadFiles();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#58a6ff',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            ← Back to root
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#8b949e', fontSize: '12px' }}>Loading...</div>
      ) : (
        <div>
          {files.map((file, index) => (
            <div
              key={index}
              onClick={() => handleFileClick(file)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#f0f6fc',
                marginBottom: '2px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#21262d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ marginRight: '8px' }}>
                {getFileIcon(file)}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.name}
              </span>
              {file.type === 'file' && (
                <span style={{ fontSize: '11px', color: '#8b949e', marginLeft: '8px' }}>
                  {(file.size / 1024).toFixed(1)}KB
                </span>
              )}
            </div>
          ))}

          {files.length === 0 && (
            <div style={{ color: '#8b949e', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
              No files found
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#161b22', borderRadius: '6px' }}>
        <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '8px' }}>Quick Actions</div>
        <button
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#238636',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '4px'
          }}
          onClick={() => {
            const fileName = prompt('File name:');
            if (fileName) {
              // Create new file (simplified)
              onFileSelect(fileName);
            }
          }}
        >
          + New File
        </button>
      </div>
    </div>
  );
};

export default FileExplorer;