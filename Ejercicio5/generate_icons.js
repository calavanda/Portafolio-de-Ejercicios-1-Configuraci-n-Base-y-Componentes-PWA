const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height, iconPath) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    function createChunk(type, data) {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);

        const typeBuf = Buffer.from(type, 'ascii');
        const toCrc = Buffer.concat([typeBuf, data]);

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

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData.writeUInt8(8, 8);
    ihdrData.writeUInt8(6, 9);
    ihdrData.writeUInt8(0, 10);
    ihdrData.writeUInt8(0, 11);
    ihdrData.writeUInt8(0, 12);
    const ihdrChunk = createChunk('IHDR', ihdrData);

    const rowSize = width * 4 + 1;
    const rawData = Buffer.alloc(rowSize * height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width * 0.38;

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowSize;
        rawData[rowOffset] = 0;

        for (let x = 0; x < width; x++) {
            const pxOffset = rowOffset + 1 + x * 4;
            const t = (x + y) / (width + height);
            let r = Math.round(11 + t * 30);
            let g = Math.round(15 + t * 40);
            let b = Math.round(25 + t * 140);
            let a = 255;

            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const innerT = dist / radius;
                r = Math.round(99 * (1 - innerT) + 129 * innerT);
                g = Math.round(102 * (1 - innerT) + 140 * innerT);
                b = Math.round(241 * (1 - innerT) + 248 * innerT);

                const ndx = Math.abs(dx) / (radius * 0.6);
                const ndy = Math.abs(dy) / (radius * 0.6);
                if (ndx + ndy < 0.65 && ndx + ndy > 0.45) {
                    r = 255; g = 255; b = 255;
                } else if (dist < radius * 0.22) {
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

createPng(192, 192, path.join(__dirname, 'icons', 'icon-192x192.png'));
createPng(512, 512, path.join(__dirname, 'icons', 'icon-512x512.png'));
