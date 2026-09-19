import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ── فحص الإصدار وإجبار التحديث ──
const VERSION_KEY = "app_version";

async function checkVersion(): Promise<void> {
  try {
    const res = await fetch("/api/app-version", { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json() as { version: string };
    const stored = localStorage.getItem(VERSION_KEY);

    if (stored && stored !== version) {
      // إصدار جديد — امسح الكاش وأعد التحميل
      localStorage.setItem(VERSION_KEY, version);
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
      return;
    }
    localStorage.setItem(VERSION_KEY, version);
  } catch {
    // تجاهل الأخطاء — لا يوقف التطبيق
  }
}

void checkVersion();

// ── تسجيل Service Worker ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }

    }).catch(() => {});
  });
}

function showUpdateBanner(worker: ServiceWorker): void {
  if (document.getElementById("sw-update-banner")) return;

  const banner = document.createElement("div");
  banner.id = "sw-update-banner";
  banner.dir = "rtl";
  banner.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 9999; display: flex; align-items: center; gap: 12px;
    padding: 14px 18px; border-radius: 20px;
    background: linear-gradient(135deg, #1a1500 0%, #0e0c00 100%);
    border: 1px solid rgba(212,175,55,0.5);
    box-shadow: 0 12px 40px rgba(212,175,55,0.25), 0 4px 16px rgba(0,0,0,0.6);
    font-family: inherit; min-width: 280px; max-width: 90vw;
    animation: swBannerIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes swBannerIn {
      from { transform: translateX(-50%) translateY(100px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  const icon = document.createElement("div");
  icon.style.cssText = `width:38px;height:38px;border-radius:12px;flex-shrink:0;
    background:rgba(212,175,55,0.15);border:1px solid rgba(212,175,55,0.3);
    display:flex;align-items:center;justify-content:center;font-size:18px;`;
  icon.textContent = "⚡";

  const text = document.createElement("div");
  text.style.cssText = "flex:1;";
  text.innerHTML = `
    <p style="font-size:13px;font-weight:800;color:#e8d062;margin:0 0 2px;">تحديث جديد متاح</p>
    <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0;">اضغط لتحديث التطبيق الآن</p>
  `;

  const btn = document.createElement("button");
  btn.textContent = "تحديث";
  btn.style.cssText = `padding:8px 18px;border-radius:12px;border:none;cursor:pointer;
    background:linear-gradient(135deg,#d4af37,#a07c1a);color:#080810;
    font-size:13px;font-weight:800;box-shadow:0 4px 14px rgba(212,175,55,0.4);white-space:nowrap;`;
  btn.onclick = () => {
    worker.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  };

  banner.appendChild(icon);
  banner.appendChild(text);
  banner.appendChild(btn);
  document.body.appendChild(banner);
}
