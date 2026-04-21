// src/services/api.js
const API_ORIGIN = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
const API_BASE_URL = `${API_ORIGIN.replace(/\/$/, '')}/api`;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Devices endpoints
  async getDevices() {
    return this.request('/devices/');
  }

  async getDevice(id) {
    return this.request(`/devices/${id}/`);
  }

  async createDevice(device) {
    return this.request('/devices/', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  }

  async updateDevice(id, device) {
    return this.request(`/devices/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
  }

  async deleteDevice(id) {
    return this.request(`/devices/${id}/`, {
      method: 'DELETE',
    });
  }

  // Alerts endpoints
  async getAlerts() {
    return this.request('/alerts/');
  }

  async getAlert(id) {
    return this.request(`/alerts/${id}/`);
  }

  // Reports endpoints
  async getReports() {
    return this.request('/reports/');
  }

  async getReport(id) {
    return this.request(`/reports/${id}/`);
  }

  // Monitoring/Heartbeat endpoints
  async getMonitoring() {
    return this.request('/monitoring/');
  }

  // Users endpoints
  async login(credentials) {
    const response = await fetch(`${API_ORIGIN.replace(/\/$/, '')}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
