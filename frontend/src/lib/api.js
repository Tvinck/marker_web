import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const initClient = (clientId) =>
  axios
    .post(`${API_URL}/client/init`, { clientId })
    .then((r) => r.data);

export const getStore = (clientId) =>
  axios.get(`${API_URL}/store`, { params: { client_id: clientId } }).then((r) => r.data);

export const getMarkers = (clientId) =>
  axios.get(`${API_URL}/markers`, { params: { client_id: clientId } }).then((r) => r.data);

export const addMarker = (clientId, marker) =>
  axios
    .post(`${API_URL}/markers`, marker, { params: { client_id: clientId } })
    .then((r) => r.data);

export const confirmMarker = (clientId, markerId) =>
  axios
    .post(`${API_URL}/markers/${markerId}/confirm`, null, { params: { client_id: clientId } })
    .then((r) => r.data);

export const addComment = (clientId, markerId, text) =>
  axios
    .post(
      `${API_URL}/markers/${markerId}/comments`,
      { text },
      { params: { client_id: clientId } }
    )
    .then((r) => r.data);

export const rateMarker = (clientId, markerId, value) =>
  axios
    .post(
      `${API_URL}/markers/${markerId}/rate`,
      { value },
      { params: { client_id: clientId } }
    )
    .then((r) => r.data);

export const leaderboard = (clientId) =>
  axios.get(`${API_URL}/leaderboard`, { params: { client_id: clientId } }).then((r) => r.data);

export const mapStyles = () => axios.get(`${API_URL}/map_styles`).then((r) => r.data);

export const updateUser = (clientId, patch) =>
  axios
    .patch(`${API_URL}/user`, patch, { params: { client_id: clientId } })
    .then((r) => r.data);

export const claimDaily = (clientId) =>
  axios
    .post(`${API_URL}/user/claim_daily`, null, { params: { client_id: clientId } })
    .then((r) => r.data);

export const tryActivateProFromPoints = (clientId) =>
  axios
    .post(`${API_URL}/user/activate_pro`, null, { params: { client_id: clientId } })
    .then((r) => r.data);

export const grantProTrial = (clientId) =>
  axios
    .post(`${API_URL}/user/grant_pro_trial`, null, { params: { client_id: clientId } })
    .then((r) => r.data);

export const isTop10FreePro = (clientId) =>
  axios
    .get(`${API_URL}/user/is_top10_free_pro`, { params: { client_id: clientId } })
    .then((r) => r.data);

export const getPending = (clientId) =>
  axios.get(`${API_URL}/markers/pending`, { params: { client_id: clientId } }).then((r) => r.data);

export const adminApprove = (clientId, markerId, approve = true) =>
  axios
    .post(
      `${API_URL}/markers/${markerId}/admin`,
      { approve },
      { params: { client_id: clientId } }
    )
    .then((r) => r.data);

export const mockCreateEnotPayment = (clientId, { amountRub }) =>
  axios
    .post(
      `${API_URL}/payments/create_enot_mock`,
      { amountRub },
      { params: { client_id: clientId } }
    )
    .then((r) => r.data);

export const isAdmin = (clientId) =>
  axios.get(`${API_URL}/user/is_admin`, { params: { client_id: clientId } }).then((r) => r.data);

export const myMarkers = (clientId) =>
  axios.get(`${API_URL}/markers/my`, { params: { client_id: clientId } }).then((r) => r.data);

export default {
  initClient,
  getStore,
  getMarkers,
  addMarker,
  confirmMarker,
  addComment,
  rateMarker,
  leaderboard,
  mapStyles,
  updateUser,
  claimDaily,
  tryActivateProFromPoints,
  grantProTrial,
  isTop10FreePro,
  getPending,
  adminApprove,
  mockCreateEnotPayment,
  isAdmin,
  myMarkers,
};

