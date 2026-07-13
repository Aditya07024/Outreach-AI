/**
 * Generate extension icons from SVG.
 * Run: node generate-icons.mjs
 */
import fs from 'fs';
import { createCanvas } from 'canvas';

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#7c3aed');
  gradient.addColorStop(1, '#3b82f6');
  
  // Rounded rectangle
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Text
  const fontSize = Math.round(size * 0.4);
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OA', size / 2, size / 2 + 1);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/icons/icon${size}.png`, buffer);
  console.log(`Generated icon${size}.png`);
}
