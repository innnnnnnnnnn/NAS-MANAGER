import axios from 'axios';

export const API_BASE = 'http://localhost:3001/api';

export const scanDirectory = async (path, signal) => {
    const response = await axios.post(`${API_BASE}/scan`, { directory: path }, { signal });
    return response.data;
};

export const deleteFile = async (filePath) => {
    const response = await axios.delete(`${API_BASE}/file`, { data: { filePath } });
    return response.data;
};

export const browseDirectory = async (path) => {
    const response = await axios.post(`${API_BASE}/browse`, { path });
    return response.data;
};

export const getStatus = async () => {
    const response = await axios.get(`${API_BASE}/status`);
    return response.data;
};

export const connectNAS = async (server) => {
    const response = await axios.post(`${API_BASE}/connect-nas`, { server });
    return response.data;
};

export const executeCategory = async (baseDir, category, files) => {
    const response = await axios.post(`${API_BASE}/execute-category`, { baseDir, category, files });
    return response.data;
};

export const batchAction = async (action, files) => {
    const response = await axios.post(`${API_BASE}/batch-action`, { action, files });
    return response.data;
};

export const learnPattern = async (item, targetCategory, targetSub) => {
    const response = await axios.post(`${API_BASE}/learn`, { item, targetCategory, targetSub });
    return response.data;
};
