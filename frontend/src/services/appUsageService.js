import { api } from './api';

export const getAppUsage = (macAddress, date) =>
  api.get('/api/usage/apps/list/', {
    params: {
      mac_address: macAddress,
      date,
    },
  });
