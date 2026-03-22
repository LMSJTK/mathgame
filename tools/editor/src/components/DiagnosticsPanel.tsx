/**
 * Diagnostics panel — shows asset-server status, available Gemini models,
 * generated files, and other debugging info.
 */
import { useState, useEffect } from 'react';

const ASSET_SERVER = 'http://localhost:4174';

interface ServerInfo {
  server?: string;
  geminiApiKey?: string;
  rembgUrl?: string;
  rembgStatus?: string;
  assetsInMemory?: number;
  spritesDir?: string;
}

interface ModelInfo {
  name: string;
  displayName?: string;
  description?: string;
  supportedActions?: string[];
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

interface FileList {
  count: number;
  files: string[];
}

export default function DiagnosticsPanel() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [serverError, setServerError] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);

  // Load server info on mount
  useEffect(() => {
    fetch(`${ASSET_SERVER}/api/diagnostics`)
      .then(r => r.json())
      .then(setServerInfo)
      .catch(err => setServerError(`Cannot reach asset-server: ${err.message}`));
  }, []);

  const loadModels = async () => {
    setModelsLoading(true);
    setModelsError('');
    try {
      const res = await fetch(`${ASSET_SERVER}/api/diagnostics/models`);
      const data = await res.json();
      if (data.error) {
        setModelsError(data.error);
      } else {
        setModels(data.models || []);
      }
    } catch (err: any) {
      setModelsError(err.message);
    } finally {
      setModelsLoading(false);
    }
  };

  const loadFiles = async () => {
    try {
      const res = await fetch(`${ASSET_SERVER}/api/diagnostics/files`);
      setFiles(await res.json());
    } catch {}
  };

  const filteredModels = models.filter(m => {
    if (!modelFilter) return true;
    const q = modelFilter.toLowerCase();
    return (m.name?.toLowerCase().includes(q)) ||
           (m.displayName?.toLowerCase().includes(q)) ||
           (m.supportedActions?.some(a => a.toLowerCase().includes(q)));
  });

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', color: '#eef6ff' }}>
      <h2 style={{ fontSize: 16, color: '#6ed4ff', marginBottom: 16 }}>Diagnostics</h2>

      {/* Server Status */}
      <Section title="Asset Server">
        {serverError ? (
          <ErrorBox>{serverError}</ErrorBox>
        ) : serverInfo ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12 }}>
            <Label>Server</Label><Val>{serverInfo.server}</Val>
            <Label>Gemini API Key</Label><Val>{serverInfo.geminiApiKey}</Val>
            <Label>rembg URL</Label><Val>{serverInfo.rembgUrl}</Val>
            <Label>rembg Status</Label>
            <Val style={{ color: serverInfo.rembgStatus?.includes('reachable') ? '#7dffb0' : '#f59e0b' }}>
              {serverInfo.rembgStatus}
            </Val>
            <Label>Assets in Memory</Label><Val>{serverInfo.assetsInMemory}</Val>
            <Label>Sprites Dir</Label><Val>{serverInfo.spritesDir}</Val>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#9eb8d4' }}>Loading...</span>
        )}
      </Section>

      {/* Models */}
      <Section title="Available Gemini Models">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button onClick={loadModels} disabled={modelsLoading} style={btnStyle}>
            {modelsLoading ? 'Loading...' : models.length ? 'Refresh' : 'Load Models'}
          </button>
          {models.length > 0 && (
            <input
              value={modelFilter}
              onChange={e => setModelFilter(e.target.value)}
              placeholder="Filter (e.g. imagen, gemini, generateContent)..."
              style={inputStyle}
            />
          )}
        </div>

        {modelsError && <ErrorBox>{modelsError}</ErrorBox>}

        {models.length > 0 && (
          <div style={{ fontSize: 11, color: '#9eb8d4', marginBottom: 6 }}>
            {filteredModels.length} of {models.length} models
          </div>
        )}

        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {filteredModels.map(m => (
            <div key={m.name} style={{
              padding: '8px 10px', marginBottom: 4, borderRadius: 6,
              border: '1px solid #1a2a4a', background: '#08111f', fontSize: 11,
            }}>
              <div style={{ fontWeight: 600, color: '#6ed4ff', marginBottom: 2 }}>{m.name}</div>
              {m.displayName && <div style={{ color: '#eef6ff' }}>{m.displayName}</div>}
              {m.description && (
                <div style={{ color: '#6b8aaa', marginTop: 2, lineHeight: 1.4 }}>
                  {m.description.slice(0, 200)}{m.description.length > 200 ? '...' : ''}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                {m.supportedActions?.map(a => (
                  <span key={a} style={{
                    padding: '1px 6px', borderRadius: 3, fontSize: 10,
                    background: a.includes('generateContent') ? '#1a3050' : a.includes('generateImages') ? '#2a1a50' : '#0d1a30',
                    color: a.includes('generateContent') ? '#6ed4ff' : a.includes('generateImages') ? '#c084fc' : '#9eb8d4',
                    border: '1px solid #1a2a4a',
                  }}>{a}</span>
                ))}
              </div>
              {(m.inputTokenLimit || m.outputTokenLimit) && (
                <div style={{ color: '#6b8aaa', marginTop: 2, fontSize: 10 }}>
                  Tokens: {m.inputTokenLimit?.toLocaleString()} in / {m.outputTokenLimit?.toLocaleString()} out
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Generated Files */}
      <Section title="Generated Files">
        <button onClick={loadFiles} style={btnStyle}>
          {files ? 'Refresh' : 'Load File List'}
        </button>
        {files && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: '#9eb8d4', marginBottom: 4 }}>{files.count} file(s)</div>
            <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 11 }}>
              {files.files.map(f => (
                <div key={f} style={{ padding: '2px 0', color: '#eef6ff' }}>{f}</div>
              ))}
              {files.count === 0 && <div style={{ color: '#9eb8d4' }}>No generated files yet.</div>}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, border: '1px solid #1a2a4a', background: '#0b182b' }}>
      <div style={{ fontSize: 11, color: '#9eb8d4', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: '#9eb8d4' }}>{children}</span>;
}

function Val({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ fontSize: 12, color: '#eef6ff', fontFamily: 'monospace', ...style }}>{children}</span>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 8, borderRadius: 6, background: '#2a0a0a', border: '1px solid #ff6e6e', color: '#ff6e6e', fontSize: 11 }}>
      {children}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '5px 14px', fontSize: 12, cursor: 'pointer',
  border: '1px solid #6ed4ff', borderRadius: 5,
  background: '#1a3050', color: '#6ed4ff',
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '4px 8px', fontSize: 12,
  background: '#08111f', border: '1px solid #1a2a4a', borderRadius: 4, color: '#eef6ff',
};
