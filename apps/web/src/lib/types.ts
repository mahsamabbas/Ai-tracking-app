export type ActivityEventRow = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  provider?: string;
  connector_version?: string;
  session_id?: string;
  status?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
};

export type ConnectorRow = {
  deviceId?: string;
  device_id?: string;
  lastHeartbeat?: string;
  last_heartbeat?: string;
  version?: string;
  queueDepth?: number;
  queue_depth?: number;
  paused?: number;
};

export type TeamResponse = {
  connectors: ConnectorRow[];
  recentEvents: ActivityEventRow[];
  dbAvailable?: boolean;
  hint?: string;
};

export type HourlySnapshot = {
  id?: string;
  hourStart?: string;
  hour_start?: string;
  version?: number;
  metrics?: {
    modelDurationMs?: number;
    toolDurationMs?: number;
    mergedActiveDurationMs?: number;
    interactiveSpanMs?: number;
    elapsedSessionSpanMs?: number;
  };
  completeness?: string;
};
