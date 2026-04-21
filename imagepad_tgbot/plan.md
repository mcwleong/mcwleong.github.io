# Image Padding Web Application - Design Document

## 1. Overview

A client-side web application that allows users to pad images to specific output dimensions and aspect ratios, and create photo collages with customizable grid layouts. The application processes images entirely in the browser without uploading to any server, ensuring privacy and fast performance.

**Unified grid model:** There is no separate “single image” mode. All work happens in one **collage** workflow. A **1×1** grid reproduces the former single-image case: one cell covers the drawable area inside the outer margins, with the same padding, scaling, and export behavior users expect for one photo.

**Deployment:** Static files only (e.g. GitHub Pages); no server-side dependencies for the app itself. For local testing, `server.py` serves the folder over HTTP on port 8000 (optional).

## 2. Core Requirements

### 2.1 Functional Requirements
- **Image Upload**: Support drag-and-drop and file picker; multiple files where the grid has multiple cells
- **Output Size Selection**: Predefined aspect ratio presets:
  - Portrait: 1080 × 1920
  - Landscape: 1920 × 1080
  - Square: 1080 × 1080
  - Instagram: 1080 × 1350
- **Custom Dimensions**: Allow manual input for width and height
- **Margin Configuration**:
  - Adjustable margin size (default: 20px)
  - Customizable margin color (color picker)
- **Grid layouts**: Selector with presets: 1×1, 1×2, 1×3, 2×1, 2×2, 2×3, 3×1, 3×2, 3×3
  - **1×1** is the default / primary path for a single padded image (replaces legacy “single mode”)
- **Per-cell fit mode**: Each cell independently uses one of:
  - **Fit** (preserve aspect, no crop)
  - **Fill vertical** (fill cell height, crop width if needed, centered)
  - **Fill horizontal** (fill cell width, crop height if needed, centered)
- **Swap photos**: User exchanges the full assignment of two cells: **image, source file handle, per-cell fit mode, and custom crop rectangle** (if any). **Desktop:** **Alt+click** two cells, or enable **Swap mode** and click twice. **Touch:** enable **Swap photos (for touch)**, then **tap** two cells on the preview. **Esc** exits swap mode and clears selection. Empty slots can participate (move or exchange with an empty cell).
- **Image processing** (per cell): Images are scaled/cropped according to that cell’s fit mode; oversized images are scaled down as required; content is centered in the cell unless user-adjusted crop offsets apply (if the UI supports drag-to-reframe)
- **Preview**: Real-time preview of the output canvas
- **Export**: Download the processed image in the desired format
- **Collage rules**:
  - Support assigning images up to grid cell count (order: left-to-right, top-to-bottom on bulk upload)
  - Margin size represents edge-to-edge distance between cells
  - Images fill cells edge-to-edge (no padding within cells)
  - Empty cells use margin color

### 2.2 Non-Functional Requirements
- **Client-Side Processing**: All image manipulation performed in browser using Canvas API
- **Privacy**: No server uploads, all processing local
- **Performance**: Efficient rendering and processing
- **Browser Compatibility**: Support modern browsers (Chrome, Firefox, Safari, Edge)
- **Responsive Design**: Works on desktop and tablet devices

## 3. User Interface Design

### 3.1 Layout Structure
```
┌─────────────────────────────────────────────┐
│           Header (App Title)                │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Left Menu  │      Preview Area            │
│   (Controls) │      (Canvas/Image)          │
│              │                              │
│              │                              │
│              │                              │
│              │                              │
│              │                              │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### 3.2 Left Menu Components

#### 3.2.1 Image Upload Section
- **File Input**: "Choose Image(s)" button; `multiple` is always enabled
- **Drag & Drop Zone**: Visual indicator for drag-and-drop
- **Image info**: For **1×1** with one image, shows filename and pixel dimensions; for multi-cell grids, shows count of **occupied** cells (not raw array length—slots can be sparse after swaps)
- **Counter**: `X of Y images selected` where Y is `gridRows × gridCols`
- **Per-cell replace / clear** (optional / not in current UI): bulk upload only; swaps used to rearrange

#### 3.2.2 Output Size Section
- **Preset Buttons**:
  - Portrait (1080 × 1920)
  - Landscape (1920 × 1080)
  - Square (1080 × 1080)
  - Instagram (1080 × 1350)
- **Custom Dimensions**:
  - Width input field (number)
  - Height input field (number)
  - "Apply" button

#### 3.2.3 Margin Settings Section
- **Margin Size**:
  - Label: "Margin Size (px)"
  - Number input field (default: 20)
  - Min: 0, Max: 500
- **Margin Color**:
  - Label: "Margin Color"
  - Color picker input
  - Default: #FFFFFF (white)

#### 3.2.4 Grid & Cell Settings
- **Grid Selector**: Visual grid buttons showing layout
  - 1×1, 1×2, 1×3
  - 2×1, 2×2, 2×3
  - 3×1, 3×2, 3×3
  - Visual preview of grid layout (mini grid icons)
  - Selected grid highlighted; **1×1** is the default and replaces legacy “single image” mode
- **Per-cell fit mode** (implemented; no global fill dropdown):
  - Scrollable list in the sidebar: one row per cell **R{row}C{col}** with buttons **[F] [H] [V]** (Fit, Fill horizontal, Fill vertical); active mode is highlighted
  - Changing a cell’s mode resets **only that cell’s** custom crop (drag-reframe) to default framing
  - New cells created by expanding the grid default to **Fit**
- **Swap photos** (implemented):
  - Sidebar toggle **Swap photos (for touch)** sets `swapModeActive`; preview **taps** (no drag) run two-step swap; button shows **Done swapping** when active
  - **Alt+click** (desktop) or **swap mode + click** on first cell, then second
  - Status line switches between tap vs Alt wording; **Esc** calls `exitSwapMode()`
  - Swapping exchanges, at both indices: `inputImages`, `files`, `cropAreas`, `cellFillModes`; sidebar dropdowns are re-rendered to match
- **Crop / reframe** (implemented):
  - **Click-drag** on the preview canvas over a cell that has an image pans the visible region (custom crop in image space), subject to that cell’s fit mode
- **Image assignment**:
  - Bulk upload fills cells **0 … N−1** in row-major order up to the smaller of file count and cell count
  - After swaps, assignments can be **sparse** (e.g. an image only in cell index 2); rendering uses `images[i] || null` per cell

#### 3.2.5 Export Section
- **Format Selection**: Dropdown (PNG, JPEG, WebP)
- **Quality Slider**: For JPEG/WebP (1-100, default: 90)
- **Download Button**: "Download Image"

### 3.3 Preview Area
- **Canvas Element**: Displays the processed output at full output resolution; CSS scales it to fit the preview container
- **Dimensions Display**: Output size and preview scale percentage below the canvas
- **Zoom Controls**: Not implemented (optional)
- **Loading Indicator**: Not implemented (local processing is fast)

## 4. Image Processing Logic

### 4.1 Relationship to 1×1 (Former “Single Image” Mode)

Legacy single-image padding is **not** a separate code path: use a **1×1** grid. The drawable region is one cell bounded by outer margins; the cell’s fit mode (typically **Fit**) controls scaling. The mathematics is the same as one cell in §4.2.

### 4.2 Photo Collage Processing Logic

#### 4.2.1 Collage Algorithm Flow
```
1. Determine grid layout (rows × columns)
2. For each cell index i, read fillMode[i] ∈ { fit, vertical, horizontal }
3. **Integer grid layout** (`getGridLayout`): inner width/height is split across columns/rows with `floor` + distributing remainder pixels to the first columns/rows so cell widths/heights are integers and sum exactly—no fractional gaps (which caused hairline seams at margin 0)
4. For each grid cell (row, col) with index i:
   a. If image exists for this cell:
      - Images fill cells edge-to-edge (no padding within cells)
      - Based on fillMode[i]:
        * "Fit": Scale to fit while preserving aspect ratio (no cropping)
          - scale = min(cellWidth/imageWidth, cellHeight/imageHeight)
          - Center image in cell (subject to user crop offset if any)
        * "Fill Vertical": Fill cell height, crop width if needed
          - scale = cellHeight / imageHeight
          - If scaled width >= cellWidth: crop horizontally (centered, or user offset)
          - If scaled width < cellWidth: fill width, crop height (centered)
        * "Fill Horizontal": Fill cell width, crop height if needed
          - scale = cellWidth / imageWidth
          - If scaled height >= cellHeight: crop vertically (centered)
          - If scaled height < cellHeight: fill height, crop width (centered)
      - Draw image (with cropping if needed)
   b. If no image for cell:
      - Fill cell with margin color
5. Combine all cells into final canvas
```

#### 4.2.2 Cell Positioning and Spacing
- Each cell’s **(x, y, width, height)** comes from `getGridLayout` (integer pixel bounds; **width/height can differ by 1px** between columns/rows when the output size does not divide evenly)
- **Margin size represents the edge-to-edge distance between cells**
- Images fill their cells completely (edge-to-edge) with no inner padding
- **Per-cell fit modes**:
  - **Fit**: Images scaled to fit within cells, preserving aspect ratio (no cropping)
  - **Fill Vertical**: Images fill cell height, horizontal dimension cropped if needed (centered crop unless adjusted)
  - **Fill Horizontal**: Images fill cell width, vertical dimension cropped if needed (centered crop unless adjusted)
- Empty cells are filled with margin color

### 4.3 Edge Cases
- **Oversized Images**: Automatically scaled down per cell per fit mode
- **Undersized Images**: Centered in cell (Fit) or upscaled as required (Fill modes)
- **Square Images**: Handled same as rectangular
- **Very Small Images**: May appear pixelated if upscaled (consider warning)
- **Invalid Dimensions**: Validation and error messages
- **Incomplete Collage**: Empty cells filled with margin color
- **Too Many Images**: Warn user if more images than grid cells
- **Too Few Images**: Allow partial collages with empty cells
- **Grid resize**: When the grid shrinks, **images and files** are trimmed to indices `0 … (rows×cols − 1)` only (row-major slots); extra loaded files are dropped. **Crop areas** are fully reset. **Swap** anchor is cleared.
- **Swap with empty cell**: Implemented as a full exchange: a photo can move into an empty slot and the other slot becomes empty (undefined), including **fit mode** and **crop** for both indices

## 5. Technical Architecture

### 5.1 Technology Stack
- **HTML5**: Structure
- **CSS3**: Styling and layout
- **JavaScript (ES6+)**: Core logic
- **Canvas API**: Image processing and rendering
- **File API**: File reading and download
- **No External Dependencies**: Pure vanilla JavaScript (or minimal framework)

### 5.2 File Structure
```
imagepad_tgbot/
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   ├── main.js
│   ├── imageProcessor.js
│   ├── uiController.js
│   └── exportHandler.js
├── server.py              # optional local static server (port 8000)
├── plan.md
└── README.md
```

### 5.3 Core Modules

#### 5.3.1 imageProcessor.js
- `loadImage(file)`: Load one `HTMLImageElement` (used by `loadMultipleImages`)
- `loadMultipleImages(files)`: `Promise<HTMLImageElement[]>` in file order
- `calculateDimensions(...)`, `processImage(...)`: **Legacy helpers** for single full-canvas “fit in margins” draw; the **app UI does not call `processImage`**—all previews and exports use `processCollage` (1×1 included)
- `getGridLayout(outputWidth, outputHeight, gridRows, gridCols, marginSize)`: Integer **cellXs**, **cellYs**, **cellWidths**, **cellHeights** so cells tile with no fractional gaps (fixes hairlines at margin 0)
- `drawImageInCell(ctx, image, cellX, cellY, cellWidth, cellHeight, fillMode, customCrop, bleedRight?, bleedDown?)`: One cell (background is only the initial full-canvas fill—no per-cell `fillRect`). Optional 1px bleed when `margin === 0` so neighbors overwrite bilinear seams. `customCrop` is `{ x, y, width, height }` in **source image pixels** or `null`
- `processCollage(images, gridRows, gridCols, outputWidth, outputHeight, marginSize, marginColor, fillModes, cropAreas)`:
  - `fillModes`: either a **string** (same mode for every cell) or an **array** of per-cell values `'fit' | 'vertical' | 'horizontal'` indexed by cell
  - `cropAreas`: `Array` length = cell count, entries `null` or crop rect; `null` means use default framing for that cell’s mode

#### 5.3.2 uiController.js
- Constructor wires DOM, `initializeGridSelector()`, default **1×1**
- `handleFileUpload(files)`: Loads into parallel `files[]` / `inputImages[]` from index 0; warns if more files than cells
- `handleGridSelection(rows, cols)`: Active grid button, may **trim** images/files to first N cell indices, resizes `cellFillModes`, **reinitializes** all `cropAreas` to `null`, re-renders per-cell selects, clears swap selection
- `renderCellFillControls()`: Builds per-cell fill **F / H / V** button groups (fit / horizontal / vertical)
- `resizeCellParallelArrays()`: Extends or truncates `cellFillModes` when grid dimensions change (crop array handled separately on full reinit)
- `updatePreview()`: Calls `processCollage` with `state.cellFillModes` and `state.cropAreas`; placeholder if no occupied cells
- `swapCells(i, j)`, `clearSwapAnchor()`, `updateSwapStatus()`: Alt+click swap flow
- Canvas handlers: `handleCanvasMouseDown/Move/MouseUp`, `getCellAtPosition`, `getGridLayoutState`, `getCellPixelSize`, `updateCropAreaPosition` (crop drag)
- `countLoadedImages()`: Counts non-empty slots among `0 … gridRows×gridCols − 1` (correct when arrays are sparse)
- `handleDownload()`: Uses `generateFilename(format, multiCellGrid)` where `multiCellGrid = (rows×cols > 1)`

#### 5.3.3 exportHandler.js
- `exportImage(canvas, format, quality)`: Convert canvas to blob
- `downloadImage(blob, filename)`: Trigger download
- `generateFilename(format, multiCellGrid)`: Prefix `image-` when **1×1**, `collage-` when multi-cell; timestamp + extension

#### 5.3.4 main.js
- Application initialization
- Module coordination
- Global state management

## 6. State Management

### 6.1 Application State (as implemented)
```javascript
{
  inputImages: (HTMLImageElement | undefined)[],  // indexed by cell; may be sparse after swaps
  files: (File | undefined)[],                   // parallel to inputImages for metadata / 1×1 info
  cellFillModes: ('fit' | 'vertical' | 'horizontal')[],  // length = gridRows * gridCols
  cropAreas: ({ x, y, width, height } | null)[], // per-cell custom crop in image coords; null = auto
  gridRows: number,
  gridCols: number,
  outputWidth: number,
  outputHeight: number,
  marginSize: number,
  marginColor: string,
  currentFormat: string,
  quality: number,
  canvas: HTMLCanvasElement | null,
  isDragging: boolean,
  dragCellIndex: number | null,
  dragStartX: number,
  dragStartY: number,
  previewScale: number,       // CSS scale from output pixels to on-screen canvas
  swapAnchorIndex: number | null,
  swapModeActive: boolean  // touch-friendly swap; when true, mouse/tap uses swap instead of crop drag
}
```

### 6.2 State Updates
- Preview refresh on upload, grid change, margin/size change, per-cell fill change, crop drag, swap
- **Grid change**: Crop rectangles for all cells are cleared; `cellFillModes` truncated or padded with `'fit'`
- **Swap**: Exchanges `inputImages`, `files`, `cropAreas`, and `cellFillModes` at two indices; UI dropdowns rebuilt
- **No separate `mode` flag**: Removed legacy `'single' | 'collage'` toggle; behavior is always collage with optional 1×1 grid

## 7. User Experience Flow

1. **Initial State**: Default grid (e.g. **1×1**), empty preview, default settings visible
2. **Select Grid**: User picks layout; single-photo workflows stay on 1×1
3. **Upload Images**: User selects/drops one or more images; cells fill in row-major order up to capacity
4. **Adjust per cell**: User sets Fit / Fill vertical / Fill horizontal in the sidebar row for **R#C#**; drag on the preview to reframe that cell’s crop when applicable
5. **Swap (optional)**: **Alt+click** two cells to exchange their photos, fit modes, and crop data; **Esc** cancels
6. **Output & margins**: User sets presets or custom dimensions, margin size and color
7. **Real-time Preview**: Preview updates automatically
8. **Export**: User selects format and downloads

## 8. Styling Guidelines

### 8.1 Color Scheme
- Primary: Modern, clean palette
- Background: Light gray (#f5f5f5) or dark mode option
- Menu Background: White or dark (#ffffff / #1e1e1e)
- Accent: Blue or brand color for buttons

### 8.2 Typography
- Headers: Sans-serif, bold
- Body: Sans-serif, regular
- Inputs: Monospace for numbers

### 8.3 Spacing
- Menu width: 300-350px
- Preview area: Flexible, minimum 600px width
- Padding: 16-20px between sections
- Button spacing: 8-12px

## 9. Error Handling

### 9.1 Validation
- File type validation (images only)
- Dimension validation (positive numbers, reasonable limits)
- Margin validation (non-negative, reasonable max)

### 9.2 Error Messages
- "Please select a valid image file"
- "Invalid dimensions. Please enter positive numbers."
- "Margin size must be between 0 and 500px"
- "Image processing failed. Please try again."
- "Too many images selected. Maximum is [grid cell count]"
- "Some grid cells are empty. They will be filled with margin color."

## 10. Performance Considerations

### 10.1 Optimization
- Use `requestAnimationFrame` for smooth preview updates
- Debounce input changes to avoid excessive processing
- Limit canvas size for very large outputs (warn user)
- Use Web Workers for heavy processing (optional)

### 10.2 Memory Management
- Dispose of image objects after processing
- Clear canvas when switching images
- Limit concurrent operations

## 11. Browser Compatibility

### 11.1 Required APIs
- File API (FileReader)
- Canvas API
- Blob API
- URL.createObjectURL

### 11.2 Minimum Versions
- Chrome: 60+
- Firefox: 55+
- Safari: 11+
- Edge: 79+

## 12. Photo Collage Feature Details

### 12.1 Grid Layout Options
Supported grid configurations:
- **1×1**: One cell for the full inner area—**default single-image / padded export** (replaces legacy single mode)
- **1×2**: 1 row, 2 columns (horizontal split)
- **1×3**: 1 row, 3 columns (triple horizontal)
- **2×1**: 2 rows, 1 column (vertical split)
- **2×2**: 2 rows, 2 columns (quad grid)
- **2×3**: 2 rows, 3 columns (6-cell grid)
- **3×1**: 3 rows, 1 column (triple vertical)
- **3×2**: 3 rows, 2 columns (6-cell vertical)
- **3×3**: 3 rows, 3 columns (9-cell grid)

### 12.2 Grid Selector UI
- Visual representation: Mini grid icons showing layout
- Button style: Square buttons with grid lines
- Active state: Highlighted border/background
- Tooltip: Show "R×C" format on hover
- Layout: 3×3 button grid for easy selection

### 12.3 Image Assignment & Swap
- **Automatic Assignment**: Images assigned to cells in order (left-to-right, top-to-bottom), indices `0, 1, …`
- **Manual Replace / per-cell clear**: Not implemented in the current UI
- **Swap**: **Alt+click** cell A, then **Alt+click** cell B; exchanges **image, file, fit mode, crop rect**
- **Cell Indicators**: No thumbnail strip; occupancy is visible in the preview and via the image counter
- **Empty Cell Handling**: Empty cells filled with margin color

### 12.4 Collage Processing
- Margin size represents the edge-to-edge distance between cells
- Images fill cells edge-to-edge (no padding within cells)
- **Per-cell fit modes** (no global mode): each cell uses its own Fit / Fill vertical / Fill horizontal
- Custom crop: user drag on preview adjusts `{ x, y, width, height }` in image space per cell when a crop exists or is initialized on first drag; otherwise default centered behavior per mode
- Grid spacing uses margin size as the gap between cells
- Outer margins applied to entire collage (first marginSize on all sides)
- Empty cells are filled with margin color

## 13. Future Enhancements (Optional)

- Drag-and-drop direct assignment to a specific cell (drop target per cell)
- Explicit per-cell “replace image” / “clear cell” controls
- Individual cell margin settings
- Grid border customization (color, width)
- Image rotation within cells
- Batch processing for multiple collages
- Template presets for common collage layouts
- Image filters/effects
- Preset saving/loading
- Undo/redo functionality
- Additional keyboard shortcuts (beyond **Esc** cancel swap)
- Dark mode toggle
- Export history
- Image format conversion options

## 14. Testing Strategy

### 14.1 Unit Tests
- Dimension calculation functions
- Scaling algorithms per fill mode
- Color conversion utilities
- Swap and grid-resize index mapping

### 14.2 Integration Tests
- File upload flow
- Preview update flow
- Export functionality
- Per-cell mode changes and swap

### 14.3 Manual Testing
- Various image formats (JPEG, PNG, WebP, GIF)
- Different aspect ratios
- Edge cases (very small/large images)
- Browser compatibility
- 1×1 vs multi-cell parity with legacy single-image expectations

## 15. Implementation Phases

### Phase 1: Core Functionality — **Done**
- Basic UI layout
- Image upload (multi-file)
- Canvas rendering via **collage pipeline** (including 1×1)

### Phase 2: Advanced Features — **Done**
- Preset system, margin controls, color picker
- Export (PNG / JPEG / WebP) with quality; filename prefix by grid size
- Multi-cell grids, grid selector, collage processing

### Phase 3: Collage UX — **Done (partial)**
- **Done**: Per-cell fit mode controls (sidebar **R×C** rows); **Alt+click** swap; drag-to-reframe crop; **Esc** cancel swap
- **Not done**: Dedicated cell selection inspector, per-cell replace/clear, thumbnail strip

### Phase 4: Polish — **Ongoing**
- Error handling (basic alerts)
- UI improvements (per-cell scroll list, swap status line)
- Optional: loading states, debounced margin preview, `requestAnimationFrame` for drag

### Phase 5: Testing & Documentation
- Manual testing checklist (see §14)
- **plan.md** (this document) aligned with implementation
- README may lag; prefer **plan.md** for architecture
