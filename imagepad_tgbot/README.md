# Image Pad - Image Padding & Photo Collage Tool

A client-side web application for padding images to specific dimensions and creating photo collages with customizable grid layouts. All processing is done locally in your browser - no server uploads required.

## Features

### Single Image Mode
- **Image Padding**: Pad images to specific output dimensions
- **Aspect Ratio Presets**: 
  - Portrait: 1080 × 1920
  - Landscape: 1920 × 1080
  - Square: 1080 × 1080
  - Instagram: 1080 × 1350
- **Custom Dimensions**: Set any width and height
- **Margin Control**: Adjustable margin size (default: 10px) and color
- **Smart Scaling**: Automatically scales oversized images to fit while preserving aspect ratio
- **Centered Images**: Images are automatically centered within the output canvas

### Photo Collage Mode
- **Grid Layouts**: Choose from 9 grid options:
  - 1×1, 1×2, 1×3
  - 2×1, 2×2, 2×3
  - 3×1, 3×2, 3×3
- **Multiple Image Upload**: Upload multiple images at once
- **Edge-to-Edge Spacing**: Margin size represents the edge-to-edge distance between cells
- **Full Cell Coverage**: Images fill cells edge-to-edge (no padding within cells)
- **Fill Mode Options**:
  - Fit: Scale to fit while preserving aspect ratio (no cropping)
  - Fill Vertical: Fill cell height, crop width if needed (centered crop)
  - Fill Horizontal: Fill cell width, crop height if needed (centered crop)
- **Flexible Layout**: Empty cells are filled with margin color

### Export Options
- **Multiple Formats**: PNG, JPEG, WebP
- **Quality Control**: Adjustable quality for JPEG and WebP formats
- **Instant Download**: Download processed images immediately

## Getting Started

### Running the Application

**Important**: Due to browser security restrictions, ES6 modules require an HTTP server. You cannot open `index.html` directly from the file system.

#### Option 1: Python Server (Recommended)
1. Make sure Python 3 is installed
2. Run the server:
   ```bash
   python server.py
   ```
   Or double-click `server.bat` on Windows
3. Open your browser to `http://localhost:8000/index.html`

#### Option 2: Node.js Server
If you have Node.js installed:
```bash
npx http-server -p 8000
```
Then open `http://localhost:8000/index.html`

#### Option 3: VS Code Live Server
If using VS Code, install the "Live Server" extension and right-click `index.html` → "Open with Live Server"

### Usage

1. **Open the Application**: Open `index.html` in your web browser
2. **Choose Mode**: Select "Single Image" or "Photo Collage" mode
3. **Upload Image(s)**: 
   - Click "Choose Image(s)" button, or
   - Drag and drop image files onto the upload area
4. **Configure Settings**:
   - Select output size preset or enter custom dimensions
   - Adjust margin size and color
   - For collage mode: select grid layout
5. **Preview**: See real-time preview of your processed image
6. **Export**: Choose format and quality, then click "Download Image"

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## File Structure

```
imagepad-app/
├── index.html              # Main HTML file
├── server.py               # Python HTTP server for local development
├── server.bat              # Windows batch file to start server
├── styles/
│   └── main.css            # Application styles
├── scripts/
│   ├── main.js             # Application entry point
│   ├── imageProcessor.js   # Image processing logic
│   ├── uiController.js     # UI interactions and state
│   └── exportHandler.js    # Export and download functionality
└── README.md               # This file
```

## Technical Details

- **Pure JavaScript**: No external dependencies
- **Canvas API**: All image processing uses HTML5 Canvas
- **File API**: Local file reading and processing
- **Client-Side Only**: No server communication required

## Privacy

All image processing happens entirely in your browser. Images are never uploaded to any server, ensuring complete privacy and security.

## License

This project is open source and available for personal and commercial use.

