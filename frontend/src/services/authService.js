import axios from 'axios';
import { API_URL } from './api';

export async function login(username, password) {
  const res = await axios.post(`${API_URL}/api/token/`, {
    username,
    password,
  });

  return res.data;
}
