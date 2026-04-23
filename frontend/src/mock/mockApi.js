const DEMO_USER = {
  id: "u-admin-001",
  username: "admin",
  full_name: "Demo Administrator",
  email: "admin@sentineledge.local",
  role: "admin",
  is_active: true,
  created_at: "2026-01-10T12:00:00Z",
};

const INITIAL_STATE = {
  users: [
    DEMO_USER,
    {
      id: "u-op-001",
      username: "operator",
      full_name: "Demo Operator",
      email: "operator@sentineledge.local",
      role: "operator",
      is_active: true,
      created_at: "2026-01-10T12:00:00Z",
    },
  ],
  zones: [
    {
      id: "zone-001",
      name: "Central Campus",
      description: "Main monitoring area",
      address: "Av. Paulista, Sao Paulo",
      latitude: -23.561414,
      longitude: -46.655881,
      camera_count: 2,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
    {
      id: "zone-002",
      name: "Logistics Yard",
      description: "Loading and perimeter zone",
      address: "Porto Alegre Industrial District",
      latitude: -30.028166,
      longitude: -51.228249,
      camera_count: 2,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
  ],
  cameras: [
    {
      id: "cam-001",
      name: "Gate A",
      location: "Main Entrance",
      zone_id: "zone-001",
      zone: { id: "zone-001", name: "Central Campus" },
      ip: "10.0.0.11",
      rtsp_url: "rtsp://10.0.0.11/stream",
      status: "online",
      is_online: true,
      is_active: true,
      fps: 24,
      resolution: "1920x1080",
      latitude: -23.561214,
      longitude: -46.655401,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
    {
      id: "cam-002",
      name: "Parking North",
      location: "North Parking",
      zone_id: "zone-001",
      zone: { id: "zone-001", name: "Central Campus" },
      ip: "10.0.0.12",
      rtsp_url: "rtsp://10.0.0.12/stream",
      status: "online",
      is_online: true,
      is_active: true,
      fps: 20,
      resolution: "1280x720",
      latitude: -23.561714,
      longitude: -46.656001,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
    {
      id: "cam-003",
      name: "Yard West",
      location: "Logistics Perimeter",
      zone_id: "zone-002",
      zone: { id: "zone-002", name: "Logistics Yard" },
      ip: "10.0.0.21",
      rtsp_url: "rtsp://10.0.0.21/stream",
      status: "offline",
      is_online: false,
      is_active: true,
      fps: 15,
      resolution: "1920x1080",
      latitude: -30.028566,
      longitude: -51.227749,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
    {
      id: "cam-004",
      name: "Dock 03",
      location: "Loading Dock",
      zone_id: "zone-002",
      zone: { id: "zone-002", name: "Logistics Yard" },
      ip: "10.0.0.22",
      rtsp_url: "rtsp://10.0.0.22/stream",
      status: "online",
      is_online: true,
      is_active: true,
      fps: 18,
      resolution: "1280x720",
      latitude: -30.027966,
      longitude: -51.228749,
      created_at: "2026-01-11T12:00:00Z",
      updated_at: "2026-01-11T12:00:00Z",
    },
  ],
  alerts: [
    {
      id: "alert-001",
      camera_id: "cam-001",
      camera: { name: "Gate A", location: "Main Entrance" },
      detected_object: "person",
      confidence: 0.93,
      severity: "high",
      status: "pending",
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      image_path: "/demo/alert-1.svg",
      notes: "Unexpected access attempt near entrance",
    },
    {
      id: "alert-002",
      camera_id: "cam-002",
      camera: { name: "Parking North", location: "North Parking" },
      detected_object: "person",
      confidence: 0.87,
      severity: "medium",
      status: "reviewing",
      created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      image_path: "/demo/alert-2.svg",
      notes: "Movement detected after schedule",
    },
    {
      id: "alert-003",
      camera_id: "cam-004",
      camera: { name: "Dock 03", location: "Loading Dock" },
      detected_object: "person",
      confidence: 0.79,
      severity: "medium",
      status: "pending",
      created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
      image_path: "/demo/alert-3.svg",
      notes: "Perimeter crossing",
    },
  ],
  settings: [
    { id: 1, key: "show_bounding_boxes", value: "true", created_at: "2026-01-10T12:00:00Z", updated_at: "2026-01-10T12:00:00Z" },
    { id: 2, key: "rtsp_reconnect_interval_seconds", value: "5", created_at: "2026-01-10T12:00:00Z", updated_at: "2026-01-10T12:00:00Z" },
    { id: 3, key: "rtsp_open_timeout_ms", value: "5000", created_at: "2026-01-10T12:00:00Z", updated_at: "2026-01-10T12:00:00Z" },
    { id: 4, key: "rtsp_read_timeout_ms", value: "5000", created_at: "2026-01-10T12:00:00Z", updated_at: "2026-01-10T12:00:00Z" },
    { id: 5, key: "max_fps", value: "30", created_at: "2026-01-10T12:00:00Z", updated_at: "2026-01-10T12:00:00Z" },
  ],
};

let state = JSON.parse(JSON.stringify(INITIAL_STATE));
let enabled = false;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(payload, status = 200, contentType = "text/plain") {
  return new Response(payload, {
    status,
    headers: { "Content-Type": contentType },
  });
}

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function shouldMock(url) {
  if (url.hostname === "localhost" && url.port === "8000") return true;
  if (url.origin === window.location.origin) {
    return /^\/(auth|cameras|zones|alerts|dashboard|health|settings|users|system)\b/.test(url.pathname);
  }
  return false;
}

function getDashboardStats() {
  const total_cameras = state.cameras.length;
  const active_cameras = state.cameras.filter((c) => c.is_online).length;
  const total_alerts_today = state.alerts.length;
  const pending_alerts = state.alerts.filter((a) => a.status === "pending").length;

  return {
    total_cameras,
    active_cameras,
    total_alerts_today,
    pending_alerts,
    recent_alerts: state.alerts.slice(0, 5),
  };
}

function findZone(id) {
  return state.zones.find((z) => z.id === id) || null;
}

function attachCameraZone(camera) {
  const zone = findZone(camera.zone_id);
  return {
    ...camera,
    zone: zone ? { id: zone.id, name: zone.name } : null,
  };
}

function handleRoute(method, url, body) {
  const { pathname, searchParams } = url;

  if (method === "POST" && pathname === "/auth/login") {
    if (!body.username || !body.password) {
      return jsonResponse({ detail: "Invalid credentials" }, 401);
    }
    return jsonResponse({ access_token: "mock-token", token_type: "bearer" });
  }

  if (method === "GET" && pathname === "/auth/me") {
    return jsonResponse(DEMO_USER);
  }

  if (method === "GET" && pathname === "/system/logo") {
    return jsonResponse({ has_logo: true, path: "/demo/sentineledge-logo.svg" });
  }

  if (method === "GET" && pathname === "/health") {
    const online = state.cameras.filter((c) => c.is_online).length;
    return jsonResponse({
      status: "healthy",
      backend: { status: "healthy", latency: 18 },
      database: { status: "healthy", latency: 22 },
      redis: { status: "healthy", latency: 11 },
      websocket: { status: "online", latency: 8 },
      cameras: { online, offline: state.cameras.length - online, total: state.cameras.length },
      memory_usage: 42,
      cpu_usage: 27,
      uptime: "3d 04h 12m",
    });
  }

  if (method === "GET" && pathname === "/dashboard/stats") {
    return jsonResponse(getDashboardStats());
  }

  if (method === "GET" && pathname === "/zones") {
    return jsonResponse(state.zones);
  }

  if (method === "POST" && pathname === "/zones") {
    const zone = {
      id: `zone-${Date.now()}`,
      name: body.name || "New Zone",
      description: body.description || "",
      address: body.address || "",
      latitude: body.latitude || null,
      longitude: body.longitude || null,
      camera_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.zones.unshift(zone);
    return jsonResponse(zone, 201);
  }

  if (method === "PUT" && pathname.startsWith("/zones/")) {
    const zoneId = pathname.split("/")[2];
    state.zones = state.zones.map((z) => (z.id === zoneId ? { ...z, ...body, updated_at: new Date().toISOString() } : z));
    const zone = findZone(zoneId);
    if (!zone) return jsonResponse({ detail: "Zone not found" }, 404);
    return jsonResponse(zone);
  }

  if (method === "DELETE" && pathname.startsWith("/zones/")) {
    const zoneId = pathname.split("/")[2];
    state.zones = state.zones.filter((z) => z.id !== zoneId);
    state.cameras = state.cameras.map((c) => (c.zone_id === zoneId ? { ...c, zone_id: null, zone: null } : c));
    return jsonResponse({ success: true });
  }

  if (method === "GET" && pathname === "/cameras") {
    return jsonResponse(state.cameras.map(attachCameraZone));
  }

  if (method === "POST" && pathname === "/cameras") {
    const camera = {
      id: `cam-${Date.now()}`,
      name: body.name || "New Camera",
      location: body.location || "Unknown",
      zone_id: body.zone_id || null,
      ip: body.ip || "10.0.0.99",
      rtsp_url: body.ip ? `rtsp://${body.ip}/stream` : "rtsp://10.0.0.99/stream",
      status: "online",
      is_online: true,
      is_active: true,
      fps: 20,
      resolution: "1280x720",
      latitude: body.latitude || -23.56,
      longitude: body.longitude || -46.65,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.cameras.unshift(camera);
    return jsonResponse(attachCameraZone(camera), 201);
  }

  if (method === "PUT" && pathname.startsWith("/cameras/")) {
    const parts = pathname.split("/");
    const cameraId = parts[2];

    if (parts[3] === "detection-zone") {
      return jsonResponse({ success: true, zone: body });
    }

    state.cameras = state.cameras.map((c) => (c.id === cameraId ? { ...c, ...body, updated_at: new Date().toISOString() } : c));
    const camera = state.cameras.find((c) => c.id === cameraId);
    if (!camera) return jsonResponse({ detail: "Camera not found" }, 404);
    return jsonResponse(attachCameraZone(camera));
  }

  if (method === "DELETE" && pathname.startsWith("/cameras/")) {
    const cameraId = pathname.split("/")[2];
    state.cameras = state.cameras.filter((c) => c.id !== cameraId);
    return jsonResponse({ success: true });
  }

  if (method === "POST" && pathname.match(/^\/cameras\/[^/]+\/test$/)) {
    return jsonResponse({
      success: true,
      message: "Mock camera connection successful",
      details: { connection: "success", latency_ms: 24.5, resolution: "1280x720", fps: 20 },
    });
  }

  if (method === "GET" && pathname.match(/^\/cameras\/[^/]+\/snapshot$/)) {
    const cameraId = pathname.split("/")[2];
    const idx = Number(cameraId.replace(/\D/g, "")) || 1;
    const hue = (idx * 47) % 360;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='hsl(${hue} 70% 35%)'/><stop offset='1' stop-color='#0b1220'/></linearGradient></defs><rect width='1280' height='720' fill='url(#g)'/><g fill='none' stroke='rgba(255,255,255,.28)'><path d='M0 120h1280M0 360h1280M0 600h1280'/><path d='M160 0v720M480 0v720M800 0v720M1120 0v720'/></g><rect x='80' y='70' width='280' height='80' rx='10' fill='rgba(2,6,23,.65)'/><text x='100' y='118' fill='#22d3ee' font-size='34' font-family='monospace'>SENTINEL</text><rect x='920' y='70' width='280' height='80' rx='10' fill='rgba(2,6,23,.65)'/><text x='950' y='118' fill='#86efac' font-size='30' font-family='monospace'>LIVE DEMO</text><rect x='440' y='250' width='180' height='280' fill='none' stroke='#22d3ee' stroke-width='4'/><text x='445' y='242' fill='#22d3ee' font-size='20' font-family='monospace'>Person 92%</text><rect x='720' y='280' width='160' height='260' fill='none' stroke='#22d3ee' stroke-width='4'/><text x='725' y='272' fill='#22d3ee' font-size='20' font-family='monospace'>Person 88%</text></svg>`;
    return textResponse(svg, 200, "image/svg+xml");
  }

  if (method === "GET" && pathname === "/alerts") {
    const limit = Number(searchParams.get("limit") || 0);
    if (limit > 0) return jsonResponse(state.alerts.slice(0, limit));
    return jsonResponse(state.alerts);
  }

  if (method === "GET" && pathname === "/alerts/count") {
    return jsonResponse({ count: state.alerts.length });
  }

  if (method === "PUT" && pathname.match(/^\/alerts\/[^/]+$/)) {
    const alertId = pathname.split("/")[2];
    state.alerts = state.alerts.map((a) => (a.id === alertId ? { ...a, ...body, status: body.acknowledged ? "confirmed" : a.status } : a));
    return jsonResponse({ success: true });
  }

  if (method === "POST" && pathname.match(/^\/alerts\/[^/]+\/acknowledge$/)) {
    const alertId = pathname.split("/")[2];
    state.alerts = state.alerts.map((a) => (a.id === alertId ? { ...a, status: "confirmed" } : a));
    return jsonResponse({ success: true });
  }

  if (method === "DELETE" && pathname === "/alerts/delete-all") {
    const deleted = state.alerts.length;
    state.alerts = [];
    return jsonResponse({ deleted, files_deleted: deleted, message: "All alerts deleted" });
  }

  if (method === "DELETE" && pathname === "/alerts/delete-old") {
    const deleted = Math.min(1, state.alerts.length);
    state.alerts = state.alerts.slice(0, Math.max(state.alerts.length - deleted, 0));
    return jsonResponse({ deleted, files_deleted: deleted, message: "Old alerts deleted" });
  }

  if (method === "GET" && pathname === "/settings") {
    return jsonResponse(state.settings);
  }

  if (method === "POST" && pathname === "/settings") {
    const existing = state.settings.find((s) => s.key === body.key);
    if (existing) {
      existing.value = String(body.value ?? "");
      existing.updated_at = new Date().toISOString();
      return jsonResponse(existing);
    }
    const item = {
      id: state.settings.length + 1,
      key: body.key,
      value: String(body.value ?? ""),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    state.settings.push(item);
    return jsonResponse(item, 201);
  }

  if (method === "GET" && pathname === "/settings/detection") {
    const boxes = state.settings.find((s) => s.key === "show_bounding_boxes");
    return jsonResponse({ show_bounding_boxes: boxes?.value !== "false" });
  }

  if (method === "PUT" && pathname === "/settings/detection") {
    let boxes = state.settings.find((s) => s.key === "show_bounding_boxes");
    if (!boxes) {
      boxes = { id: state.settings.length + 1, key: "show_bounding_boxes", value: "true", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      state.settings.push(boxes);
    }
    boxes.value = body.show_bounding_boxes ? "true" : "false";
    boxes.updated_at = new Date().toISOString();
    return jsonResponse({ show_bounding_boxes: body.show_bounding_boxes, message: "Updated" });
  }

  if (method === "POST" && pathname === "/settings/telegram/test") {
    return jsonResponse({ success: true, message: "Telegram test simulated in demo mode", integration_mode: "mock" });
  }

  if (method === "GET" && pathname === "/users") {
    return jsonResponse(state.users);
  }

  if (method === "POST" && pathname === "/users") {
    const user = {
      id: `u-${Date.now()}`,
      username: body.username,
      full_name: body.full_name || body.username,
      email: body.email || `${body.username}@example.local`,
      role: body.role || "viewer",
      is_active: true,
      created_at: new Date().toISOString(),
    };
    state.users.unshift(user);
    return jsonResponse(user, 201);
  }

  if (method === "PUT" && pathname.startsWith("/users/")) {
    const userId = pathname.split("/")[2];
    state.users = state.users.map((u) => (u.id === userId ? { ...u, ...body } : u));
    const user = state.users.find((u) => u.id === userId);
    if (!user) return jsonResponse({ detail: "User not found" }, 404);
    return jsonResponse(user);
  }

  if (method === "DELETE" && pathname.startsWith("/users/")) {
    const userId = pathname.split("/")[2];
    state.users = state.users.filter((u) => u.id !== userId);
    return jsonResponse({ success: true });
  }

  return jsonResponse({ detail: `Mock route not found: ${method} ${pathname}` }, 404);
}

export function enableMockApi() {
  if (enabled) return;
  enabled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    const url = new URL(request.url, window.location.origin);

    if (!shouldMock(url)) {
      return originalFetch(input, init);
    }

    const method = (init.method || request.method || "GET").toUpperCase();
    const body = parseJsonBody(init.body);

    await new Promise((resolve) => setTimeout(resolve, 120));
    return handleRoute(method, url, body);
  };

  console.info("[mock-api] Enabled demo mock API for frontend-only mode.");
}

export function resetMockState() {
  state = JSON.parse(JSON.stringify(INITIAL_STATE));
}
