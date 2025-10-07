import { AnimationData, AnimationProperty, ObjectType } from '@renderer/engine/animations'
import { GPUPolyfill } from '@renderer/engine/polyfill'
import { MousePosition, StVideo } from '@renderer/engine/video'

export const processVideoZoom = (
  gpuResources: GPUPolyfill,
  zoom: number,
  property: AnimationProperty,
  videoItem: StVideo,
  currentTimeMs: number,
  scaleMultiplier: number
) => {
  let halfVideoWidth = videoItem.dimensions[0] / 2.0 / scaleMultiplier
  let halfVideoHeight = videoItem.dimensions[1] / 2.0 / scaleMultiplier
  const elapsedMs = currentTimeMs

  const autoFollowDelay = 150

  // if (videoItem.mousePositions && videoItem.sourceData) {
  // Check if we need to update the shift points
  const shouldUpdateShift = videoItem.lastShiftTime
    ? elapsedMs - videoItem.lastShiftTime > autoFollowDelay
    : (() => {
        videoItem.lastShiftTime = elapsedMs

        // Get all positions after current time
        // const relevantPositions = property.keyframes.filter(
        //   (p) => p.time >= elapsedMs
        // );

        // Find first position after delay
        const endPosition = property.keyframes.find((p) => p.time > elapsedMs + autoFollowDelay)

        // Find the position that comes before it
        const startPosition = property.keyframes.find((p) => p.time < (endPosition?.time ?? 0))

        if (
          startPosition &&
          endPosition &&
          startPosition.value.type === 'Zoom' &&
          endPosition.value.type === 'Zoom'
        ) {
          // videoItem.lastStartPoint = [
          //   startPosition.value.value.position[0] + halfVideoWidth,
          //   startPosition.value.value.position[1] + halfVideoHeight,
          //   startPosition.time,
          // ];
          // videoItem.lastEndPoint = [
          //   endPosition.value.value.position[0] + halfVideoWidth,
          //   endPosition.value.value.position[1] + halfVideoHeight,
          //   endPosition.time,
          // ];

          videoItem.lastStartPoint = [
            startPosition.value.value.position[0] + 0,
            startPosition.value.value.position[1] + 0,
            startPosition.time
          ]
          videoItem.lastEndPoint = [
            endPosition.value.value.position[0] + 0,
            endPosition.value.value.position[1] + 0,
            endPosition.time
          ]
        }

        return false
      })()

  const delayOffset = 0 // time shift
  const minDistance = 30.0 // Min distance to incur change
  let baseAlpha = 0.005 // Your current default value
  let maxAlpha = 0.05 // Maximum blending speed
  let scalingFactor = 0.005 // Controls how quickly alpha increases with distance

  let mousePositions: MousePosition[] = []
  property.keyframes.forEach((kf) => {
    if (kf.value.type === 'Zoom') {
      mousePositions.push({
        timestamp: kf.time,
        // point: [
        //   kf.value.value.position[0] + halfVideoWidth,
        //   kf.value.value.position[1] + halfVideoHeight,
        //   kf.time,
        // ],
        point: [kf.value.value.position[0] + 0, kf.value.value.position[1] + 0, kf.time]
      })
    }
  })

  // Update shift points if needed
  if (shouldUpdateShift) {
    // Find current position (after elapsed - delay + offset)
    const startPoint = mousePositions.find(
      (p) =>
        p.timestamp > elapsedMs - autoFollowDelay + delayOffset &&
        p.timestamp < videoItem.sourceDurationMs
    )

    // Find future position (after the first position's timestamp + minimum gap)
    const endPoint = mousePositions.find(
      (p) =>
        p.timestamp > (startPoint?.timestamp ?? 0) + autoFollowDelay &&
        p.timestamp < videoItem.sourceDurationMs
    )

    if (startPoint && endPoint && videoItem.lastStartPoint && videoItem.lastEndPoint) {
      const dx = startPoint.point[0] - videoItem.lastStartPoint[0]
      const dy = startPoint.point[1] - videoItem.lastStartPoint[1]
      const distance = Math.sqrt(dx * dx + dy * dy)

      const dx2 = endPoint.point[0] - videoItem.lastEndPoint[0]
      const dy2 = endPoint.point[1] - videoItem.lastEndPoint[1]
      const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

      if (distance >= minDistance || distance2 >= minDistance) {
        videoItem.lastShiftTime = elapsedMs
        videoItem.lastStartPoint = startPoint.point
        videoItem.lastEndPoint = endPoint.point

        const maxDistance = Math.max(distance, distance2)
        const dynamicAlpha =
          baseAlpha + (maxAlpha - baseAlpha) * (1.0 - Math.exp(-scalingFactor * maxDistance))

        videoItem.dynamicAlpha = dynamicAlpha

        // console.info("update shift points", dynamicAlpha);
      }
    }
  }

  // Always interpolate between the current shift points
  if (videoItem.lastStartPoint && videoItem.lastEndPoint) {
    // console.info(
    //   "points",
    //   videoItem.lastStartPoint,
    //   videoItem.lastEndPoint
    // );

    const clampedElapsedMs = Math.min(
      Math.max(elapsedMs, videoItem.lastStartPoint[2]!),
      videoItem.lastEndPoint[2]!
    )

    const timeProgress =
      (clampedElapsedMs - videoItem.lastStartPoint[2]!) /
      (videoItem.lastEndPoint[2]! - videoItem.lastStartPoint[2]!)

    // console.info(
    //   "timeProgerss",
    //   elapsedMs,
    //   clampedElapsedMs,
    //   timeProgress
    // );

    const interpolatedX =
      videoItem.lastStartPoint[0] +
      (videoItem.lastEndPoint[0] - videoItem.lastStartPoint[0]) * timeProgress
    //     *
    // this.scaleMultiplier;
    const interpolatedY =
      videoItem.lastStartPoint[1] +
      (videoItem.lastEndPoint[1] - videoItem.lastStartPoint[1]) * timeProgress
    //     *
    // this.scaleMultiplier;

    // console.info("interpolated", interpolatedX, interpolatedY);

    // const newCenterPoint: Point = {
    //   x:
    //     (interpolatedX / videoItem.sourceDimensions[0]) *
    //     videoItem.dimensions[0],
    //   y:
    //     (interpolatedY / videoItem.sourceDimensions[1]) *
    //     videoItem.dimensions[1],
    // };

    // console.info("newCenterPoint", interpolatedX, interpolatedY);

    // Smooth transition with existing center point
    const blendedCenterPoint = videoItem.lastCenterPoint
      ? {
          x:
            videoItem.lastCenterPoint.x * (1.0 - videoItem.dynamicAlpha) +
            interpolatedX * videoItem.dynamicAlpha,
          y:
            videoItem.lastCenterPoint.y * (1.0 - videoItem.dynamicAlpha) +
            interpolatedY * videoItem.dynamicAlpha
        }
      : {
          x: interpolatedX,
          y: interpolatedY
        }

    const scaledCenterPoint = {
      x: blendedCenterPoint.x * scaleMultiplier,
      y: blendedCenterPoint.y * scaleMultiplier
    }

    // console.info("blendedCenterPoint", blendedCenterPoint);

    videoItem.updateZoom(gpuResources.queue!, zoom, scaledCenterPoint)
    videoItem.lastCenterPoint = blendedCenterPoint

    // this.updateVideoItemPopout(
    //   videoItem,
    //   blendedCenterPoint,
    //   1.5,
    //   { width: 200, height: 200 }
    // );
  }
  // }
}
