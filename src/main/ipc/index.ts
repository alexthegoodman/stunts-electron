import { registerProjectHandlers } from './projects'
import { registerBrandHandlers } from './brands'
import { registerSettingsHandlers } from './settings'
import { registerUploadHandlers } from './uploads'
import { registerAiGenerationHandlers } from './ai-generation'
import { registerVideoHandlers } from './video'
import { registerScreenCaptureHandlers } from './screen-capture'

/**
 * Register all IPC handlers
 * Call this from main process initialization
 */
export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerBrandHandlers()
  registerSettingsHandlers()
  registerUploadHandlers()
  registerAiGenerationHandlers()
  registerVideoHandlers()
  registerScreenCaptureHandlers()

  console.log('All IPC handlers registered')
}
