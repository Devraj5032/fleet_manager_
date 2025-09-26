"use client"
import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RotateCcw, RotateCw, Move, MousePointer, Info } from "lucide-react"

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
  // Use a single pixel-per-meter scale everywhere to keep rendering consistent
  const PIXELS_PER_METER = 100
  const [mapData, setMapData] = useState<OccupancyGrid | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasFetchedMap = useRef(false)

  // Map interaction state
  const [zoom, setZoom] = useState(0.5) // Start with a more reasonable zoom level
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Coordinate display state
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const calculateAutoFit = useCallback(() => {
    if (!mapData || !containerRef.current) return

    const container = containerRef.current
    const rect = container.getBoundingClientRect()

    // Calculate the scale needed to fit the map in the container
    const mapWorldWidth = mapData.width * mapData.resolution
    const mapWorldHeight = mapData.height * mapData.resolution

    const scaleX = (rect.width * 0.8) / (mapWorldWidth * PIXELS_PER_METER) // 80% of container width
    const scaleY = (rect.height * 0.8) / (mapWorldHeight * PIXELS_PER_METER) // 80% of container height

    const autoZoom = Math.min(scaleX, scaleY, 2) // Cap at 2x zoom

    setZoom(Math.max(0.1, autoZoom))
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }, [mapData])

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setError(null)
        const mapResponse = await fetch("/api/map")
        if (!mapResponse.ok) {
          throw new Error(`Failed to fetch map data: ${mapResponse.status}`)
        }
        const mapData = await mapResponse.json()

        // Validate map data structure
        if (!mapData || typeof mapData.width !== "number" || typeof mapData.height !== "number") {
          throw new Error("Invalid map data structure")
        }

        if (!Array.isArray(mapData.data) || mapData.data.length !== mapData.width * mapData.height) {
          throw new Error(
            `Map data array length mismatch. Expected: ${mapData.width * mapData.height}, Got: ${mapData.data?.length || 0}`,
          )
        }

        setMapData(mapData)

        // Auto-fit the map after loading
        setTimeout(() => {
          calculateAutoFit()
        }, 100)

        console.log("Map data loaded:", {
          width: mapData.width,
          height: mapData.height,
          resolution: mapData.resolution,
          origin: mapData.origin,
          dataLength: mapData.data.length,
          worldSize: {
            width: mapData.width * mapData.resolution,
            height: mapData.height * mapData.resolution,
          },
        })
      } catch (error) {
        console.error("Failed to fetch map data:", error)
        setError(error instanceof Error ? error.message : "Failed to fetch map data")
      }
    }
    if (!hasFetchedMap.current) {
      hasFetchedMap.current = true
      fetchMapData()
    }
  }, [])

  // Fetch sensor data with real-time updates
  useEffect(() => {
    let isMounted = true
    let intervalId: NodeJS.Timeout

    const fetchSensorData = async () => {
      try {
        const sensorResponse = await fetch(`/api/rovers/${roverId}/sensor-data`)
        if (!sensorResponse.ok) {
          throw new Error(`Failed to fetch sensor data: ${sensorResponse.status}`)
        }
        const sensorDataArray = await sensorResponse.json()

        if (isMounted) {
          const latestSensorData = sensorDataArray && sensorDataArray.length > 0 ? sensorDataArray[0] : null
          setSensorData((prevData) => {
            if (!prevData || !latestSensorData) return latestSensorData

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
        if (isMounted && !sensorData) {
          // Fallback data for testing
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

    fetchSensorData()
    intervalId = setInterval(() => {
      if (isMounted) {
        fetchSensorData()
      }
    }, 5000)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [roverId, loading, sensorData])

  // Convert world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (worldX: number, worldY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const { resolution, origin } = mapData

      // Calculate cell size based on zoom and resolution
      const cellSize = resolution * zoom * PIXELS_PER_METER

      // Transform world coordinates to map grid coordinates
      const gridX = (worldX - origin.position.x) / resolution
      const gridY = (worldY - origin.position.y) / resolution

      // Apply rotation around the center
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const rotRad = (rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)

      // Position relative to map center
      const relativeX = gridX * cellSize
      // Flip Y-axis: Negate gridY to match typical map coordinate systems
      const relativeY = -gridY * cellSize

      // Apply rotation
      const rotatedX = relativeX * cos - relativeY * sin
      const rotatedY = relativeX * sin + relativeY * cos

      // Final canvas coordinates
      const canvasX = centerX + rotatedX + offset.x
      const canvasY = centerY + rotatedY + offset.y

      return { x: canvasX, y: canvasY }
    },
    [mapData, zoom, offset, rotation],
  )

  // Convert canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const { resolution, origin } = mapData
      const cellSize = resolution * zoom * PIXELS_PER_METER

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
      // Flip Y-axis back
      const gridY = -unrotatedY / cellSize

      // Convert to world coordinates
      const worldX = gridX * resolution + origin.position.x
      const worldY = gridY * resolution + origin.position.y

      return { x: worldX, y: worldY }
    },
    [mapData, zoom, offset, rotation],
  )

  // Render the map
  const renderMap = useMemo(() => {
    return () => {
      if (!mapData || !canvasRef.current || !containerRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      const container = containerRef.current

      if (!ctx) return

      // Set canvas size to match container
      const rect = container.getBoundingClientRect()
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width
        canvas.height = rect.height
      }

      // Clear canvas with background color
      ctx.fillStyle = "#f8f9fa"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { width, height, data, resolution } = mapData
      const cellSize = Math.max(0.1, resolution * zoom * PIXELS_PER_METER) // Ensure minimum cell size

      // Validate data array
      if (data.length !== width * height) {
        console.error("Data array length mismatch:", data.length, "expected:", width * height)
        return
      }

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

          // Bounds check
          if (dataIndex >= data.length) {
            console.warn(`Data index out of bounds: ${dataIndex} >= ${data.length}`)
            continue
          }

          const value = data[dataIndex]
          let fillStyle = "rgba(200, 200, 200, 0.5)" // Unknown/default

          // Map occupancy values to colors
          if (value === 100) {
            fillStyle = "rgba(0, 0, 0, 1)" // Occupied (black)
          } else if (value === 0) {
            fillStyle = "rgba(255, 255, 255, 1)" // Free space (white)
          } else if (value === -1) {
            fillStyle = "rgba(128, 128, 128, 0.3)" // Unknown (gray)
          } else if (value > 50) {
            // Probably occupied
            const alpha = Math.min(1, value / 100)
            fillStyle = `rgba(0, 0, 0, ${alpha})`
          } else if (value >= 0) {
            // Probably free
            const alpha = Math.max(0.1, 1 - value / 50)
            fillStyle = `rgba(255, 255, 255, ${alpha})`
          }

          const x = mapOffsetX + col * cellSize
          // Flip Y-axis: Render from bottom to top
          const y = mapOffsetY + (height - 1 - row) * cellSize

          ctx.fillStyle = fillStyle
          ctx.fillRect(x, y, cellSize, cellSize)
        }
      }

      // Draw grid lines when zoomed in
      if (zoom > 3) {
        ctx.strokeStyle = "rgba(150, 150, 150, 0.2)"
        ctx.lineWidth = 0.5

        // Vertical lines
        for (let i = 0; i <= width; i++) {
          const x = mapOffsetX + i * cellSize
          ctx.beginPath()
          ctx.moveTo(x, mapOffsetY)
          ctx.lineTo(x, mapOffsetY + mapPixelHeight)
          ctx.stroke()
        }

        // Horizontal lines
        for (let i = 0; i <= height; i++) {
          const y = mapOffsetY + i * cellSize
          ctx.beginPath()
          ctx.moveTo(mapOffsetX, y)
          ctx.lineTo(mapOffsetX + mapPixelWidth, y)
          ctx.stroke()
        }
      }

      ctx.restore()

      // Draw points in screen space (not affected by rotation)
      // Draw origin point (red)
      const originCanvas = worldToCanvas(mapData.origin.position.x, mapData.origin.position.y)
      ctx.beginPath()
      ctx.arc(originCanvas.x, originCanvas.y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = "#ef4444"
      ctx.fill()
      ctx.strokeStyle = "white"
      ctx.lineWidth = 3
      ctx.stroke()

      // Add origin label
      ctx.fillStyle = "black"
      ctx.font = "12px sans-serif"
      ctx.fillText("Origin", originCanvas.x + 12, originCanvas.y - 8)

      // Draw rover position if available (blue)
      if (sensorData?.currentPosition) {
        const roverCanvas = worldToCanvas(sensorData.currentPosition.x, sensorData.currentPosition.y)

        // Rover position dot
        ctx.beginPath()
        ctx.arc(roverCanvas.x, roverCanvas.y, 10, 0, 2 * Math.PI)
        ctx.fillStyle = "#3b82f6"
        ctx.fill()
        ctx.strokeStyle = "white"
        ctx.lineWidth = 3
        ctx.stroke()

        // Rover direction indicator
        ctx.beginPath()
        ctx.moveTo(roverCanvas.x, roverCanvas.y)
        ctx.lineTo(roverCanvas.x + 20, roverCanvas.y)
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 4
        ctx.stroke()

        // Add rover label
        ctx.fillStyle = "black"
        ctx.font = "12px sans-serif"
        ctx.fillText("Rover", roverCanvas.x + 12, roverCanvas.y + 20)
      }
    }
  }, [mapData, sensorData, zoom, offset, rotation, worldToCanvas])

  // Mouse event handlers
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
      setIsRotating(true)
      setLastMousePos({ x: canvasX, y: canvasY })
    } else {
      setIsDragging(true)
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsRotating(false)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      if (!canvasRef.current || !mapData) return
      const rect = canvasRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const targetZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

      // Keep the world point under cursor stationary by adjusting offset
      const { resolution, origin } = mapData
      const cellSizePrev = resolution * zoom * PIXELS_PER_METER
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const relX = mouseX - (centerX + offset.x)
      const relY = mouseY - (centerY + offset.y)

      // Reverse rotation for previous zoom
      const rotRadInv = (-rotation * Math.PI) / 180
      const cosInv = Math.cos(rotRadInv)
      const sinInv = Math.sin(rotRadInv)
      const ux = relX * cosInv - relY * sinInv
      const uy = relX * sinInv + relY * cosInv

      const gridX = ux / cellSizePrev
      const gridY = -uy / cellSizePrev
      const worldX = gridX * resolution + origin.position.x
      const worldY = gridY * resolution + origin.position.y

      // Compute new canvas position of the same world point at target zoom
      const cellSizeNew = resolution * targetZoom * PIXELS_PER_METER
      const newUx = gridX * cellSizeNew
      const newUy = -gridY * cellSizeNew
      const rotRad = (rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)
      const newRelX = newUx * cos - newUy * sin
      const newRelY = newUx * sin + newUy * cos
      const newCanvasX = centerX + newRelX + offset.x
      const newCanvasY = centerY + newRelY + offset.y

      // Adjust offset so new canvas point equals mouse position
      const deltaX = mouseX - newCanvasX
      const deltaY = mouseY - newCanvasY
      setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }))
      setZoom(targetZoom)
    },
    [zoom, offset, rotation, mapData],
  )

  // Control functions
  const rotateLeft = () => setRotation((prev) => ((prev - 15) % 360 + 360) % 360)
  const rotateRight = () => setRotation((prev) => ((prev + 15) % 360 + 360) % 360)
  const resetView = () => {
    calculateAutoFit()
  }

  // Render map when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      renderMap()
    }, 16) // ~60fps

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

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <h4 className="text-lg font-semibold text-red-600">Map Loading Error</h4>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-semibold">Enhanced Map Visualization</h4>
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="p-2 hover:bg-gray-100 rounded"
            title="Toggle Debug Info"
          >
            <Info size={16} />
          </button>
        </div>
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
              onWheel={handleWheel}
            />

            {/* Coordinate displays */}
            {hoverCoords && (
              <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-mono">
                Hover: ({hoverCoords.x}, {hoverCoords.y})
              </div>
            )}

            {/* Debug info */}
            {showDebugInfo && mapData && (
              <div className="absolute top-2 right-2 bg-white bg-opacity-95 p-3 rounded text-xs space-y-1 max-w-xs">
                <div>
                  <strong>Map:</strong> {mapData.width}×{mapData.height}
                </div>
                <div>
                  <strong>Resolution:</strong> {mapData.resolution}m
                </div>
                <div>
                  <strong>Origin:</strong> ({mapData.origin.position.x}, {mapData.origin.position.y})
                </div>
                <div>
                  <strong>Data Length:</strong> {mapData.data.length}
                </div>
                <div>
                  <strong>Zoom:</strong> {(zoom * 100).toFixed(0)}%
                </div>
                <div>
                  <strong>Rotation:</strong> {rotation.toFixed(0)}°
                </div>
                <div>
                  <strong>Offset:</strong> ({offset.x.toFixed(0)}, {offset.y.toFixed(0)})
                </div>
                {sensorData?.currentPosition && (
                  <div>
                    <strong>Rover World:</strong> ({sensorData.currentPosition.x.toFixed(2)},{" "}
                    {sensorData.currentPosition.y.toFixed(2)})
                  </div>
                )}
                <div>
                  <strong>Map World Size:</strong> {(mapData.width * mapData.resolution).toFixed(2)}m ×{" "}
                  {(mapData.height * mapData.resolution).toFixed(2)}m
                </div>
              </div>
            )}

            {/* Map info */}
            <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
              Map: {mapData?.width}×{mapData?.height} | Resolution: {mapData?.resolution}m | Rotation:{" "}
              {rotation.toFixed(0)}°
            </div>

            {/* Controls */}
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
                <button
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  onClick={calculateAutoFit}
                  title="Auto Fit Map"
                >
                  Fit
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
                <span>Scroll to zoom</span>
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

            <div className="mt-6 text-xs text-gray-500 space-y-1">
              <div>• Red dot: Origin (0,0)</div>
              <div>• Blue dot: Rover position</div>
              <div>• Scroll to zoom</div>
              <div>• Updates every 5s</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedMapVisual
