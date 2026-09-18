export type ActivityEventRow = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  provider?: string;
  connector_version?: string;
  session_id?: string;
  project_id?: string;
  work_item_id?: string;
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
  provider?: string;
};

export type DeveloperOverviewRow = {
  developerId?: string;
  deviceId?: string;
  provider?: string | null;
  connectorVersion?: string | null;
  lastHeartbeat?: string | null;
  lastEventAt?: string | null;
  eventsThisHour?: number;
  queueDepth?: number | null;
  paused?: boolean;
  coverageWarning?: boolean;
  connectorState?: "online" | "stale" | "paused";
  currentSession?: {
    sessionId?: string;
    startedAt?: string;
    projectId?: string | null;
    workItemId?: string | null;
    unassigned?: boolean;
  } | null;
};

export type DashboardAlert = {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  deviceId?: string;
};

export type TeamResponse = {
  connectors: ConnectorRow[];
  developers?: DeveloperOverviewRow[];
  alerts?: DashboardAlert[];
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
    tokenInput?: number;
    tokenOutput?: number;
    testsCompleted?: number;
    buildsCompleted?: number;
    fileChanges?: number;
    eventCount?: number;
  };
  completeness?: string;
  recalcReason?: string | null;
};
