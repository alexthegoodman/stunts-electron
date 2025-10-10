# Quick Integration Guide

## Adding API Key Management to Your App

The API key management UI has been created but needs to be integrated into your app's settings or profile section.

### Option 1: Add to Existing Settings Page

If you have a settings page, import and use the component:

```tsx
import { ApiKeySettings } from '@renderer/components/ApiKeySettings'

export function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>

      {/* Other settings sections */}

      <ApiKeySettings />
    </div>
  )
}
```

### Option 2: Create a New Settings Route

If you don't have a settings page yet, create one:

```tsx
// src/renderer/src/pages/Settings.tsx
import { ApiKeySettings } from '@renderer/components/ApiKeySettings'
import { ProfileSelector } from '@renderer/components/ProfileSelector'

export function Settings() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-8">
        {/* Profile Selection */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>
          <ProfileSelector />
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">AI Features</h2>
          <ApiKeySettings />
        </section>
      </div>
    </div>
  )
}
```

### Option 3: Add to Main Menu

Add a menu item to access settings:

```tsx
// In your navigation menu
<MenuItem onClick={() => navigate('/settings')}>
  Settings
</MenuItem>
```

## What's Already Working

✅ **Image Generation**
- Located in: ToolGrid component
- Uses: `window.api.ai.generateImage(prompt)`
- Requires: Replicate API key

✅ **Animation Generation**
- Located in: AnimationTab component
- Uses: `window.api.ai.generateAnimation(data)`
- Requires: OpenAI API key

✅ **API Key Storage**
- Encrypted local storage
- IPC handlers: `settings:getApiKeys`, `settings:updateApiKey`, etc.
- Service: `src/main/services/api-keys.ts`

✅ **UI Component**
- Component: `src/renderer/src/components/ApiKeySettings.tsx`
- Fully functional with show/hide, edit, delete
- Ready to integrate

## Testing the Features

### 1. Test API Key Management

```typescript
// Check if keys exist
const result = await window.api.settings.hasApiKey('openai')
console.log('Has OpenAI key:', result.data)

// Get keys (masked)
const keys = await window.api.settings.getApiKeys()
console.log('Current keys:', keys.data)

// Update a key
await window.api.settings.updateApiKey({
  service: 'openai',
  apiKey: 'sk-proj-...'
})
```

### 2. Test Image Generation

1. Add the ApiKeySettings component to your UI
2. Add a Replicate API key
3. Open the video editor
4. Click "Generate Image" tool
5. Enter a prompt like "a cute cat"
6. Click Generate

### 3. Test Animation Generation

1. Add an OpenAI API key via ApiKeySettings
2. Open the video editor
3. Add some objects to the canvas (text, shapes, images)
4. Go to the Animation tab
5. Find "AI Animation Generator"
6. Enter a prompt like "bounce all objects"
7. Click "Generate AI Animation"

## File Reference

### New/Modified Files

**UI Components:**
- `src/renderer/src/components/ApiKeySettings.tsx` - API key management UI (NEW)

**Main Process:**
- `src/main/ipc/ai-generation.ts` - Added `ai:generateAnimation` handler
- `src/main/ipc/settings.ts` - Already had API key handlers
- `src/main/services/api-keys.ts` - Already existed

**Renderer:**
- `src/renderer/src/components/stunts-app/AnimationTab.tsx` - Updated to use IPC
- `src/renderer/src/components/stunts-app/ToolGrid.tsx` - Updated to use IPC
- `src/preload/index.ts` - Added AI methods to window.api
- `src/preload/index.d.ts` - Added TypeScript definitions

**Documentation:**
- `AI_FEATURES_SETUP.md` - User guide (NEW)
- `INTEGRATION_GUIDE.md` - This file (NEW)

## Next Steps

1. **Integrate ApiKeySettings** into your settings page
2. **Test the features** with your own API keys
3. **Add navigation** to settings if needed
4. **Customize styling** to match your app's design
5. **Add help text** or tooltips where needed

## Example: Complete Settings Page

Here's a complete example you can use:

```tsx
// src/renderer/src/pages/Settings.tsx
import React from 'react'
import { ApiKeySettings } from '@renderer/components/ApiKeySettings'
import { ProfileSelector } from '@renderer/components/ProfileSelector'

export function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>

        <div className="space-y-8">
          {/* Profile Management */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Profile
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage your profiles and switch between different users.
            </p>
            <ProfileSelector />
          </section>

          {/* API Keys */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              AI Features
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Configure API keys for AI-powered features like image generation and animations.
            </p>
            <ApiKeySettings />
          </section>
        </div>
      </div>
    </div>
  )
}
```

## Support

If you encounter any issues during integration:
1. Check the browser console for errors
2. Verify IPC handlers are registered in `src/main/ipc/index.ts`
3. Ensure the preload script is properly loaded
4. Check that the component imports are correct

For detailed usage instructions, see `AI_FEATURES_SETUP.md`.
