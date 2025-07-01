"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RotateCcw, RotateCw, Move, MousePointer } from "lucide-react"

interface OccupancyGrid {
  width: number
  height: number
  resolution: number
  origin: {
    position: { x: number; y: number; z: number }
  }
  data: number[]
}

interface SensorData {
  currentPosition?: { x: number; y: number }
  distanceTraveled?: number
  trips?: number
  speed?: number
  timestamp?: string
}

interface MapVisualProps {
  className?: string
  roverId: number
}

const EnhancedMapVisual = ({ className, roverId }: MapVisualProps) => {
  const [mapData, setMapData] = useState<OccupancyGrid | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Map interaction state
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0) // Rotation in degrees
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Coordinate display state
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null)
  const [clickCoords, setClickCoords] = useState<{ x: number; y: number } | null>(null)

  // Fetch map data and sensor data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const mapResponse = await fetch("/api/map")
        const mapData = await mapResponse.json()
        setMapData(mapData)
      } catch (error) {
        console.error("Failed to fetch map data:", error)
      }
    }

    fetchMapData()
  }, [])

  // Fetch sensor data with real-time updates (optimized to prevent reloads)
  useEffect(() => {
    let isMounted = true
    let intervalId: NodeJS.Timeout

    const fetchSensorData = async () => {
      try {
        // Replace with your actual sensor data API endpoint
        const sensorResponse = await fetch(`/api/rovers/${roverId}/sensor-data`)

        if (!sensorResponse.ok) {
          throw new Error("Failed to fetch sensor data")
        }

        const sensorDataArray = await sensorResponse.json()

        // Only update if component is still mounted
        if (isMounted) {
          // Get the latest sensor data
          const latestSensorData = sensorDataArray && sensorDataArray.length > 0 ? sensorDataArray[0] : null

          // Only update if data actually changed to prevent unnecessary re-renders
          setSensorData((prevData) => {
            if (!prevData || !latestSensorData) return latestSensorData

            // Compare positions to see if update is needed
            const positionChanged =
              prevData.currentPosition?.x !== latestSensorData.currentPosition?.x ||
              prevData.currentPosition?.y !== latestSensorData.currentPosition?.y

            const dataChanged =
              prevData.speed !== latestSensorData.speed ||
              prevData.distanceTraveled !== latestSensorData.distanceTraveled ||
              positionChanged

            return dataChanged ? latestSensorData : prevData
          })
        }
      } catch (error) {
        console.error("Failed to fetch sensor data:", error)

        // Only set fallback data on first load, not on subsequent failures
        if (isMounted && !sensorData) {
          setSensorData({
            currentPosition: { x: 2.5, y: -1.8 },
            distanceTraveled: 45.2,
            trips: 3,
            speed: 0.8,
            timestamp: new Date().toISOString(),
          })
        }
      } finally {
        if (isMounted && loading) {
          setLoading(false)
        }
      }
    }

    // Initial fetch
    fetchSensorData()

    // Set up interval for updates (increased to 5 seconds to reduce load)
    intervalId = setInterval(() => {
      if (isMounted) {
        fetchSensorData()
      }
    }, 5000) // Changed from 2000 to 5000 (5 seconds)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [roverId])

  // Convert world coordinates to canvas coordinates with rotation
  const worldToCanvas = useCallback(
    (worldX: number, worldY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const { resolution, origin } = mapData

      // Calculate cell size based on zoom and resolution
      const cellSize = resolution * zoom * 100

      // Transform world coordinates to map grid coordinates
      const gridX = (worldX - origin.position.x) / resolution
      const gridY = (worldY - origin.position.y) / resolution

      // Apply rotation around the center
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      const rotRad = (rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)

      // Translate to origin, rotate, then translate back
      const relativeX = gridX * cellSize
      const relativeY = gridY * cellSize

      const rotatedX = relativeX * cos - relativeY * sin
      const rotatedY = relativeX * sin + relativeY * cos

      const canvasX = centerX + rotatedX + offset.x
      const canvasY = centerY + rotatedY + offset.y

      return { x: canvasX, y: canvasY }
    },
    [mapData, zoom, offset, rotation],
  )

  // Convert canvas coordinates to world coordinates with rotation
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const { resolution, origin } = mapData

      const cellSize = resolution * zoom * 100
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Reverse the transformations
      const relativeX = canvasX - centerX - offset.x
      const relativeY = canvasY - centerY - offset.y

      // Reverse rotation
      const rotRad = (-rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)

      const unrotatedX = relativeX * cos - relativeY * sin
      const unrotatedY = relativeX * sin + relativeY * cos

      // Convert to grid coordinates
      const gridX = unrotatedX / cellSize
      const gridY = unrotatedY / cellSize

      // Convert to world coordinates
      const worldX = gridX * resolution + origin.position.x
      const worldY = gridY * resolution + origin.position.y

      return { x: worldX, y: worldY }
    },
    [mapData, zoom, offset, rotation],
  )

  // Memoize the render function to prevent unnecessary re-renders
  const renderMap = useMemo(() => {
    return () => {
      if (!mapData || !canvasRef.current || !containerRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const container = containerRef.current

      if (!ctx) return

      // Set canvas size to match container
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      // Clear canvas
      ctx.fillStyle = "#f0f0f0"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { width, height, data, resolution } = mapData
      const cellSize = resolution * zoom * 100

      // Save context for transformations
      ctx.save()

      // Apply transformations: translate to center, rotate, then apply offset
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      ctx.translate(centerX + offset.x, centerY + offset.y)
      ctx.rotate((rotation * Math.PI) / 180)

      // Calculate map positioning (centered)
      const mapPixelWidth = width * cellSize
      const mapPixelHeight = height * cellSize
      const mapOffsetX = -mapPixelWidth / 2
      const mapOffsetY = -mapPixelHeight / 2

      // Draw occupancy grid
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const dataIndex = row * width + col
          const value = data[dataIndex]

          let fillStyle = "rgba(240, 240, 240, 1)" // Unknown/free space

          if (value === 100) {
            fillStyle = "rgba(0, 0, 0, 1)" // Occupied
          } else if (value === 0) {
            fillStyle = "rgba(255, 255, 255, 1)" // Free space
          } else if (value === -1) {
            fillStyle = "rgba(128, 128, 128, 0.5)" // Unknown
          }

          const x = mapOffsetX + col * cellSize
          const y = mapOffsetY + row * cellSize

          ctx.fillStyle = fillStyle
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }

      // Draw grid lines for better visibility when zoomed in
      if (zoom > 2) {
        ctx.strokeStyle = "rgba(200, 200, 200, 0.3)"
        ctx.lineWidth = 0.5

        for (let i = 0; i <= width; i++) {
          const x = mapOffsetX + i * cellSize
          ctx.beginPath()
          ctx.moveTo(x, mapOffsetY)
          ctx.lineTo(x, mapOffsetY + mapPixelHeight)
          ctx.stroke()
        }

        for (let i = 0; i <= height; i++) {
          const y = mapOffsetY + i * cellSize
          ctx.beginPath()
          ctx.moveTo(mapOffsetX, y)
          ctx.lineTo(mapOffsetX + mapPixelWidth, y)
          ctx.stroke()
        }
      }

      ctx.restore()

      // Draw points in screen space (not rotated)
      // Draw origin point
      const originCanvas = worldToCanvas(mapData.origin.position.x, mapData.origin.position.y)
      ctx.beginPath()
      ctx.arc(originCanvas.x, originCanvas.y, 6, 0, 2 * Math.PI)
      ctx.fillStyle = "red"
      ctx.fill()
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw rover position if available
      if (sensorData?.currentPosition) {
        const roverCanvas = worldToCanvas(sensorData.currentPosition.x, sensorData.currentPosition.y)
        ctx.beginPath()
        ctx.arc(roverCanvas.x, roverCanvas.y, 8, 0, 2 * Math.PI)
        ctx.fillStyle = "blue"
        ctx.fill()
        ctx.strokeStyle = "white"
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw rover direction indicator
        ctx.beginPath()
        ctx.moveTo(roverCanvas.x, roverCanvas.y)
        ctx.lineTo(roverCanvas.x + 15, roverCanvas.y)
        ctx.strokeStyle = "blue"
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // Draw click coordinates if available
    }
  }, [mapData, sensorData, zoom, offset, rotation, worldToCanvas])

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top

      // Update hover coordinates
      const worldCoords = canvasToWorld(canvasX, canvasY)
      setHoverCoords({
        x: Number.parseFloat(worldCoords.x.toFixed(3)),
        y: Number.parseFloat(worldCoords.y.toFixed(3)),
      })

      // Handle dragging
      if (isDragging) {
        const deltaX = e.clientX - lastMousePos.x
        const deltaY = e.clientY - lastMousePos.y

        setOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))

        setLastMousePos({ x: e.clientX, y: e.clientY })
      }

      // Handle rotation
      if (isRotating) {
        const rect = canvasRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        const angle1 = Math.atan2(lastMousePos.y - centerY, lastMousePos.x - centerX)
        const angle2 = Math.atan2(canvasY - centerY, canvasX - centerX)
        const deltaAngle = ((angle2 - angle1) * 180) / Math.PI

        setRotation((prev) => prev + deltaAngle)
        setLastMousePos({ x: canvasX, y: canvasY })
      }
    },
    [canvasToWorld, isDragging, isRotating, lastMousePos],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top

    if (e.shiftKey) {
      // Rotation mode with Shift key
      setIsRotating(true)
      setLastMousePos({ x: canvasX, y: canvasY })
    } else {
      // Pan mode (default)
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsRotating(false)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || isDragging || isRotating) return

      const rect = canvasRef.current.getBoundingClientRect()
      const canvasX = e.clientX - rect.left
      const canvasY = e.clientY - rect.top

      // Get the center of the canvas
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      if (e.shiftKey) {
        // Shift+click to zoom in towards the clicked point
        const newZoom = Math.min(10, zoom * 1.5)

        // Calculate offset adjustment to zoom towards clicked position
        const mouseOffsetX = (canvasX - centerX) / zoom
        const mouseOffsetY = (canvasY - centerY) / zoom

        const newOffsetX = offset.x - mouseOffsetX * (1 - zoom / newZoom)
        const newOffsetY = offset.y - mouseOffsetY * (1 - zoom / newZoom)

        setZoom(newZoom)
        setOffset({ x: newOffsetX, y: newOffsetY })
      } else {
        // Regular click to zoom out
        const newZoom = Math.max(0.1, zoom * 0.7)
        setZoom(newZoom)
      }
    },
    [zoom, offset, isDragging, isRotating],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

      setZoom(newZoom)
    },
    [zoom],
  )

  // Control functions
  const rotateLeft = () => setRotation((prev) => prev - 15)
  const rotateRight = () => setRotation((prev) => prev + 15)
  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }

  // Render map when dependencies change (optimized)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      renderMap()
    }, 16) // Debounce rendering to ~60fps

    return () => clearTimeout(timeoutId)
  }, [renderMap])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      renderMap()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [renderMap])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h4 className="text-lg font-semibold">Enhanced Map Visualization</h4>
        <div className="text-sm text-gray-600">
          Last updated: {sensorData?.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString() : "Never"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
          {/* Map Canvas */}
          <div
            ref={containerRef}
            className="col-span-3 relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300"
          >
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${
                isRotating ? "cursor-alias" : isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleClick}
              onWheel={handleWheel}
            />

            {/* Coordinate displays */}
            {hoverCoords && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                Hover: ({hoverCoords.x}, {hoverCoords.y})
              </div>
            )}

            {/* Map info */}
            {mapData && (
              <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
                Map: {mapData.width}×{mapData.height} | Resolution: {mapData.resolution}m | Rotation:{" "}
                {rotation.toFixed(0)}°
              </div>
            )}

            {/* Enhanced Controls */}
            <div className="absolute bottom-2 right-2 flex flex-col gap-2">
              {/* Zoom Controls */}
              <div className="flex gap-2 bg-white bg-opacity-90 rounded p-2">
                <button
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
                >
                  +
                </button>
                <button
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
                >
                  −
                </button>
                <span className="text-xs px-2 flex items-center bg-gray-100 rounded">{(zoom * 100).toFixed(0)}%</span>
              </div>

              {/* Rotation Controls */}
              <div className="flex gap-2 bg-white bg-opacity-90 rounded p-2">
                <button
                  className="px-2 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                  onClick={rotateLeft}
                  title="Rotate Left"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="px-2 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                  onClick={rotateRight}
                  title="Rotate Right"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  onClick={resetView}
                  title="Reset View"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Interaction Help */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 px-3 py-1 rounded text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Move size={12} /> Drag to pan
                </span>
                <span className="flex items-center gap-1">
                  <MousePointer size={12} /> Shift+drag to rotate
                </span>
                <span>Click to zoom out, Shift+click to zoom in</span>
              </div>
            </div>
          </div>

          {/* Status Panel */}
          <div className="col-span-1 bg-white p-4 rounded-lg shadow-md">
            <h5 className="font-semibold mb-4">Rover Status</h5>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Current Position</div>
                <div className="font-mono text-sm">
                  {sensorData?.currentPosition
                    ? `(${sensorData.currentPosition.x.toFixed(2)}, ${sensorData.currentPosition.y.toFixed(2)})`
                    : "Unknown"}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Distance Traveled</div>
                <div className="font-mono text-sm">{sensorData?.distanceTraveled?.toFixed(1) || "--"} m</div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Speed</div>
                <div className="font-mono text-sm">{sensorData?.speed?.toFixed(2) || "--"} m/s</div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Trips</div>
                <div className="font-mono text-sm">{sensorData?.trips || "--"}</div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <div>• Red dot: Origin (0,0)</div>
              <div>• Blue dot: Rover position</div>
              <div>• Click to zoom out, Shift+click to zoom in</div>
              <div>• Real-time updates every 5s</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedMapVisual
