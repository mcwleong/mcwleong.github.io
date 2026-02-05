# Image Padding Web Application - Design Document

## 1. Overview

A client-side web application that allows users to pad images to specific output dimensions and aspect ratios, and create photo collages with customizable grid layouts. The application processes images entirely in the browser without uploading to any server, ensuring privacy and fast performance.

## 2. Core Requirements

### 2.1 Functional Requirements
- **Image Upload**: Support drag-and-drop and file picker for image input
- **Output Size Selection**: Predefined aspect ratio presets:
  - Portrait: 1080 × 1920
  - Landscape: 1920 × 1080
  - Square: 1080 × 1080
  - Instagram: 1080 × 1350
- **Custom Dimensions**: Allow manual input for width and height
- **Margin Configuration**:
  - Adjustable margin size (default: 10px)
  - Customizable margin color (color picker)
- **Image Processing**:
  - For oversized images: shrink to fit longer side while preserving aspect ratio
  - Center the image within the output canvas
  - Apply margins around the image
- **Preview**: Real-time preview of the processed image
- **Export**: Download the processed image in the desired format
- **Photo Collage**: Create multi-image collages with grid layouts
  - Grid selector with presets: 1×1, 1×2, 1×3, 2×1, 2×2, 2×3, 3×1, 3×2, 3×3
  - Support for multiple image uploads (up to grid cell count)
  - Margin size represents edge-to-edge distance between cells
  - Images fill cells edge-to-edge (no padding within cells)

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
- **File Input**: "Choose Image" button
- **Drag & Drop Zone**: Visual indicator for drag-and-drop
- **Current Image Info**: Display filename and original dimensions

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

#### 3.2.4 Photo Collage Section
- **Mode Toggle**: Radio buttons or toggle switch
  - "Single Image" mode (default)
  - "Photo Collage" mode
- **Grid Selector**: Visual grid buttons showing layout
  - 1×1, 1×2, 1×3
  - 2×1, 2×2, 2×3
  - 3×1, 3×2, 3×3
  - Visual preview of grid layout (mini grid icons)
  - Selected grid highlighted
- **Fill Mode Selector**: Dropdown for image fill behavior
  - "Fit (Preserve Aspect)": Scale to fit cell, preserve aspect ratio, no cropping
  - "Fill Vertical (Crop Horizontal)": Fill cell height, crop width if needed (centered crop)
  - "Fill Horizontal (Crop Vertical)": Fill cell width, crop height if needed (centered crop)
- **Image Upload for Collage**:
  - Multiple file input (accepts up to grid cell count)
  - Drag-and-drop for multiple images
  - Image counter: "X of Y images selected"
  - Individual image preview thumbnails in grid cells
  - Ability to replace individual images in cells

#### 3.2.5 Export Section
- **Format Selection**: Dropdown (PNG, JPEG, WebP)
- **Quality Slider**: For JPEG/WebP (1-100, default: 90)
- **Download Button**: "Download Processed Image"

### 3.3 Preview Area
- **Canvas Element**: Displays the processed image
- **Zoom Controls**: Optional zoom in/out buttons
- **Dimensions Display**: Show output dimensions below canvas
- **Loading Indicator**: Show during processing

## 4. Image Processing Logic

### 4.1 Algorithm Flow

```
1. Load input image
2. Get output dimensions (width, height)
3. Calculate available space:
   - availableWidth = outputWidth - (marginSize × 2)
   - availableHeight = outputHeight - (marginSize × 2)
4. Calculate scaling factor:
   - scaleX = availableWidth / imageWidth
   - scaleY = availableHeight / imageHeight
   - scale = min(scaleX, scaleY)  // Use smaller to fit within bounds
5. Calculate scaled dimensions:
   - scaledWidth = imageWidth × scale
   - scaledHeight = imageHeight × scale
6. Calculate centered position:
   - x = marginSize + (availableWidth - scaledWidth) / 2
   - y = marginSize + (availableHeight - scaledHeight) / 2
7. Create output canvas with output dimensions
8. Fill canvas with margin color
9. Draw scaled image at calculated position
10. Export canvas as image file
```

### 4.2 Photo Collage Processing Logic

#### 4.2.1 Collage Algorithm Flow
```
1. Determine grid layout (rows × columns) and fill mode
2. Calculate cell dimensions:
   - cellWidth = (outputWidth - (marginSize × (columns + 1))) / columns
   - cellHeight = (outputHeight - (marginSize × (rows + 1))) / rows
   Note: marginSize is the edge-to-edge distance between cells
3. For each grid cell (row, col):
   a. If image exists for this cell:
      - Images fill cells edge-to-edge (no padding within cells)
      - Based on fill mode:
        * "Fit": Scale to fit while preserving aspect ratio (no cropping)
          - scale = min(cellWidth/imageWidth, cellHeight/imageHeight)
          - Center image in cell
        * "Fill Vertical": Fill cell height, crop width if needed
          - scale = cellHeight / imageHeight
          - If scaled width >= cellWidth: crop horizontally (centered)
          - If scaled width < cellWidth: fill width, crop height (centered)
        * "Fill Horizontal": Fill cell width, crop height if needed
          - scale = cellWidth / imageWidth
          - If scaled height >= cellHeight: crop vertically (centered)
          - If scaled height < cellHeight: fill height, crop width (centered)
      - Draw image (with cropping if needed, always centered)
   b. If no image for cell:
      - Fill cell with margin color
4. Combine all cells into final canvas
```

#### 4.2.2 Cell Positioning and Spacing
- Each cell position: 
  - x = marginSize + col × (cellWidth + marginSize)
  - y = marginSize + row × (cellHeight + marginSize)
- **Margin size represents the edge-to-edge distance between cells**
- Images fill their cells completely (edge-to-edge) with no inner padding
- **Fill Modes**:
  - **Fit**: Images scaled to fit within cells, preserving aspect ratio (no cropping)
  - **Fill Vertical**: Images fill cell height, horizontal dimension cropped if needed (centered crop)
  - **Fill Horizontal**: Images fill cell width, vertical dimension cropped if needed (centered crop)
- Empty cells are filled with margin color

### 4.3 Edge Cases
- **Oversized Images**: Automatically scaled down to fit within margins
- **Undersized Images**: Centered with margins around them
- **Square Images**: Handled same as rectangular
- **Very Small Images**: May appear pixelated if upscaled (consider warning)
- **Invalid Dimensions**: Validation and error messages
- **Incomplete Collage**: Empty cells filled with margin color
- **Too Many Images**: Warn user if more images than grid cells
- **Too Few Images**: Allow partial collages with empty cells

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
imagepad-app/
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   ├── main.js
│   ├── imageProcessor.js
│   ├── uiController.js
│   └── exportHandler.js
├── assets/
│   └── (optional icons/images)
└── README.md
```

### 5.3 Core Modules

#### 5.3.1 imageProcessor.js
- `loadImage(file)`: Load image from file
- `loadMultipleImages(files)`: Load multiple images for collage
- `calculateDimensions(image, outputSize, margin)`: Calculate scaling and positioning
- `processImage(image, outputSize, margin, marginColor)`: Main processing function (single image)
- `processCollage(images, gridRows, gridCols, outputSize, margin, marginColor)`: Process collage
- `calculateCellDimensions(outputSize, gridRows, gridCols, margin)`: Calculate cell sizes
- `drawImageOnCanvas(canvas, image, x, y, width, height)`: Render image
- `drawImageInCell(canvas, image, cellRow, cellCol, cellWidth, cellHeight, margin, marginColor)`: Render image in grid cell

#### 5.3.2 uiController.js
- `initializeUI()`: Set up event listeners
- `handleFileUpload(file)`: Process file selection (single image)
- `handleMultipleFileUpload(files)`: Process multiple file selection (collage)
- `updatePreview()`: Refresh preview canvas
- `handlePresetSelection(preset)`: Apply preset dimensions
- `handleMarginChange()`: Update margin settings
- `handleModeToggle(mode)`: Switch between single image and collage mode
- `handleGridSelection(rows, cols)`: Update grid layout
- `handleCellImageReplace(cellIndex, file)`: Replace image in specific cell

#### 5.3.3 exportHandler.js
- `exportImage(canvas, format, quality)`: Convert canvas to blob
- `downloadImage(blob, filename)`: Trigger download

#### 5.3.4 main.js
- Application initialization
- Module coordination
- Global state management

## 6. State Management

### 6.1 Application State
```javascript
{
  mode: 'single' | 'collage',
  inputImage: Image | null,
  inputImages: Image[],  // For collage mode
  gridRows: number,
  gridCols: number,
  outputWidth: number,
  outputHeight: number,
  marginSize: number,
  marginColor: string,
  currentFormat: string,
  quality: number,
  canvas: HTMLCanvasElement | null
}
```

### 6.2 State Updates
- Update state on user input
- Trigger preview refresh on state change
- Maintain state for export functionality

## 7. User Experience Flow

### 7.1 Single Image Mode
1. **Initial State**: Empty preview, default settings visible
2. **Upload Image**: User selects/drops image file
3. **Image Loads**: Preview shows original image
4. **Select Preset**: User chooses output size preset
5. **Adjust Margins**: User modifies margin size and color
6. **Real-time Preview**: Preview updates automatically
7. **Export**: User selects format and downloads

### 7.2 Photo Collage Mode
1. **Switch to Collage Mode**: User toggles to "Photo Collage" mode
2. **Select Grid Layout**: User chooses grid layout (e.g., 2×2, 3×3)
3. **Upload Images**: User selects/drops multiple images (up to grid cell count)
4. **Images Load**: Preview shows grid with images in cells
5. **Adjust Settings**: User modifies output size, margins, and colors
6. **Replace Images**: User can replace individual images in cells (optional)
7. **Real-time Preview**: Preview updates automatically as settings change
8. **Export**: User selects format and downloads collage

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
- "Please select a grid layout for collage mode"
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
- **1×1**: Single cell (same as single image mode)
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

### 12.3 Image Assignment
- **Automatic Assignment**: Images assigned to cells in order (left-to-right, top-to-bottom)
- **Manual Assignment**: Users can drag images to specific cells (future enhancement)
- **Cell Indicators**: Show which cells have images (checkmark or thumbnail)
- **Empty Cell Handling**: Empty cells filled with margin color

### 12.4 Collage Processing
- Margin size represents the edge-to-edge distance between cells
- Images fill cells edge-to-edge (no padding within cells)
- **Fill Mode Options**:
  - **Fit**: Scale to fit cell while preserving aspect ratio (no cropping, default)
  - **Fill Vertical**: Fill cell height completely, crop width if image exceeds cell width (centered crop)
  - **Fill Horizontal**: Fill cell width completely, crop height if image exceeds cell height (centered crop)
- Images are always centered within their cells
- Cropping is performed from the center of the image when needed
- Grid spacing uses margin size as the gap between cells
- Outer margins applied to entire collage (first marginSize on all sides)
- Empty cells are filled with margin color

## 13. Future Enhancements (Optional)

- Drag-and-drop image assignment to specific cells
- Individual cell margin settings
- Grid border customization (color, width)
- Image rotation within cells
- Batch processing for multiple collages
- Template presets for common collage layouts
- Image filters/effects
- Preset saving/loading
- Undo/redo functionality
- Keyboard shortcuts
- Dark mode toggle
- Export history
- Image format conversion options

## 14. Testing Strategy

### 14.1 Unit Tests
- Dimension calculation functions
- Scaling algorithms
- Color conversion utilities

### 14.2 Integration Tests
- File upload flow
- Preview update flow
- Export functionality

### 14.3 Manual Testing
- Various image formats (JPEG, PNG, WebP, GIF)
- Different aspect ratios
- Edge cases (very small/large images)
- Browser compatibility

## 15. Implementation Phases

### Phase 1: Core Functionality
- Basic UI layout
- Image upload
- Canvas rendering
- Simple padding logic

### Phase 2: Advanced Features
- Preset system
- Margin controls
- Color picker
- Export functionality
- Photo Collage mode
- Grid selector component
- Multiple image handling

### Phase 3: Polish
- Error handling
- Loading states
- UI improvements
- Performance optimization

### Phase 4: Photo Collage Implementation
- Mode toggle functionality
- Grid selector component
- Multiple image upload handling
- Collage processing algorithm
- Cell-based rendering

### Phase 5: Testing & Documentation
- Comprehensive testing
- User documentation
- Code comments
- README updates

