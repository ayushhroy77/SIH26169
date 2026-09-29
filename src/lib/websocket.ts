/**
 * Native WebSocket Clients for FSOC Telemetry and Video Ingestion Streams
 * - TelemetryWebSocketClient: Connects to /ws/telemetry for 30 Hz live scene frames + JSON metrics
 * - VideoBenchmarkWebSocketClient: Connects to /ws/video/{video_id} for pre-recorded benchmark ingestion
 */

import { TelemetryMetrics, BenchmarkMetrics } from './spec';

export interface WSMessagePayload {
  timestamp: number;
  frame: string; // data:image/jpeg;base64,... or raw b64
  metrics: TelemetryMetrics;
}

export interface VideoWSMessagePayload {
  type: 'frame' | 'eof' | 'error';
  timestamp?: number;
  frame?: string;
  frame_idx?: number;
  total_frames?: number;
  detected?: { x: number; y: number } | null;
  detected_bbox?: [number, number, number, number] | null;
  gt?: { x: number; y: number } | null;
  boresight?: { x: number; y: number };
  is_approximate_gt?: boolean;
  metrics?: BenchmarkMetrics;
  status?: string;
}

function getWsBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  return 'ws://localhost:3000';
}

export class TelemetryWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: ((data: WSMessagePayload) => void) | null = null;
  private reconnectTimer: any = null;

  constructor(url?: string) {
    this.url = url || `${getWsBaseUrl()}/ws/telemetry`;
  }

  public connect(onMessage: (data: WSMessagePayload) => void) {
    this.onMessageCallback = onMessage;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS] Connected to FSOC Telemetry Server');
      };

      this.ws.onmessage = (event) => {
        try {
          const payload: WSMessagePayload = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(payload);
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS] Connection closed, scheduling retry in 2s...');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        console.warn('[WS] Telemetry WebSocket offline/warning');
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  public sendCommand(cmd: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.onMessageCallback) {
        this.connect(this.onMessageCallback);
      }
    }, 2000);
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export class VideoBenchmarkWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessageCallback: ((data: VideoWSMessagePayload) => void) | null = null;
  private reconnectTimer: any = null;

  constructor(videoId: string, customUrl?: string) {
    this.url = customUrl || `${getWsBaseUrl()}/ws/video/${videoId}`;
  }

  public connect(onMessage: (data: VideoWSMessagePayload) => void) {
    this.onMessageCallback = onMessage;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WS Video] Connected to Video Benchmark Stream:', this.url);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload: VideoWSMessagePayload = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(payload);
          }
        } catch (err) {
          console.error('[WS Video] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WS Video] Closed');
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Video] Connection warning');
      };
    } catch (e) {
      console.warn('[WS Video] Failed to create socket', e);
    }
  }

  public sendAction(action: 'play' | 'pause' | 'step' | 'reset' | 'seek', extraData: Record<string, any> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...extraData }));
    }
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
