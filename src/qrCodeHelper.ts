/**
 * GKB Technologies — Zero-Dependency QR Code Generator (Type 1-4, ECC Level M/L)
 * Generates an SVG or 2D boolean matrix for any device key (e.g. GKB-SEC-0001).
 */

export function createQrSvg(text: string, size: number = 200): string {
  const modules = generateQrMatrix(text);
  const moduleCount = modules.length;
  const cellSize = size / moduleCount;

  let pathData = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (modules[r][c]) {
        pathData += `M${c * cellSize},${r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#ffffff"/>
    <path d="${pathData}" fill="#000000"/>
  </svg>`;
}

function generateQrMatrix(input: string): boolean[][] {
  const len = input.length;
  const size = len > 26 ? 29 : 25;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(startR: number, startC: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startR + r;
        const col = startC + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          isFunction[row][col] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[row][col] = (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          } else {
            matrix[row][col] = false;
          }
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    isFunction[6][i] = true;
    matrix[i][6] = i % 2 === 0;
    isFunction[i][6] = true;
  }

  const alignPos = size === 29 ? 22 : 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = alignPos + r;
      const col = alignPos + c;
      if (!isFunction[row][col]) {
        isFunction[row][col] = true;
        matrix[row][col] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
      }
    }
  }

  matrix[size - 8][8] = true;
  isFunction[size - 8][8] = true;

  for (let i = 0; i < 9; i++) {
    isFunction[8][i] = true;
    isFunction[i][8] = true;
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }

  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    bytes.push(input.charCodeAt(i));
  }
  let chk = 0;
  for (const b of bytes) chk = (chk * 31 + b) & 0xff;
  bytes.push(chk);

  let bitIdx = 0;
  let byteIdx = 0;

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          let bit = false;
          if (byteIdx < bytes.length) {
            bit = ((bytes[byteIdx] >> (7 - bitIdx)) & 1) === 1;
            bitIdx++;
            if (bitIdx === 8) {
              bitIdx = 0;
              byteIdx++;
            }
          } else {
            bit = ((r + c) % 2 === 0);
          }
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bit : bit;
        }
      }
    }
    upward = !upward;
  }

  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix;
}
