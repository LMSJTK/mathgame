/**
 * Math Game Asset Editor — Backend Server
 *
 * Serves the generation API endpoints that the asset-editor frontend calls:
 *   POST /api/generate              — Base image generation
 *   POST /api/generate/variation    — Variant from existing asset
 *   POST /api/generate/animation-frames — Multi-frame animation
 *   GET/POST/PUT/DELETE /api/assets — Asset record CRUD (in-memory)
 *
 * Requires: GEMINI_API_KEY env var
 * Optional: REMBG_URL env var (defaults to http://rembg:5000)
 *
 * Usage:
 *   npm run dev    # watch mode
 *   npm run start  # production
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  generateBase,
  generateVariant,
  generateAnimationFrames,
} from './generation.js';

const app = express();
const PORT = Number(process.env.ASSET_SERVER_PORT || 4174);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/assets', express.static('public/assets'));

// --- In-memory asset store ---
interface AssetRecord {
  id: string;
  [key: string]: unknown;
}

const assets = new Map<string, AssetRecord>();

// --- Asset CRUD ---

app.get('/api/assets', (req, res) => {
  let result = [...assets.values()];
  const { category, state } = req.query;
  if (category) result = result.filter(a => a.category === category);
  if (state) result = result.filter(a => a.state === state);
  res.json(result);
});

app.get('/api/assets/:id', (req, res) => {
  const asset = assets.get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
});

app.post('/api/assets', (req, res) => {
  const asset: AssetRecord = {
    id: req.body.id || crypto.randomUUID(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assets.set(asset.id, asset);
  res.status(201).json(asset);
});

app.put('/api/assets/:id', (req, res) => {
  const existing = assets.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  assets.set(req.params.id, updated);
  res.json(updated);
});

app.patch('/api/assets/:id/anchor', (req, res) => {
  const existing = assets.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  assets.set(req.params.id, updated);
  res.json(updated);
});

app.patch('/api/assets/:id/state', (req, res) => {
  const existing = assets.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, state: req.body.state, updatedAt: new Date().toISOString() };
  assets.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/assets/:id', (req, res) => {
  assets.delete(req.params.id);
  res.json({ deleted: true });
});

// --- Generation endpoints ---

app.post('/api/generate', async (req, res) => {
  try {
    const result = await generateBase(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Generation error:', err);
    res.status(502).json({ error: err.message || 'Generation failed' });
  }
});

app.post('/api/generate/variation', async (req, res) => {
  const { sourceAssetId, variantLabel, description } = req.body;

  if (!sourceAssetId || !description) {
    return res.status(400).json({ error: 'sourceAssetId and description are required' });
  }

  // Look up the source asset to get its image path and category
  const sourceAsset = assets.get(sourceAssetId);
  if (!sourceAsset) {
    return res.status(404).json({ error: `Source asset "${sourceAssetId}" not found` });
  }

  try {
    const result = await generateVariant({
      sourceAssetId,
      sourceImagePath: sourceAsset.imagePath as string,
      sourceCategory: sourceAsset.category as string,
      variantLabel: variantLabel || 'variant',
      description,
      width: (sourceAsset.width as number) || 128,
      height: (sourceAsset.height as number) || 128,
      style: sourceAsset.prompt as string | undefined,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Variant generation error:', err);
    res.status(502).json({ error: err.message || 'Variant generation failed' });
  }
});

app.post('/api/generate/animation-frames', async (req, res) => {
  const { assetId, clipName, frameCount, description } = req.body;

  if (!assetId || !clipName || !frameCount || !description) {
    return res.status(400).json({ error: 'assetId, clipName, frameCount, and description are required' });
  }

  const sourceAsset = assets.get(assetId);
  if (!sourceAsset) {
    return res.status(404).json({ error: `Source asset "${assetId}" not found` });
  }

  try {
    const result = await generateAnimationFrames({
      assetId,
      sourceImagePath: sourceAsset.imagePath as string,
      sourceCategory: sourceAsset.category as string,
      clipName,
      frameCount: Math.min(frameCount, 12), // Cap at 12 frames
      description,
      width: (sourceAsset.width as number) || 128,
      height: (sourceAsset.height as number) || 128,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Animation frame generation error:', err);
    res.status(502).json({ error: err.message || 'Animation frame generation failed' });
  }
});

// --- Export ---

app.post('/api/export/manifest', (_req, res) => {
  const manifest = [...assets.values()].filter(a => a.state === 'approved');
  res.json({ path: 'export/manifest.json', assetCount: manifest.length });
});

// --- Diagnostics ---

app.get('/api/diagnostics', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const info: Record<string, unknown> = {
    server: 'mathgame-asset-server',
    geminiApiKey: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'NOT SET',
    rembgUrl: process.env.REMBG_URL || 'http://rembg:5000 (default)',
    assetsInMemory: assets.size,
    spritesDir: 'public/assets/sprites',
  };

  // Check rembg connectivity
  try {
    const rembgRes = await fetch(`${process.env.REMBG_URL || 'http://rembg:5000'}/api/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(0),
      signal: AbortSignal.timeout(3000),
    });
    info.rembgStatus = `reachable (${rembgRes.status})`;
  } catch {
    info.rembgStatus = 'unreachable';
  }

  res.json(info);
});

app.get('/api/diagnostics/models', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const models: Array<Record<string, unknown>> = [];

    const pager = await ai.models.list({ config: { pageSize: 100 } });
    for (const model of pager) {
      models.push({
        name: model.name,
        displayName: model.displayName,
        description: model.description,
        supportedActions: model.supportedGenerationMethods,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
      });
    }

    res.json({ count: models.length, models });
  } catch (err: any) {
    console.error('ListModels error:', err);
    res.json({ error: err.message, raw: String(err) });
  }
});

app.get('/api/diagnostics/files', async (_req, res) => {
  const fs = await import('fs');
  const path = await import('path');

  function listDir(dir: string): string[] {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const results: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...listDir(full));
        } else {
          results.push(full);
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  const files = listDir('public/assets/sprites');
  res.json({ count: files.length, files });
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`Asset server running at http://localhost:${PORT}`);
  console.log(`  GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'set' : 'NOT SET'}`);
  console.log(`  REMBG_URL: ${process.env.REMBG_URL || 'http://rembg:5000 (default)'}`);
});
