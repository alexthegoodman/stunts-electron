import { v4 as uuidv4 } from 'uuid'

import { SavedState, Sequence, TrackType } from "@renderer/engine/animations"

export const getEmptyVideoData = (isVertical: boolean) => {
    let currentSequenceId = uuidv4().toString()
    
        const defaultVideoSequence: Sequence = {
          id: currentSequenceId,
          name: 'Sequence #1',
          backgroundFill: { type: 'Color', value: [200, 200, 200, 255] },
          // durationMs: 20000,
          activePolygons: [],
          polygonMotionPaths: [],
          activeTextItems: [],
          activeImageItems: [],
          activeVideoItems: []
        }
    
        let dimensions = isVertical
          ? {
              width: 500,
              height: 900
            }
          : {
              width: 900,
              height: 500
            }
    
        const emptyVideoState: SavedState = {
          sequences: [defaultVideoSequence],
          timeline_state: {
            timeline_sequences: [
              {
                id: uuidv4(),
                sequenceId: currentSequenceId,
                trackType: TrackType.Video
                // startTimeMs: 0
                // duration_ms: 20000,
              }
            ]
          },
          settings: {
            dimensions
          }
        }

        return emptyVideoState
}