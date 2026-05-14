import { api } from './api';

export const executeCommand = ({ command, macAddress = '', timeout = 30 }) =>
  api.post('/api/commands/execute/', {
    command,
    mac_address: macAddress,
    timeout,
  });

export const getCommandHistory = ({ macAddress, deviceId, commandIds, limit = 50 } = {}) => {
  const url = deviceId ? `/api/commands/history/${deviceId}/` : '/api/commands/history/';
  const params = { limit };

  if (macAddress) {
    params.mac_address = macAddress;
  }

  if (commandIds?.length) {
    params.command_ids = commandIds.join(',');
  }

  return api.get(url, { params });
};
