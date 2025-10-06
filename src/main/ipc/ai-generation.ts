import { ipcMain, app } from 'electron'
import Replicate from 'replicate'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { apiKeys } from '../services/api-keys'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

// Content schema for AI content generation
const contentSchema = z.object({
  summaries: z.array(z.string()).min(3).max(3)
})

/**
 * Register all AI generation related IPC handlers
 */
export function registerAiGenerationHandlers(): void {
  // Generate single image using Replicate
  ipcMain.handle('ai:generateImage', async (_event, prompt: string) => {
    try {
      const replicateKey = await apiKeys.getKey('replicate')
      if (!replicateKey) {
        return { success: false, error: 'Replicate API key not configured' }
      }

      const replicate = new Replicate({ auth: replicateKey })

      const output = (await replicate.run('black-forest-labs/flux-schnell', {
        input: {
          prompt: prompt,
          go_fast: true,
          megapixels: '0.25',
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'jpg',
          output_quality: 80
        }
      })) as any

      // Download the image and save locally
      const imageUrl = output[0] as string
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Save to uploads directory
      const documentsPath = app.getPath('documents')
      const uploadsDir = path.join(documentsPath, 'Stunts', 'uploads', 'images')
      await fs.mkdir(uploadsDir, { recursive: true })

      const timestamp = Date.now()
      const fileName = `generated-${timestamp}.jpg`
      const savePath = path.join(uploadsDir, fileName)
      await fs.writeFile(savePath, buffer)

      return {
        success: true,
        data: {
          url: savePath,
          fileName: fileName
        }
      }
    } catch (error) {
      console.error('Failed to generate image:', error)
      return { success: false, error: 'Failed to generate image' }
    }
  })

  // Generate multiple images in bulk
  ipcMain.handle('ai:generateImageBulk', async (_event, prompts: string[]) => {
    try {
      const replicateKey = await apiKeys.getKey('replicate')
      if (!replicateKey) {
        return { success: false, error: 'Replicate API key not configured' }
      }

      const replicate = new Replicate({ auth: replicateKey })
      const documentsPath = app.getPath('documents')
      const uploadsDir = path.join(documentsPath, 'Stunts', 'uploads', 'images')
      await fs.mkdir(uploadsDir, { recursive: true })

      const results: any[] = []

      for (const prompt of prompts) {
        try {
          const output = (await replicate.run('black-forest-labs/flux-schnell', {
            input: {
              prompt: prompt,
              go_fast: true,
              megapixels: '0.25',
              num_outputs: 1,
              aspect_ratio: '1:1',
              output_format: 'jpg',
              output_quality: 80
            }
          })) as any

          // Download and save
          const imageUrl = output[0] as string
          const response = await fetch(imageUrl)
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const timestamp = Date.now()
          const fileName = `generated-${timestamp}.jpg`
          const savePath = path.join(uploadsDir, fileName)
          await fs.writeFile(savePath, buffer)

          results.push({
            prompt,
            url: savePath,
            fileName: fileName
          })
        } catch (error) {
          console.error(`Failed to generate image for prompt "${prompt}":`, error)
          results.push({
            prompt,
            error: 'Failed to generate'
          })
        }
      }

      return { success: true, data: results }
    } catch (error) {
      console.error('Failed to generate images in bulk:', error)
      return { success: false, error: 'Failed to generate images' }
    }
  })

  // Generate content summaries using OpenAI
  ipcMain.handle(
    'ai:generateContent',
    async (_event, data: { context: string; language: string }) => {
      try {
        const openaiKey = await apiKeys.getKey('openai')
        if (!openaiKey) {
          return { success: false, error: 'OpenAI API key not configured' }
        }

        let targetLanguage = 'English'
        switch (data.language) {
          case 'en':
            targetLanguage = 'English'
            break
          case 'hi':
            targetLanguage = 'Hindi'
            break
          case 'hit':
            targetLanguage = 'Hindi (Roman)'
            break
          default:
            break
        }

        const openai = createOpenAI({
          apiKey: openaiKey
        })

        const object = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: contentSchema,
          prompt:
            `Generate 3 mini summaries regarding this content (in the language of ${targetLanguage}):` +
            data.context
        })

        const result = object.toJsonResponse()
        const jsonData = await result.json()

        return { success: true, data: jsonData }
      } catch (error) {
        console.error('Failed to generate content:', error)
        return { success: false, error: 'Failed to generate content' }
      }
    }
  )

  // Generate questions using OpenAI (placeholder - implement based on your needs)
  ipcMain.handle('ai:generateQuestions', async (_event, context: string) => {
    try {
      const openaiKey = await apiKeys.getKey('openai')
      if (!openaiKey) {
        return { success: false, error: 'OpenAI API key not configured' }
      }

      // TODO: Implement question generation logic
      return { success: true, data: { questions: [] } }
    } catch (error) {
      console.error('Failed to generate questions:', error)
      return { success: false, error: 'Failed to generate questions' }
    }
  })

  // Scrape link content (using cheerio)
  ipcMain.handle('ai:scrapeLink', async (_event, url: string) => {
    try {
      const cheerio = await import('cheerio')

      const response = await fetch(url)
      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract text content
      const title = $('title').text()
      const metaDescription = $('meta[name="description"]').attr('content') || ''
      const bodyText = $('body').text().trim()

      return {
        success: true,
        data: {
          title,
          description: metaDescription,
          content: bodyText.substring(0, 5000) // Limit to 5000 chars
        }
      }
    } catch (error) {
      console.error('Failed to scrape link:', error)
      return { success: false, error: 'Failed to scrape link' }
    }
  })

  // Extract data from content (placeholder - implement based on your needs)
  ipcMain.handle('ai:extractData', async (_event, content: string) => {
    try {
      // TODO: Implement data extraction logic
      return { success: true, data: {} }
    } catch (error) {
      console.error('Failed to extract data:', error)
      return { success: false, error: 'Failed to extract data' }
    }
  })
}
