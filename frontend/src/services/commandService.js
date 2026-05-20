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

export const installSoftware = ({
  packageManager,
  packageName = '',
  packageVersion = '',
  installerPath = '',
  macAddress = '',
  timeout = 600,
}) =>
  api.post('/api/commands/software-install/', {
    package_manager: packageManager,
    package_name: packageName,
    package_version: packageVersion,
    installer_path: installerPath,
    mac_address: macAddress,
    timeout,
  });

export const getCommandHistory = ({ macAddress, deviceId, commandIds, category, limit = 50 } = {}) => {
  const url = deviceId ? `/api/commands/history/${deviceId}/` : '/api/commands/history/';
  const params = { limit };

  if (macAddress) {
    params.mac_address = macAddress;
  }

  if (commandIds?.length) {
    params.command_ids = commandIds.join(',');
  }

  if (category) {
    params.category = category;
  }

  return api.get(url, { params });
};
