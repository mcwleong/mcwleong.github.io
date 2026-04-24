/**
 * UI Controller Module
 * Handles all UI interactions and updates
 */

import { loadMultipleImages, processCollage, getGridLayout, normalizeMarginSize } from './imageProcessor.js';
import { exportImage, downloadImage, generateFilename, generateBatchFilename } from './exportHandler.js';

export class UIController {
    constructor() {
        this.state = {
            inputImages: [],
            gridRows: 1,
            gridCols: 1,
            cellFillModes: ['fit'],
            outputWidth: 1080,
            outputHeight: 1350,
            scale: 2,
            marginSize: 20,
            marginColor: '#FFFFFF',
            currentFormat: 'jpeg',
            quality: 90,
            canvas: null,
            files: [],
            cropAreas: [],
            isDragging: false,
            dragCellIndex: null,
            dragStartX: 0,
            dragStartY: 0,
            previewScale: 1,
            swapAnchorIndex: null,
            swapModeActive: false,
            batchMode: false,
            batchAllImages: null,
            batchFiles: null,
            batchConfirmStamp: null
        };

        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.initializeGridSelector();

        this.elements.exportFormat.value = 'jpeg';
        this.state.currentFormat = 'jpeg';
        this.updateQualityVisibility();
        this.handlePresetSelection('instagram');
        this.updateSwapModeButton();
        {
            const v = parseInt(this.elements.outputScale.value, 10);
            this.state.scale = Number.isFinite(v) && v >= 1 && v <= 8 ? v : 2;
        }
    }

    invalidateBatchConfirm() {
        this.state.batchConfirmStamp = null;
    }

    getBatchSettingsStamp() {
        return JSON.stringify({
            r: this.state.gridRows,
            c: this.state.gridCols,
            w: this.state.outputWidth,
            h: this.state.outputHeight,
            s: this.state.scale,
            m: normalizeMarginSize(this.state.marginSize),
            mc: this.state.marginColor,
            fmt: this.state.currentFormat,
            q: this.state.quality,
            fills: [...this.state.cellFillModes]
        });
    }

    buildBatchConfirmMessage() {
        const cells = this.state.gridRows * this.state.gridCols;
        const m = normalizeMarginSize(this.state.marginSize);
        const fmt = this.state.currentFormat.toUpperCase();
        const lossy = this.state.currentFormat !== 'png';
        const lines = [
            'Use these settings for batch export?',
            '',
            `Grid: ${this.state.gridRows}×${this.state.gridCols} (${cells} images per file)`,
            `Output: ${this.state.outputWidth}×${this.state.outputHeight}px at ${this.state.scale}× scale (${this.state.outputWidth * this.state.scale}×${this.state.outputHeight * this.state.scale}px)`,
            `Margin: ${m}px, color ${this.state.marginColor}`,
            `Format: ${fmt}` + (lossy ? ` (quality ${this.state.quality}%)` : ''),
            '',
            'You will then pick images. Images that do not complete a full grid are skipped (with an alert).'
        ];
        return lines.join('\n');
    }

    ensureBatchSettingsConfirmed() {
        const stamp = this.getBatchSettingsStamp();
        if (this.state.batchConfirmStamp === stamp) return true;
        if (!window.confirm(this.buildBatchConfirmMessage())) return false;
        this.state.batchConfirmStamp = stamp;
        return true;
    }

    handleBatchModeChange(e) {
        const on = e.target.checked;
        this.state.batchMode = on;
        this.elements.batchHint.hidden = !on;
        this.updateUploadHintText();
        this.invalidateBatchConfirm();

        if (!on) {
            this.exitSwapMode();
            if (this.state.batchAllImages) {
                this.clearBatchWork();
            }
            this.updateBatchInteractionLock();
            return;
        }

        if (this.countLoadedImages() > 0 && !this.state.batchAllImages) {
            if (!window.confirm('Batch mode needs a new multi-image selection. Clear current images?')) {
                e.target.checked = false;
                this.state.batchMode = false;
                this.elements.batchHint.hidden = true;
                this.updateUploadHintText();
                return;
            }
            this.state.inputImages = [];
            this.state.files = [];
            this.initializeCropAreas();
            this.showPlaceholder();
            this.updateImageInfo();
            this.updateImageCounter();
        }
        this.updateBatchInteractionLock();
    }

    updateUploadHintText() {
        if (!this.elements.uploadHint) return;
        if (this.state.batchMode) {
            this.elements.uploadHint.textContent =
                'Choose images after confirming settings. Each full grid of cells becomes one file.';
        } else {
            this.elements.uploadHint.textContent =
                'or drag and drop here — use a 1×1 grid for a single padded image';
        }
    }

    clearBatchWork() {
        this.state.batchAllImages = null;
        this.state.batchFiles = null;
        this.state.inputImages = [];
        this.state.files = [];
        this.initializeCropAreas();
        this.showPlaceholder();
        this.state.canvas = null;
        this.updateImageInfo();
        this.updateImageCounter();
        this.updateBatchInteractionLock();
    }

    updateBatchInteractionLock() {
        const locked = this.state.batchMode && this.state.batchAllImages && this.state.batchAllImages.length > 0;
        if (this.elements.swapModeBtn) {
            this.elements.swapModeBtn.disabled = locked;
        }
        if (this.elements.previewCanvas) {
            this.elements.previewCanvas.classList.toggle('batch-locked', locked);
        }
    }

    async handleBatchFileUpload(files) {
        const cells = this.state.gridRows * this.state.gridCols;
        const list = Array.from(files);
        const remainder = list.length % cells;

        if (remainder > 0) {
            alert(
                `${remainder} image(s) will be skipped: a ${this.state.gridRows}×${this.state.gridCols} grid needs exactly ${cells} images per file. Only complete groups are exported.`
            );
        }

        const usableCount = list.length - remainder;
        if (usableCount === 0) {
            alert(`Batch export needs at least ${cells} image(s) to create one file.`);
            this.clearBatchWork();
            return;
        }

        const toLoad = list.slice(0, usableCount);
        const loaded = await loadMultipleImages(toLoad);
        this.state.batchAllImages = loaded;
        this.state.batchFiles = toLoad.slice();

        this.state.inputImages = [];
        this.state.files = [];
        for (let i = 0; i < cells; i++) {
            this.state.inputImages[i] = loaded[i];
            this.state.files[i] = toLoad[i];
        }

        this.initializeCropAreas();
        this.updateImageInfo();
        this.updateImageCounter();
        this.updateBatchInteractionLock();
        this.updatePreview();
    }

    toggleControlsCollapsed() {
        const collapsed = document.body.classList.toggle('controls-collapsed');
        const btn = this.elements.collapseControlsBtn;
        if (btn) {
            const show = collapsed ? 'Show controls' : 'Hide controls';
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            btn.setAttribute('aria-label', show);
            btn.title = show;
        }
        this.updatePreview();
    }

    initializeElements() {
        // Upload
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.chooseBtn = document.getElementById('choose-btn');
        this.elements.uploadArea = document.getElementById('upload-area');
        this.elements.uploadHint = document.getElementById('upload-hint');
        this.elements.batchHint = document.getElementById('batch-hint');
        this.elements.batchMode = document.getElementById('batch-mode');
        this.elements.imageInfo = document.getElementById('image-info');
        this.elements.imageCounter = document.getElementById('image-counter');
        this.elements.cellFillControls = document.getElementById('cell-fill-controls');
        this.elements.swapStatus = document.getElementById('swap-status');
        this.elements.swapModeBtn = document.getElementById('swap-mode-btn');

        this._touchTracking = null;

        // Output size
        this.elements.presetButtons = document.querySelectorAll('.btn-preset');
        this.elements.outputWidth = document.getElementById('output-width');
        this.elements.outputHeight = document.getElementById('output-height');
        this.elements.outputScale = document.getElementById('output-scale');
        this.elements.applyDimensions = document.getElementById('apply-dimensions');

        // Margins
        this.elements.marginSize = document.getElementById('margin-size');
        this.elements.marginColor = document.getElementById('margin-color');

        // Export
        this.elements.exportFormat = document.getElementById('export-format');
        this.elements.exportQuality = document.getElementById('export-quality');
        this.elements.qualityLabel = document.getElementById('quality-label');
        this.elements.qualityValue = document.getElementById('quality-value');
        this.elements.downloadBtn = document.getElementById('download-btn');

        // Preview
        this.elements.previewCanvas = document.getElementById('preview-canvas');
        this.elements.previewPlaceholder = document.getElementById('preview-placeholder');
        this.elements.previewInfo = document.getElementById('preview-info');
        this.elements.previewContainer = document.getElementById('preview-container');
        this.elements.gridSelector = document.getElementById('grid-selector');
        this.elements.collapseControlsBtn = document.getElementById('collapse-controls-btn');
    }

    setupEventListeners() {
        // File upload
        this.elements.chooseBtn.addEventListener('click', () => {
            if (this.state.batchMode && !this.ensureBatchSettingsConfirmed()) return;
            this.elements.fileInput.click();
        });
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files));
        
        // Drag and drop
        this.elements.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.add('drag-over');
        });
        this.elements.uploadArea.addEventListener('dragleave', () => {
            this.elements.uploadArea.classList.remove('drag-over');
        });
        this.elements.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadArea.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });

        // Output size
        this.elements.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handlePresetSelection(btn.dataset.preset));
        });
        this.elements.applyDimensions.addEventListener('click', () => this.handleCustomDimensions());

        // Margins
        this.elements.marginSize.addEventListener('input', () => this.handleMarginChange());
        this.elements.marginColor.addEventListener('input', () => this.handleMarginChange());

        // Export
        this.elements.exportFormat.addEventListener('change', (e) => {
            this.state.currentFormat = e.target.value;
            this.invalidateBatchConfirm();
            this.updateQualityVisibility();
        });
        this.elements.exportQuality.addEventListener('input', (e) => {
            this.state.quality = parseInt(e.target.value);
            this.elements.qualityValue.textContent = this.state.quality;
            this.invalidateBatchConfirm();
        });

        this.elements.batchMode.addEventListener('change', (e) => this.handleBatchModeChange(e));
        this.elements.downloadBtn.addEventListener('click', () => this.handleDownload());

        // Debounce for input changes
        let debounceTimer;
        const debouncedUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.updatePreview(), 100);
        };

        this.elements.marginSize.addEventListener('input', debouncedUpdate);
        this.elements.marginColor.addEventListener('input', debouncedUpdate);
        this.elements.outputScale.addEventListener('input', () => {
            this.handleScaleChange();
            this.invalidateBatchConfirm();
            debouncedUpdate();
        });

        // Crop area dragging (collage mode)
        this.elements.previewCanvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.elements.previewCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.elements.previewCanvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        this.elements.previewCanvas.addEventListener('mouseleave', () => this.handleCanvasMouseUp());

        this.elements.previewCanvas.addEventListener('touchstart', (e) => this.handleCanvasTouchStart(e), { passive: false });
        this.elements.previewCanvas.addEventListener('touchmove', (e) => this.handleCanvasTouchMove(e), { passive: false });
        this.elements.previewCanvas.addEventListener('touchend', (e) => this.handleCanvasTouchEnd(e));
        this.elements.previewCanvas.addEventListener('touchcancel', () => {
            this._touchTracking = null;
            if (this.state.isDragging) this.handleCanvasMouseUp();
        });

        this.elements.previewCanvas.style.cursor = 'grab';

        this.elements.swapModeBtn.addEventListener('click', () => this.handleSwapModeToggle());

        if (this.elements.collapseControlsBtn) {
            this.elements.collapseControlsBtn.addEventListener('click', () => this.toggleControlsCollapsed());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.exitSwapMode();
        });
    }

    initializeGridSelector() {
        const grids = [
            { rows: 1, cols: 1 },
            { rows: 1, cols: 2 },
            { rows: 1, cols: 3 },
            { rows: 2, cols: 1 },
            { rows: 2, cols: 2 },
            { rows: 2, cols: 3 },
            { rows: 3, cols: 1 },
            { rows: 3, cols: 2 },
            { rows: 3, cols: 3 }
        ];

        grids.forEach(({ rows, cols }) => {
            const button = document.createElement('button');
            button.className = 'grid-button';
            button.dataset.rows = rows;
            button.dataset.cols = cols;
            button.title = `${rows}×${cols}`;

            // Create visual grid preview
            const preview = document.createElement('div');
            preview.className = 'grid-preview';
            preview.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            preview.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

            for (let i = 0; i < rows * cols; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell-preview';
                preview.appendChild(cell);
            }

            button.appendChild(preview);
            button.addEventListener('click', () => this.handleGridSelection(rows, cols));
            this.elements.gridSelector.appendChild(button);
        });

        // Set default to 1x1
        this.handleGridSelection(1, 1);
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        try {
            if (this.state.batchMode) {
                if (!this.ensureBatchSettingsConfirmed()) return;
                await this.handleBatchFileUpload(files);
                return;
            }

            this.state.batchAllImages = null;
            this.state.batchFiles = null;
            this.updateBatchInteractionLock();

            const maxImages = this.state.gridRows * this.state.gridCols;
            const filesArray = Array.from(files).slice(0, maxImages);

            if (files.length > maxImages) {
                alert(`Only the first ${maxImages} images will be used for the ${this.state.gridRows}×${this.state.gridCols} grid.`);
            }

            const loaded = await loadMultipleImages(filesArray);
            const imagesByCell = [];
            for (let i = 0; i < loaded.length; i++) {
                imagesByCell[i] = loaded[i];
            }
            const filesByCell = [];
            for (let i = 0; i < filesArray.length; i++) {
                filesByCell[i] = filesArray[i];
            }
            this.state.files = filesByCell;
            this.state.inputImages = imagesByCell;
            this.initializeCropAreas();
            this.updateImageInfo();
            this.updateImageCounter();

            this.updatePreview();
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Failed to load image. Please try again.');
        }
    }

    handlePresetSelection(preset) {
        const presets = {
            portrait: { width: 1080, height: 1920 },
            landscape: { width: 1920, height: 1080 },
            square: { width: 1080, height: 1080 },
            instagram: { width: 1080, height: 1350 }
        };

        const selected = presets[preset];
        if (selected) {
            this.state.outputWidth = selected.width;
            this.state.outputHeight = selected.height;
            this.elements.outputWidth.value = selected.width;
            this.elements.outputHeight.value = selected.height;

            // Update active button
            this.elements.presetButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.preset === preset);
            });

            this.updatePreview();
            this.invalidateBatchConfirm();
        }
    }

    handleCustomDimensions() {
        const width = parseInt(this.elements.outputWidth.value);
        const height = parseInt(this.elements.outputHeight.value);

        if (width > 0 && height > 0 && width <= 10000 && height <= 10000) {
            this.state.outputWidth = width;
            this.state.outputHeight = height;
            
            // Remove active state from preset buttons
            this.elements.presetButtons.forEach(btn => btn.classList.remove('active'));
            
            this.updatePreview();
            this.invalidateBatchConfirm();
        } else {
            alert('Please enter valid dimensions (1-10000).');
        }
    }

    handleScaleChange() {
        const scale = parseInt(this.elements.outputScale.value, 10) || 1;
        if (scale >= 1 && scale <= 8) {
            this.state.scale = scale;
        }
    }

    handleMarginChange() {
        this.state.marginSize = parseInt(this.elements.marginSize.value) || 0;
        this.state.marginColor = this.elements.marginColor.value;
        this.invalidateBatchConfirm();
        this.updatePreview();
    }

    handleGridSelection(rows, cols) {
        this.exitSwapMode();
        this.invalidateBatchConfirm();
        if (this.state.batchAllImages) {
            this.clearBatchWork();
        }

        this.state.gridRows = rows;
        this.state.gridCols = cols;

        // Update active grid button
        document.querySelectorAll('.grid-button').forEach(btn => {
            btn.classList.toggle('active', 
                parseInt(btn.dataset.rows) === rows && 
                parseInt(btn.dataset.cols) === cols
            );
        });

        // Trim images if needed
        const maxImages = rows * cols;
        if (this.state.inputImages.length > maxImages) {
            const nextImages = [];
            const nextFiles = [];
            for (let i = 0; i < maxImages; i++) {
                nextImages[i] = this.state.inputImages[i];
                nextFiles[i] = this.state.files[i];
            }
            this.state.inputImages = nextImages;
            this.state.files = nextFiles;
        }

        this.resizeCellParallelArrays();
        this.initializeCropAreas();
        this.renderCellFillControls();

        this.updateImageCounter();
        this.updatePreview();
    }

    resizeCellParallelArrays() {
        const cellCount = this.state.gridRows * this.state.gridCols;
        while (this.state.cellFillModes.length < cellCount) {
            this.state.cellFillModes.push('fit');
        }
        if (this.state.cellFillModes.length > cellCount) {
            this.state.cellFillModes = this.state.cellFillModes.slice(0, cellCount);
        }
    }

    initializeCropAreas() {
        const cellCount = this.state.gridRows * this.state.gridCols;
        this.state.cropAreas = new Array(cellCount).fill(null);
    }

    renderCellFillControls() {
        const container = this.elements.cellFillControls;
        container.replaceChildren();
        const cellCount = this.state.gridRows * this.state.gridCols;
        const fillButtons = [
            { value: 'fit', letter: 'F', title: 'Fit (preserve aspect)' },
            { value: 'horizontal', letter: 'H', title: 'Fill horizontal (crop vertical)' },
            { value: 'vertical', letter: 'V', title: 'Fill vertical (crop horizontal)' }
        ];

        for (let i = 0; i < cellCount; i++) {
            const row = document.createElement('div');
            row.className = 'cell-fill-row';

            const rowIdx = Math.floor(i / this.state.gridCols) + 1;
            const colIdx = (i % this.state.gridCols) + 1;
            const lab = document.createElement('span');
            lab.className = 'cell-fill-label';
            lab.textContent = `R${rowIdx}C${colIdx}`;

            const btnGroup = document.createElement('div');
            btnGroup.className = 'cell-fill-btns';

            const idx = i;
            const current = this.state.cellFillModes[i] || 'fit';

            fillButtons.forEach(({ value, letter, title }) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'cell-fill-btn';
                btn.textContent = letter;
                btn.title = title;
                btn.dataset.fill = value;
                if (current === value) btn.classList.add('active');

                btn.addEventListener('click', () => {
                    if (this.state.cellFillModes[idx] === value) return;
                    this.state.cellFillModes[idx] = value;
                    this.state.cropAreas[idx] = null;
                    btnGroup.querySelectorAll('.cell-fill-btn').forEach((b) => {
                        b.classList.toggle('active', b.dataset.fill === value);
                    });
                    this.invalidateBatchConfirm();
                    this.updatePreview();
                });

                btnGroup.appendChild(btn);
            });

            row.appendChild(lab);
            row.appendChild(btnGroup);
            container.appendChild(row);
        }
    }

    countLoadedImages() {
        const cellCount = this.state.gridRows * this.state.gridCols;
        let n = 0;
        for (let i = 0; i < cellCount; i++) {
            if (this.state.inputImages[i]) n++;
        }
        return n;
    }

    updateImageInfo() {
        if (this.state.batchMode && this.state.batchAllImages && this.state.batchAllImages.length > 0) {
            const cells = this.state.gridRows * this.state.gridCols;
            const total = this.state.batchAllImages.length;
            const n = total / cells;
            this.elements.imageInfo.textContent =
                `Batch: ${n} output file(s) from ${total} images (${cells} per file). Preview shows the first collage only.`;
            return;
        }
        if (this.countLoadedImages() === 0) {
            this.elements.imageInfo.textContent = '';
            return;
        }
        if (this.state.gridRows === 1 && this.state.gridCols === 1 && this.state.inputImages[0]) {
            const img = this.state.inputImages[0];
            this.elements.imageInfo.textContent =
                `Image: ${this.state.files[0]?.name || 'Unknown'}\n` +
                `Dimensions: ${img.width} × ${img.height}px`;
        } else {
            this.elements.imageInfo.textContent =
                `${this.countLoadedImages()} image(s) loaded`;
        }
    }

    updateImageCounter() {
        const maxImages = this.state.gridRows * this.state.gridCols;
        if (this.state.batchMode && this.state.batchAllImages && this.state.batchAllImages.length > 0) {
            const total = this.state.batchAllImages.length;
            const files = total / maxImages;
            this.elements.imageCounter.textContent =
                `Batch: ${total} images → ${files} file(s) (${maxImages} per file)`;
            return;
        }
        const currentImages = this.countLoadedImages();
        this.elements.imageCounter.textContent =
            `${currentImages} of ${maxImages} images selected`;
    }

    updatePreview() {
        if (this.countLoadedImages() === 0) {
            this.showPlaceholder();
            return;
        }

        const s = this.state.scale;
        const canvas = processCollage(
            this.state.inputImages,
            this.state.gridRows,
            this.state.gridCols,
            this.state.outputWidth * s,
            this.state.outputHeight * s,
            normalizeMarginSize(this.state.marginSize * s),
            this.state.marginColor,
            this.state.cellFillModes,
            this.state.cropAreas
        );

        this.displayCanvas(canvas);
    }

    displayCanvas(canvas) {
        this.state.canvas = canvas;
        this.elements.previewCanvas.width = canvas.width;
        this.elements.previewCanvas.height = canvas.height;
        
        const ctx = this.elements.previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(canvas, 0, 0);

        this.elements.previewCanvas.classList.add('visible');
        this.elements.previewPlaceholder.classList.add('hidden');

        // Update preview info and store scale
        const scale = Math.min(
            (this.elements.previewCanvas.parentElement.clientWidth - 40) / canvas.width,
            (this.elements.previewCanvas.parentElement.clientHeight - 40) / canvas.height
        );
        this.state.previewScale = scale;
        this.elements.previewInfo.textContent = 
            `Output: ${canvas.width} × ${canvas.height}px ` +
            `(Preview scale: ${(scale * 100).toFixed(0)}%)`;
    }

    showPlaceholder() {
        this.elements.previewCanvas.classList.remove('visible');
        this.elements.previewPlaceholder.classList.remove('hidden');
        this.elements.previewInfo.textContent = '';
        this.state.canvas = null;
    }

    updateQualityVisibility() {
        const showQuality = this.state.currentFormat !== 'png';
        this.elements.qualityLabel.style.display = showQuality ? 'flex' : 'none';
    }

    async handleDownload() {
        if (this.state.batchMode && this.state.batchAllImages && this.state.batchAllImages.length > 0) {
            await this.handleBatchDownload();
            return;
        }

        if (!this.state.canvas) {
            alert('Please upload and process an image first.');
            return;
        }

        try {
            const blob = await exportImage(
                this.state.canvas,
                this.state.currentFormat,
                this.state.quality / 100
            );

            const multiCell = this.state.gridRows * this.state.gridCols > 1;
            const filename = generateFilename(this.state.currentFormat, multiCell);
            downloadImage(blob, filename);
        } catch (error) {
            console.error('Error exporting image:', error);
            alert('Failed to export image. Please try again.');
        }
    }

    async handleBatchDownload() {
        const cells = this.state.gridRows * this.state.gridCols;
        const all = this.state.batchAllImages;
        if (!all || all.length === 0) return;
        if (all.length % cells !== 0) {
            alert('Batch data is incomplete. Please choose images again.');
            return;
        }

        const nBatches = all.length / cells;
        const fmt = this.state.currentFormat;
        const q = this.state.quality / 100;
        const multiCell = cells > 1;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

        try {
            const s = this.state.scale;
            for (let b = 0; b < nBatches; b++) {
                const chunk = [];
                for (let i = 0; i < cells; i++) {
                    chunk[i] = all[b * cells + i];
                }
                const canvas = processCollage(
                    chunk,
                    this.state.gridRows,
                    this.state.gridCols,
                    this.state.outputWidth * s,
                    this.state.outputHeight * s,
                    normalizeMarginSize(this.state.marginSize * s),
                    this.state.marginColor,
                    this.state.cellFillModes,
                    null
                );
                const blob = await exportImage(canvas, fmt, q);
                const filename = generateBatchFilename(fmt, multiCell, b + 1, nBatches, ts);
                downloadImage(blob, filename);
                await new Promise((r) => setTimeout(r, 250));
            }
        } catch (error) {
            console.error('Error in batch export:', error);
            alert('Batch export failed. Please try again.');
        }
    }

    isBatchPreviewLocked() {
        return Boolean(
            this.state.batchMode &&
                this.state.batchAllImages &&
                this.state.batchAllImages.length > 0
        );
    }

    clearSwapAnchor() {
        this.state.swapAnchorIndex = null;
        this.updateSwapStatus();
    }

    exitSwapMode() {
        this.state.swapModeActive = false;
        this.state.swapAnchorIndex = null;
        this.updateSwapModeButton();
        this.updateSwapStatus();
    }

    updateSwapModeButton() {
        const btn = this.elements.swapModeBtn;
        btn.classList.toggle('active', this.state.swapModeActive);
        btn.setAttribute('aria-pressed', this.state.swapModeActive ? 'true' : 'false');
        btn.textContent = this.state.swapModeActive ? 'Done swapping' : 'Swap photos (for touch)';
    }

    handleSwapModeToggle() {
        if (this.state.swapModeActive) {
            this.exitSwapMode();
        } else {
            this.state.swapModeActive = true;
            this.state.swapAnchorIndex = null;
            this.updateSwapModeButton();
            this.updateSwapStatus();
        }
    }

    trySwapSelect(cellIndex) {
        if (this.state.swapAnchorIndex === null) {
            this.state.swapAnchorIndex = cellIndex;
            this.updateSwapStatus();
        } else {
            this.swapCells(this.state.swapAnchorIndex, cellIndex);
        }
    }

    updateSwapStatus() {
        const el = this.elements.swapStatus;
        if (this.state.swapAnchorIndex !== null) {
            el.hidden = false;
            const i = this.state.swapAnchorIndex;
            const rowIdx = Math.floor(i / this.state.gridCols) + 1;
            const colIdx = (i % this.state.gridCols) + 1;
            const tap = this.state.swapModeActive;
            el.textContent = tap
                ? `Swap: R${rowIdx}C${colIdx} selected — tap another cell`
                : `Swap: R${rowIdx}C${colIdx} selected — Alt+click another cell (Esc to cancel)`;
            return;
        }
        if (this.state.swapModeActive) {
            el.hidden = false;
            el.textContent = 'Swap mode: tap first cell on the preview, then the second';
            return;
        }
        el.hidden = true;
        el.textContent = '';
    }

    swapCells(i, j) {
        if (i === j) {
            this.clearSwapAnchor();
            return;
        }
        const swap = (arr) => {
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
        };
        swap(this.state.inputImages);
        swap(this.state.files);
        swap(this.state.cropAreas);
        swap(this.state.cellFillModes);
        this.renderCellFillControls();
        this.clearSwapAnchor();
        this.updateImageInfo();
        this.updateImageCounter();
        this.updatePreview();
    }

    getCanvasLogicalCoords(clientX, clientY) {
        const rect = this.elements.previewCanvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / this.state.previewScale,
            y: (clientY - rect.top) / this.state.previewScale
        };
    }

    // Mouse event handlers for crop area dragging
    handleCanvasMouseDown(e) {
        if (this.countLoadedImages() === 0) return;
        if (this.isBatchPreviewLocked()) return;

        const { x, y } = this.getCanvasLogicalCoords(e.clientX, e.clientY);

        const cellIndex = this.getCellAtPosition(x, y);
        if (cellIndex === null) return;

        if (e.altKey || this.state.swapModeActive) {
            e.preventDefault();
            this.trySwapSelect(cellIndex);
            return;
        }

        if (this.state.inputImages[cellIndex]) {
            this.state.isDragging = true;
            this.state.dragCellIndex = cellIndex;
            this.state.dragStartX = x;
            this.state.dragStartY = y;
            this.elements.previewCanvas.style.cursor = 'grabbing';
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.state.isDragging || this.state.dragCellIndex === null) {
            if (this.countLoadedImages() > 0) {
                const { x, y } = this.getCanvasLogicalCoords(e.clientX, e.clientY);
                const cellIndex = this.getCellAtPosition(x, y);
                this.elements.previewCanvas.style.cursor =
                    (cellIndex !== null && this.state.inputImages[cellIndex]) ? 'grab' : 'default';
            }
            return;
        }

        const { x, y } = this.getCanvasLogicalCoords(e.clientX, e.clientY);

        const dx = x - this.state.dragStartX;
        const dy = y - this.state.dragStartY;

        this.updateCropAreaPosition(this.state.dragCellIndex, dx, dy);

        this.state.dragStartX = x;
        this.state.dragStartY = y;
        this.updatePreview();
    }

    handleCanvasMouseUp() {
        if (this.state.isDragging) {
            this.state.isDragging = false;
            this.state.dragCellIndex = null;
            this.elements.previewCanvas.style.cursor = 'grab';
        }
    }

    handleCanvasTouchStart(e) {
        if (this.countLoadedImages() === 0) return;
        if (this.isBatchPreviewLocked()) return;
        if (e.touches.length !== 1) return;

        const t = e.touches[0];
        const { x, y } = this.getCanvasLogicalCoords(t.clientX, t.clientY);
        const cellIndex = this.getCellAtPosition(x, y);

        this._touchTracking = {
            startLX: x,
            startLY: y,
            startTime: Date.now(),
            startCellIndex: cellIndex,
            moved: false
        };
        e.preventDefault();
    }

    handleCanvasTouchMove(e) {
        if (!this._touchTracking || e.touches.length !== 1) return;

        const t = e.touches[0];
        const { x, y } = this.getCanvasLogicalCoords(t.clientX, t.clientY);
        const dx = x - this._touchTracking.startLX;
        const dy = y - this._touchTracking.startLY;
        if (dx * dx + dy * dy > 64) {
            this._touchTracking.moved = true;
        }

        if (this.state.swapModeActive) {
            e.preventDefault();
            return;
        }

        const startCell = this._touchTracking.startCellIndex;
        if (
            this._touchTracking.moved &&
            startCell !== null &&
            this.state.inputImages[startCell]
        ) {
            if (!this.state.isDragging) {
                this.state.isDragging = true;
                this.state.dragCellIndex = startCell;
                this.state.dragStartX = this._touchTracking.startLX;
                this.state.dragStartY = this._touchTracking.startLY;
            }
            const stepX = x - this.state.dragStartX;
            const stepY = y - this.state.dragStartY;
            this.updateCropAreaPosition(this.state.dragCellIndex, stepX, stepY);
            this.state.dragStartX = x;
            this.state.dragStartY = y;
            this.updatePreview();
        }
        e.preventDefault();
    }

    handleCanvasTouchEnd(e) {
        const tr = this._touchTracking;
        this._touchTracking = null;

        if (this.state.swapModeActive && tr && !tr.moved && tr.startCellIndex !== null) {
            this.trySwapSelect(tr.startCellIndex);
        } else if (this.state.isDragging) {
            this.handleCanvasMouseUp();
        }
    }

    getGridLayoutState() {
        const s = this.state.scale;
        return getGridLayout(
            this.state.outputWidth * s,
            this.state.outputHeight * s,
            this.state.gridRows,
            this.state.gridCols,
            normalizeMarginSize(this.state.marginSize * s)
        );
    }

    getCellPixelSize(cellIndex) {
        const layout = this.getGridLayoutState();
        const col = cellIndex % this.state.gridCols;
        const row = Math.floor(cellIndex / this.state.gridCols);
        return {
            cellWidth: layout.cellWidths[col],
            cellHeight: layout.cellHeights[row]
        };
    }

    getCellAtPosition(x, y) {
        const layout = this.getGridLayoutState();
        for (let row = 0; row < this.state.gridRows; row++) {
            for (let col = 0; col < this.state.gridCols; col++) {
                const cx = layout.cellXs[col];
                const cy = layout.cellYs[row];
                const cw = layout.cellWidths[col];
                const ch = layout.cellHeights[row];
                if (x >= cx && x < cx + cw && y >= cy && y < cy + ch) {
                    return row * this.state.gridCols + col;
                }
            }
        }
        return null;
    }

    updateCropAreaPosition(cellIndex, dx, dy) {
        const fillMode = this.state.cellFillModes[cellIndex] || 'fit';

        if (!this.state.cropAreas[cellIndex]) {
            // Initialize crop area if it doesn't exist
            const image = this.state.inputImages[cellIndex];
            if (!image) return;

            const { cellWidth, cellHeight } = this.getCellPixelSize(cellIndex);
            
            // Calculate initial crop area in image coordinates based on fill mode
            let cropWidth, cropHeight;
            if (fillMode === 'fit') {
                // For fit mode, use the full image or scaled version
                const scaleX = cellWidth / image.width;
                const scaleY = cellHeight / image.height;
                const scale = Math.min(scaleX, scaleY);
                // Crop area is the portion that will be visible in the cell
                cropWidth = cellWidth / scale;
                cropHeight = cellHeight / scale;
                // Clamp to image size
                cropWidth = Math.min(cropWidth, image.width);
                cropHeight = Math.min(cropHeight, image.height);
            } else if (fillMode === 'vertical') {
                // Fill vertical: crop width to fit cell width
                const scale = cellHeight / image.height;
                cropHeight = image.height;
                cropWidth = cellWidth / scale;
                cropWidth = Math.min(cropWidth, image.width);
            } else { // horizontal
                // Fill horizontal: crop height to fit cell height
                const scale = cellWidth / image.width;
                cropWidth = image.width;
                cropHeight = cellHeight / scale;
                cropHeight = Math.min(cropHeight, image.height);
            }

            this.state.cropAreas[cellIndex] = {
                x: (image.width - cropWidth) / 2,
                y: (image.height - cropHeight) / 2,
                width: cropWidth,
                height: cropHeight
            };
        }

        const crop = this.state.cropAreas[cellIndex];
        const image = this.state.inputImages[cellIndex];
        
        // Calculate scale factor from canvas to image coordinates
        // This is the scale used to display the image in the cell
        const { cellWidth, cellHeight } = this.getCellPixelSize(cellIndex);
        let imageScale;
        if (fillMode === 'fit') {
            const scaleX = cellWidth / image.width;
            const scaleY = cellHeight / image.height;
            imageScale = Math.min(scaleX, scaleY);
        } else if (fillMode === 'vertical') {
            imageScale = cellHeight / image.height;
        } else {
            imageScale = cellWidth / image.width;
        }

        // When using custom crop, the scale is based on the crop area size
        if (crop) {
            const cropScaleX = cellWidth / crop.width;
            const cropScaleY = cellHeight / crop.height;
            imageScale = Math.min(cropScaleX, cropScaleY);
        }

        // Convert canvas movement to image movement
        const imageDx = dx / imageScale;
        const imageDy = dy / imageScale;

        // Update crop position, clamping to image bounds
        const newX = Math.max(0, Math.min(image.width - crop.width, crop.x - imageDx));
        const newY = Math.max(0, Math.min(image.height - crop.height, crop.y - imageDy));

        this.state.cropAreas[cellIndex].x = newX;
        this.state.cropAreas[cellIndex].y = newY;
    }
}

