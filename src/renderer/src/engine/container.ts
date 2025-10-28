import { Editor } from './editor'
import { CanvasPipeline } from './pipeline'

export default class Container {
  public editors: Editor[]
  public pipelines: CanvasPipeline[]

  constructor(editors: Editor[], pipelines: CanvasPipeline[]) {
    this.editors = editors
    this.pipelines = pipelines
  }
}
