/**
 * Core image generation logic for the math game asset pipeline.
 *
 * Three modes:
 *   1. Base generation  — text prompt → Imagen 4 → rembg → resize
 *   2. Variant generation — source image + instruction → Gemini multimodal → rembg → resize
 *   3. Animation frames  — source image + per-frame instructions → Gemini multimodal → rembg → resize
 */

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// --- Config ---

const REMBG_URL = process.env.REMBG_URL || 'http://rembg:5000';
const SPRITES_DIR = path.resolve('public', 'assets', 'sprites');

// Categories that should keep their background (no rembg)
const KEEP_BACKGROUND_CATEGORIES = new Set(['background', 'foreground']);

// Style prefixes per art style
const STYLE_PROMPTS: Record<string, string> = {
  'Colorful cartoon 2D side-view, vibrant, kid-friendly':
    'Colorful cartoon 2D side-view platformer art, vibrant, kid-friendly, clean outlines',
  'Pixel art retro style, 16-bit aesthetic':
    'Pixel art retro style, 16-bit aesthetic, crisp pixels, limited palette',
  'Hand-drawn storybook illustration, soft edges':
    'Hand-drawn storybook illustration, soft edges, gentle watercolor feel',
  'Flat design, clean vector look, bright colors':
    'Flat design, clean vector look, bright saturated colors, minimal shading',
};

const DEFAULT_STYLE = 'Colorful cartoon 2D side-view, vibrant, kid-friendly, clean outlines';
const PROMPT_SUFFIX = 'single isolated object, no text, no watermark, game asset sprite';

// --- Helpers ---

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey });
}

/** Remove background via rembg service. Falls back to original if unavailable. */
export async function removeBackground(imageBuffer: Uint8Array): Promise<Uint8Array> {
  try {
    const response = await fetch(`${REMBG_URL}/api/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: imageBuffer as unknown as BodyInit,
    });
    if (!response.ok) {
      console.warn(`rembg returned ${response.status}, skipping background removal`);
      return imageBuffer;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (err) {
    console.warn('rembg unavailable, skipping background removal:', (err as Error).message);
    return imageBuffer;
  }
}

/** Resize image to target dimensions, preserving aspect ratio with transparent padding. */
export async function resizeImage(
  imageBuffer: Uint8Array,
  width: number,
  height: number,
  transparent: boolean,
): Promise<Uint8Array> {
  return sharp(imageBuffer)
    .resize(width, height, {
      fit: 'contain',
      background: transparent
        ? { r: 0, g: 0, b: 0, alpha: 0 }
        : { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png()
    .toBuffer();
}

/** Save a buffer to the sprites directory. Returns the relative path. */
export function saveSprite(buffer: Uint8Array, category: string, filename: string): string {
  const categoryDir = path.join(SPRITES_DIR, category || 'uncategorized');
  fs.mkdirSync(categoryDir, { recursive: true });
  const filePath = path.join(categoryDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `assets/sprites/${category || 'uncategorized'}/${filename}`;
}

/** Load a sprite from disk by its relative path. */
export function loadSprite(relativePath: string): Uint8Array {
  const fullPath = path.resolve('public', relativePath);
  return new Uint8Array(fs.readFileSync(fullPath));
}

// --- Base Generation ---

export interface GenerateParams {
  description: string;
  category: string;
  assetId: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface GenerateResult {
  prompt: string;
  imagePath: string;
  model: string;
  size: { w: number; h: number };
}

export async function generateBase(params: GenerateParams): Promise<GenerateResult> {
  const { description, category, assetId, width = 128, height = 128, style } = params;
  const ai = getAI();

  const stylePrefix = (style && STYLE_PROMPTS[style]) || style || DEFAULT_STYLE;
  const fullPrompt = category === 'background'
    ? `${stylePrefix}, ${description}, seamless game background, high quality`
    : `${stylePrefix}, ${description}, ${PROMPT_SUFFIX}`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: fullPrompt,
    config: { numberOfImages: 1 },
  });

  if (!response.generatedImages?.length) throw new Error('No images generated');
  const imageData = response.generatedImages[0].image?.imageBytes;
  if (!imageData) throw new Error('No image data in response');

  let buffer: Uint8Array = new Uint8Array(Buffer.from(imageData, 'base64'));

  // Background removal: skip for backgrounds/foregrounds
  if (!KEEP_BACKGROUND_CATEGORIES.has(category)) {
    buffer = await removeBackground(buffer);
  }

  // Resize
  const transparent = !KEEP_BACKGROUND_CATEGORIES.has(category);
  buffer = await resizeImage(buffer, width, height, transparent);

  const filename = `${assetId || 'gen_' + Date.now()}.png`;
  const imagePath = saveSprite(buffer, category, filename);

  return {
    prompt: fullPrompt,
    imagePath,
    model: 'imagen-4.0-generate-001',
    size: { w: width, h: height },
  };
}

// --- Variant Generation ---

export interface VariantParams {
  sourceAssetId: string;
  sourceImagePath: string;
  sourceCategory: string;
  variantLabel: string;
  description: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface VariantResult {
  prompt: string;
  imagePath: string;
  model: string;
}

/**
 * Generate a variant of an existing asset using Gemini's multimodal capabilities.
 *
 * Sends the source image + an instruction prompt to Gemini, which understands
 * the visual style and produces a new image matching the instruction.
 */
export async function generateVariant(params: VariantParams): Promise<VariantResult> {
  const {
    sourceImagePath, sourceCategory, sourceAssetId,
    variantLabel, description,
    width = 128, height = 128, style,
  } = params;
  const ai = getAI();

  // Load source image
  const sourceBuffer = loadSprite(sourceImagePath);
  const sourceBase64 = Buffer.from(sourceBuffer).toString('base64');

  const styleHint = (style && STYLE_PROMPTS[style]) || style || DEFAULT_STYLE;

  // Build the multimodal prompt
  const instruction = [
    `You are a game art assistant. I have an existing game sprite asset.`,
    `Art style: ${styleHint}`,
    `Modification requested: ${description}`,
    `Variant label: ${variantLabel}`,
    ``,
    `Generate a new image of the SAME character/object but with the requested modification.`,
    `Maintain the exact same art style, color palette, proportions, and visual identity.`,
    `The result should look like it belongs to the same sprite sheet as the original.`,
    KEEP_BACKGROUND_CATEGORIES.has(sourceCategory)
      ? 'Keep the background.'
      : 'Use a clean, solid-color background (preferably white or light gray) so it can be easily removed.',
  ].join('\n');

  // Use Gemini multimodal to generate the variant
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: sourceBase64,
            },
          },
          { text: instruction },
        ],
      },
    ],
    config: {
      responseModalities: ['image', 'text'],
    },
  });

  // Extract generated image from response
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
    throw new Error('Gemini did not return an image. The model may not support image generation in this configuration.');
  }

  let buffer: Uint8Array = new Uint8Array(Buffer.from(imagePart.inlineData.data, 'base64'));

  // Post-process: background removal + resize
  if (!KEEP_BACKGROUND_CATEGORIES.has(sourceCategory)) {
    buffer = await removeBackground(buffer);
  }
  const transparent = !KEEP_BACKGROUND_CATEGORIES.has(sourceCategory);
  buffer = await resizeImage(buffer, width, height, transparent);

  const filename = `${sourceAssetId}_${variantLabel.replace(/\s+/g, '_')}.png`;
  const imagePath = saveSprite(buffer, sourceCategory, filename);

  return {
    prompt: instruction,
    imagePath,
    model: 'gemini-2.5-flash-image',
  };
}

// --- Animation Frame Generation ---

export interface AnimationFrameParams {
  assetId: string;
  sourceImagePath: string;
  sourceCategory: string;
  clipName: string;
  frameCount: number;
  description: string;
  width?: number;
  height?: number;
  style?: string;
}

export interface AnimationFrameResult {
  frames: string[];
  model: string;
}

/**
 * Generate animation frames by producing variants for each frame.
 * Each frame builds on the source image with a frame-specific instruction.
 */
export async function generateAnimationFrames(
  params: AnimationFrameParams,
): Promise<AnimationFrameResult> {
  const {
    assetId, sourceImagePath, sourceCategory,
    clipName, frameCount, description,
    width = 128, height = 128, style,
  } = params;

  const frames: string[] = [];

  for (let i = 0; i < frameCount; i++) {
    const frameDesc = `Frame ${i + 1} of ${frameCount} for "${clipName}" animation: ${description}. This is frame ${i + 1}/${frameCount} of the motion sequence.`;

    const result = await generateVariant({
      sourceAssetId: assetId,
      sourceImagePath,
      sourceCategory,
      variantLabel: `${clipName}_frame${String(i + 1).padStart(2, '0')}`,
      description: frameDesc,
      width,
      height,
      style,
    });

    frames.push(result.imagePath);
  }

  return { frames, model: 'gemini-2.0-flash-exp' };
}
