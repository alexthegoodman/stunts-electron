import { Editor } from './editor'
import { CanvasPipeline } from './pipeline'

export default class Container {
  // public editors: Editor[]
  // public pipelines: CanvasPipeline[]
  public editors: [Editor, CanvasPipeline][]

  constructor(editors: [Editor, CanvasPipeline][]) {
    this.editors = editors
  }
}
