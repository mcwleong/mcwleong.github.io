/**
 * Export Handler Module
 * Handles image export and download functionality
 */

/**
 * Convert canvas to blob
 * @param {HTMLCanvasElement} canvas - Canvas to export
 * @param {string} format - Export format ('png', 'jpeg', 'webp')
 * @param {number} quality - Quality for lossy formats (1-100)
 * @returns {Promise<Blob>}
 */
export function exportImage(canvas, format = 'png', quality = 0.9) {
    return new Promise((resolve, reject) => {
        const mimeType = format === 'png' ? 'image/png' : 
                        format === 'jpeg' ? 'image/jpeg' : 
                        'image/webp';
        
        const qualityValue = format === 'png' ? undefined : quality;

        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to export image'));
                }
            },
            mimeType,
            qualityValue
        );
    });
}

/**
 * Download image blob as file
 * @param {Blob} blob - Image blob
 * @param {string} filename - Filename for download
 */
export function downloadImage(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate filename based on format and timestamp
 * @param {string} format - Export format
 * @param {boolean} multiCellGrid - true when grid has more than one cell (affects default filename prefix)
 * @returns {string} - Generated filename
 */
export function generateFilename(format, multiCellGrid = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const prefix = multiCellGrid ? 'collage' : 'image';
    return `${prefix}-${timestamp}.${format}`;
}

/**
 * Filename for one file in a batch export run (shared timestamp across the batch).
 */
export function generateBatchFilename(format, multiCellGrid, batchIndex, batchTotal, timestamp) {
    const prefix = multiCellGrid ? 'collage' : 'image';
    const i = String(batchIndex).padStart(2, '0');
    const n = String(batchTotal).padStart(2, '0');
    return `${prefix}-batch${i}-of-${n}-${timestamp}.${format}`;
}

