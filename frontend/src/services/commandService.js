import { api } from './api';

export const executeCommand = ({ command, macAddress = '', timeout = 30, shell = 'cmd' }) =>
  api.post('/api/commands/execute/', {
    command,
    mac_address: macAddress,
    timeout,
    shell,
  });

export const cancelCommand = (commandId) =>
  api.post(`/api/commands/${commandId}/cancel/`);

export const getCommandHistory = ({ macAddress, deviceId, commandIds, date, limit = 50 } = {}) => {
  const url = deviceId ? `/api/commands/history/${deviceId}/` : '/api/commands/history/';
  const params = { limit };

  if (macAddress) {
    params.mac_address = macAddress;
  }

  if (commandIds?.length) {
    params.command_ids = commandIds.join(',');
  }

  if (date) {
    params.date = date;
  }

  return api.get(url, { params });
};
