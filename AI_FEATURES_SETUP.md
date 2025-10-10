# AI Features Setup Guide

This guide explains how to set up and use the AI-powered features in Stunts Electron, including **Generate Image** and **Generate Animation**.

## Overview

The app now includes two main AI-powered features:
1. **Generate Image** - Uses Replicate AI to generate images from text prompts
2. **Generate Animation** - Uses OpenAI to create animations based on natural language descriptions

## Prerequisites

You'll need API keys from two services:
- **Replicate** - For image generation
- **OpenAI** - For animation generation and content summaries

## Getting Your API Keys

### Replicate API Key

1. Visit [replicate.com](https://replicate.com)
2. Sign up or log in to your account
3. Go to [Account Settings > API Tokens](https://replicate.com/account/api-tokens)
4. Create a new API token or copy an existing one
5. Your key will look like: `r8_...`

### OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in to your account
3. Go to [API Keys](https://platform.openai.com/api-keys)
4. Create a new API key
5. Your key will look like: `sk-proj-...`

**Important:** Keep your API keys secure and never share them publicly.

## Setting Up API Keys in Stunts

### Method 1: Using the API Key Settings UI

1. Open the Stunts app
2. Navigate to the settings or profile area
3. Look for the **API Keys** section or create a settings page that imports the `ApiKeySettings` component
4. For each service (OpenAI and Replicate):
   - Click to add/edit the key
   - Paste your API key
   - Click "Save"

The API keys are stored securely on your device using Electron's encrypted storage.

### Method 2: Direct Component Usage

If you haven't added the API Key settings to your UI yet, you can add it to any settings page:

```tsx
import { ApiKeySettings } from '@renderer/components/ApiKeySettings'

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <ApiKeySettings />
    </div>
  )
}
```

## Using the Features

### Generate Image

1. Open a video project in the editor
2. Click on the **"Generate Image"** tool in the toolbar
3. Enter a description of the image you want to generate
   - Example: "A beautiful sunset over mountains"
4. Click "Generate"
5. Wait for the image to be generated (usually 10-30 seconds)
6. The image will be automatically added to your canvas

**Note:** If you see an error about the API key, make sure you've added your Replicate API key in Settings.

**Costs:** Replicate charges per generation. Check their pricing at [replicate.com/pricing](https://replicate.com/pricing)

### Generate Animation

1. Open a video project with objects on the canvas (text, images, shapes, etc.)
2. Go to the **Animation** tab in the editor
3. Find the **"AI Animation Generator"** section
4. Enter a description of the animation you want:
   - Example: "Make the text bounce excitedly, then fade out slowly"
   - Example: "Move all objects in a circle"
   - Example: "Create a dramatic entrance animation"
5. Select the duration (1-8 seconds)
6. Choose an animation style:
   - **Smooth** - Gentle, flowing animations
   - **Bouncy** - Playful animations with overshoot
   - **Quick** - Fast, snappy transitions
   - **Dramatic** - Large, impactful movements
   - **Subtle** - Small, refined changes
7. Click "Generate AI Animation"
8. Wait for the animation to be created
9. The keyframes will be automatically applied to your objects

**Note:** If you see an error about the API key, make sure you've added your OpenAI API key in Settings.

**Costs:** OpenAI charges per API call. The animation feature uses GPT-4o-mini, which is very affordable. Check pricing at [openai.com/pricing](https://openai.com/pricing)

## Features Architecture

### API Key Storage

- Keys are stored in: `Documents/Stunts/.config/api-keys.json`
- Storage uses Electron's `safeStorage` for encryption when available
- Each profile can have its own API keys (planned feature)
- Keys are never sent anywhere except to the respective API services

### Image Generation Flow

1. User enters prompt → Renderer calls `window.api.ai.generateImage(prompt)`
2. Main process receives IPC call → Checks for Replicate API key
3. If key exists → Calls Replicate's Flux-Schnell model
4. Downloads generated image → Saves to `Documents/Stunts/uploads/images/`
5. Returns file path to renderer → Image is loaded into the editor

### Animation Generation Flow

1. User enters prompt + selects objects → Renderer calls `window.api.ai.generateAnimation(data)`
2. Main process receives IPC call → Checks for OpenAI API key
3. If key exists → Calls OpenAI's GPT-4o-mini with animation schema
4. AI returns structured keyframe data → Validates against schema
5. Returns animation data to renderer → Keyframes are applied to objects

## Troubleshooting

### "API key not configured" error

**Solution:** Go to Settings and add the required API key (OpenAI or Replicate)

### Image generation fails

**Possible causes:**
- Invalid Replicate API key
- Insufficient credits in Replicate account
- Network connectivity issues
- Prompt violates content policy

**Solutions:**
1. Verify your API key is correct
2. Check your Replicate account balance
3. Try a different prompt
4. Check the console logs for specific error messages

### Animation generation fails

**Possible causes:**
- Invalid OpenAI API key
- No objects on canvas to animate
- Insufficient credits in OpenAI account
- Network connectivity issues

**Solutions:**
1. Verify your API key is correct
2. Make sure you have objects on the canvas
3. Check your OpenAI account billing
4. Try a simpler animation description
5. Check the console logs for specific error messages

### Generated animations don't look right

**Tips:**
- Be specific in your prompt
- Mention which objects you want to animate
- Describe the motion clearly (e.g., "move from left to right" vs "move")
- Try different animation styles
- Experiment with different durations

## Privacy & Security

- **API keys** are stored locally on your device, encrypted when possible
- **No data** is sent to any servers except OpenAI and Replicate APIs
- **Prompts and generated content** are sent to the respective AI services according to their privacy policies
- **Generated images** are stored locally in your Documents folder

## API Usage Costs

Both services charge for API usage:

- **Replicate**: Pay-per-use, ~$0.003 per image with Flux-Schnell
- **OpenAI**: Pay-per-token, GPT-4o-mini is ~$0.15 per 1M input tokens

Set up billing limits in each service to avoid unexpected charges.

## Support

If you encounter issues:
1. Check the console logs (View → Toggle Developer Tools)
2. Verify your API keys are correctly entered
3. Check your account balances on Replicate/OpenAI
4. Try with a simpler prompt
5. Report bugs with error messages and steps to reproduce

## Future Enhancements

Planned features:
- [ ] Per-profile API key management
- [ ] Bulk image generation from multiple prompts
- [ ] Animation templates library
- [ ] Local image generation using Stable Diffusion
- [ ] Animation preview before applying
- [ ] Cost estimation before generation
- [ ] Usage analytics and tracking
