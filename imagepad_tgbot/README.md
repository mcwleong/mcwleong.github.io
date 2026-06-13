# Image Pad — Image Padding & Photo Collage Tool

A client-side web app for padding images to exact output sizes and building photo collages on a grid. Everything runs in your browser with the Canvas API—**no uploads**, no backend required for the app itself.

## Features

### Workflow modes

Use the **Workflow** toggle in the sidebar:

- **Collage** (default) — grid layouts and multi-image collages (see below).
- **Split** — one image rendered on a wide canvas, then exported as **2 or 3 equal vertical strips** in a ZIP (for album-style posting).

### Horizontal split mode

1. Switch workflow to **Split**.
2. Upload **one image** (extra files are ignored with an alert).
3. Choose **2 strips** or **3 strips**.
4. Choose **H** (fill horizontal) or **V** (fill vertical) for how the image fills the inner area.
5. Set **output size**, **scale**, **margins**, and export format (shared with collage mode).
6. Preview shows the full wide canvas with **dotted vertical lines** at slice boundaries.
7. **Download ZIP** — contains `split-01-of-02-…`, `split-02-of-02-…`, etc.

**Canvas math:** master size is `(z × outputWidth × scale) × (outputHeight × scale)`. Each strip is `outputWidth × scale` by `outputHeight × scale`. Margins apply as an outer border on the full master (same as a 1×1 collage on the wide canvas).

Example: output 1080×1350, scale 1, z=2 → master 2160×1350; strips are the left and right 1080×1350 halves.

### Unified grid workflow (collage mode)

There is one workflow: pick a **grid layout**. A **1×1** grid is the default and matches the old single-image case—one cell inside the outer margins, with the same padding and export behavior. Use a larger grid for collages.

### Output & margins

- **Presets**: Portrait 1080×1920, Landscape 1920×1080, Square 1080×1080, Instagram 1080×1350  
- **Custom width/height** (validated range)  
- **Margins**: Size (px) and color; margin is also the **gap** between grid cells  

### Grid layouts

Nine layouts: **1×1**, 1×2, 1×3, 2×1, 2×2, 2×3, 3×1, 3×2, **3×3** (visual selector in the sidebar).

### Upload

- **Choose Image(s)** or drag-and-drop; the file input is always multi-select  
- Images fill cells in **row-major order** (left-to-right, top-to-bottom) up to the number of cells  
- If you pick more files than cells, only the first *N* are used (with an alert)  

### Per-cell fill mode

Each row is labeled **R1C1**, **R1C2**, … with three toggle buttons **F** (fit), **H** (fill horizontal), **V** (fill vertical); tooltips spell out the full mode.

| Mode | Behavior |
|------|------------|
| **Fit** | Scale to fit inside the cell, preserve aspect ratio (letterboxing in cell uses margin color) |
| **Fill vertical** | Fill cell height; crop width if needed (centered unless you reframe) |
| **Fill horizontal** | Fill cell width; crop height if needed (centered unless you reframe) |

Changing a cell’s mode clears **only that cell’s** custom crop.

### Reframe (crop pan)

On the **preview canvas**, click and **drag** inside a cell that has a photo to adjust the visible region (custom crop in image coordinates), according to that cell’s fill mode.

### Swap two cells

**Phone / tablet (no Alt key):** tap **Swap photos (for touch)** in the sidebar, then **tap the first cell** on the preview, then **tap the second**. Tap **Done swapping** (or **Esc**) to leave swap mode and use drag-to-crop again.

**Desktop:** hold **Alt** and **click** two cells (or turn on **Swap photos** and click twice—same as touch).

This exchanges the **image, file reference, fill mode, and crop** for those two indices. **Esc** exits swap mode and clears a pending selection. Swapping with an **empty** cell moves the photo into that slot (and clears the other).

### Export

- **PNG**, **JPEG**, **WebP** with quality slider for lossy formats  
- Filenames: `image-<timestamp>.*` for **1×1**, `collage-<timestamp>.*` for multi-cell grids  
- **Split mode:** `split-z2-<timestamp>.zip` (or `z3`) with `split-01-of-02-…` members inside  
- **Batch processing** (collage only): all collages export as one ZIP file (`image-batch-<timestamp>.zip` or `collage-batch-<timestamp>.zip`); each member inside keeps the usual `*-batch01-of-N-*` name  

### Empty cells

Unused slots are filled with the **margin color**.

## Getting started

**ES modules need HTTP** — do not open `index.html` as a `file://` URL.

### Option 1: Python (recommended)

```bash
python server.py
```

Then open **http://localhost:8000/index.html** (the script may open a browser for you).

On Windows you can double-click **`server.bat`** instead (runs `python server.py` and pauses on exit).

### Option 2: Node

```bash
npx http-server -p 8000
```

Open **http://localhost:8000/index.html**

### Option 3: VS Code Live Server

Right-click `index.html` → **Open with Live Server**.

### Usage checklist

1. Start a local server and open the app URL  
2. Choose **Collage** or **Split** workflow  
3. **Collage:** optionally change the grid (default **1×1**), upload images, set fill modes, reframe/swap as needed, then **Download Image** (or batch ZIP)  
4. **Split:** upload one image, pick strip count and H/V fill, set output/margins/format, then **Download ZIP**  

## Browser compatibility

Chrome 60+, Firefox 55+, Safari 11+, Edge 79+ (File API, Canvas, ES modules).

## Project layout

```
imagepad_tgbot/
├── index.html
├── server.py              # local static server (port 8000)
├── server.bat             # Windows: double-click to start server.py
├── plan.md                # design / architecture (detailed)
├── styles/
│   └── main.css
├── scripts/
│   ├── main.js            # entry (initializes UIController)
│   ├── uiController.js    # DOM, state, swap, crop drag
│   ├── imageProcessor.js  # load images, collage render, cell draw
│   └── exportHandler.js   # blob + download + filename
└── README.md
```

## Technical notes

- **Vanilla ES modules** — no npm dependencies for the app  
- **`processCollage`** drives collage previews and exports (including 1×1); **`processSplitMaster`** / **`cropStrip`** drive split mode  
- Legacy `processImage` remains in `imageProcessor.js` but is not used by the UI  
- **Privacy**: images stay on your machine; the dev server only serves static files  

## License

Open source — personal and commercial use welcome.
