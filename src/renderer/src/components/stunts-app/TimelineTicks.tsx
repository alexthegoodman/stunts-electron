import { useWindowSize } from '@uidotdev/usehooks'
import React, { useState, useCallback, useMemo } from 'react'

interface TimelineTicksProps {
  trackWidth?: number // Width of the track (540 or 960)
  pixelsPerSecond: number
  durationMs: number // Duration of the sequence in milliseconds
  onSeek: (timeMs: number) => void // Callback to seek to a time
}

export const TimelineTicks: React.FC<TimelineTicksProps> = ({
  trackWidth = 960,
  pixelsPerSecond,
  durationMs,
  onSeek
}) => {
  const [hoverPositionX, setHoverPositionX] = useState<number | null>(null)
  const { width: screenWidth, height: screenHeight } = useWindowSize()
  const sidebarWidth = 500

  // Constants calculated from props
  const pixelsPerMs = useMemo(() => pixelsPerSecond / 1000, [pixelsPerSecond])
  const msPerPixel = useMemo(() => 1000 / pixelsPerSecond, [pixelsPerSecond])
  const totalWidth = trackWidth
  const allSeconds = Math.ceil(durationMs / 1000)
  // calculate based on window width and pixelsPerSecond instead for visual ticks, Math.max(x, allSeconds)
  const totalSeconds = Math.max((screenWidth - sidebarWidth) / pixelsPerSecond, allSeconds)

  // --- Utility Functions ---

  // Calculates the time in milliseconds based on the X position
  const calculateTimeFromX = useCallback(
    (x: number): number => {
      // Ensure the position is within bounds
      const clampedX = Math.min(Math.max(0, x), totalWidth)
      let timeMs = clampedX * msPerPixel

      // Do not exceed the total duration
      if (timeMs > durationMs) {
        timeMs = durationMs
      }

      return Math.round(timeMs) // Round to the nearest millisecond
    },
    [msPerPixel, totalWidth, durationMs]
  )

  // Formats milliseconds into a standard time label (e.g., 10s 250ms)
  const formatTimeLabel = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000)
    const ms = timeMs % 1000

    // Show seconds and milliseconds for precision
    return `${totalSeconds}s ${ms}ms`
  }

  // --- Event Handlers ---

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Get the X position relative to the ruler container
    const x = event.nativeEvent.offsetX
    setHoverPositionX(x)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoverPositionX(null)
  }, [])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const x = event.nativeEvent.offsetX
      const timeToSeek = calculateTimeFromX(x)
      onSeek(timeToSeek)
    },
    [calculateTimeFromX, onSeek]
  )

  // --- Tick Generation (Original Logic for Static Ticks) ---
  const ticks: any = useMemo(() => {
    const generatedTicks = []
    for (let i = 0; i <= totalSeconds; i++) {
      const position = i * 1000 * pixelsPerMs

      if (position <= totalWidth) {
        generatedTicks.push({
          position,
          label: `${i}s`,
          isMajor: i % 5 === 0
        })
      }
    }
    return generatedTicks
  }, [totalSeconds, pixelsPerMs, totalWidth])

  // --- Hover Tick Data ---
  const hoverTimeMs = hoverPositionX !== null ? calculateTimeFromX(hoverPositionX) : null
  const hoverTimeLabel = hoverTimeMs !== null ? formatTimeLabel(hoverTimeMs) : ''

  return (
    <div
      className={`relative h-[24px] ${trackWidth === 540 ? 'w-[540px]' : 'w-[960px]'} mb-1 z-50`}
    >
      {/* Timeline ruler background */}
      <div
        className={`relative ${
          trackWidth === 540 ? 'w-[540px]' : 'w-[960px]'
        } h-[30px] bg-slate-700 border-b border-slate-500 cursor-pointer`}
        // Attach all interaction handlers to the ruler container
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* 1. Static Tick marks (for seconds) */}
        {ticks.map((tick, index) => (
          <div
            key={index}
            className="absolute flex flex-col items-center pointer-events-none" // Ignore mouse events on static ticks
            style={{ left: `${tick.position}px`, transform: 'translateX(-50%)' }}
          >
            {/* Tick line */}
            <div
              className={`${tick.isMajor ? 'h-[16px] w-[2px]' : 'h-[8px] w-[1px]'} bg-slate-300`}
            />
            {/* Tick label - only show for major ticks */}
            {tick.isMajor && (
              <span className="text-[10px] text-slate-300 mt-[2px] absolute top-[14px]">
                {tick.label}
              </span>
            )}
          </div>
        ))}

        {/* 2. Dynamic Hover Tick and Tooltip */}
        {hoverPositionX !== null && (
          <div
            className="absolute top-0 h-full flex flex-col items-center pointer-events-none"
            style={{ left: `${hoverPositionX}px`, transform: 'translateX(-50%)' }}
          >
            {/* Hover Tick Line (Make it distinct, e.g., red) */}
            <div className="h-[30px] w-[1px] bg-teal-400 opacity-70" />

            {/* Tooltip */}
            <div className="absolute top-[18px] bg-teal-600 text-white text-[10px] px-1 py-0.5 rounded-sm whitespace-nowrap">
              {hoverTimeLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
