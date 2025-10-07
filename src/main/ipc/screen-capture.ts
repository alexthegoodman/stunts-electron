import { ipcMain, desktopCapturer, screen } from 'electron'

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  appIcon?: string
  hwnd?: string
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  scaleFactor?: number
}

export function registerScreenCaptureHandlers(): void {
  ipcMain.handle('screen-capture:getSources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: true
      })

      // Get all displays for scale factor calculation
      const displays = screen.getAllDisplays()
      const primaryDisplay = screen.getPrimaryDisplay()

      const screenSources: ScreenSource[] = sources.map((source) => {
        const hwnd = source.id.split(':')[1]

        // For screen sources, use the display bounds
        // For window sources, we'll get bounds via native API if available
        let bounds: { x: number; y: number; width: number; height: number } | undefined
        let scaleFactor = 1

        if (source.id.startsWith('screen:')) {
          // This is a screen/display source
          const displayId = source.display_id
          const display = displays.find(d => d.id.toString() === displayId) || primaryDisplay
          bounds = display.bounds
          scaleFactor = display.scaleFactor
        } else if (process.platform === 'win32') {
          // For windows on Windows, use the thumbnail size as an approximation
          // The actual window bounds would require native bindings
          // We'll need to get this via a different method
          scaleFactor = primaryDisplay.scaleFactor
        }

        return {
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          appIcon: source.appIcon?.toDataURL(),
          hwnd: hwnd,
          bounds: bounds,
          scaleFactor: scaleFactor
        }
      })

      return screenSources
    } catch (error) {
      console.error('Error getting screen sources:', error)
      throw error
    }
  })

  ipcMain.handle('screen:getCursorPosition', () => {
    try {
      const point = screen.getCursorScreenPoint()
      const primaryDisplay = screen.getPrimaryDisplay()
      const display = screen.getDisplayNearestPoint(point)

      return {
        x: point.x,
        y: point.y,
        scaleFactor: display.scaleFactor
      }
    } catch (error) {
      console.error('Error getting cursor position:', error)
      throw error
    }
  })

  ipcMain.handle('screen:getWindowBounds', async (_, hwnd: string) => {
    try {
      // For now, we'll return null for window-specific bounds
      // This would require native Windows API calls (GetWindowRect)
      // which would need a native node addon
      // The workaround is to use screen bounds or estimate from cursor position
      return null
    } catch (error) {
      console.error('Error getting window bounds:', error)
      throw error
    }
  })

  console.log('Screen capture IPC handlers registered')
}
