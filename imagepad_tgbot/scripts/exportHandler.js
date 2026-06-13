/**
 * Export Handler Module
 * Handles image export and download functionality
 */

import { zipSync } from './vendor/fflate.esm.js';

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

/**
 * Build a ZIP blob from named file entries.
 * @param {{ name: string, blob: Blob }[]} entries
 * @returns {Promise<Blob>}
 */
export async function buildZipBlob(entries) {
    const files = {};
    for (const { name, blob } of entries) {
        files[name] = new Uint8Array(await blob.arrayBuffer());
    }
    return new Blob([zipSync(files)], { type: 'application/zip' });
}

/**
 * Filename for a batch export ZIP (shared timestamp with members inside).
 * @param {boolean} multiCellGrid
 * @returns {string}
 */
export function generateBatchZipFilename(multiCellGrid = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const prefix = multiCellGrid ? 'collage' : 'image';
    return `${prefix}-batch-${timestamp}.zip`;
}

/**
 * Filename for a horizontal-split ZIP export.
 * @param {number} z - Strip count (2 or 3)
 * @returns {string}
 */
export function generateSplitZipFilename(z) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `split-z${z}-${timestamp}.zip`;
}

/**
 * Filename for one strip inside a split ZIP.
 * @param {string} format - Export format
 * @param {number} index - 1-based strip index
 * @param {number} z - Total strips
 * @param {string} timestamp - Shared timestamp for the run
 * @returns {string}
 */
export function generateSplitMemberFilename(format, index, z, timestamp) {
    const i = String(index).padStart(2, '0');
    const n = String(z).padStart(2, '0');
    return `split-${i}-of-${n}-${timestamp}.${format}`;
}

