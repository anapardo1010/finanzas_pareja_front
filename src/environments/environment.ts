/**
 * Environment configuration for development
 * Backend API running locally on port 8080
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  apiTimeout: 30000, // 30 seconds
  enableDebugLogs: true
};
