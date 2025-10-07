# Screen Capture Implementation

This document describes the Electron-native screen capture implementation that replaces the web-based `navigator.mediaDevices.getDisplayMedia`.

## Overview

The screen capture feature now uses Electron's `desktopCapturer` API, which provides:
- Better window identification using hwnd (window handle) instead of titles
- Native OS integration
- More reliable source selection
- Window and screen thumbnails with app icons

## Architecture

### 1. Main Process (`src/main/ipc/screen-capture.ts`)
Handles the IPC communication and fetches available screen sources using `desktopCapturer`:
- Gets all windows and screens
- Generates thumbnails
- Extracts hwnd from source IDs for reliable window identification

### 2. Preload Script (`src/preload/index.ts`)
Exposes the screen capture API to the renderer process:
```typescript
window.api.screenCapture.getSources()
```

### 3. Source Selection Modal (`src/renderer/src/components/stunts-app/SourceSelectionModal.tsx`)
A React modal component that:
- Displays available windows and screens with thumbnails
- Shows app icons and window names
- Displays hwnd for identification
- Allows user to select a source

### 4. WebCapture Class (`src/renderer/src/engine/capture.ts`)
Updated to use Electron's desktop capture:
```typescript
await webCapture.startScreenCapture(sourceId)
```

## Usage

### Basic Flow

1. User clicks the screen capture button
2. `SourceSelectionModal` opens and fetches available sources
3. User selects a window or screen
4. Modal passes the `sourceId` to the callback
5. `WebCapture.startScreenCapture(sourceId)` initializes the capture
6. Recording proceeds as normal

### Example (ToolGrid.tsx)

```typescript
import { SourceSelectionModal } from './SourceSelectionModal'

// State
const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)

// Handler when source is selected
const handleSourceSelected = async (sourceId: string) => {
  const webCapture = webCaptureRef.current
  await webCapture.startScreenCapture(sourceId)
  // ... proceed with recording
}

// Open modal
const handleStartCapture = () => {
  setIsSourceModalOpen(true)
}

// In JSX
<SourceSelectionModal
  isOpen={isSourceModalOpen}
  setIsOpen={setIsSourceModalOpen}
  onSourceSelected={handleSourceSelected}
/>
```

## Benefits

1. **Reliable Identification**: Uses hwnd instead of window titles, avoiding mismatches when multiple windows have the same title
2. **Better UX**: Shows thumbnails and app icons for easy identification
3. **Native Integration**: Uses Electron's native APIs for better performance and compatibility
4. **Cross-platform**: Works consistently across Windows, macOS, and Linux

## Technical Details

### Source ID Format
On Windows, the source ID format is: `window:{hwnd}:{index}`
- The hwnd is extracted and displayed in the UI for reference

### getUserMedia Constraints
The capture uses Electron-specific constraints:
```typescript
{
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: "desktop",
      chromeMediaSourceId: sourceId,
    },
  },
}
```

## Future Enhancements

- Add audio capture support
- Remember last selected source
- Filter sources by application
- Add search/filter functionality for many windows
