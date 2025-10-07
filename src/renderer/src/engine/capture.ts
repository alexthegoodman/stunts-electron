export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

export class WebCapture {
  mediaRecorder: MediaRecorder | null = null;
  mediaStream: MediaStream | null = null;
  mousePositions: MousePosition[] = [];
  lastMousePosition: { x: number; y: number } | null = null;
  captureStartTime: number = 0;
  mouseTrackingInterval: number | null = null;

  constructor() {}

  checkSupport() {
    const isSupported = MediaRecorder.isTypeSupported("video/mp4");

    return isSupported;
  }

  async startScreenCapture(sourceId: string): Promise<void> {
    try {
      // Use Electron's desktopCapturer via the exposed API
      // The sourceId should be obtained from the SourceSelectionModal
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron-specific constraint
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId,
          },
        },
      });
    } catch (error) {
      console.error("Error accessing screen capture:", error);
      throw error;
    }
  }

  startRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaStream) {
        return;
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: "video/mp4",
      });

      const chunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/mp4" });
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event: Event) => {
        reject(new Error(`Recording error: ${event}`));
      };

      this.mediaRecorder.start();
      this.startMouseTracking();
    });
  }

  stopRecording(): void {
    if (!this.mediaRecorder) {
      return;
    }

    this.mediaRecorder.stop();
    this.stopMouseTracking();
  }

  startMouseTracking(): void {
    this.mousePositions = [];
    this.lastMousePosition = null;
    this.captureStartTime = Date.now();

    // Poll mouse position every 16ms (~60fps)
    this.mouseTrackingInterval = window.setInterval(() => {
      const currentPosition = window.electron.ipcRenderer.invoke('screen:getCursorPosition');

      currentPosition.then((pos: { x: number; y: number }) => {
        if (this.lastMousePosition) {
          const distance = Math.sqrt(
            Math.pow(pos.x - this.lastMousePosition.x, 2) +
            Math.pow(pos.y - this.lastMousePosition.y, 2)
          );

          if (distance >= 100) {
            const timestamp = Date.now() - this.captureStartTime;
            this.mousePositions.push({
              x: pos.x,
              y: pos.y,
              timestamp
            });
            this.lastMousePosition = pos;
          }
        } else {
          // First position
          this.lastMousePosition = pos;
          this.mousePositions.push({
            x: pos.x,
            y: pos.y,
            timestamp: 0
          });
        }
      }).catch(err => {
        console.error('Error getting cursor position:', err);
      });
    }, 16);
  }

  stopMouseTracking(): void {
    if (this.mouseTrackingInterval !== null) {
      window.clearInterval(this.mouseTrackingInterval);
      this.mouseTrackingInterval = null;
    }
  }

  getMousePositionsJSON(): string {
    return JSON.stringify(this.mousePositions, null, 2);
  }

  saveMousePositionsToFile(fileName: string): void {
    const json = this.getMousePositionsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
