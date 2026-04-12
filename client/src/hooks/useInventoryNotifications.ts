import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const NOTIF_KEY = "indhan_last_notif_ts";
const NOTIF_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between repeat alerts

/**
 * Requests browser notification permission and fires a notification
 * whenever a product is critically low (currentStock < reorderLevel).
 * Runs once on mount and then every 10 minutes while the app is open.
 */
export function useInventoryNotifications() {
  const { data: products } = trpc.inventory.list.useQuery(undefined, {
    refetchInterval: 10 * 60 * 1000, // re-check every 10 min
    staleTime: 5 * 60 * 1000,
  });

  const permissionRef = useRef<NotificationPermission>("default");

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return;
    }
    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  }, []);

  // Request permission on first load
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!products || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const criticalItems = products.filter((p) => {
      const reorder = Number(p.reorderLevel ?? 0);
      const stock = Number(p.currentStock ?? 0);
      return reorder > 0 && stock < reorder;
    });

    if (criticalItems.length === 0) return;

    // Throttle: don't fire more than once per cooldown period
    const lastTs = parseInt(localStorage.getItem(NOTIF_KEY) ?? "0", 10);
    const now = Date.now();
    if (now - lastTs < NOTIF_COOLDOWN_MS) return;

    localStorage.setItem(NOTIF_KEY, String(now));

    const names = criticalItems.map((p) => p.name).join(", ");
    const body =
      criticalItems.length === 1
        ? `${criticalItems[0].name}: ${Number(criticalItems[0].currentStock).toFixed(0)} ${criticalItems[0].unit} remaining (min ${criticalItems[0].reorderLevel} ${criticalItems[0].unit})`
        : `${criticalItems.length} products need restocking: ${names}`;

    const notif = new Notification("⚠️ Indhan — Low Stock Alert", {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      tag: "indhan-low-stock",
      requireInteraction: false,
      data: { url: "/inventory" },
    });

    notif.onclick = () => {
      window.focus();
      window.location.href = "/inventory";
      notif.close();
    };
  }, [products]);

  return { requestPermission };
}
