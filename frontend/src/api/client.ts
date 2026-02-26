// ============================================================
// Axios 인스턴스 (API 클라이언트)
// 주의: localhost 대신 127.0.0.1 사용 (IPv6 해석 문제 방지)
// ============================================================

import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:9999/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
