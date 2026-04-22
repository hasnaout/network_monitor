export function getCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
}

export function normalizeStatus(status) {
  if (!status) {
    return "Offline";
  }

  const value = String(status).toLowerCase();

  if (value === "online") {
    return "Online";
  }

  if (value === "maintenance") {
    return "Maintenance";
  }

  return "Offline";
}

export function normalizeDevice(device) {
  return {
    ...device,
    ip: device.ip_address || device.ip || "",
    ip_address: device.ip_address || device.ip || "",
    status: normalizeStatus(device.status),
  };
}
