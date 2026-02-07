/**
 * UI Controller Module
 * Handles all UI interactions and updates
 */

import { loadImage, loadMultipleImages, processImage, processCollage } from './imageProcessor.js';
import { exportImage, downloadImage, generateFilename } from './exportHandler.js';

export class UIController {
    constructor() {
        this.state = {
            mode: 'single',
            inputImage: null,
            inputImages: [],
            gridRows: 1,
            gridCols: 1,
            fillMode: 'fit',
            outputWidth: 1920,
            outputHeight: 1080,
            scale: 2,
            marginSize: 10,
            marginColor: '#FFFFFF',
            currentFormat: 'jpeg',
            quality: 95,
            canvas: null,
            files: [],
            cropAreas: [], // Array of {x, y, width, height} for each cell, null if no custom crop
            isDragging: false,
            dragCellIndex: null,
            dragStartX: 0,
            dragStartY: 0,
            previewScale: 1
        };

        this.elements = {};
        this.initializeElements();
        this.setupEventListeners();
        this.initializeGridSelector();
        this.state.scale = parseInt(this.elements.outputScale?.value, 10) || 2;
        this.updateQualityVisibility();
    }

    initializeElements() {
        // Mode toggle
        this.elements.modeInputs = document.querySelectorAll('input[name="mode"]');
        
        // Upload
        this.elements.fileInput = document.getElementById('file-input');
        this.elements.chooseBtn = document.getElementById('choose-btn');
        this.elements.uploadArea = document.getElementById('upload-area');
        this.elements.imageInfo = document.getElementById('image-info');
        this.elements.uploadSection = document.getElementById('upload-section');
        this.elements.collageSection = document.getElementById('collage-section');
        this.elements.imageCounter = document.getElementById('image-counter');
        this.elements.fillMode = document.getElementById('fill-mode');

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
    }

    setupEventListeners() {
        // Mode toggle
        this.elements.modeInputs.forEach(input => {
            input.addEventListener('change', (e) => this.handleModeToggle(e.target.value));
        });

        // File upload
        this.elements.chooseBtn.addEventListener('click', () => this.elements.fileInput.click());
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

        // Fill mode (collage)
        this.elements.fillMode.addEventListener('change', (e) => {
            this.state.fillMode = e.target.value;
            // Reset crop areas when fill mode changes
            this.initializeCropAreas();
            this.updatePreview();
        });

        // Export
        this.elements.exportFormat.addEventListener('change', (e) => {
            this.state.currentFormat = e.target.value;
            this.updateQualityVisibility();
        });
        this.elements.exportQuality.addEventListener('input', (e) => {
            this.state.quality = parseInt(e.target.value);
            this.elements.qualityValue.textContent = this.state.quality;
        });
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
            debouncedUpdate();
        });

        // Crop area dragging (collage mode)
        this.elements.previewCanvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.elements.previewCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.elements.previewCanvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        this.elements.previewCanvas.addEventListener('mouseleave', () => this.handleCanvasMouseUp());
        this.elements.previewCanvas.style.cursor = 'grab';
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

    handleModeToggle(mode) {
        this.state.mode = mode;
        
        if (mode === 'collage') {
            this.elements.collageSection.style.display = 'block';
            this.elements.fileInput.setAttribute('multiple', '');
        } else {
            this.elements.collageSection.style.display = 'none';
            this.elements.fileInput.removeAttribute('multiple');
            this.state.inputImages = [];
            this.state.inputImage = this.state.inputImages[0] || null;
        }
        
        this.updateImageCounter();
        this.updatePreview();
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        try {
            if (this.state.mode === 'collage') {
                const maxImages = this.state.gridRows * this.state.gridCols;
                const filesArray = Array.from(files).slice(0, maxImages);
                
                if (files.length > maxImages) {
                    alert(`Only the first ${maxImages} images will be used for the ${this.state.gridRows}×${this.state.gridCols} grid.`);
                }

                this.state.files = filesArray;
                this.state.inputImages = await loadMultipleImages(filesArray);
                // Initialize crop areas for new images
                this.initializeCropAreas();
                this.updateImageInfo();
                this.updateImageCounter();
            } else {
                const file = files[0];
                this.state.files = [file];
                this.state.inputImage = await loadImage(file);
                this.updateImageInfo();
            }

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
        this.updatePreview();
    }

    handleGridSelection(rows, cols) {
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
            this.state.inputImages = this.state.inputImages.slice(0, maxImages);
            this.state.files = this.state.files.slice(0, maxImages);
            this.state.cropAreas = this.state.cropAreas.slice(0, maxImages);
        }

        // Initialize crop areas array
        this.initializeCropAreas();

        this.updateImageCounter();
        this.updatePreview();
    }

    initializeCropAreas() {
        const cellCount = this.state.gridRows * this.state.gridCols;
        this.state.cropAreas = new Array(cellCount).fill(null);
    }

    updateImageInfo() {
        if (this.state.mode === 'single' && this.state.inputImage) {
            this.elements.imageInfo.textContent = 
                `Image: ${this.state.files[0]?.name || 'Unknown'}\n` +
                `Dimensions: ${this.state.inputImage.width} × ${this.state.inputImage.height}px`;
        } else if (this.state.mode === 'collage') {
            this.elements.imageInfo.textContent = 
                `${this.state.inputImages.length} image(s) loaded`;
        } else {
            this.elements.imageInfo.textContent = '';
        }
    }

    updateImageCounter() {
        if (this.state.mode === 'collage') {
            const maxImages = this.state.gridRows * this.state.gridCols;
            const currentImages = this.state.inputImages.length;
            this.elements.imageCounter.textContent = 
                `${currentImages} of ${maxImages} images selected`;
        } else {
            this.elements.imageCounter.textContent = '';
        }
    }

    updatePreview() {
        if (this.state.mode === 'collage') {
            if (this.state.inputImages.length === 0) {
                this.showPlaceholder();
                return;
            }

            const scale = this.state.scale;
            const canvas = processCollage(
                this.state.inputImages,
                this.state.gridRows,
                this.state.gridCols,
                this.state.outputWidth * scale,
                this.state.outputHeight * scale,
                this.state.marginSize * scale,
                this.state.marginColor,
                this.state.fillMode,
                this.state.cropAreas
            );

            this.displayCanvas(canvas);
        } else {
            if (!this.state.inputImage) {
                this.showPlaceholder();
                return;
            }

            const scale = this.state.scale;
            const canvas = processImage(
                this.state.inputImage,
                this.state.outputWidth * scale,
                this.state.outputHeight * scale,
                this.state.marginSize * scale,
                this.state.marginColor
            );

            this.displayCanvas(canvas);
        }
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

            const filename = generateFilename(this.state.currentFormat, this.state.mode);
            downloadImage(blob, filename);
        } catch (error) {
            console.error('Error exporting image:', error);
            alert('Failed to export image. Please try again.');
        }
    }

    // Mouse event handlers for crop area dragging
    handleCanvasMouseDown(e) {
        if (this.state.mode !== 'collage' || this.state.inputImages.length === 0) return;

        const rect = this.elements.previewCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.state.previewScale;
        const y = (e.clientY - rect.top) / this.state.previewScale;

        // Find which cell was clicked
        const cellIndex = this.getCellAtPosition(x, y);
        if (cellIndex !== null && this.state.inputImages[cellIndex]) {
            this.state.isDragging = true;
            this.state.dragCellIndex = cellIndex;
            this.state.dragStartX = x;
            this.state.dragStartY = y;
            this.elements.previewCanvas.style.cursor = 'grabbing';
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.state.isDragging || this.state.dragCellIndex === null) {
            // Update cursor
            if (this.state.mode === 'collage' && this.state.inputImages.length > 0) {
                const rect = this.elements.previewCanvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) / this.state.previewScale;
                const y = (e.clientY - rect.top) / this.state.previewScale;
                const cellIndex = this.getCellAtPosition(x, y);
                this.elements.previewCanvas.style.cursor = 
                    (cellIndex !== null && this.state.inputImages[cellIndex]) ? 'grab' : 'default';
            }
            return;
        }

        const rect = this.elements.previewCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.state.previewScale;
        const y = (e.clientY - rect.top) / this.state.previewScale;

        const dx = x - this.state.dragStartX;
        const dy = y - this.state.dragStartY;

        // Update crop area position
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

    getCellAtPosition(x, y) {
        const { cellWidth, cellHeight } = this.calculateCellDimensions();
        const edge = this.state.marginSize * this.state.scale;
        const cellCol = Math.floor((x - edge) / (cellWidth + edge));
        const cellRow = Math.floor((y - edge) / (cellHeight + edge));

        if (cellRow >= 0 && cellRow < this.state.gridRows && 
            cellCol >= 0 && cellCol < this.state.gridCols) {
            return cellRow * this.state.gridCols + cellCol;
        }
        return null;
    }

    calculateCellDimensions() {
        const scale = this.state.scale;
        const w = this.state.outputWidth * scale;
        const h = this.state.outputHeight * scale;
        const edge = this.state.marginSize * scale;
        const totalMarginWidth = edge * (this.state.gridCols + 1);
        const totalMarginHeight = edge * (this.state.gridRows + 1);
        const cellWidth = (w - totalMarginWidth) / this.state.gridCols;
        const cellHeight = (h - totalMarginHeight) / this.state.gridRows;
        return { cellWidth, cellHeight };
    }

    updateCropAreaPosition(cellIndex, dx, dy) {
        if (!this.state.cropAreas[cellIndex]) {
            // Initialize crop area if it doesn't exist
            const image = this.state.inputImages[cellIndex];
            if (!image) return;

            const { cellWidth, cellHeight } = this.calculateCellDimensions();
            
            // Calculate initial crop area in image coordinates based on fill mode
            let cropWidth, cropHeight;
            if (this.state.fillMode === 'fit') {
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
            } else if (this.state.fillMode === 'vertical') {
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
        const { cellWidth, cellHeight } = this.calculateCellDimensions();
        let imageScale;
        if (this.state.fillMode === 'fit') {
            const scaleX = cellWidth / image.width;
            const scaleY = cellHeight / image.height;
            imageScale = Math.min(scaleX, scaleY);
        } else if (this.state.fillMode === 'vertical') {
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

