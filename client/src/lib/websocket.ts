import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { WebSocketMessage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from './queryClient';

type WebSocketContextType = {
  connected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  gpsPosition: { latitude: number; longitude: number } | null;  // ✅ Add this 
  mapData: { map: string; latitude?: number; longitude?: number } | null;  // ✅

};

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  sendMessage: () => {},
  lastMessage: null,
  gpsPosition: null,  // ✅ Add default null value
  mapData: null, // ✅ Add this line

});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = (props) => {
  const { children } = props;
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const { toast } = useToast();
  const [gpsPosition, setGpsPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapData, setMapData] = useState<{ map: string; latitude?: number; longitude?: number } | null>(null);


  let reconnectAttempts = 0;


  const connectWebSocket = useCallback(() => {
    if (socket) return; // Prevent multiple connections

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        toast({
          title: 'Connected to server',
          description: 'Real-time updates are now active',
        });
      
      
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            setLastMessage((prev) => 
              prev?.timestamp === message.timestamp ? prev : message
            );
          
          // Handle specific message types
            switch (message.type) {
              case 'STATUS_UPDATE':
                // Invalidate rover queries to get updated data
                if (message.roverId) {
                  queryClient.invalidateQueries({ queryKey: [`/api/rovers/${message.roverId}`] });
                }
                queryClient.invalidateQueries({ queryKey: ['/api/rovers'] });
                queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
                break;
              
              case 'TELEMETRY':
              // Invalidate sensor data queries
                if (message.roverId) {
                  queryClient.invalidateQueries({ 
                    queryKey: [`/api/rovers/${message.roverId}/sensor-data`] 
                  });
                }
                break;
              
              /*case 'COMMAND':
              // Invalidate command logs
                if (message.roverId) {
                  queryClient.invalidateQueries({ 
                    queryKey: [`/api/rovers/${message.roverId}/command-logs`] 
                  });
                }
                break;*/

              case "COMMAND_RESPONSE":
                if(message.roverId){
                  queryClient.invalidateQueries({
                    queryKey:[`/api/rovers/${message.roverId}/command-logs`]
                  });
                }
                break;
              
          
              
              case 'ERROR':
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: message.payload?.message || "An unknown error occurred",
                });
                break;

              case 'MAP_DATA': // ✅ Handle GPS Data separately
                const payload = message.payload;
                console.log("📡 Received MAP_DATA payload:", payload);

                if (!payload?.map) {
                  console.error("❌ map object  is missing fro payload:", payload);
                } else {
                 // Handle compressed map data (store it or pass to renderer)
                 setMapData(payload);  // or extract fields if needed


                  if (message.payload?.latitude && message.payload?.longitude) {
                    setGpsPosition({
                      latitude: payload.latitude,
                      longitude: payload.longitude,
                    });
                  }
                }
                console.log("Updating mapData:", message);

                break;
          
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Try to reconnect after delay
        setTimeout(() => {
          if (!connected) {
          connectWebSocket();
          }
        }, 3000);
        
        toast({
         variant: "destructive",
          title: "Disconnected from server",
          description: "Attempting to reconnect...",
        });
        const retryDelay = Math.min(10000 * (2 ** reconnectAttempts), 60000); // Exponential backoff (max 1 min)
        reconnectAttempts++;
      

        /*setTimeout(() => {
          if (document.visibilityState !== 'hidden') {
            connectWebSocket();
          }
        }, retryDelay);*/

      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
      
      setSocket(ws);
      
      // Cleanup on unmount
      return () => {
        if (ws.readyState === WebSocket.OPEN) { //*

          ws.close();
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  }, []);//* [toast]);
  
  useEffect(() => {
    if (!socket) {
      connectWebSocket();
    }
  
    
    // Reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !connected) {
        connectWebSocket();
      }
    };
    
    //document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
    };
  }, [connectWebSocket ]);//, connected, socket]);*/
  
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Add timestamp if not provided
      const messageWithTimestamp: WebSocketMessage = {
        ...message,
        timestamp: message.timestamp || Date.now()
      };
      socket.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.error('WebSocket not connected');
      
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Not connected to server. Please try again later.",
      });
    }
  }, [socket, toast]);
  
  const contextValue: WebSocketContextType = {
    connected,
    sendMessage,
    lastMessage,
    gpsPosition,  // ✅ Provide the GPS position to the context
    mapData,
  };

  return React.createElement(
    WebSocketContext.Provider,
    { value: contextValue },
    children
  );
}
