import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import path from 'path'

// Define the port for the Express server
const PORT = 7301

// Helper to get uploads directory
function getUploadsDir(app: Electron.App): string {
  const documentsPath = app.getPath('documents')
  return path.join(documentsPath, 'Stunts', 'uploads')
}

/**
 * Initializes and starts the Express server.
 */
export function startExpressServer(electronApp: Electron.App): void {
  const uploadsDir = getUploadsDir(electronApp)

  const app: Express = express()

  // 1. CORS Configuration
  // Allows requests from all origins (*). You might want to restrict this
  app.use(cors())

  // 2. Static Files Setup
  // Serves files from the 'uploadsDirectory' when a request is made to the '/public' path.
  // Example access: http://localhost:7301/public/images/image.jpg or http://localhost:7301/public/images/1760066868243-lotus1.png.png
  app.use('/public', express.static(uploadsDir))

  console.info(`Serving static files from: ${uploadsDir} at route: /public`)

  // Optional: A basic route to confirm the server is running
  app.get('/', (req: Request, res: Response) => {
    res.send('Express Server is running! Static files available at /public.')
  })

  // Start the server
  app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`)
  })
}
