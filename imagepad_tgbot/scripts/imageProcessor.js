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

/**
 * Calculate cell dimensions for grid layout
 * @param {number} outputWidth - Total output width
 * @param {number} outputHeight - Total output height
 * @param {number} gridRows - Number of rows
 * @param {number} gridCols - Number of columns
 * @param {number} marginSize - Margin size
 * @returns {Object} - {cellWidth, cellHeight}
 */
export function calculateCellDimensions(outputWidth, outputHeight, gridRows, gridCols, marginSize) {
    const totalMarginWidth = marginSize * (gridCols + 1);
    const totalMarginHeight = marginSize * (gridRows + 1);
    
    const cellWidth = (outputWidth - totalMarginWidth) / gridCols;
    const cellHeight = (outputHeight - totalMarginHeight) / gridRows;

    return { cellWidth, cellHeight };
}

/**
 * Draw an image in a specific grid cell
 * Images fill cells edge-to-edge. Margin size is the gap between cells.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLImageElement} image - Image to draw
 * @param {number} cellRow - Row index (0-based)
 * @param {number} cellCol - Column index (0-based)
 * @param {number} cellWidth - Width of the cell
 * @param {number} cellHeight - Height of the cell
 * @param {number} marginSize - Margin size (gap between cells)
 * @param {string} marginColor - Margin color
 * @param {string} fillMode - Fill mode: 'fit', 'vertical', or 'horizontal'
 * @param {Object|null} customCrop - Custom crop area {x, y, width, height} in image coordinates, or null
 */
export function drawImageInCell(ctx, image, cellRow, cellCol, cellWidth, cellHeight, marginSize, marginColor, fillMode = 'fit', customCrop = null) {
    // Calculate cell position
    const cellX = marginSize + cellCol * (cellWidth + marginSize);
    const cellY = marginSize + cellRow * (cellHeight + marginSize);

    // Fill cell with margin color (for empty cells)
    ctx.fillStyle = marginColor;
    ctx.fillRect(cellX, cellY, cellWidth, cellHeight);

    if (!image) return;

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

        ctx.drawImage(
            image,
            sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (cropped)
            drawX, drawY, drawWidth, drawHeight            // Destination rectangle
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

        // Draw full image
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
            ctx.drawImage(
                image,
                sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (cropped)
                drawX, drawY, drawWidth, drawHeight            // Destination rectangle
            );
        } else {
            // Image fits within cell width, no cropping needed
            drawWidth = scaledWidth;
            drawX = cellX + (cellWidth - drawWidth) / 2;
            ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
            ctx.drawImage(
                image,
                sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (cropped)
                drawX, drawY, drawWidth, drawHeight            // Destination rectangle
            );
        } else {
            // Image fits within cell height, no cropping needed
            drawHeight = scaledHeight;
            drawY = cellY + (cellHeight - drawHeight) / 2;
            ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
 * @param {string} fillMode - Fill mode: 'fit', 'vertical', or 'horizontal'
 * @param {Array<Object|null>} cropAreas - Array of custom crop areas for each cell, or null
 * @returns {HTMLCanvasElement} - Processed canvas
 */
export function processCollage(images, gridRows, gridCols, outputWidth, outputHeight, marginSize, marginColor, fillMode = 'fit', cropAreas = null) {
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');

    // Fill entire canvas with margin color
    ctx.fillStyle = marginColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    // Calculate cell dimensions
    const { cellWidth, cellHeight } = calculateCellDimensions(
        outputWidth, outputHeight, gridRows, gridCols, marginSize
    );

    // Draw each cell
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const index = row * gridCols + col;
            const image = images[index] || null;
            const customCrop = cropAreas && cropAreas[index] ? cropAreas[index] : null;
            drawImageInCell(ctx, image, row, col, cellWidth, cellHeight, marginSize, marginColor, fillMode, customCrop);
        }
    }

    return canvas;
}

