import React, { useState } from 'react'
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core'
import { restrictToHorizontalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { AnimationData, ObjectType, TrackType } from '../../engine/animations'
import { CreateIcon } from './icon'

interface TrackProps {
  type: TrackType
  trackWidth?: number // Optional width for the track
  objectName: string | null | undefined
  objectData: AnimationData
  pixelsPerSecond: number
  visibleDurationMs: number
  onSequenceDragEnd: (animation: AnimationData, newStartTimeMs: number) => void
  onSelectObject: (objectType: ObjectType, objectId: string) => void
  onDeleteObject: (id: string, kind: ObjectType) => void
}

interface SequenceProps {
  objectName: string | null | undefined
  animation: AnimationData
  pixelsPerMs: number
  sequenceColor: string
  localLeft: number
  localWidth: number
  onSelectObject: (objectType: ObjectType, objectId: string) => void
  onDeleteObject: (id: string, kind: ObjectType) => void
}

// Draggable Sequence Component
const DraggableSequence: React.FC<SequenceProps> = ({
  objectName,
  animation,
  pixelsPerMs,
  sequenceColor,
  localLeft,
  localWidth,
  onSelectObject,
  onDeleteObject
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: animation.id,
    data: animation
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-row justify-between gap-2 relative h-10 rounded cursor-pointer ${sequenceColor} 
        hover:shadow-lg transition-shadow duration-200
        flex items-center px-2 select-none ${isDragging ? 'opacity-50' : ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        left: `${localLeft}px`,
        width: `${localWidth}px`
      }}
      {...listeners}
      {...attributes}
    >
      {/* <span className="text-xs">({animation.polygonId})</span> */}
      <div className="flex flex-row gap-1 justify-center">
        <div
          className="bg-black hover:bg-gray-600 pb-1 px-2 rounded"
          onClick={() => onSelectObject(animation.objectType, animation.polygonId)}
        >
          <span className="text-xs">Select</span>
          {/* <CreateIcon icon="folder-open" size="18px" /> */}
        </div>
        <div
          className="bg-red-500 hover:bg-gray-600 pb-1 px-2 rounded pt-1"
          onClick={() => {
            onDeleteObject(animation.polygonId, animation.objectType)
          }}
        >
          <CreateIcon icon="trash" size="18px" />
        </div>
        <span className="block truncate text-xs pt-[6px] pl-1">{objectName}</span>
      </div>
      <div>{/** right-side ctrls */}</div>
    </div>
  )
}

export const ObjectTrack: React.FC<TrackProps> = ({
  type,
  trackWidth = 900,
  objectName,
  objectData,
  pixelsPerSecond,
  visibleDurationMs = 0,
  onSequenceDragEnd,
  onSelectObject,
  onDeleteObject
}) => {
  const pixelsPerMs = pixelsPerSecond / 1000

  const [localLeft, setLocalLeft] = useState(objectData.startTimeMs * pixelsPerMs)
  const [localWidth, setLocalWidth] = useState(visibleDurationMs * pixelsPerMs)

  const trackColor = type === TrackType.Audio ? 'bg-slate-600' : 'bg-slate-600'
  const sequenceColor = type === TrackType.Audio ? 'bg-blue-400' : 'bg-[#3eb56c]'

  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Adjust activation constraints if needed
      activationConstraint: {
        distance: 5 // 5px movement before drag starts
      }
    })
  )

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {}

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta, over } = event

    if (active) {
      const animation = active.data.current as AnimationData

      // Calculate new time based on delta
      const deltaXInMs = Math.round(delta.x / pixelsPerMs)
      const newStartTimeMs = Math.max(0, animation.startTimeMs + deltaXInMs)

      setLocalLeft(newStartTimeMs * pixelsPerMs)
      onSequenceDragEnd(animation, newStartTimeMs)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToHorizontalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`relative h-[50px] ${trackWidth === 540 ? 'w-[540px]' : 'w-[960px]'} mb-1`}>
        {/* Track background */}
        <div
          className={`relative ${
            trackWidth === 540 ? 'w-[540px]' : 'w-[960px]'
          } h-[50px] ${trackColor}`}
        />

        {/* Sequences */}
        <div className="relative w-full h-full p-1 top-[-50px] z-10">
          {objectData && (
            <DraggableSequence
              objectName={objectName}
              animation={objectData}
              pixelsPerMs={pixelsPerMs}
              sequenceColor={sequenceColor}
              localLeft={localLeft}
              localWidth={localWidth}
              onSelectObject={onSelectObject}
              onDeleteObject={onDeleteObject}
            />
          )}
        </div>
      </div>
    </DndContext>
  )
}
