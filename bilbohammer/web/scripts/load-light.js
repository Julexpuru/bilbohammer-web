// scripts/load-light.js
import http from "k6/http";
import { sleep } from "k6";

export const options = {
  stages: [
    { duration: "20s", target: 1 },
    { duration: "20s", target: 3 },
    { duration: "20s", target: 5 },
    { duration: "20s", target: 1 },
  ],
  thresholds: { http_req_failed: ["rate<0.01"] },
};

export default function () {
  const base = __ENV.BASE_URL || "https://bilbohammer.es";
  http.get(`${base}/`);
  http.get(`${base}/novedades`);
  http.get(`${base}/eventos`);
  sleep(2);
}