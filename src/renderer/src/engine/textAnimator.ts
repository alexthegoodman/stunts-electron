import { vec2 } from 'gl-matrix'
import { EasingType, UIKeyframe, KeyframeValue } from './animations'
import { TextRenderer } from './text'
import { Vertex } from './vertex'
import { PolyfillQueue } from './polyfill'
import { WindowSize } from './camera'

export enum TextAnimationType {
  Typewriter = 'Typewriter',
  FadeIn = 'FadeIn',
  SlideIn = 'SlideIn',
  ScaleIn = 'ScaleIn',
  Bounce = 'Bounce',
  Wave = 'Wave',
  Glow = 'Glow',
  Shake = 'Shake',
  PopIn = 'PopIn',
  RollIn = 'RollIn',
  BlurIn = 'BlurIn',
  Elastic = 'Elastic',
  Matrix = 'Matrix',
  Glitch = 'Glitch',
  Neon = 'Neon',
  Fire = 'Fire',
  Water = 'Water',
  Electric = 'Electric',
  Magnetic = 'Magnetic',
  Rainbow = 'Rainbow',
  Sparkle = 'Sparkle',
  StylePunch = 'StylePunch'
}

export enum TextAnimationTiming {
  AllAtOnce = 'AllAtOnce',
  WordByWord = 'WordByWord',
  CharByChar = 'CharByChar',
  LineByLine = 'LineByLine',
  RandomOrder = 'RandomOrder',
  FromCenter = 'FromCenter',
  FromEdges = 'FromEdges'
}

export interface TextAnimationConfig {
  id: string
  type: TextAnimationType
  timing: TextAnimationTiming
  duration: number // in milliseconds
  delay: number // delay between characters/words
  intensity: number // 0-1 for effect intensity
  easing: EasingType
  startTime: number // when animation starts
  loop: boolean
  reverse: boolean
  customParams?: Record<string, any>
}

export interface AnimatedCharacter {
  index: number
  char: string
  position: vec2
  originalPosition: vec2
  scale: number
  rotation: number
  opacity: number
  color: [number, number, number, number]
  originalColor: [number, number, number, number]
  vertices: Vertex[]
  animationProgress: number
  animationDelay: number
  isVisible: boolean
  customData?: Record<string, any>
  // Style Punch properties
  isLastWord?: boolean
  punchWeight?: number
  punchSizeMultiplier?: number
  punchColor?: [number, number, number, number]
  punchItalic?: boolean
  punchFontApplied?: boolean // Flag to prevent re-rendering every frame
}

export class TextAnimator {
  private animationConfig: TextAnimationConfig
  private animatedCharacters: AnimatedCharacter[] = []
  private currentTime: number = 0
  private isPlaying: boolean = false
  private animationStartTime: number = 0
  private stylePunchFontsApplied: boolean = false // Track if we've done the font re-render

  constructor(textRenderer: TextRenderer, config: TextAnimationConfig) {
    this.animationConfig = config
    this.initializeCharacters(textRenderer)
  }

  private initializeCharacters(textRenderer: TextRenderer): void {
    if (!textRenderer.vertices) return

    console.warn('INITIALIZE CHARS')

    this.animatedCharacters = []
    const text = textRenderer.text

    // Count only renderable characters (excluding spaces and newlines)
    const renderableCharCount = text.split('').filter((c) => c !== '\n').length

    // Detect last word for Style Punch
    const lastWordIndices = this.getLastWordIndices(text)
    const numLastWordChars = lastWordIndices.size

    // Get style punch config if enabled
    const stylePunchConfig = this.getStylePunchConfig()

    let charIndex = 0
    let vertexIndex = 0

    // console.info('init text', text, 'renderable chars:', renderableCharCount)

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '\n') {
        continue // Don't increment charIndex or vertexIndex for spaces/newlines
      }

      // console.info('char', char)

      const charVertices = textRenderer.vertices.slice(vertexIndex, vertexIndex + 4)
      if (charVertices.length === 4) {
        // const position = vec2.fromValues(charVertices[0].position[0], charVertices[0].position[1])

        const centerX = (charVertices[0].position[0] + charVertices[2].position[0]) / 2
        const centerY = (charVertices[0].position[1] + charVertices[2].position[1]) / 2
        const position = vec2.fromValues(centerX, centerY)

        const isLastWord = lastWordIndices.has(i)

        const animatedChar: AnimatedCharacter = {
          index: vertexIndex / 4, // Use vertex-based index for updateTextRenderer
          char: char,
          position: vec2.clone(position),
          originalPosition: vec2.clone(position),
          scale: 1.0,
          rotation: 0.0,
          opacity: 1.0,
          color: [...charVertices[0].color] as [number, number, number, number],
          originalColor: [...charVertices[0].color] as [number, number, number, number],
          // vertices: charVertices,
          vertices: textRenderer.vertices.slice(vertexIndex, vertexIndex + 4).map((v) => ({
            position: [...v.position],
            tex_coords: [...v.tex_coords],
            color: [...v.color],
            gradient_coords: [...v.gradient_coords],
            object_type: v.object_type
          })),
          animationProgress: 0.0,
          animationDelay: this.calculateCharacterDelay(
            charIndex,
            renderableCharCount,
            isLastWord,
            numLastWordChars
          ),
          isVisible: true,
          customData: {},
          isLastWord: isLastWord,
          punchFontApplied: false,
          ...(isLastWord && stylePunchConfig ? stylePunchConfig : {})
        }

        this.animatedCharacters.push(animatedChar)
        vertexIndex += 4 // Only increment for actual rendered characters
        charIndex++ // Only increment charIndex for renderable characters
      }
    }
  }

  private getLastWordIndices(text: string): Set<number> {
    const indices = new Set<number>()

    // Trim trailing whitespace and newlines
    const trimmedText = text.trimEnd()
    if (trimmedText.length === 0) return indices

    // Find the last word by working backwards from the end
    let lastWordStart = trimmedText.length - 1

    // Skip trailing non-letter characters (like punctuation)
    while (lastWordStart >= 0 && !/[a-zA-Z0-9]/.test(trimmedText[lastWordStart])) {
      lastWordStart--
    }

    if (lastWordStart < 0) return indices

    // Find the start of the last word
    while (lastWordStart > 0 && /[a-zA-Z0-9]/.test(trimmedText[lastWordStart - 1])) {
      lastWordStart--
    }

    // Mark all character indices in the last word
    for (let i = lastWordStart; i < trimmedText.length; i++) {
      if (/[a-zA-Z0-9]/.test(trimmedText[i])) {
        indices.add(i)
      }
    }

    return indices
  }

  private getStylePunchConfig(): {
    punchWeight?: number
    punchSizeMultiplier?: number
    punchColor?: [number, number, number, number]
    punchItalic?: boolean
  } | null {
    const customParams = this.animationConfig.customParams
    if (!customParams || !customParams.stylePunchEnabled) return null

    const punchWeights = customParams.punchWeights as number[] | undefined
    const punchSizeMultipliers = customParams.punchSizeMultipliers as number[] | undefined
    const punchColors = customParams.punchColors as [number, number, number, number][] | undefined
    const punchItalic = customParams.punchItalic as boolean | undefined

    // Randomly select one option from each array
    const config: any = {}

    if (punchWeights && punchWeights.length > 0) {
      config.punchWeight = punchWeights[Math.floor(Math.random() * punchWeights.length)]
    }

    if (punchSizeMultipliers && punchSizeMultipliers.length > 0) {
      config.punchSizeMultiplier =
        punchSizeMultipliers[Math.floor(Math.random() * punchSizeMultipliers.length)]
    }

    if (punchColors && punchColors.length > 0) {
      config.punchColor = punchColors[Math.floor(Math.random() * punchColors.length)]
    }

    if (punchItalic !== undefined) {
      config.punchItalic = punchItalic
    }

    return Object.keys(config).length > 0 ? config : null
  }

  private calculateCharacterDelay(
    charIndex: number,
    totalChars: number,
    isLastWord: boolean = false,
    numLastWordChars: number = 0
  ): number {
    const baseDelay = this.animationConfig.delay

    if (isLastWord && this.animationConfig.customParams?.stylePunchEnabled) {
      return (totalChars - numLastWordChars) * baseDelay
    }

    return 0

    // switch (this.animationConfig.timing) {
    //   case TextAnimationTiming.AllAtOnce:
    //     return 0
    //   case TextAnimationTiming.CharByChar:
    //     return charIndex * baseDelay
    //   case TextAnimationTiming.RandomOrder:
    //     return Math.random() * (totalChars * baseDelay)
    //   case TextAnimationTiming.FromCenter:
    //     const centerIndex = Math.floor(totalChars / 2)
    //     return Math.abs(charIndex - centerIndex) * baseDelay
    //   case TextAnimationTiming.FromEdges:
    //     const edgeDistance = Math.min(charIndex, totalChars - 1 - charIndex)
    //     return (Math.floor(totalChars / 2) - edgeDistance) * baseDelay
    //   default:
    //     return charIndex * baseDelay
    // }
  }

  public startAnimation(startTime: number = 0): void {
    this.isPlaying = true
    this.animationStartTime = startTime
    this.currentTime = startTime
    this.stylePunchFontsApplied = false // Reset font re-render flag

    console.info('Starting text animation:', this.animationConfig.id)

    this.animatedCharacters.forEach((ac) => {
      ac.punchFontApplied = false
    })
  }

  public stopAnimation(): void {
    this.isPlaying = false
    this.resetCharacters()

    console.info('Stopping text animation:', this.animationConfig.id)
  }

  public pauseAnimation(): void {
    this.isPlaying = false
  }

  public resumeAnimation(): void {
    this.isPlaying = true
  }

  public updateAnimation(
    currentTime: number,
    queue: PolyfillQueue,
    textRenderer: TextRenderer,
    windowSize: WindowSize
  ): void {
    if (!this.isPlaying) return

    this.currentTime = currentTime
    const elapsedTime = currentTime - this.animationStartTime

    if (elapsedTime < 0) return

    // Check if we have exit animation parameters
    const hasExitAnimation = this.animationConfig.customParams?.hasExitAnimation
    const exitAnimationDuration = this.animationConfig.customParams?.exitAnimationDuration || 0
    const entranceDuration = this.getTotalAnimationDuration()
    const totalWithExit = hasExitAnimation
      ? entranceDuration + exitAnimationDuration
      : entranceDuration

    // Track if we need to re-render text for font changes
    let needsFontRerender = false

    for (const char of this.animatedCharacters) {
      const charStartTime = char.animationDelay
      const charElapsedTime = elapsedTime - charStartTime

      if (charElapsedTime >= 0) {
        // Determine if we're in entrance or exit phase
        const charEntranceDuration = this.animationConfig.duration
        const isInExitPhase = hasExitAnimation && charElapsedTime >= charEntranceDuration

        if (isInExitPhase) {
          // Exit animation phase - play in reverse
          const exitElapsedTime = charElapsedTime - charEntranceDuration
          const exitProgress = Math.min(exitElapsedTime / exitAnimationDuration, 1.0)
          // Reverse progress: start at 1.0 and go to 0.0
          char.animationProgress = this.applyEasing(1.0 - exitProgress)
        } else {
          // Entrance animation phase
          const progress = Math.min(charElapsedTime / this.animationConfig.duration, 1.0)
          char.animationProgress = this.applyEasing(progress)
        }

        this.updateCharacterAnimation(char)

        // Check if this character just triggered font punch (only once)
        if (
          this.animationConfig.customParams?.stylePunchEnabled &&
          char.isLastWord &&
          char.punchFontApplied &&
          !this.stylePunchFontsApplied
        ) {
          needsFontRerender = true
        }
      }
      // else {
      //   this.resetCharacterToInitialState(char)
      // }
    }

    // Apply character styles to TextRenderer if needed for StylePunch (only once)
    if (needsFontRerender && this.animationConfig.customParams?.stylePunchEnabled) {
      this.applyStylePunchFonts(textRenderer, queue, windowSize)
      this.stylePunchFontsApplied = true // Mark as done
    }

    this.updateTextRenderer(queue, textRenderer)

    // Check if animation is complete
    if (elapsedTime >= totalWithExit) {
      if (this.animationConfig.loop) {
        this.animationStartTime = currentTime
      } else {
        this.isPlaying = false
      }
    }

    // console.info("Updating text animation:", this.animationConfig.id, {
    //   elapsedTime,
    //   isPlaying: this.isPlaying,
    //   totalDuration: this.getTotalAnimationDuration(),
    // });
  }

  private updateCharacterAnimation(char: AnimatedCharacter): void {
    const progress = char.animationProgress
    const intensity = this.animationConfig.intensity

    // First apply the base animation
    switch (this.animationConfig.type) {
      case TextAnimationType.Typewriter:
        char.isVisible = progress > 0
        char.opacity = progress > 0 ? 1.0 : 0.0
        break

      case TextAnimationType.FadeIn:
        char.opacity = progress
        break

      case TextAnimationType.SlideIn:
        const slideOffset = (1 - progress) * 200 * intensity
        char.position[0] = char.originalPosition[0] + slideOffset
        char.opacity = progress
        break

      case TextAnimationType.ScaleIn:
        char.scale = progress * intensity
        break

      case TextAnimationType.Bounce:
        // Bounce in from above and settle - decreasing bounce amplitude
        const bounceHeight = Math.sin(progress * Math.PI * 3) * 50 * intensity * (1 - progress)
        char.position[1] = char.originalPosition[1] + bounceHeight
        char.opacity = Math.min(progress * 2, 1.0) // Fade in quickly
        break

      case TextAnimationType.Wave:
        // Wave in and settle - amplitude decreases over time
        const waveOffset =
          Math.sin(progress * Math.PI * 2 + char.index * 0.5) * 30 * intensity * (1 - progress)
        char.position[1] = char.originalPosition[1] + waveOffset * 0.001
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.Glow:
        // Glow pulses and settles to normal brightness
        const glowIntensity =
          (Math.sin(progress * Math.PI * 4) + 1) * 0.5 * intensity * (1 - progress)
        char.color[0] = char.originalColor[0] + glowIntensity
        char.color[1] = char.originalColor[1] + glowIntensity
        char.color[2] = char.originalColor[2] + glowIntensity
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.Shake:
        // Shake in and settle - amplitude decreases over time
        const shakeX = (Math.random() - 0.5) * 15 * intensity * (1 - progress)
        const shakeY = (Math.random() - 0.5) * 15 * intensity * (1 - progress)
        char.position[0] = char.originalPosition[0] + shakeX
        char.position[1] = char.originalPosition[1] + shakeY
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.PopIn:
        const popScale = progress < 0.7 ? progress * 1.4 : 1.0 + (1 - progress) * 0.3
        char.scale = popScale
        // console.info('progress', progress)
        // char.scale = progress
        char.opacity = progress
        break

      case TextAnimationType.RollIn:
        // Roll in and settle - rotation decreases, scale grows to normal
        char.rotation = (1 - progress) * Math.PI * 2
        char.scale = progress
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.Elastic:
        // Elastic bounce that settles - already has (1 - progress) decay
        const elasticScale = 1 + Math.sin(progress * Math.PI * 6) * 0.3 * intensity * (1 - progress)
        char.scale = elasticScale
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.Rainbow:
        // Rainbow cycle that settles to original color
        const rainbowProgress = progress < 0.7 ? progress / 0.7 : 1.0
        const colorBlend = progress < 0.7 ? 1.0 : 1.0 - (progress - 0.7) / 0.3
        const hue = (rainbowProgress * 360 + char.index * 30) % 360
        const rgb = this.hslToRgb(hue / 360, 1, 0.5)
        char.color[0] = rgb[0] * colorBlend + char.originalColor[0] * (1 - colorBlend)
        char.color[1] = rgb[1] * colorBlend + char.originalColor[1] * (1 - colorBlend)
        char.color[2] = rgb[2] * colorBlend + char.originalColor[2] * (1 - colorBlend)
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      case TextAnimationType.Glitch:
        // Glitch effect that settles - decreasing glitch probability
        const glitchIntensity = (1 - progress) * intensity
        if (Math.random() < 0.1 * glitchIntensity) {
          char.position[0] = char.originalPosition[0] + (Math.random() - 0.5) * 20 * glitchIntensity
          const colorGlitch = 1 - progress * 0.5 // Reduce color distortion over time
          char.color[0] = char.originalColor[0] * (1 - colorGlitch) + Math.random() * colorGlitch
          char.color[1] = char.originalColor[1] * (1 - colorGlitch) + Math.random() * colorGlitch
          char.color[2] = char.originalColor[2] * (1 - colorGlitch) + Math.random() * colorGlitch
        } else {
          char.position[0] = char.originalPosition[0]
          char.color = [...char.originalColor]
        }
        char.opacity = Math.min(progress * 1.5, 1.0)
        break

      default:
        break
    }

    // Apply StylePunch modifier if enabled (works on top of any base animation)
    if (this.animationConfig.customParams?.stylePunchEnabled && char.isLastWord) {
      const punchDelay = this.animationConfig.customParams?.punchDelay || 0
      const punchDuration = this.animationConfig.customParams?.punchDuration || 500
      const totalDuration = this.animationConfig.duration
      const timeSinceStart = progress * totalDuration

      // Apply font weight/italic changes ONCE when punch effect starts
      if (
        timeSinceStart >= punchDelay &&
        !char.punchFontApplied &&
        (char.punchWeight || char.punchItalic)
      ) {
        // Mark as applied to prevent re-rendering every frame
        char.punchFontApplied = true
        // Note: Font re-rendering will be triggered at the TextRenderer level
      }

      // Apply size multiplier (multiply with base animation scale)
      if (char.punchSizeMultiplier) {
        if (timeSinceStart >= punchDelay) {
          const punchProgress = Math.min((timeSinceStart - punchDelay) / punchDuration, 1.0)
          const easedPunchProgress = this.applyEasing(punchProgress)
          const punchScale = 1.0 + (char.punchSizeMultiplier - 1.0) * easedPunchProgress
          char.scale *= punchScale // Multiply with existing scale from base animation
        }
      }

      // Apply color change (blend with base animation color)
      if (char.punchColor) {
        if (timeSinceStart >= punchDelay) {
          const punchProgress = Math.min((timeSinceStart - punchDelay) / punchDuration, 1.0)
          const easedPunchProgress = this.applyEasing(punchProgress)

          // Blend from current color (after base animation) to punch color
          const baseColor = [...char.color]
          char.color[0] = baseColor[0] + (char.punchColor[0] - baseColor[0]) * easedPunchProgress
          char.color[1] = baseColor[1] + (char.punchColor[1] - baseColor[1]) * easedPunchProgress
          char.color[2] = baseColor[2] + (char.punchColor[2] - baseColor[2]) * easedPunchProgress
        }
      }
    }
  }

  private resetCharacterToInitialState(char: AnimatedCharacter): void {
    char.position = vec2.clone(char.originalPosition)
    char.scale = 1.0
    char.rotation = 0.0
    char.opacity = 1.0
    char.color = [...char.originalColor]
    char.isVisible = true
    char.animationProgress = 0.0

    // For typewriter effect, characters should start hidden
    if (this.animationConfig.type === TextAnimationType.Typewriter) {
      char.isVisible = false
      char.opacity = 0.0
    }
  }

  private resetCharacters(): void {
    for (const char of this.animatedCharacters) {
      // this.resetCharacterToInitialState(char)
    }
  }

  private applyEasing(progress: number): number {
    switch (this.animationConfig.easing) {
      case EasingType.Linear:
        return progress
      case EasingType.EaseIn:
        return progress * progress
      case EasingType.EaseOut:
        return 1 - Math.pow(1 - progress, 2)
      case EasingType.EaseInOut:
        return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      default:
        return progress
    }
  }

  private updateTextRenderer(queue: PolyfillQueue, textRenderer: TextRenderer): void {
    if (!textRenderer.vertices) return

    const updatedVertices = [...textRenderer.vertices]

    // For typewriter effect, hide all vertices initially
    if (this.animationConfig.type === TextAnimationType.Typewriter) {
      for (const vertex of updatedVertices) {
        vertex.color = [0, 0, 0, 0]
      }
    }

    for (const char of this.animatedCharacters) {
      const startIndex = char.index * 4

      for (let i = 0; i < 4; i++) {
        const vertexIndex = startIndex + i
        if (vertexIndex < updatedVertices.length) {
          const vertex = updatedVertices[vertexIndex]

          // Apply transformations
          if (char.isVisible) {
            // Apply scale to vertex position relative to character center
            const originalVertex = char.vertices[i]
            const centerX = char.originalPosition[0] // originalPosition and position is local space
            const centerY = char.originalPosition[1]

            // Scale relative to character center
            // const scaledX = centerX + (originalVertex.position[0] - centerX) * char.scale // TODO: this causes a lot of offset, although it does scale the size correctly
            // const scaledY = centerY + (originalVertex.position[1] - centerY) * char.scale

            // const scaledX = originalVertex.position[0] * char.scale // TODO: this causes a lot of offset, although it does scale the size correctly
            // const scaledY = originalVertex.position[1] * char.scale

            let scale = char.scale

            const scaledX = centerX + (originalVertex.position[0] - centerX) * scale // TODO: this causes a lot of offset, although it does scale the size correctly
            const scaledY = centerY + (originalVertex.position[1] - centerY) * scale

            // Apply position offset
            // vertex.position[0] = scaledX + (char.position[0] - char.originalPosition[0])
            // vertex.position[1] = scaledY + (char.position[1] - char.originalPosition[1])

            vertex.position[0] = scaledX + (char.position[0] - char.originalPosition[0])
            vertex.position[1] = scaledY + (char.position[1] - char.originalPosition[1])

            // console.info('vertex.position', char.originalPosition, vertex.position)

            vertex.color = [...char.color]
          } else {
            vertex.color = [0, 0, 0, 0] // Make invisible
          }
        }
      }
    }

    // Update vertex buffer
    queue.writeBuffer(
      textRenderer.vertexBuffer,
      0,
      new Float32Array(
        updatedVertices.flatMap((v) => [
          ...v.position,
          ...v.tex_coords,
          ...v.color,
          ...v.gradient_coords,
          v.object_type
        ])
      )
    )
  }

  private getTotalAnimationDuration(): number {
    const maxDelay = Math.max(...this.animatedCharacters.map((c) => c.animationDelay))
    return maxDelay + this.animationConfig.duration
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b

    if (s === 0) {
      r = g = b = l // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return [r, g, b]
  }

  public getConfig(): TextAnimationConfig {
    return { ...this.animationConfig }
  }

  public updateConfig(config: Partial<TextAnimationConfig>, textRenderer: TextRenderer): void {
    this.animationConfig = { ...this.animationConfig, ...config }
    this.initializeCharacters(textRenderer)
  }

  public getAnimatedCharacters(): AnimatedCharacter[] {
    return this.animatedCharacters
  }

  public isAnimationPlaying(): boolean {
    return this.isPlaying
  }

  private applyStylePunchFonts(
    textRenderer: TextRenderer,
    queue: PolyfillQueue,
    windowSize: WindowSize
  ): void {
    console.info('this.animatedCharacters', this.animatedCharacters)
    // Apply character styles and trigger re-render
    for (const char of this.animatedCharacters) {
      if (char.isLastWord && char.punchFontApplied) {
        // Update character style in TextRenderer
        textRenderer.updateCharacterStyle(char.index, char.punchWeight, char.punchItalic)
      }
    }

    // Trigger re-render with new font styles
    if (textRenderer.device) {
      textRenderer.renderText(textRenderer.device, queue, windowSize)
    }
  }
}

// Factory function to create common text animation presets
export function createTextAnimationPreset(
  type: TextAnimationType,
  customConfig?: Partial<TextAnimationConfig>
): TextAnimationConfig {
  const baseConfig: TextAnimationConfig = {
    id: `text-animation-${Date.now()}`,
    type,
    timing: TextAnimationTiming.CharByChar,
    duration: 1000,
    delay: 50,
    intensity: 1.0,
    easing: EasingType.EaseOut,
    startTime: 0,
    loop: false,
    reverse: false,
    ...customConfig
  }

  // Preset-specific configurations
  switch (type) {
    case TextAnimationType.Typewriter:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.CharByChar,
        duration: 100,
        delay: 100,
        easing: EasingType.Linear
      }

    case TextAnimationType.Wave:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.AllAtOnce,
        duration: 2000,
        loop: true,
        easing: EasingType.EaseInOut
      }

    case TextAnimationType.Bounce:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.CharByChar,
        duration: 800,
        delay: 100,
        easing: EasingType.EaseOut
      }

    case TextAnimationType.PopIn:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.CharByChar,
        duration: 600,
        delay: 80,
        easing: EasingType.EaseOut
      }

    case TextAnimationType.Rainbow:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.AllAtOnce,
        duration: 3000,
        loop: true,
        easing: EasingType.Linear
      }

    case TextAnimationType.Glitch:
      return {
        ...baseConfig,
        timing: TextAnimationTiming.AllAtOnce,
        duration: 2000,
        intensity: 0.5,
        easing: EasingType.Linear
      }

    default:
      return baseConfig
  }
}
