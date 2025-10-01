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
  // Image-based rendering state (ROS2-style occupancy grid to ImageData)
  const [imageData, setImageData] = useState<ImageData | null>(null)
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

    // Calculate the scale needed to fit the map (image cells → pixels)
    const scaleX = (rect.width * 0.8) / mapData.width // 80% of container width
    const scaleY = (rect.height * 0.8) / mapData.height // 80% of container height

    const autoZoom = Math.min(scaleX, scaleY, 2) // Cap at 2x zoom

    const finalZoom = Math.max(0.1, autoZoom)
    setZoom(finalZoom)
    setRotation(0)

    // If world (0,0) lies within the map bounds, center it
    const { origin, width, height, resolution } = mapData
    const minX = origin.position.x
    const maxX = origin.position.x + width * resolution
    const minY = origin.position.y
    const maxY = origin.position.y + height * resolution
    const zeroInside = 0 >= minX && 0 <= maxX && 0 >= minY && 0 <= maxY

    if (zeroInside) {
      const gridX0 = (0 - origin.position.x) / resolution
      const gridY0 = (0 - origin.position.y) / resolution
      const flippedGridY0 = height - 1 - gridY0
      const mapX = gridX0 - width / 2
      const mapY = flippedGridY0 - height / 2
      const scaledX = mapX * finalZoom
      const scaledY = mapY * finalZoom
      // Center at canvas center → offset cancels scaled
      setOffset({ x: -scaledX, y: -scaledY })
    } else {
      // Default: center the map itself
      setOffset({ x: 0, y: 0 })
    }
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

        // Build ImageData from occupancy grid with ROS2 Y-flip
        try {
          const { width, height, data } = mapData
          const tmp = document.createElement("canvas")
          tmp.width = width
          tmp.height = height
          const tctx = tmp.getContext("2d")
          if (tctx) {
            const img = tctx.createImageData(width, height)
            const pixels = img.data
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const dataIndex = y * width + x
                const flippedY = height - 1 - y
                const pixelIndex = (flippedY * width + x) * 4
                const value = data[dataIndex]
                let r = 200, g = 200, b = 200
                if (value === 0) {
                  r = g = b = 255
                } else if (value === 100) {
                  r = g = b = 0
                } else if (value === -1) {
                  r = g = b = 128
                } else if (value > 0) {
                  const intensity = Math.max(0, 255 - value * 2.55)
                  r = g = b = intensity
                }
                pixels[pixelIndex] = r
                pixels[pixelIndex + 1] = g
                pixels[pixelIndex + 2] = b
                pixels[pixelIndex + 3] = 255
              }
            }
            setImageData(img)
          }
        } catch (e) {
          console.warn("Failed generating ImageData for map:", e)
        }

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
      const { resolution, origin, width, height } = mapData

      // Convert world to grid
      const gridX = (worldX - origin.position.x) / resolution
      const gridY = (worldY - origin.position.y) / resolution
      // Flip Y for ROS2 → Canvas
      const flippedGridY = height - 1 - gridY

      // Map-centered coordinates (in pixels where 1 cell = 1 px before zoom)
      const mapX = gridX - width / 2
      const mapY = flippedGridY - height / 2

      // Apply scale then rotation then center+offset translate
      const scaledX = mapX * zoom
      const scaledY = mapY * zoom
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const rotRad = (rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)
      const rotatedX = scaledX * cos - scaledY * sin
      const rotatedY = scaledX * sin + scaledY * cos
      return { x: centerX + offset.x + rotatedX, y: centerY + offset.y + rotatedY }
    },
    [mapData, zoom, offset, rotation],
  )

  // Convert canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 }

      const canvas = canvasRef.current
      const { resolution, origin, width, height } = mapData
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Reverse translate
      const relX = canvasX - centerX - offset.x
      const relY = canvasY - centerY - offset.y

      // Reverse rotation
      const rotRad = (-rotation * Math.PI) / 180
      const cos = Math.cos(rotRad)
      const sin = Math.sin(rotRad)
      const ux = relX * cos - relY * sin
      const uy = relX * sin + relY * cos

      // Reverse scale
      const mapX = ux / zoom
      const mapY = uy / zoom

      // Back to grid
      const gridX = mapX + width / 2
      const flippedGridY = mapY + height / 2
      const gridY = height - 1 - flippedGridY

      // To world
      const worldX = origin.position.x + gridX * resolution
      const worldY = origin.position.y + gridY * resolution
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

      // Clear background
      ctx.fillStyle = "#f8f9fa"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw prebuilt image with transforms
      if (imageData) {
        ctx.imageSmoothingEnabled = false
        ctx.save()
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        ctx.translate(centerX + offset.x, centerY + offset.y)
        ctx.rotate((rotation * Math.PI) / 180)
        ctx.scale(zoom, zoom)

        // Create temporary image canvas
        const tmp = document.createElement("canvas")
        tmp.width = mapData.width
        tmp.height = mapData.height
        const tctx = tmp.getContext("2d")
        if (tctx) {
          tctx.putImageData(imageData, 0, 0)
          ctx.drawImage(tmp, -mapData.width / 2, -mapData.height / 2)
        }
        ctx.restore()
      }

      // Draw points in screen space (not affected by rotation)
      // Draw origin point (red)
      const originCanvas = worldToCanvas(0, 0)
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

      // Keep the world point under cursor stationary by adjusting offset using image-based math
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const relX = mouseX - (centerX + offset.x)
      const relY = mouseY - (centerY + offset.y)

      // Reverse rotation
      const rotRadInv = (-rotation * Math.PI) / 180
      const cosInv = Math.cos(rotRadInv)
      const sinInv = Math.sin(rotRadInv)
      const ux = relX * cosInv - relY * sinInv
      const uy = relX * sinInv + relY * cosInv

      // Reverse scale to map-centered coords
      const mapX = ux / zoom
      const mapY = uy / zoom

      // Re-apply new scale
      const newUx = mapX * targetZoom
      const newUy = mapY * targetZoom
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
                  <strong>World Origin:</strong> (0, 0)
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
