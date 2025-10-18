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

      // const output = (await replicate.run('black-forest-labs/flux-schnell', {
      //   input: {
      //     prompt: prompt,
      //     go_fast: true,
      //     megapixels: '0.25',
      //     num_outputs: 1,
      //     aspect_ratio: '1:1',
      //     output_format: 'jpg',
      //     output_quality: 80
      //   }
      // })) as any

      const input = {
        size: '1K',
        width: 1024,
        height: 1024,
        prompt: prompt,
        max_images: 1,
        image_input: [],
        aspect_ratio: '1:1',
        sequential_image_generation: 'disabled'
      }

      const output = await replicate.run('bytedance/seedream-4', { input })

      const imageUrl = output[0].url() as URL

      // To access the file URL:
      console.log(imageUrl) //=> "http://example.com"

      // console.info('output', output)

      // Download the image and save locally
      // const imageUrl = output[0] as string
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

      console.info('saving replicate url ', imageUrl)

      return {
        success: true,
        data: {
          // url: savePath,
          url: fileName,
          fileName: fileName,
          replicateUrl: imageUrl.href // Store the original Replicate URL
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
            // url: savePath,
            url: fileName,
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

  // Generate AI animation using OpenAI
  ipcMain.handle(
    'ai:generateAnimation',
    async (
      _event,
      data: {
        prompt: string
        duration: number
        style: string
        objectsData: Array<{
          id: string
          objectType: string
          dimensions: { width: number; height: number }
          position: { x: number; y: number }
        }>
        canvasSize: { width: number; height: number }
      }
    ) => {
      try {
        const openaiKey = await apiKeys.getKey('openai')
        if (!openaiKey) {
          return { success: false, error: 'OpenAI API key not configured' }
        }

        // Validate required fields
        if (
          !data.prompt ||
          !data.objectsData ||
          !Array.isArray(data.objectsData) ||
          data.objectsData.length === 0
        ) {
          return {
            success: false,
            error: 'Missing required fields: prompt and objectsData'
          }
        }

        // Default values
        const animationDuration = data.duration || 3000
        const animationStyle = data.style || 'smooth'

        // Create animation schema
        const animationSchema = z.object({
          duration: z.number().describe('Total animation duration in milliseconds'),
          style: z
            .string()
            .describe("Animation style: 'smooth', 'bouncy', 'quick', 'dramatic', 'subtle'"),
          animations: z.array(
            z.object({
              objectId: z
                .string()
                .describe("The ID of the object to animate (e.g., 'text-1', 'polygon-2')"),
              properties: z.array(
                z.object({
                  propertyName: z
                    .string()
                    .describe(
                      "The property to animate: 'Position', 'ScaleX', 'ScaleY', 'Rotation', 'Opacity'"
                    ),
                  keyframes: z.array(
                    z.object({
                      time: z.number().describe('Time in milliseconds when this keyframe occurs'),
                      value: z
                        .union([z.number(), z.array(z.number()).length(2)])
                        .describe(
                          'Value at this keyframe. Use [x, y] for position, single number for others. Scale/opacity: 0-100+'
                        ),
                      easing: z
                        .string()
                        .describe("Easing type: 'Linear', 'EaseIn', 'EaseOut', 'EaseInOut'")
                    })
                  )
                })
              ),
              description: z.string().describe('Brief description of what this animation does')
            })
          )
        })

        // Create a comprehensive prompt for the AI
        const objectsInfo = data.objectsData
          .map(
            (obj: any) =>
              `ID: ${obj.id}, Type: ${obj.objectType}, Dimensions: ${obj.dimensions.width}x${obj.dimensions.height}, Position: (${obj.position.x}, ${obj.position.y})`
          )
          .join('\n- ')

        const systemPrompt = `You are an expert animation designer. Create engaging keyframe animations based on the user's description.

Available objects to animate:
- ${objectsInfo}

Canvas size: ${data.canvasSize ? `${data.canvasSize.width}x${data.canvasSize.height}` : '550x900'}
Requested duration: ${animationDuration}ms
Requested style: ${animationStyle}

Animation Properties Available:
- position: [x, y] coordinates
- scaleX: scale factor (100 = normal, 200 = double size, 50 = half size)
- scaleY: scale factor (100 = normal, 200 = double size, 50 = half size)
- rotation: rotation in degrees (0-360)
- opacity: transparency (0 = invisible, 100 = fully visible)

Easing Options: Linear, EaseIn, EaseOut, EaseInOut

Guidelines:
- Create smooth, visually appealing animations
- Use appropriate easing for the style requested
- Consider the canvas size when setting position values
- Create at least up to 3-7 keyframes per object
- Match the animation style (smooth = gentle curves, bouncy = overshoot, quick = fast transitions, dramatic = large movements, subtle = small changes)
- Use object types to inform animation choices (text objects may need different animations than images or shapes)
- Consider object dimensions when creating scale animations (larger objects may need different scaling than smaller ones)
- Animate objects anywhere that looks best, unless a specific spot is requested
- Ensure animations keep objects within canvas boundaries based on their dimensions
- Please be sure to limit mockup, video, and image rotation to up to 20 degrees

User Request: ${data.prompt}`

        console.info('Calling OpenAI: ', systemPrompt)

        const openai = createOpenAI({
          apiKey: openaiKey
        })

        const object = await generateObject({
          model: openai('gpt-4o-mini'),
          schema: animationSchema,
          prompt: systemPrompt,
          temperature: 1 // Add some creativity while maintaining consistency
        })

        const result = object.toJsonResponse()
        const jsonData = await result.json()

        return {
          success: true,
          data: jsonData
        }
      } catch (error) {
        console.error('Failed to generate animation:', error)
        return { success: false, error: 'Failed to generate animation' }
      }
    }
  )

  // Remove background from image using Replicate
  ipcMain.handle('ai:removeBackground', async (_event, imageUrl: string) => {
    try {
      const replicateKey = await apiKeys.getKey('replicate')
      if (!replicateKey) {
        return { success: false, error: 'Replicate API key not configured' }
      }

      const replicate = new Replicate({ auth: replicateKey })

      // Use BRIA RMBG model for background removal
      // const output = (await replicate.run('briaai/rmbg-2.0:4c2dea16ef0d2463c538b5e33a28a0b9daa6e373e3c58aeb3f0c1a2d2c9e10b0', {
      //   input: {
      //     image: imageUrl
      //   }
      // })) as string

      console.info('imageUrl', imageUrl)

      const output = (await replicate.run(
        '851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
        {
          input: {
            image: imageUrl,
            format: 'png',
            reverse: false,
            threshold: 0,
            background_type: 'rgba'
          }
        }
      )) as any

      // Download the processed image and save locally
      const response = await fetch(output.url())
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Save to uploads directory
      const documentsPath = app.getPath('documents')
      const uploadsDir = path.join(documentsPath, 'Stunts', 'uploads', 'images')
      await fs.mkdir(uploadsDir, { recursive: true })

      const timestamp = Date.now()
      const fileName = `no-bg-${timestamp}.png`
      const savePath = path.join(uploadsDir, fileName)
      await fs.writeFile(savePath, buffer)

      return {
        success: true,
        data: {
          url: fileName,
          fileName: fileName
        }
      }
    } catch (error) {
      console.error('Failed to remove background:', error)
      return { success: false, error: 'Failed to remove background' }
    }
  })

  // Generate 3D model from image using Replicate and Trellis
  ipcMain.handle('ai:generate3DModel', async (_event, imageUrl: string) => {
    try {
      const replicateKey = await apiKeys.getKey('replicate')
      if (!replicateKey) {
        return { success: false, error: 'Replicate API key not configured' }
      }

      const replicate = new Replicate({ auth: replicateKey })

      // Use Trellis model for 3D generation from image
      // const output = (await replicate.run(
      //   'jbilcke-hf/trellis:87fc4da651e7d0bfc03f54f5c4b7766bb8e30d4a2e2fa5cc3e8a04c9c38267f4',
      //   {
      //     input: {
      //       image: imageUrl,
      //       seed: Math.floor(Math.random() * 1000000),
      //       slat_sampler_steps: 12,
      //       slat_sampler_cfg: 7.5,
      //       mesh_simplify: 0.95,
      //       texture_size: 1024
      //     }
      //   }
      // )) as any

      const input = {
        images: [imageUrl],
        texture_size: 2048,
        mesh_simplify: 0.9,
        generate_model: true,
        save_gaussian_ply: true,
        ss_sampling_steps: 38
      }

      const output = (await replicate.run(
        'firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c',
        { input }
      )) as any

      console.log(output)
      //=> {"model_file":"https://replicate.delivery/yhqm/5xOmxKPXDT...

      // The output should contain a GLB file URL
      const glbUrl = output?.model_file

      if (!glbUrl) {
        throw new Error('No GLB model returned from Trellis')
      }

      // Download the GLB file and save locally
      const response = await fetch(glbUrl)
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Save to uploads directory
      const documentsPath = app.getPath('documents')
      const uploadsDir = path.join(documentsPath, 'Stunts', 'uploads', 'models')
      await fs.mkdir(uploadsDir, { recursive: true })

      const timestamp = Date.now()
      const fileName = `generated-model-${timestamp}.glb`
      const savePath = path.join(uploadsDir, fileName)
      await fs.writeFile(savePath, buffer)

      return {
        success: true,
        data: {
          url: fileName,
          fileName: fileName
        }
      }
    } catch (error) {
      console.error('Failed to generate 3D model:', error)
      return { success: false, error: 'Failed to generate 3D model' }
    }
  })
}
