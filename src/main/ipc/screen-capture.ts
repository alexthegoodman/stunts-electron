import { ipcMain, desktopCapturer, screen } from 'electron'

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  appIcon?: string
  hwnd?: string
}

export function registerScreenCaptureHandlers(): void {
  ipcMain.handle('screen-capture:getSources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 300, height: 200 },
        fetchWindowIcons: true
      })

      const screenSources: ScreenSource[] = sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon?.toDataURL(),
        // Extract hwnd from the source id for Windows (format: "window:12345:0" where 12345 is the hwnd)
        hwnd: source.id.split(':')[1]
      }))

      return screenSources
    } catch (error) {
      console.error('Error getting screen sources:', error)
      throw error
    }
  })

  ipcMain.handle('screen:getCursorPosition', () => {
    try {
      const point = screen.getCursorScreenPoint()
      return { x: point.x, y: point.y }
    } catch (error) {
      console.error('Error getting cursor position:', error)
      throw error
    }
  })

  console.log('Screen capture IPC handlers registered')
}
