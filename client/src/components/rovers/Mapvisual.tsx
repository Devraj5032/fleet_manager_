// import React, { useState, useRef, useEffect } from "react";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { useQuery } from "@tanstack/react-query";
// import { SensorData as SensorDataType } from "@shared/schema";
// import { Skeleton } from "@/components/ui/skeleton";
// import roomImage from "./room.jpg";

// export interface SensorDataProps {
//   className?: string;
//   roverId: number;
// }
// interface OccupancyGrid {
//   width: number;
//   height: number;
//   resolution: number;
//   origin: { position: { x: number; y: number; z: number } }; // in meters
//   data: number[];
// }

// const MapVisual = ({ className, roverId }: SensorDataProps) => {
//   const [mapData, setMapData] = useState<OccupancyGrid | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const containerRef = useRef<HTMLDivElement>(null);
//   const [zoom, setZoom] = useState(1);
//   const [offset, setOffset] = useState({ x: 0, y: 0 });

//   const [clickCoords, setClickCoords] = useState<{
//     x: number;
//     y: number;
//   } | null>(null);

//   const { data: sensorData, isLoading } = useQuery<SensorDataType[]>({
//     queryKey: [`/api/rovers/${roverId}/sensor-data`],
//     refetchInterval: 100000,
//   });
//   const latestSensorData =
//     sensorData && sensorData.length > 0 ? sensorData[0] : null;
//   console.log("currentPosition", latestSensorData?.currentPosition);
//   useEffect(() => {
//     const preventZoom = (e: WheelEvent) => {
//       if (e.ctrlKey) {
//         e.preventDefault(); // Disable browser zoom with Ctrl+Scroll
//       }
//     };

//     window.addEventListener("wheel", preventZoom, { passive: false });

//     return () => {
//       window.removeEventListener("wheel", preventZoom);
//     };
//   }, []);

//   useEffect(() => {
//     const fetchMap = async () => {
//       const res = await fetch(`/api/map`);
//       const data = await res.json();
//       setMapData(data);
//     };
//     fetchMap();
//   }, []);

//   useEffect(() => {
//     if (!mapData || !canvasRef.current || !containerRef.current) return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");
//     const container = containerRef.current;

//     if (!ctx) return;

//     // Get map info
//     const { width, height, resolution, origin, data } = mapData;
//     const cellSize = resolution * zoom * 30;
//     console.log("useeffect:", cellSize);

//     // Set canvas size to match container
//     const canvasWidth = container.clientWidth;
//     const canvasHeight = container.clientHeight;
//     console.log("canvas", canvasWidth, canvasHeight);
//     canvas.width = canvasWidth;
//     canvas.height = canvasHeight;
//     console.log("outer:", canvas.width, canvas.height);
//     ctx.imageSmoothingEnabled = false;
//     ctx.fillStyle = "#b3b3b3"; // light gray
//     ctx.fillRect(0, 0, canvasWidth, canvasHeight);

//     // Translate canvas to apply pan offset
//     ctx.save();

//     // Calculate map size in pixels
//     const mapPixelWidth = height * cellSize;
//     const mapPixelHeight = width * cellSize;
//     console.log("widthheight:", width, height);
//     console.log("mappixelwidthheight:", mapPixelWidth, mapPixelHeight);

//     // Center map in canvas
//     const offsetX = (canvasWidth - mapPixelWidth) / 2;
//     const offsetY = (canvasHeight - mapPixelHeight) / 2;
//     //const rotationAngle = (90 * Math.PI) / 180; // rotate 90 degrees clockwise

//     // Translate canvas to apply pan offset
//     ctx.save();

//     ctx.translate(offset.x, offset.y);

//     // Draw grid
//     for (let row = 0; row < width; row++) {
//       for (let col = 0; col < height; col++) {
//         const val = data[row * width + col];

//         let fill = "rgba(0,0,0,0)";
//         if (val === 100) fill = "rgba(0,0,0,1)";
//         else if (val === -1) fill = "rgba(200,200,200,1)";
//         else if (val === 0) fill = "rgba(220,220,220,1)";

//         if (fill) {
//           const x = offsetX + row * cellSize;
//           //          131 + col * cellSize;
//           const y = offsetY + col * cellSize; //40.25 + row * cellSize;
//           ctx.fillStyle = fill;
//           ctx.fillRect(x, y, cellSize, cellSize);
//         }
//       }
//     }

//     const { x: originCanvasX, y: originCanvasY } = mapToCanvas(
//       0,
//       0,
//       resolution,
//       zoom,
//       offsetX,
//       offsetY,
//       origin.position.x,
//       origin.position.y
//     );

//     ctx.beginPath();
//     ctx.arc(originCanvasX, originCanvasY, 5, 0, 2 * Math.PI);
//     console.log(originCanvasX, originCanvasY);
//     ctx.fillStyle = "red";
//     ctx.fill();

//     const { x: roverPosx, y: roverPosy } = mapToCanvas(
//       4,
//       -4,
//       resolution,
//       zoom,
//       offsetX,
//       offsetY,
//       origin.position.x,
//       origin.position.y
//     );
//     ctx.beginPath();
//     ctx.arc(roverPosx, roverPosy, 5, 0, 2 * Math.PI);
//     ctx.fillStyle = "blue";
//     ctx.fill();

//     const { x: r1x, y: r1y } = mapToCanvas(
//       5,
//       0,
//       resolution,
//       zoom,
//       offsetX,
//       offsetY,
//       origin.position.x,
//       origin.position.y
//     );
//     ctx.beginPath();
//     ctx.arc(r1x, r1y, 5, 0, 2 * Math.PI);
//     ctx.fillStyle = "green";
//     ctx.fill();

//     // Plot Rover Position (if available)
//     if (
//       latestSensorData?.currentPosition !== null &&
//       latestSensorData?.currentPosition !== undefined
//     ) {
//       const roverPos = mapToCanvas(
//         latestSensorData.currentPosition.x,
//         latestSensorData.currentPosition.y,

//         resolution,
//         zoom,
//         offsetX,
//         offsetY,
//         origin.position.x,
//         origin.position.y
//       );

//       ctx.beginPath();
//       ctx.arc(roverPos.x, roverPos.y, 5, 0, 2 * Math.PI);
//       ctx.fillStyle = "orange";
//       ctx.fill();
//     }

//     ctx.restore();
//   }, [mapData, zoom, offset, latestSensorData]);
//   function mapToCanvas(
//     worldX: number,
//     worldY: number,
//     resolution: number,
//     zoom: number,
//     canvasOffsetX: number,
//     canvasOffsetY: number,
//     mapOriginX: number,
//     mapOriginY: number
//   ) {
//     const cellSize = resolution * zoom * 600; // resolution * zoom * 30;
//     const dx = (worldY - mapOriginY) * cellSize; //zoom * 30; // 30;
//     const dy = (worldX - mapOriginX) * cellSize; // zoom * 30; //(worldX - mapOriginX) * cellSize;  //y+9.7 //-x+2.4
//     console.log("cellsizemaptocanvas", cellSize);

//     //function handleCanvasClick();
//     console.log("canvasdxdy", dx, dy);
//     console.log("canvasoffset:", canvasOffsetX, canvasOffsetY);
//     console.log(
//       "finalfixedpoint to world co:",
//       dx + canvasOffsetX,
//       dy + canvasOffsetY
//     );
//     return {
//       x: canvasOffsetX + dx,
//       y: canvasOffsetY + dy,
//     };
//   }

//   /*const handleCa,nvasClick = (e: React.MouseEvent) => {
//     if (!mapData || !canvasRef.current || !containerRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const clickX = e.clientX - rect.left;
//     const clickY = e.clientY - rect.top;
//     console.log("hanldeclick:", clickX, clickY);

//     const cellSize = zoom * 30;
//     const canvasWidth = canvasRef.current.width;
//     const canvasHeight = canvasRef.current.height;
//     const mapPixelWidth = mapData.height * cellSize;
//     const mapPixelHeight = mapData.width * cellSize;

//     const offsetX = (canvasWidth - mapPixelWidth) / 2;
//     const offsetY = (canvasHeight - mapPixelHeight) / 2;
//     console.log("handleoffset:", offsetX, offsetY);
//     const originX = mapData.origin.position.x;
//     const originY = mapData.origin.position.y;

//     // Convert canvas click to world coordinates (meters)
//     const worldY = (clickX - offsetX - offset.x) / cellSize + originY;
//     const worldX = (clickY - offsetY - offset.y) / cellSize + originX;

//     // Relative to fixed origin
//     const mapCoordX = worldX - originX;
//     const mapCoordY = worldY - originY;
//     console.log("worldXY", worldX, worldY);
//     console.log("originXY:", originX, originY);
//     setClickCoords({
//       x: parseFloat(mapCoordX.toFixed(2)),
//       y: parseFloat(mapCoordY.toFixed(2)),
//     });
//     console.log("set", mapCoordX, mapCoordY);
//   };*/
//   const handleCanvasClick = (
//     e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
//   ) => {
//     if (!canvasRef.current || !mapData) return;

//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     console.log("handleclick");
//     const clickX = e.clientX - rect.left;
//     const clickY = e.clientY - rect.top;
//     console.log("clickXY:", clickX, clickY);
//     const cellSize = mapData.resolution * zoom * 30;
//     console.log("cellsize:", cellSize);

//     const mapWidthPx = mapData.height * cellSize;
//     const mapHeightPx = mapData.width * cellSize;
//     console.log("mapwidthHeightpx:", mapWidthPx, mapHeightPx);

//     const offsetX = (canvas.width - mapWidthPx) / 2;
//     const offsetY = (canvas.height - mapHeightPx) / 2;
//     console.log("offsetxy:", offsetX, offsetY);
//     //const mappositionY = offsetX - / cellSize;
//     const mapX = (offsetY - clickY) / cellSize;
//     const mapY = (offsetX - clickX) / cellSize;

//     setClickCoords({
//       x: parseFloat(mapX.toFixed(2)),
//       y: parseFloat(mapY.toFixed(2)),
//     });
//   };

//   const handleWheel = (e: React.WheelEvent) => {
//     e.preventDefault();

//     const newZoom = Math.max(
//       0.5,
//       Math.min(10, zoom * (e.deltaY > 0 ? 0.9 : 1.1))
//     );
//     setZoom(newZoom);
//   };

//   if (isLoading) {
//     return (
//       <Card className={className}>
//         <CardHeader>
//           <Skeleton className="h-8 w-64" />
//         </CardHeader>
//         <CardContent>
//           <Skeleton className="h-64 w-full" />
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <Card className={className}>
//       <CardHeader>
//         <h4>Map Visualization</h4>
//       </CardHeader>
//       <CardContent>
//         <div className="grid grid-cols-4 gap-4 h-[calc(100vh-100px)] p-4 ">
//           <div
//             ref={containerRef}
//             className=" relative col-span-3 h-[500px] flex-1 bg-gray-100 rounded-xl overflow-hidden  border border-blue-500"
//             onWheel={handleWheel}
//           >
//             <canvas
//               ref={canvasRef}
//               onClick={handleCanvasClick}
//               className="w-full h-full absolute top-0 left-0 border border-red-500"
//             />
//             {clickCoords && (
//               <div className="absolute top-2 left-2 bg-white bg-opacity-75 p-1 rounded text-xs">
//                 Clicked at: ({clickCoords.x}, {clickCoords.y})
//               </div>
//             )}

//             {/* Zoom controls */}
//             <div className="absolute bottom-2 right-2 flex gap-2 bg-white bg-opacity-80 rounded p-1">
//               <button
//                 className="px-2 py-1 text-sm rounded border"
//                 onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
//               >
//                 +
//               </button>
//               <button
//                 className="px-2 py-1 text-sm rounded border"
//                 onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
//               >
//                 −
//               </button>
//               <button
//                 className="px-2 py-1 text-sm rounded border"
//                 onClick={() => setZoom(1)}
//               >
//                 Reset
//               </button>
//               <span className="text-xs px-2 flex items-center">
//                 Zoom: {(zoom * 100).toFixed(0)}%
//               </span>
//             </div>
//           </div>

//           {/* Status Panel (col-span-1) */}
//           <div className="col-span-1 bg-white p-4 rounded-xl shadow flex flex-col gap-4">
//             {/* Position & Orientation */}
//             <div className="border p-4 rounded bg-gray-50">
//               <h4 className="text-sm font-medium">Orientation</h4>

//               {/* Stats Grid */}
//               <div className="grid grid-cols-1 gap-10">
//                 <div className="bg-gray-50 p-2 rounded border text-center">
//                   <div className="text-xs text-muted-foreground">Distance</div>
//                   <div className="font-medium text-sm">
//                     {latestSensorData?.distanceTraveled?.toFixed(0) || "--"}m
//                   </div>
//                 </div>
//                 <div className="bg-gray-50 p-2 rounded border text-center">
//                   <div className="text-xs text-muted-foreground">
//                     Trips Count
//                   </div>
//                   <div className="font-medium text-sm">
//                     {latestSensorData?.trips?.toFixed(0) || "--"}
//                   </div>
//                 </div>
//                 <div className="bg-gray-50 p-2 rounded border text-center">
//                   <div className="text-xs text-muted-foreground">
//                     Last Position
//                   </div>
//                   <div className="font-medium text-sm">
//                     {latestSensorData?.currentPosition
//                       ? `${latestSensorData.currentPosition?.x.toFixed(
//                           2
//                         )}, ${latestSensorData.currentPosition?.y.toFixed(2)}`
//                       : "--"}
//                   </div>
//                 </div>
//                 <div className="bg-gray-50 p-2 rounded border text-center">
//                   <div className="text-xs text-muted-foreground">Speed</div>
//                   <div className="font-medium text-sm">
//                     {latestSensorData?.speed?.toFixed(1) || "--"} m/s
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default MapVisual;
"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OccupancyGrid {
  width: number;
  height: number;
  resolution: number;
  origin: {
    position: { x: number; y: number; z: number };
  };
  data: number[];
}

interface SensorData {
  currentPosition?: { x: number; y: number };
  distanceTraveled?: number;
  trips?: number;
  speed?: number;
}

interface MapVisualProps {
  className?: string;
  roverId: number;
}

const DynamicMapVisual = ({ className, roverId }: MapVisualProps) => {
  const [mapData, setMapData] = useState<OccupancyGrid | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map interaction state
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Coordinate display state
  const [hoverCoords, setHoverCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [clickCoords, setClickCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Fetch map data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const mapResponse = await fetch("/api/map");
        const mapData = await mapResponse.json();
        setMapData(mapData);

        // Mock sensor data - replace with actual API call
        setSensorData({
          currentPosition: { x: 2.5, y: -1.8 },
          distanceTraveled: 45.2,
          trips: 3,
          speed: 0.8,
        });
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roverId]);

  // Convert world coordinates to canvas coordinates
  const worldToCanvas = useCallback(
    (worldX: number, worldY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 };

      const canvas = canvasRef.current;
      const { resolution, origin } = mapData;

      // Calculate cell size based on zoom and resolution
      const cellSize = resolution * zoom * 100; // Adjust multiplier as needed

      // Calculate map dimensions in pixels
      const mapPixelWidth = mapData.width * cellSize;
      const mapPixelHeight = mapData.height * cellSize;

      // Center the map in the canvas
      const centerOffsetX = (canvas.width - mapPixelWidth) / 2;
      const centerOffsetY = (canvas.height - mapPixelHeight) / 2;

      // Transform world coordinates to map grid coordinates
      const gridX = (worldX - origin.position.x) / resolution;
      const gridY = (worldY - origin.position.y) / resolution;

      // Convert to canvas coordinates
      const canvasX = centerOffsetX + gridX * cellSize + offset.x;
      const canvasY = centerOffsetY + gridY * cellSize + offset.y;

      return { x: canvasX, y: canvasY };
    },
    [mapData, zoom, offset]
  );

  // Convert canvas coordinates to world coordinates
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!mapData || !canvasRef.current) return { x: 0, y: 0 };

      const canvas = canvasRef.current;
      const { resolution, origin } = mapData;

      const cellSize = resolution * zoom * 100;
      const mapPixelWidth = mapData.width * cellSize;
      const mapPixelHeight = mapData.height * cellSize;

      const centerOffsetX = (canvas.width - mapPixelWidth) / 2;
      const centerOffsetY = (canvas.height - mapPixelHeight) / 2;

      // Convert canvas coordinates to grid coordinates
      const gridX = (canvasX - centerOffsetX - offset.x) / cellSize;
      const gridY = (canvasY - centerOffsetY - offset.y) / cellSize;

      // Convert to world coordinates
      const worldX = gridX * resolution + origin.position.x;
      const worldY = gridY * resolution + origin.position.y;

      return { x: worldX, y: worldY };
    },
    [mapData, zoom, offset]
  );

  // Render the map
  const renderMap = useCallback(() => {
    if (!mapData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const container = containerRef.current;

    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { width, height, data, resolution } = mapData;
    const cellSize = resolution * zoom * 100;

    // Calculate map positioning
    const mapPixelWidth = width * cellSize;
    const mapPixelHeight = height * cellSize;
    const centerOffsetX = (canvas.width - mapPixelWidth) / 2;
    const centerOffsetY = (canvas.height - mapPixelHeight) / 2;

    // Save context for transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);

    // Draw occupancy grid
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const dataIndex = row * width + col;
        const value = data[dataIndex];

        let fillStyle = "rgba(240, 240, 240, 1)"; // Unknown/free space

        if (value === 100) {
          fillStyle = "rgba(0, 0, 0, 1)"; // Occupied
        } else if (value === 0) {
          fillStyle = "rgba(255, 255, 255, 1)"; // Free space
        } else if (value === -1) {
          fillStyle = "rgba(128, 128, 128, 0.5)"; // Unknown
        }

        const x = centerOffsetX + col * cellSize;
        const y = centerOffsetY + row * cellSize;

        ctx.fillStyle = fillStyle;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Draw grid lines for better visibility when zoomed in
    if (zoom > 2) {
      ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
      ctx.lineWidth = 0.5;

      for (let i = 0; i <= width; i++) {
        const x = centerOffsetX + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, centerOffsetY);
        ctx.lineTo(x, centerOffsetY + mapPixelHeight);
        ctx.stroke();
      }

      for (let i = 0; i <= height; i++) {
        const y = centerOffsetY + i * cellSize;
        ctx.beginPath();
        ctx.moveTo(centerOffsetX, y);
        ctx.lineTo(centerOffsetX + mapPixelWidth, y);
        ctx.stroke();
      }
    }

    // Draw origin point
    const originCanvas = worldToCanvas(
      mapData.origin.position.x,
      mapData.origin.position.y
    );
    ctx.beginPath();
    ctx.arc(
      originCanvas.x - offset.x,
      originCanvas.y - offset.y,
      6,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw rover position if available
    if (sensorData?.currentPosition) {
      const roverCanvas = worldToCanvas(
        sensorData.currentPosition.x,
        sensorData.currentPosition.y
      );
      ctx.beginPath();
      ctx.arc(
        roverCanvas.x - offset.x,
        roverCanvas.y - offset.y,
        8,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "blue";
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }, [mapData, sensorData, zoom, offset, worldToCanvas]);

  // Handle mouse events
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      // Update hover coordinates
      const worldCoords = canvasToWorld(canvasX, canvasY);
      setHoverCoords({
        x: Number.parseFloat(worldCoords.x.toFixed(3)),
        y: Number.parseFloat(worldCoords.y.toFixed(3)),
      });

      // Handle dragging
      if (isDragging) {
        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;

        setOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));

        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    },
    [canvasToWorld, isDragging, lastMousePos]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const worldCoords = canvasToWorld(canvasX, canvasY);
      setClickCoords({
        x: Number.parseFloat(worldCoords.x.toFixed(3)),
        y: Number.parseFloat(worldCoords.y.toFixed(3)),
      });
    },
    [canvasToWorld]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor));

      setZoom(newZoom);
    },
    [zoom]
  );

  // Render map when dependencies change
  useEffect(() => {
    renderMap();
  }, [renderMap]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      renderMap();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderMap]);

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
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h4 className="text-lg font-semibold">Dynamic Map Visualization</h4>
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
              className="w-full h-full cursor-move"
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

            {clickCoords && (
              <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 text-white px-2 py-1 rounded text-sm">
                Clicked: ({clickCoords.x}, {clickCoords.y})
              </div>
            )}

            {/* Map info */}
            {mapData && (
              <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs">
                Map: {mapData.width}×{mapData.height} | Resolution:{" "}
                {mapData.resolution}m
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-2 right-2 flex gap-2 bg-white bg-opacity-90 rounded p-2">
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
              <button
                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                Reset
              </button>
              <span className="text-xs px-2 flex items-center bg-gray-100 rounded">
                {(zoom * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Status Panel */}
          <div className="col-span-1 bg-white p-4 rounded-lg shadow-md">
            <h5 className="font-semibold mb-4">Rover Status</h5>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">
                  Current Position
                </div>
                <div className="font-mono text-sm">
                  {sensorData?.currentPosition
                    ? `(${sensorData.currentPosition.x.toFixed(
                        2
                      )}, ${sensorData.currentPosition.y.toFixed(2)})`
                    : "Unknown"}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">
                  Distance Traveled
                </div>
                <div className="font-mono text-sm">
                  {sensorData?.distanceTraveled?.toFixed(1) || "--"} m
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Speed</div>
                <div className="font-mono text-sm">
                  {sensorData?.speed?.toFixed(2) || "--"} m/s
                </div>
              </div>
              {/* <div className="bg-gray-50 p-2 rounded border text-center">
                <div className="text-xs text-muted-foreground">
                  Last Position
                </div>
                <div className="font-medium text-sm">
                  {latestSensorData?.currentPosition
                    ? `${latestSensorData.currentPosition?.x.toFixed(
                        2
                      )}, ${latestSensorData.currentPosition?.y.toFixed(2)}`
                    : "--"}
                </div>
              </div> */}
              {/* <div className="bg-gray-50 p-3 rounded border">
                <div className="text-xs text-gray-600 mb-1">Trips</div>
                <div className="font-mono text-sm">{sensorData?.trips || "--"}</div>
              </div> */}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <div>• Red dot: Origin (0,0)</div>
              <div>• Blue dot: Rover position</div>
              <div>• Drag to pan, scroll to zoom</div>
              <div>• Click to get coordinates</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicMapVisual;
