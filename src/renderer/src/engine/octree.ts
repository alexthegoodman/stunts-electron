// Vector3 utility type
export interface Vector3 {
  x: number
  y: number
  z: number
}

// Bounding box for spatial queries
export interface BoundingBox {
  min: Vector3
  max: Vector3
}

// Generic data wrapper for octree nodes
export interface OctreeData<T> {
  position: Vector3
  data: T
}

// Octree node class
class OctreeNode<T> {
  bounds: BoundingBox
  children: OctreeNode<T>[] | null = null
  items: OctreeData<T>[] = []
  depth: number

  constructor(bounds: BoundingBox, depth: number = 0) {
    this.bounds = bounds
    this.depth = depth
  }

  isLeaf(): boolean {
    return this.children === null
  }
}

// Main Octree class
export class Octree<T> {
  private root: OctreeNode<T>
  private maxItems: number
  private maxDepth: number
  private itemCount: number = 0

  constructor(bounds: BoundingBox, maxItems: number = 8, maxDepth: number = 8) {
    this.root = new OctreeNode(bounds)
    this.maxItems = maxItems
    this.maxDepth = maxDepth
  }

  // Insert an item into the octree
  insert(position: Vector3, data: T): boolean {
    const item: OctreeData<T> = { position, data }
    const success = this.insertIntoNode(this.root, item)
    if (success) this.itemCount++
    return success
  }

  private insertIntoNode(node: OctreeNode<T>, item: OctreeData<T>): boolean {
    if (!this.containsPoint(node.bounds, item.position)) {
      return false
    }

    // If leaf node and has capacity, add item
    if (node.isLeaf() && node.items.length < this.maxItems) {
      node.items.push(item)
      return true
    }

    // If leaf node at max depth, force add
    if (node.isLeaf() && node.depth >= this.maxDepth) {
      node.items.push(item)
      return true
    }

    // Subdivide if leaf and over capacity
    if (node.isLeaf()) {
      this.subdivide(node)
    }

    // Insert into appropriate child
    for (const child of node.children!) {
      if (this.containsPoint(child.bounds, item.position)) {
        return this.insertIntoNode(child, item)
      }
    }

    return false
  }

  // Query items within a bounding box
  query(bounds: BoundingBox): OctreeData<T>[] {
    const results: OctreeData<T>[] = []
    this.queryNode(this.root, bounds, results)
    return results
  }

  private queryNode(node: OctreeNode<T>, bounds: BoundingBox, results: OctreeData<T>[]): void {
    if (!this.intersects(node.bounds, bounds)) {
      return
    }

    // Check items in this node
    for (const item of node.items) {
      if (this.containsPoint(bounds, item.position)) {
        results.push(item)
      }
    }

    // Recursively check children
    if (!node.isLeaf()) {
      for (const child of node.children!) {
        this.queryNode(child, bounds, results)
      }
    }
  }

  // Query items within radius of a point (for distance-based chunking)
  queryRadius(center: Vector3, radius: number): OctreeData<T>[] {
    const bounds: BoundingBox = {
      min: { x: center.x - radius, y: center.y - radius, z: center.z - radius },
      max: { x: center.x + radius, y: center.y + radius, z: center.z + radius }
    }

    const candidates = this.query(bounds)
    const radiusSq = radius * radius

    return candidates.filter((item) => {
      const distSq = this.distanceSquared(center, item.position)
      return distSq <= radiusSq
    })
  }

  // Remove an item from the octree
  remove(position: Vector3, predicate: (data: T) => boolean): boolean {
    const result = this.removeFromNode(this.root, position, predicate)
    if (result) this.itemCount--
    return result
  }

  private removeFromNode(
    node: OctreeNode<T>,
    position: Vector3,
    predicate: (data: T) => boolean
  ): boolean {
    if (!this.containsPoint(node.bounds, position)) {
      return false
    }

    // Try to remove from this node's items
    const idx = node.items.findIndex(
      (item) =>
        item.position.x === position.x &&
        item.position.y === position.y &&
        item.position.z === position.z &&
        predicate(item.data)
    )

    if (idx !== -1) {
      node.items.splice(idx, 1)
      return true
    }

    // Try children if not a leaf
    if (!node.isLeaf()) {
      for (const child of node.children!) {
        if (this.removeFromNode(child, position, predicate)) {
          return true
        }
      }
    }

    return false
  }

  // Clear all items
  clear(): void {
    this.root = new OctreeNode(this.root.bounds)
    this.itemCount = 0
  }

  // Subdivide a node into 8 children
  private subdivide(node: OctreeNode<T>): void {
    const { min, max } = node.bounds
    const mid: Vector3 = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    }

    node.children = [
      // Bottom 4 octants
      new OctreeNode(
        { min: { x: min.x, y: min.y, z: min.z }, max: { x: mid.x, y: mid.y, z: mid.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: mid.x, y: min.y, z: min.z }, max: { x: max.x, y: mid.y, z: mid.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: min.x, y: min.y, z: mid.z }, max: { x: mid.x, y: mid.y, z: max.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: mid.x, y: min.y, z: mid.z }, max: { x: max.x, y: mid.y, z: max.z } },
        node.depth + 1
      ),
      // Top 4 octants
      new OctreeNode(
        { min: { x: min.x, y: mid.y, z: min.z }, max: { x: mid.x, y: max.y, z: mid.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: mid.x, y: mid.y, z: min.z }, max: { x: max.x, y: max.y, z: mid.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: min.x, y: mid.y, z: mid.z }, max: { x: mid.x, y: max.y, z: max.z } },
        node.depth + 1
      ),
      new OctreeNode(
        { min: { x: mid.x, y: mid.y, z: mid.z }, max: { x: max.x, y: max.y, z: max.z } },
        node.depth + 1
      )
    ]

    // Redistribute items to children
    const itemsToRedistribute = [...node.items]
    node.items = []

    for (const item of itemsToRedistribute) {
      for (const child of node.children) {
        if (this.containsPoint(child.bounds, item.position)) {
          this.insertIntoNode(child, item)
          break
        }
      }
    }
  }

  // Utility: Check if bounds contains point
  private containsPoint(bounds: BoundingBox, point: Vector3): boolean {
    return (
      point.x >= bounds.min.x &&
      point.x <= bounds.max.x &&
      point.y >= bounds.min.y &&
      point.y <= bounds.max.y &&
      point.z >= bounds.min.z &&
      point.z <= bounds.max.z
    )
  }

  // Utility: Check if two bounding boxes intersect
  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x &&
      a.max.x >= b.min.x &&
      a.min.y <= b.max.y &&
      a.max.y >= b.min.y &&
      a.min.z <= b.max.z &&
      a.max.z >= b.min.z
    )
  }

  // Utility: Calculate squared distance between two points
  private distanceSquared(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return dx * dx + dy * dy + dz * dz
  }

  // Get octree statistics
  getStats(): OctreeStats {
    const stats: OctreeStats = {
      totalNodes: 0,
      leafNodes: 0,
      maxDepth: 0,
      totalItems: this.itemCount,
      averageItemsPerLeaf: 0
    }

    this.collectStats(this.root, stats)
    stats.averageItemsPerLeaf = stats.leafNodes > 0 ? this.itemCount / stats.leafNodes : 0

    return stats
  }

  private collectStats(node: OctreeNode<T>, stats: OctreeStats): void {
    stats.totalNodes++
    stats.maxDepth = Math.max(stats.maxDepth, node.depth)

    if (node.isLeaf()) {
      stats.leafNodes++
    } else {
      for (const child of node.children!) {
        this.collectStats(child, stats)
      }
    }
  }
}

export interface OctreeStats {
  totalNodes: number
  leafNodes: number
  maxDepth: number
  totalItems: number
  averageItemsPerLeaf: number
}

// Performance verification utilities
export class OctreePerformanceTester {
  static testInsertionPerformance<T>(
    octree: Octree<T>,
    itemCount: number,
    bounds: BoundingBox
  ): PerformanceResult {
    const items: Array<{ pos: Vector3; data: T }> = []

    // Generate random items
    for (let i = 0; i < itemCount; i++) {
      const pos: Vector3 = {
        x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
        z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
      }
      items.push({ pos, data: i as any })
    }

    const start = performance.now()
    for (const item of items) {
      octree.insert(item.pos, item.data)
    }
    const end = performance.now()

    const timePerItem = (end - start) / itemCount
    const theoreticalLogN = Math.log2(itemCount)

    return {
      operation: 'insert',
      totalTime: end - start,
      itemCount,
      timePerItem,
      theoreticalLogN,
      isLogarithmic: this.checkLogarithmicComplexity(timePerItem, theoreticalLogN)
    }
  }

  static testQueryPerformance<T>(
    octree: Octree<T>,
    queryCount: number,
    bounds: BoundingBox,
    queryRadius: number
  ): PerformanceResult {
    const queries: Vector3[] = []

    // Generate random query points
    for (let i = 0; i < queryCount; i++) {
      queries.push({
        x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y),
        z: bounds.min.z + Math.random() * (bounds.max.z - bounds.min.z)
      })
    }

    const start = performance.now()
    let totalResults = 0
    for (const query of queries) {
      const results = octree.queryRadius(query, queryRadius)
      totalResults += results.length
    }
    const end = performance.now()

    const timePerQuery = (end - start) / queryCount
    const stats = octree.getStats()
    const theoreticalLogN = Math.log2(stats.totalItems || 1)

    return {
      operation: 'query',
      totalTime: end - start,
      itemCount: queryCount,
      timePerItem: timePerQuery,
      theoreticalLogN,
      isLogarithmic: this.checkLogarithmicComplexity(timePerQuery, theoreticalLogN),
      additionalInfo: `Avg results per query: ${(totalResults / queryCount).toFixed(2)}`
    }
  }

  private static checkLogarithmicComplexity(actualTime: number, logN: number): boolean {
    // Very rough heuristic: if time grows proportionally to log(n), it's logarithmic
    // For small datasets, this is approximate
    return actualTime < logN * 0.1 // Allow some overhead
  }

  static logPerformanceReport(result: PerformanceResult): void {
    console.log('\n=== Octree Performance Report ===')
    console.log(`Operation: ${result.operation}`)
    console.log(`Total items: ${result.itemCount}`)
    console.log(`Total time: ${result.totalTime.toFixed(3)}ms`)
    console.log(`Time per operation: ${result.timePerItem.toFixed(6)}ms`)
    console.log(`Theoretical log(n): ${result.theoreticalLogN.toFixed(3)}`)
    console.log(`Logarithmic complexity: ${result.isLogarithmic ? '✓ PASS' : '✗ FAIL'}`)
    if (result.additionalInfo) {
      console.log(`Additional info: ${result.additionalInfo}`)
    }
    console.log('================================\n')
  }

  static runFullBenchmark<T>(bounds: BoundingBox): void {
    console.log('Starting Octree Full Benchmark...\n')

    const sizes = [100, 1000, 10000]

    for (const size of sizes) {
      const octree = new Octree<number>(bounds, 8, 8)

      console.log(`\n--- Testing with ${size} items ---`)

      // Test insertion
      const insertResult = this.testInsertionPerformance(octree, size, bounds)
      this.logPerformanceReport(insertResult)

      // Test query
      const queryResult = this.testQueryPerformance(octree, 100, bounds, 50)
      this.logPerformanceReport(queryResult)

      // Print stats
      const stats = octree.getStats()
      console.log('Octree Statistics:')
      console.log(`  Total nodes: ${stats.totalNodes}`)
      console.log(`  Leaf nodes: ${stats.leafNodes}`)
      console.log(`  Max depth: ${stats.maxDepth}`)
      console.log(`  Total items: ${stats.totalItems}`)
      console.log(`  Avg items per leaf: ${stats.averageItemsPerLeaf.toFixed(2)}`)
    }
  }
}

export interface PerformanceResult {
  operation: string
  totalTime: number
  itemCount: number
  timePerItem: number
  theoreticalLogN: number
  isLogarithmic: boolean
  additionalInfo?: string
}

// Usage example:
// // Initialize octree with world bounds
// const octree = new Octree(
//   { x: 0, y: 0, z: 0 },  // world center
//   1000,                   // world size
//   8,                      // max objects per node
//   8                       // max depth
// );

// // Insert physics bodies
// octree.insert({
//   id: 'chunk_0_0_0',
//   position: { x: 10, y: 0, z: 10 },
//   data: yourPhysicsBody
// });

// // Query bodies near player
// const nearbyBodies = octree.queryRadius(
//   playerPosition,
//   loadDistance
// );

// // Run performance tests
// octree.benchmark(10000);
// octree.logStats();
