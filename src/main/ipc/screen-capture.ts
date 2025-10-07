import { ipcMain, desktopCapturer, screen } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

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

async function getWindowBoundsWindows(hwnd: string): Promise<{
  x: number
  y: number
  width: number
  height: number
} | null> {
  if (process.platform !== 'win32') {
    return null
  }

  try {
    // HWND is already in decimal format from Electron's desktopCapturer
    console.log('Original HWND string:', hwnd)
    const hwndDecimal = parseInt(hwnd, 10)
    console.log('HWND decimal:', hwndDecimal)

    if (isNaN(hwndDecimal) || hwndDecimal === 0) {
      console.warn('Invalid HWND:', hwnd)
      return null
    }

    // PowerShell script that uses P/Invoke to call GetWindowRect
    // Using -IgnoreError to prevent Add-Type from failing if type already exists
    const psScript = `
      $ErrorActionPreference = 'Stop'
      try {
        Add-Type -IgnoreWarnings -ErrorAction SilentlyContinue @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32GetRect {
            [DllImport("user32.dll")]
            public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT {
              public int Left;
              public int Top;
              public int Right;
              public int Bottom;
            }
          }
"@
      } catch {}

      $rect = New-Object Win32GetRect+RECT
      $result = [Win32GetRect]::GetWindowRect([IntPtr]${hwndDecimal}, [ref]$rect)
      if ($result) {
        Write-Output "$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
      } else {
        Write-Error "GetWindowRect failed for HWND ${hwndDecimal}"
      }
    `

    console.info('executing powershell!')

    const { stdout, stderr } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript
    ])

    console.info('stdout:', stdout)
    console.info('stderr:', stderr)

    const output = stdout.trim()
    if (!output) {
      return null
    }

    const [left, top, right, bottom] = output.split(',').map(Number)

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    }
  } catch (error) {
    console.error('Error getting window bounds via PowerShell:', error)
    return null
  }
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

      const screenSources: ScreenSource[] = await Promise.all(
        sources.map(async (source) => {
          console.log('Source ID:', source.id, 'Name:', source.name)
          const hwnd = source.id.split(':')[1]
          console.log('Extracted HWND:', hwnd)

          // For screen sources, use the display bounds
          // For window sources, we'll get bounds via native API if available
          let bounds: { x: number; y: number; width: number; height: number } | undefined
          let scaleFactor = 1

          if (source.id.startsWith('screen:')) {
            // This is a screen/display source
            const displayId = source.display_id
            const display = displays.find((d) => d.id.toString() === displayId) || primaryDisplay
            bounds = display.bounds
            scaleFactor = display.scaleFactor
          } else if (process.platform === 'win32' && hwnd) {
            // For window sources on Windows, get bounds via PowerShell
            bounds = (await getWindowBoundsWindows(hwnd)) || undefined
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
      )

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
      return await getWindowBoundsWindows(hwnd)
    } catch (error) {
      console.error('Error getting window bounds:', error)
      throw error
    }
  })

  console.log('Screen capture IPC handlers registered')
}
