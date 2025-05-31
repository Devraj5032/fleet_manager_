import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { SensorData as SensorDataType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import roomImage from "./room.jpg";

export interface SensorDataProps {
  className?: string;
  roverId: number;
}
interface OccupancyGrid {
  width: number;
  height: number;
  resolution: number;
  origin: { position: { x: number; y: number; z: number } }; // in meters
  data: number[];
}

const MapVisual = ({ className, roverId }: SensorDataProps) => {
  const [mapData, setMapData] = useState<OccupancyGrid | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [clickCoords, setClickCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const { data: sensorData, isLoading } = useQuery<SensorDataType[]>({
    queryKey: [`/api/rovers/${roverId}/sensor-data`],
    refetchInterval: 100000,
  });
  const latestSensorData =
    sensorData && sensorData.length > 0 ? sensorData[0] : null;
  console.log("currentPosition", latestSensorData?.currentPosition);
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Disable browser zoom with Ctrl+Scroll
      }
    };

    window.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventZoom);
    };
  }, []);

  useEffect(() => {
    const fetchMap = async () => {
      const res = await fetch(`/api/map`);
      const data = await res.json();
      setMapData(data);
    };
    fetchMap();
  }, []);

  useEffect(() => {
    if (!mapData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const container = containerRef.current;

    if (!ctx) return;

    // Get map info
    const { width, height, resolution, origin, data } = mapData;
    const cellSize = resolution * zoom * 30;
    console.log("useeffect:", cellSize);

    // Set canvas size to match container
    const canvasWidth = container.clientWidth;
    const canvasHeight = container.clientHeight;
    console.log("canvas", canvasWidth, canvasHeight);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    console.log("outer:", canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#b3b3b3"; // light gray
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Translate canvas to apply pan offset
    ctx.save();

    // Calculate map size in pixels
    const mapPixelWidth = height * cellSize;
    const mapPixelHeight = width * cellSize;
    console.log("widthheight:", width, height);
    console.log("mappixelwidthheight:", mapPixelWidth, mapPixelHeight);

    // Center map in canvas
    const offsetX = (canvasWidth - mapPixelWidth) / 2;
    const offsetY = (canvasHeight - mapPixelHeight) / 2;
    //const rotationAngle = (90 * Math.PI) / 180; // rotate 90 degrees clockwise

    // Translate canvas to apply pan offset
    ctx.save();

    ctx.translate(offset.x, offset.y);

    // Draw grid
    for (let row = 0; row < width; row++) {
      for (let col = 0; col < height; col++) {
        const val = data[row * width + col];

        let fill = "rgba(0,0,0,0)";
        if (val === 100) fill = "rgba(0,0,0,1)";
        else if (val === -1) fill = "rgba(200,200,200,1)";
        else if (val === 0) fill = "rgba(220,220,220,1)";

        if (fill) {
          const x = offsetX + row * cellSize;
          //          131 + col * cellSize;
          const y = offsetY + col * cellSize; //40.25 + row * cellSize;
          ctx.fillStyle = fill;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    const { x: originCanvasX, y: originCanvasY } = mapToCanvas(
      0,
      0,
      resolution,
      zoom,
      offsetX,
      offsetY,
      origin.position.x,
      origin.position.y
    );

    ctx.beginPath();
    ctx.arc(originCanvasX, originCanvasY, 5, 0, 2 * Math.PI);
    console.log(originCanvasX, originCanvasY);
    ctx.fillStyle = "red";
    ctx.fill();

    const { x: roverPosx, y: roverPosy } = mapToCanvas(
      4,
      -4,
      resolution,
      zoom,
      offsetX,
      offsetY,
      origin.position.x,
      origin.position.y
    );
    ctx.beginPath();
    ctx.arc(roverPosx, roverPosy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();

    const { x: r1x, y: r1y } = mapToCanvas(
      5,
      0,
      resolution,
      zoom,
      offsetX,
      offsetY,
      origin.position.x,
      origin.position.y
    );
    ctx.beginPath();
    ctx.arc(r1x, r1y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "green";
    ctx.fill();

    // Plot Rover Position (if available)
    if (
      latestSensorData?.currentPosition !== null &&
      latestSensorData?.currentPosition !== undefined
    ) {
      const roverPos = mapToCanvas(
        latestSensorData.currentPosition.x,
        latestSensorData.currentPosition.y,

        resolution,
        zoom,
        offsetX,
        offsetY,
        origin.position.x,
        origin.position.y
      );

      ctx.beginPath();
      ctx.arc(roverPos.x, roverPos.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "orange";
      ctx.fill();
    }

    ctx.restore();
  }, [mapData, zoom, offset, latestSensorData]);
  function mapToCanvas(
    worldX: number,
    worldY: number,
    resolution: number,
    zoom: number,
    canvasOffsetX: number,
    canvasOffsetY: number,
    mapOriginX: number,
    mapOriginY: number
  ) {
    const cellSize = resolution * zoom * 600; // resolution * zoom * 30;
    const dx = (worldY - mapOriginY) * cellSize; //zoom * 30; // 30;
    const dy = (worldX - mapOriginX) * cellSize; // zoom * 30; //(worldX - mapOriginX) * cellSize;  //y+9.7 //-x+2.4
    console.log("cellsizemaptocanvas", cellSize);

    //function handleCanvasClick();
    console.log("canvasdxdy", dx, dy);
    console.log("canvasoffset:", canvasOffsetX, canvasOffsetY);
    console.log(
      "finalfixedpoint to world co:",
      dx + canvasOffsetX,
      dy + canvasOffsetY
    );
    return {
      x: canvasOffsetX + dx,
      y: canvasOffsetY + dy,
    };
  }

  /*const handleCa,nvasClick = (e: React.MouseEvent) => {
    if (!mapData || !canvasRef.current || !containerRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    console.log("hanldeclick:", clickX, clickY);

    const cellSize = zoom * 30;
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const mapPixelWidth = mapData.height * cellSize;
    const mapPixelHeight = mapData.width * cellSize;

    const offsetX = (canvasWidth - mapPixelWidth) / 2;
    const offsetY = (canvasHeight - mapPixelHeight) / 2;
    console.log("handleoffset:", offsetX, offsetY);
    const originX = mapData.origin.position.x;
    const originY = mapData.origin.position.y;

    // Convert canvas click to world coordinates (meters)
    const worldY = (clickX - offsetX - offset.x) / cellSize + originY;
    const worldX = (clickY - offsetY - offset.y) / cellSize + originX;

    // Relative to fixed origin
    const mapCoordX = worldX - originX;
    const mapCoordY = worldY - originY;
    console.log("worldXY", worldX, worldY);
    console.log("originXY:", originX, originY);
    setClickCoords({
      x: parseFloat(mapCoordX.toFixed(2)),
      y: parseFloat(mapCoordY.toFixed(2)),
    });
    console.log("set", mapCoordX, mapCoordY);
  };*/
  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement, MouseEvent>
  ) => {
    if (!canvasRef.current || !mapData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    console.log("handleclick");
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    console.log("clickXY:", clickX, clickY);
    const cellSize = mapData.resolution * zoom * 30;
    console.log("cellsize:", cellSize);

    const mapWidthPx = mapData.height * cellSize;
    const mapHeightPx = mapData.width * cellSize;
    console.log("mapwidthHeightpx:", mapWidthPx, mapHeightPx);

    const offsetX = (canvas.width - mapWidthPx) / 2;
    const offsetY = (canvas.height - mapHeightPx) / 2;
    console.log("offsetxy:", offsetX, offsetY);
    //const mappositionY = offsetX - / cellSize;
    const mapX = (offsetY - clickY) / cellSize;
    const mapY = (offsetX - clickX) / cellSize;

    setClickCoords({
      x: parseFloat(mapX.toFixed(2)),
      y: parseFloat(mapY.toFixed(2)),
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const newZoom = Math.max(
      0.5,
      Math.min(10, zoom * (e.deltaY > 0 ? 0.9 : 1.1))
    );
    setZoom(newZoom);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <h4>Map Visualization</h4>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 h-[calc(100vh-100px)] p-4 ">
          <div
            ref={containerRef}
            className=" relative col-span-3 h-[500px] flex-1 bg-gray-100 rounded-xl overflow-hidden  border border-blue-500"
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full h-full absolute top-0 left-0 border border-red-500"
            />
            {clickCoords && (
              <div className="absolute top-2 left-2 bg-white bg-opacity-75 p-1 rounded text-xs">
                Clicked at: ({clickCoords.x}, {clickCoords.y})
              </div>
            )}

            {/* Zoom controls */}
            <div className="absolute bottom-2 right-2 flex gap-2 bg-white bg-opacity-80 rounded p-1">
              <button
                className="px-2 py-1 text-sm rounded border"
                onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
              >
                +
              </button>
              <button
                className="px-2 py-1 text-sm rounded border"
                onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
              >
                −
              </button>
              <button
                className="px-2 py-1 text-sm rounded border"
                onClick={() => setZoom(1)}
              >
                Reset
              </button>
              <span className="text-xs px-2 flex items-center">
                Zoom: {(zoom * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Status Panel (col-span-1) */}
          <div className="col-span-1 bg-white p-4 rounded-xl shadow flex flex-col gap-4">
            {/* Position & Orientation */}
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="text-sm font-medium">Orientation</h4>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-10">
                <div className="bg-gray-50 p-2 rounded border text-center">
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="font-medium text-sm">
                    {latestSensorData?.distanceTraveled?.toFixed(0) || "--"}m
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded border text-center">
                  <div className="text-xs text-muted-foreground">
                    Trips Count
                  </div>
                  <div className="font-medium text-sm">
                    {latestSensorData?.trips?.toFixed(0) || "--"}
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded border text-center">
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
                </div>
                <div className="bg-gray-50 p-2 rounded border text-center">
                  <div className="text-xs text-muted-foreground">Speed</div>
                  <div className="font-medium text-sm">
                    {latestSensorData?.speed?.toFixed(1) || "--"} m/s
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapVisual;
