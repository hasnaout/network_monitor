import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export async function login(username, password) {
  const res = await axios.post(`${API_URL}/api/token/`, {
    username,
    password,
  });

  return res.data;
}
