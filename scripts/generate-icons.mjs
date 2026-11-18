import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function drawPng(size, maskable = false) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const bg = [11, 18, 32, 255];
  const panel = [20, 31, 50, 255];
  const border = [38, 55, 80, 255];
  const mint = [83, 227, 161, 255];

  const pad = maskable ? 0.16 : 0.06;
  const cx = size / 2;
  const cy = size / 2;
  const scale = size * (1 - pad * 2);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      let color = bg;

      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      // Outer rounded panel frame
      if (!maskable && Math.abs(nx) < 0.46 && Math.abs(ny) < 0.46) {
        const dx = Math.max(0, Math.abs(nx) - 0.34);
        const dy = Math.max(0, Math.abs(ny) - 0.34);
        const d = Math.hypot(dx, dy);
        if (d <= 0.12 && d >= 0.105) {
          color = border;
        } else if (d < 0.105) {
          color = panel;
        }
      }

      // House roof & walls outline
      const inHouseX = Math.abs(nx) <= 0.27;
      const roofY = -0.27 + Math.abs(nx) * 0.88;
      const inHouseBody = inHouseX && ny >= roofY && ny <= 0.27;
      if (inHouseBody) {
        const distWall = Math.min(0.27 - Math.abs(nx), 0.27 - ny);
        const distRoof = (ny - roofY) / Math.hypot(1, 0.88);
        if (distWall < 0.036 || distRoof < 0.036) {
          color = mint;
        } else {
          color = panel;
        }
      }

      // Lightning bolt in center
      const bx = nx;
      const by = ny - 0.02;
      const inUpperBolt = by >= -0.14 && by <= 0.02 && bx >= -0.02 - (0.02 - by) * 0.35 && bx <= 0.05 - (0.02 - by) * 0.15;
      const inLowerBolt = by > -0.01 && by <= 0.15 && bx >= -0.05 + (by + 0.01) * 0.15 && bx <= 0.02 + (by + 0.01) * 0.35;
      if (inUpperBolt || inLowerBolt) {
        color = mint;
      }

      raw[idx] = color[0];
      raw[idx + 1] = color[1];
      raw[idx + 2] = color[2];
      raw[idx + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), drawPng(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), drawPng(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), drawPng(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), drawPng(180, false));
console.log('Generated PWA PNG icons in public/');
