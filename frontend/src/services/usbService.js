import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8001";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth");
  if (stored) {
    try {
      const { accessToken } = JSON.parse(stored);
      if (accessToken) config.headers["Authorization"] = `Bearer ${accessToken}`;
    } catch (_) {}
  }
  return config;
});

// ---------- Devices USB ----------

export function getUSBDevices(deviceId) {
  return api.get(`/api/usb/devices/by_device/`, { params: { device_id: deviceId } });
}

export function getUSBDeviceDetail(usbId) {
  return api.get(`/api/usb/devices/${usbId}/`);
}

export function allowUSBDevice(usbId) {
  return api.post(`/api/usb/devices/${usbId}/allow/`);
}

export function blockUSBDevice(usbId) {
  return api.post(`/api/usb/devices/${usbId}/block/`);
}

// ---------- Politique ----------

export function getUSBPolicy(deviceId) {
  return api.get(`/api/usb/policies/by_device/`, { params: { device_id: deviceId } });
}

export function updateUSBPolicy(deviceId, policyData) {
  return api.post(`/api/usb/policies/update_policy/`, { device_id: deviceId, ...policyData });
}

// ---------- Historique ----------

export function getUSBHistory(deviceId, eventType) {
  const params = { device_id: deviceId };
  if (eventType) params.event_type = eventType;
  return api.get(`/api/usb/history/by_device/`, { params });
}

// ---------- Alertes ----------

export function getUSBAlerts(deviceId, unreadOnly = false) {
  return api.get(`/api/usb/alerts/by_device/`, {
    params: { device_id: deviceId, unread_only: unreadOnly ? "true" : undefined },
  });
}

export function markUSBAlertRead(alertId) {
  return api.post(`/api/usb/alerts/${alertId}/mark_as_read/`);
}

export function markAllUSBAlertRead(deviceId) {
  return api.post(`/api/usb/alerts/mark_all_as_read/`, { device_id: deviceId });
}

export function getUSBStatistics(deviceId) {
  return api.get(`/api/usb/alerts/statistics/`, { params: { device_id: deviceId } });
}