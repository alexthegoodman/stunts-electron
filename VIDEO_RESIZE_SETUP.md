# Video Resize IPC Setup ✅

Video resizing has been converted from HTTP server to IPC!

## What Was Done

### 1. Created Video Processing Service

**File:** `src/main/services/video-processor.ts`

A TypeScript service that handles video resizing using ffmpeg:
- Uses `fluent-ffmpeg` for video processing
- Automatically calculates optimal dimensions while maintaining aspect ratio
- Ensures even dimensions (required for H.264 encoding)
- Handles temporary file creation/cleanup
- Uses Electron's temp directory

**Key Features:**
- ✅ Maintains aspect ratio
- ✅ Ensures H.264 compatibility (even dimensions)
- ✅ Progress logging
- ✅ Automatic cleanup of temp files
- ✅ Optimized for web streaming (`-movflags +faststart`)

### 2. Created IPC Handler

**File:** `src/main/ipc/video.ts`

Registered handler: `video:resize`

**Input:**
```typescript
{
  buffer: ArrayBuffer,    // Video file as ArrayBuffer
  maxWidth: number,       // Max width (default: 1200)
  maxHeight: number       // Max height (default: 900)
}
```

**Output:**
```typescript
{
  success: true,
  data: {
    buffer: Buffer,       // Resized video buffer
    size: number          // Size in bytes
  }
}
```

### 3. Updated Preload Script

**File:** `src/preload/index.ts`

Added video API:
```typescript
window.api.video.resize({ buffer, maxWidth, maxHeight })
```

**File:** `src/preload/index.d.ts`

Added TypeScript definitions for the video API.

### 4. Updated Fetcher

**File:** `src/renderer/src/fetchers/projects.ts`

**Before (HTTP):**
```typescript
const formData = new FormData();
formData.append("video", videoFile);
const response = await fetch("http://localhost:3002/resize-video", {
  method: "POST",
  body: formData,
});
```

**After (IPC):**
```typescript
const buffer = await videoFile.arrayBuffer();
const result = await window.api.video.resize({
  buffer,
  maxWidth,
  maxHeight
});
return new Blob([result.data.buffer], { type: 'video/mp4' });
```

### 5. Registered Handler

**File:** `src/main/ipc/index.ts`

Added `registerVideoHandlers()` to the handler registration.

## Dependencies Required

Make sure these are in your `package.json`:

```json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "ffmpeg-static": "^5.2.0",
    "ffprobe-static": "^3.1.0"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.24"
  }
}
```

## How It Works

1. **Renderer Process:**
   - User uploads video file
   - Converts to ArrayBuffer
   - Calls `window.api.video.resize()`

2. **Main Process:**
   - Receives ArrayBuffer via IPC
   - Converts to Buffer
   - Writes to temp file
   - Uses ffmpeg to resize video
   - Reads resized video
   - Cleans up temp files
   - Returns Buffer to renderer

3. **Renderer Process:**
   - Receives resized Buffer
   - Converts back to Blob
   - Ready to use/display

## Video Processing Settings

Current ffmpeg settings:
```typescript
.videoCodec('libx264')
.outputOptions([
  '-profile:v baseline',     // Maximum compatibility
  '-level 4.0',              // Level 4.0
  '-preset fast',            // Faster encoding
  '-crf 23',                 // Good quality
  '-movflags +faststart'     // Web streaming optimized
])
.audioCodec('aac')
.audioBitrate('128k')
```

## Dimension Calculation

The service automatically:
1. Gets original video dimensions
2. Calculates scale ratio to fit within max dimensions
3. Ensures dimensions are even (H.264 requirement)
4. Verifies aspect ratio is maintained
5. Adjusts if needed to preserve aspect ratio

**Example:**
- Original: 1920x1080
- Max: 1200x900
- Result: 1200x676 (maintains 16:9 aspect ratio, even dimensions)

## Benefits Over HTTP

✅ **No External Server** - Everything runs locally in Electron
✅ **Better Performance** - Direct IPC is faster than HTTP
✅ **More Secure** - No network requests
✅ **Offline First** - Works without internet
✅ **Better Integration** - Uses Electron's temp directory
✅ **Type Safety** - Full TypeScript support

## Usage in Components

```typescript
import { resizeVideo } from '@/fetchers/projects';

async function handleVideoUpload(file: File) {
  try {
    const resizedBlob = await resizeVideo(file, 1200, 900);
    // Use resized video
    console.log('Resized video size:', resizedBlob.size);
  } catch (error) {
    console.error('Failed to resize video:', error);
  }
}
```

## Notes

- The original `resize-video.js` Express server is no longer needed
- Video processing happens in the main process (Electron)
- Temp files are automatically cleaned up after processing
- Progress is logged to the console during processing
- ffmpeg binaries are bundled via `ffmpeg-static` and `ffprobe-static`

## Testing

To test video resizing:

1. Upload a video file in your app
2. Call `resizeVideo(file, 1200, 900)`
3. Check console for processing logs
4. Verify output video has correct dimensions
5. Check temp directory is cleaned up

## Old vs New

**Old System:**
- Express server running on port 3002
- HTTP requests with FormData
- Separate process to manage
- CORS configuration needed

**New System:**
- Built into Electron main process
- IPC communication
- No extra servers needed
- Type-safe API
