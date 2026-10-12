const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, iconPath) {
    // 8-byte signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function createChunk(type, data) {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);

        const typeBuf = Buffer.from(type, 'ascii');
        const toCrc = Buffer.concat([typeBuf, data]);

        // CRC32 implementation
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < toCrc.length; i++) {
            crc ^= toCrc[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        crc = (crc ^ 0xFFFFFFFF) >>> 0;

        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crc, 0);

        return Buffer.concat([length, typeBuf, data, crcBuf]);
    }

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8); // bit depth 8
    ihdrData.writeUInt8(6, 9); // RGBA color type
    ihdrData.writeUInt8(0, 10); // compression
    ihdrData.writeUInt8(0, 11); // filter
    ihdrData.writeUInt8(0, 12); // interlace
    const ihdrChunk = createChunk('IHDR', ihdrData);

    // Raw pixel data with filter byte (0) before each row
    const rowSize = width * 4 + 1;
    const rawData = Buffer.alloc(rowSize * height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width * 0.38;

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowSize;
        rawData[rowOffset] = 0; // Filter None

        for (let x = 0; x < width; x++) {
            const pxOffset = rowOffset + 1 + x * 4;

            // Gradient background: deep slate to royal indigo
            const t = (x + y) / (width + height);
            let r = Math.round(30 + t * 50);   // ~30 to 80
            let g = Math.round(41 + t * 40);   // ~41 to 81
            let b = Math.round(75 + t * 160);  // ~75 to 235
            let a = 255;

            // Distance from center
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Circular App Badge
            if (dist < radius) {
                // Vibrant Indigo-Violet glowing core
                const innerT = dist / radius;
                r = Math.round(99 * (1 - innerT) + 129 * innerT); // Indigo
                g = Math.round(102 * (1 - innerT) + 140 * innerT);
                b = Math.round(241 * (1 - innerT) + 248 * innerT);

                // Draw an stylized geometric icon in the center (Hexagon / Diamond / S)
                const ndx = Math.abs(dx) / (radius * 0.6);
                const ndy = Math.abs(dy) / (radius * 0.6);
                if (ndx + ndy < 0.65 && ndx + ndy > 0.45) {
                    // White emblem ring
                    r = 255; g = 255; b = 255;
                } else if (dist < radius * 0.22) {
                    // White core dot
                    r = 255; g = 255; b = 255;
                }
            }

            rawData[pxOffset] = r;
            rawData[pxOffset + 1] = g;
            rawData[pxOffset + 2] = b;
            rawData[pxOffset + 3] = a;
        }
    }

    const compressed = zlib.deflateSync(rawData);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.writeFileSync(iconPath, png);
    console.log(`Generated PNG: ${iconPath} (${width}x${height})`);
}

createPng(192, 192, path.join(__dirname, 'icons', 'icon-192.png'));
createPng(512, 512, path.join(__dirname, 'icons', 'icon-512.png'));
createPng(512, 512, path.join(__dirname, 'icons', 'icon-maskable.png'));
