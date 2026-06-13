/**
 * Image Processing Module
 * Handles image loading, scaling, and canvas operations
 */

/**
 * Load a single image from a file
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Load multiple images from files
 * @param {FileList|File[]} files - Array of image files
 * @returns {Promise<HTMLImageElement[]>}
 */
export function loadMultipleImages(files) {
    const fileArray = Array.from(files);
    return Promise.all(fileArray.map(file => loadImage(file)));
}

/**
 * Calculate dimensions and scaling for a single image
 * @param {HTMLImageElement} image - Source image
 * @param {number} outputWidth - Output canvas width
 * @param {number} outputHeight - Output canvas height
 * @param {number} marginSize - Margin size in pixels
 * @returns {Object} - {scaledWidth, scaledHeight, x, y}
 */
export function calculateDimensions(image, outputWidth, outputHeight, marginSize) {
    const availableWidth = outputWidth - (marginSize * 2);
    const availableHeight = outputHeight - (marginSize * 2);

    const scaleX = availableWidth / image.width;
    const scaleY = availableHeight / image.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    const x = marginSize + (availableWidth - scaledWidth) / 2;
    const y = marginSize + (availableHeight - scaledHeight) / 2;

    return { scaledWidth, scaledHeight, x, y };
}

/**
 * Process a single image with padding
 * @param {HTMLImageElement} image - Source image
 * @param {number} outputWidth - Output width
 * @param {number} outputHeight - Output height
 * @param {number} marginSize - Margin size
 * @param {string} marginColor - Margin color (hex)
 * @returns {HTMLCanvasElement} - Processed canvas
 */
export function processImage(image, outputWidth, outputHeight, marginSize, marginColor) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    // Fill canvas with margin color
    ctx.fillStyle = marginColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Calculate dimensions and position
    const { scaledWidth, scaledHeight, x, y } = calculateDimensions(
        image, outputWidth, outputHeight, marginSize
    );

    // Draw image
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

    return canvas;
}

export function normalizeMarginSize(marginSize) {
    const m = Number(marginSize);
    if (!Number.isFinite(m) || m < 0) return 0;
    return Math.round(m);
}

/**
 * Snap drawImage destination to whole pixels so adjacent cells do not leave
 * subpixel gaps or semi-transparent seams (common when margin is 0).
 */
function drawImageDestSnapped9(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh) {
    const ix = Math.floor(dx);
    const iy = Math.floor(dy);
    const iw = Math.max(1, Math.ceil(dx + dw - ix));
    const ih = Math.max(1, Math.ceil(dy + dh - iy));
    ctx.drawImage(image, sx, sy, sw, sh, ix, iy, iw, ih);
}

function drawImageDestSnapped5(ctx, image, dx, dy, dw, dh) {
    const ix = Math.floor(dx);
    const iy = Math.floor(dy);
    const iw = Math.max(1, Math.ceil(dx + dw - ix));
    const ih = Math.max(1, Math.ceil(dy + dh - iy));
    ctx.drawImage(image, ix, iy, iw, ih);
}

/**
 * Integer pixel layout for grid cells so they tile exactly with no fractional gaps.
 * Extra pixels go to the first columns / rows. Margin is rounded to an integer px value.
 */
export function getGridLayout(outputWidth, outputHeight, gridRows, gridCols, marginSize) {
    const m = normalizeMarginSize(marginSize);
    const innerW = Math.max(0, outputWidth - m * (gridCols + 1));
    const innerH = Math.max(0, outputHeight - m * (gridRows + 1));

    const baseW = Math.floor(innerW / gridCols);
    const extraW = innerW - baseW * gridCols;
    const baseH = Math.floor(innerH / gridRows);
    const extraH = innerH - baseH * gridRows;

    const cellWidths = [];
    for (let c = 0; c < gridCols; c++) {
        cellWidths[c] = baseW + (c < extraW ? 1 : 0);
    }
    const cellHeights = [];
    for (let r = 0; r < gridRows; r++) {
        cellHeights[r] = baseH + (r < extraH ? 1 : 0);
    }

    const cellXs = [];
    let x = m;
    for (let c = 0; c < gridCols; c++) {
        cellXs[c] = x;
        x += cellWidths[c] + m;
    }
    const cellYs = [];
    let y = m;
    for (let r = 0; r < gridRows; r++) {
        cellYs[r] = y;
        y += cellHeights[r] + m;
    }

    return { cellXs, cellYs, cellWidths, cellHeights };
}

/**
 * Draw an image in a specific grid cell
 * Images fill cells edge-to-edge. Margin size is the gap between cells.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} image - Image to draw
 * @param {number} cellX - Left edge of cell (pixels)
 * @param {number} cellY - Top edge of cell (pixels)
 * @param {number} cellWidth - Width of the cell (pixels)
 * @param {number} cellHeight - Height of the cell (pixels)
 * @param {string} fillMode - Fill mode: 'fit', 'vertical', or 'horizontal'
 * @param {Object|null} customCrop - Custom crop area {x, y, width, height} in image coordinates, or null
 * @param {number} bleedRight - Extra destination width (px) to overlap the cell to the right (seam fix when margin is 0)
 * @param {number} bleedDown - Extra destination height (px) to overlap the cell below
 */
export function drawImageInCell(ctx, image, cellX, cellY, cellWidth, cellHeight, fillMode = 'fit', customCrop = null, bleedRight = 0, bleedDown = 0) {
    if (!image) return;

    const br = bleedRight;
    const bd = bleedDown;

    let drawX, drawY, drawWidth, drawHeight;
    let sourceX = 0, sourceY = 0, sourceWidth = image.width, sourceHeight = image.height;

    // If custom crop is provided, use it
    if (customCrop) {
        sourceX = customCrop.x;
        sourceY = customCrop.y;
        sourceWidth = customCrop.width;
        sourceHeight = customCrop.height;

        // Calculate scale to fit crop area in cell
        const scaleX = cellWidth / sourceWidth;
        const scaleY = cellHeight / sourceHeight;
        const scale = Math.min(scaleX, scaleY);

        drawWidth = sourceWidth * scale;
        drawHeight = sourceHeight * scale;
        drawX = cellX + (cellWidth - drawWidth) / 2;
        drawY = cellY + (cellHeight - drawHeight) / 2;

        drawImageDestSnapped9(
            ctx, image,
            sourceX, sourceY, sourceWidth, sourceHeight,
            drawX, drawY, drawWidth + br, drawHeight + bd
        );
        return;
    }

    if (fillMode === 'fit') {
        // Fit mode: Scale to fit while preserving aspect ratio (no cropping)
        const scaleX = cellWidth / image.width;
        const scaleY = cellHeight / image.height;
        const scale = Math.min(scaleX, scaleY);

        drawWidth = image.width * scale;
        drawHeight = image.height * scale;
        drawX = cellX + (cellWidth - drawWidth) / 2;
        drawY = cellY + (cellHeight - drawHeight) / 2;

        drawImageDestSnapped5(ctx, image, drawX, drawY, drawWidth + br, drawHeight + bd);
    } else if (fillMode === 'vertical') {
        // Fill vertical: Always fill cell height, crop width if image exceeds cell width
        const scale = cellHeight / image.height;
        const scaledWidth = image.width * scale;

        drawHeight = cellHeight;
        drawY = cellY;

        if (scaledWidth > cellWidth) {
            // Image is wider than cell, crop horizontally (center crop)
            drawWidth = cellWidth;
            drawX = cellX;
            sourceWidth = cellWidth / scale;
            sourceX = (image.width - sourceWidth) / 2;
            drawImageDestSnapped9(
                ctx, image,
                sourceX, sourceY, sourceWidth, sourceHeight,
                drawX, drawY, drawWidth + br, drawHeight + bd
            );
        } else {
            // Image fits within cell width, no cropping needed
            drawWidth = scaledWidth;
            drawX = cellX + (cellWidth - drawWidth) / 2;
            drawImageDestSnapped5(ctx, image, drawX, drawY, drawWidth + br, drawHeight + bd);
        }
    } else if (fillMode === 'horizontal') {
        // Fill horizontal: Always fill cell width, crop height if image exceeds cell height
        const scale = cellWidth / image.width;
        const scaledHeight = image.height * scale;

        drawWidth = cellWidth;
        drawX = cellX;

        if (scaledHeight > cellHeight) {
            // Image is taller than cell, crop vertically (center crop)
            drawHeight = cellHeight;
            drawY = cellY;
            sourceHeight = cellHeight / scale;
            sourceY = (image.height - sourceHeight) / 2;
            drawImageDestSnapped9(
                ctx, image,
                sourceX, sourceY, sourceWidth, sourceHeight,
                drawX, drawY, drawWidth + br, drawHeight + bd
            );
        } else {
            // Image fits within cell height, no cropping needed
            drawHeight = scaledHeight;
            drawY = cellY + (cellHeight - drawHeight) / 2;
            drawImageDestSnapped5(ctx, image, drawX, drawY, drawWidth + br, drawHeight + bd);
        }
    }
}

/**
 * Process a photo collage
 * @param {HTMLImageElement[]} images - Array of images (can have nulls for empty cells)
 * @param {number} gridRows - Number of rows
 * @param {number} gridCols - Number of columns
 * @param {number} outputWidth - Output width
 * @param {number} outputHeight - Output height
 * @param {number} marginSize - Margin size
 * @param {string} marginColor - Margin color
 * @param {string[]|string} fillModes - Per-cell fill mode ('fit'|'vertical'|'horizontal'), or single string for all cells
 * @param {Array<Object|null>} cropAreas - Array of custom crop areas for each cell, or null
 * @returns {HTMLCanvasElement} - Processed canvas
 */
export function processCollage(images, gridRows, gridCols, outputWidth, outputHeight, marginSize, marginColor, fillModes = 'fit', cropAreas = null) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    const m = normalizeMarginSize(marginSize);

    // Fill entire canvas with margin color
    ctx.fillStyle = marginColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    const layout = getGridLayout(outputWidth, outputHeight, gridRows, gridCols, m);
    const defaultFill = typeof fillModes === 'string' ? fillModes : 'fit';

    const multiCell = gridRows * gridCols > 1;
    const seamBleed = m === 0 && multiCell;

    // Row-major: later cells paint over 1px overlap from earlier (eliminates bilinear seams)
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const index = row * gridCols + col;
            const image = images[index] || null;
            const customCrop = cropAreas && cropAreas[index] ? cropAreas[index] : null;
            const fillMode = Array.isArray(fillModes) ? (fillModes[index] || defaultFill) : defaultFill;
            const cellX = layout.cellXs[col];
            const cellY = layout.cellYs[row];
            const cw = layout.cellWidths[col];
            const ch = layout.cellHeights[row];
            const bleedR = seamBleed && col < gridCols - 1 ? 1 : 0;
            const bleedD = seamBleed && row < gridRows - 1 ? 1 : 0;
            drawImageInCell(ctx, image, cellX, cellY, cw, ch, fillMode, customCrop, bleedR, bleedD);
        }
    }

    return canvas;
}

/**
 * Render one image on a wide master canvas for horizontal split export.
 * @param {HTMLImageElement} image - Source image
 * @param {number} z - Number of vertical strips (2 or 3)
 * @param {number} frameW - Width of each exported strip
 * @param {number} frameH - Height of each exported strip
 * @param {number} marginSize - Margin size (already scaled)
 * @param {string} marginColor - Margin / letterbox color
 * @param {string} fillMode - 'horizontal' or 'vertical'
 * @returns {HTMLCanvasElement}
 */
export function processSplitMaster(image, z, frameW, frameH, marginSize, marginColor, fillMode) {
    const masterW = z * frameW;
    const masterH = frameH;
    const canvas = document.createElement('canvas');
    canvas.width = masterW;
    canvas.height = masterH;
    const ctx = canvas.getContext('2d');

    const m = normalizeMarginSize(marginSize);
    ctx.fillStyle = marginColor;
    ctx.fillRect(0, 0, masterW, masterH);

    const layout = getGridLayout(masterW, masterH, 1, 1, m);
    drawImageInCell(
        ctx,
        image,
        layout.cellXs[0],
        layout.cellYs[0],
        layout.cellWidths[0],
        layout.cellHeights[0],
        fillMode
    );

    return canvas;
}

/**
 * Crop one vertical strip from a split master canvas.
 * @param {HTMLCanvasElement} masterCanvas
 * @param {number} index - Strip index (0-based)
 * @param {number} frameW
 * @param {number} frameH
 * @returns {HTMLCanvasElement}
 */
export function cropStrip(masterCanvas, index, frameW, frameH) {
    const canvas = document.createElement('canvas');
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        masterCanvas,
        index * frameW, 0, frameW, frameH,
        0, 0, frameW, frameH
    );
    return canvas;
}

/**
 * Draw vertical dashed slice guides on a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} z - Strip count
 * @param {number} frameW - Strip width
 * @param {number} frameH - Canvas height
 * @param {string} [strokeColor] - Line color (theme-aware from caller)
 */
export function drawSplitGuides(ctx, z, frameW, frameH, strokeColor = 'rgba(220, 50, 50, 0.75)') {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    for (let i = 1; i < z; i++) {
        const x = i * frameW + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, frameH);
        ctx.stroke();
    }
    ctx.restore();
}

