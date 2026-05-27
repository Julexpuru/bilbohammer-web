"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatClubDateTime } from "@/lib/date-format";
import {
  NOTIFICATION_PREFERENCE_DEFINITIONS,
  type NotificationPreferenceField,
  type NotificationPreferenceState,
} from "@/lib/notification-preference-definitions";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
  preferences: NotificationPreferenceState;
};

type PushState = {
  supported: boolean;
  configured: boolean;
  subscribed: boolean;
  permission: NotificationPermission | "unsupported";
  publicKey: string | null;
};

type Props = {
  className?: string;
};

function BellIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" focusable="false">
      <path
        d="M12 4a4 4 0 0 0-4 4v2.2c0 .93-.32 1.83-.9 2.56L5.7 14.5c-.72.9-.08 2.25 1.07 2.25h10.46c1.15 0 1.79-1.35 1.07-2.25l-1.4-1.74a4.09 4.09 0 0 1-.9-2.56V8a4 4 0 0 0-4-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const DATE_LABEL_OPTIONS = {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
} satisfies Intl.DateTimeFormatOptions;

export default function NotificationsMenu({ className }: Props) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferenceState | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushState, setPushState] = useState<PushState>({
    supported: false,
    configured: false,
    subscribed: false,
    permission: "unsupported",
    publicKey: null,
  });
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/me/notifications", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as NotificationsResponse | { error?: string } | null;
      if (!response.ok || !body || !("notifications" in body)) {
        throw new Error((body as { error?: string } | null)?.error || "No se pudieron cargar las notificaciones.");
      }
      setNotifications(body.notifications);
      setUnreadCount(body.unreadCount);
      setPreferences(body.preferences);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadPushState = useCallback(async () => {
    if (!isAuthenticated) return;
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!supported) {
      setPushState({ supported: false, configured: false, subscribed: false, permission: "unsupported", publicKey: null });
      return;
    }

    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration && Notification.permission === "granted") {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      registration = await navigator.serviceWorker.ready;
    }

    const localSubscription = (await registration?.pushManager.getSubscription()) ?? null;
    const endpoint = localSubscription?.endpoint ?? "";
    const url = new URL("/api/me/push-subscription", window.location.origin);
    if (endpoint) {
      url.searchParams.set("endpoint", endpoint);
    }

    const response = await fetch(url.toString(), { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPushState({
        supported: true,
        configured: false,
        subscribed: false,
        permission: Notification.permission,
        publicKey: null,
      });
      return;
    }

    let subscribed = Boolean(localSubscription && body.subscribed);
    if (localSubscription && body.configured && !subscribed) {
      const syncResponse = await fetch("/api/me/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: localSubscription.toJSON() }),
      });
      subscribed = syncResponse.ok;
    }

    setPushState({
      supported: true,
      configured: Boolean(body.configured),
      subscribed,
      permission: Notification.permission,
      publicKey: typeof body.publicKey === "string" ? body.publicKey : null,
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications().catch(() => undefined);
    loadPushState().catch(() => undefined);

    const interval = window.setInterval(() => {
      loadNotifications().catch(() => undefined);
    }, 60000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        loadNotifications().catch(() => undefined);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, loadNotifications, loadPushState]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && wrapperRef.current && !wrapperRef.current.contains(target)) {
        setOpen(false);
        setSettingsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const visibleNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  if (!isAuthenticated) return null;

  async function markRead(ids: string[], all = false) {
    if (ids.length === 0 && !all) return;
    try {
      const response = await fetch("/api/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron actualizar las notificaciones.");
      }
      setNotifications((current) =>
        current.map((notification) =>
          all || ids.includes(notification.id)
            ? { ...notification, readAt: notification.readAt ?? new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((current) => (all ? 0 : Math.max(0, current - ids.length)));
    } catch (err: any) {
      setError(err?.message || "No se pudieron actualizar las notificaciones.");
    }
  }

  async function deleteNotifications(ids: string[], all = false) {
    if (ids.length === 0 && !all) return;
    try {
      const response = await fetch("/api/me/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { ids }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudieron borrar las notificaciones.");
      }

      const deletedIds = new Set(ids);
      setNotifications((current) => (all ? [] : current.filter((notification) => !deletedIds.has(notification.id))));
      setUnreadCount((current) => {
        if (all) return 0;
        const deletedUnread = notifications.filter(
          (notification) => deletedIds.has(notification.id) && !notification.readAt
        ).length;
        return Math.max(0, current - deletedUnread);
      });
    } catch (err: any) {
      setError(err?.message || "No se pudieron borrar las notificaciones.");
    }
  }

  async function updatePreference(field: NotificationPreferenceField, value: boolean) {
    const previous = preferences;
    if (!previous) return;

    setSaving(field);
    setError(null);
    setPreferences({ ...previous, [field]: value });
    try {
      const response = await fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.preferences) {
        throw new Error(body.error || "No se pudieron guardar las preferencias.");
      }
      setPreferences(body.preferences);
    } catch (err: any) {
      setPreferences(previous);
      setError(err?.message || "No se pudieron guardar las preferencias.");
    } finally {
      setSaving(null);
    }
  }

  async function updateReminderMinutes(value: number) {
    const previous = preferences;
    if (!previous) return;

    setSaving("matchReminderMinutes");
    setError(null);
    setPreferences({ ...previous, matchReminderMinutes: value });
    try {
      const response = await fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchReminderMinutes: value }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.preferences) {
        throw new Error(body.error || "No se pudieron guardar las preferencias.");
      }
      setPreferences(body.preferences);
    } catch (err: any) {
      setPreferences(previous);
      setError(err?.message || "No se pudieron guardar las preferencias.");
    } finally {
      setSaving(null);
    }
  }

  async function enablePush() {
    setError(null);
    if (!pushState.supported || !pushState.configured || !pushState.publicKey) return;
    setSaving("push");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Permiso de notificaciones denegado por el navegador.");
        return;
      }

      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      await registration.update().catch(() => undefined);
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushState.publicKey),
        }));

      const response = await fetch("/api/me/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "No se pudo guardar la suscripcion push.");
      }

      setPushState((current) => ({ ...current, subscribed: true }));
      await loadPushState();
    } catch (err: any) {
      const message = String(err?.message || "");
      setError(
        message.toLowerCase().includes("push service")
          ? "El navegador ha concedido permiso, pero no ha podido crear el canal push. En Brave/Android revisa que las notificaciones del sitio no esten bloqueadas y prueba a activar desde la app instalada o desde Chrome."
          : message || "No se pudo activar push."
      );
      await loadPushState().catch(() => undefined);
    } finally {
      setSaving(null);
    }
  }

  async function disablePush() {
    setError(null);
    setSaving("push");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/me/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      await loadPushState();
    } catch (err: any) {
      setError(err?.message || "No se pudo desactivar push.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--hairline)] bg-[var(--card)] text-[var(--text)] shadow-sm transition-colors hover:border-[var(--accent-600)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir notificaciones"
        onClick={() => {
          setOpen((current) => !current);
          if (!open) {
            loadNotifications().catch(() => undefined);
          }
        }}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent-600)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-[calc(var(--nav-h)_+_0.5rem)] z-50 flex max-h-[calc(100dvh_-_var(--nav-h)_-_1rem)] flex-col overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--card)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[min(92vw,24rem)] sm:max-h-none">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text)]">
                {settingsOpen ? "Ajustes de notificaciones" : "Notificaciones"}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {settingsOpen ? "Preferencias y push" : unreadCount > 0 ? `${unreadCount} sin leer` : "Sin pendientes"}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!settingsOpen && (
                <>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--hairline)] px-2 py-1 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
                    disabled={unreadCount === 0}
                    onClick={() => markRead([], true)}
                  >
                    Marcar todo
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--hairline)] px-2 py-1 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
                    disabled={notifications.length === 0}
                    onClick={() => deleteNotifications([], true)}
                  >
                    Borrar
                  </button>
                </>
              )}
              <button
                type="button"
                className="rounded-lg border border-[var(--hairline)] px-2 py-1 text-xs font-semibold text-[var(--text)]"
                onClick={() => setSettingsOpen((current) => !current)}
              >
                {settingsOpen ? "Volver" : "Ajustes"}
              </button>
            </div>
          </div>

          {settingsOpen && preferences ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] px-4 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Preferencias</div>
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">Push en este dispositivo</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        {pushState.supported
                          ? pushState.configured
                            ? pushState.subscribed
                              ? "Activo"
                              : pushState.permission === "granted"
                                ? "Permiso concedido, pendiente de registro push"
                                : "Disponible"
                            : "Pendiente de claves VAPID"
                          : "No soportado por este navegador"}
                      </div>
                    </div>
                    {pushState.subscribed ? (
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]"
                        disabled={saving === "push"}
                        onClick={disablePush}
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--hairline)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] disabled:opacity-50"
                        disabled={!pushState.supported || !pushState.configured || saving === "push"}
                        onClick={enablePush}
                      >
                        {saving === "push" ? "Activando..." : "Activar"}
                      </button>
                    )}
                  </div>
                </div>
                {NOTIFICATION_PREFERENCE_DEFINITIONS.map((definition) => (
                  <div key={definition.eventType} className="rounded-xl border border-[var(--hairline)] bg-[var(--card)] p-3">
                    <div className="text-sm font-semibold text-[var(--text)]">{definition.label}</div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{definition.description}</div>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
                        <input
                          type="checkbox"
                          checked={preferences[definition.inAppField]}
                          disabled={saving === definition.inAppField}
                          onChange={(event) => updatePreference(definition.inAppField, event.target.checked)}
                        />
                        En la web
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
                        <input
                          type="checkbox"
                          checked={preferences[definition.emailField]}
                          disabled={saving === definition.emailField}
                          onChange={(event) => updatePreference(definition.emailField, event.target.checked)}
                        />
                        Por correo
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-[var(--text)]">
                        <input
                          type="checkbox"
                          checked={preferences[definition.pushField]}
                          disabled={saving === definition.pushField}
                          onChange={(event) => updatePreference(definition.pushField, event.target.checked)}
                        />
                        Push
                      </label>
                    </div>
                    {definition.eventType === "MATCH_REMINDER" && (
                      <label className="mt-3 flex flex-col gap-1 text-xs font-semibold text-[var(--muted)]">
                        Antelacion
                        <select
                          className="rounded-lg border border-[var(--hairline)] bg-[var(--card)] px-2 py-1.5 text-xs text-[var(--text)]"
                          value={preferences.matchReminderMinutes}
                          disabled={saving === "matchReminderMinutes"}
                          onChange={(event) => updateReminderMinutes(Number(event.target.value))}
                        >
                          <option value={60}>1 hora antes</option>
                          <option value={180}>3 horas antes</option>
                          <option value={1440}>1 dia antes</option>
                          <option value={2880}>2 dias antes</option>
                          <option value={10080}>1 semana antes</option>
                        </select>
                      </label>
                    )}
                  </div>
                ))}
              </div>
              {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            </div>
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:max-h-[26rem]">
            {loading && visibleNotifications.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--bg)] px-3 py-4 text-sm text-[var(--muted)]">
                Cargando notificaciones...
              </div>
            )}

            {!loading && visibleNotifications.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--hairline)] bg-[var(--bg)] px-3 py-4 text-sm text-[var(--muted)]">
                Aun no tienes notificaciones.
              </div>
            )}

            <div className="space-y-2">
              {visibleNotifications.map((notification) => {
                const isUnread = !notification.readAt;
                const content = (
                  <div
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      isUnread
                        ? "border-[var(--accent-600)]/35 bg-[var(--accent-50)]"
                        : "border-[var(--hairline)] bg-[var(--bg)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm font-semibold text-[var(--text)]">{notification.title}</div>
                      <div className="shrink-0 pr-16 text-[11px] text-[var(--muted)]">
                        {formatClubDateTime(notification.createdAt, DATE_LABEL_OPTIONS)}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">{notification.body}</div>
                  </div>
                );

                if (notification.linkUrl) {
                  return (
                    <div key={notification.id} className="relative">
                      <Link
                        href={notification.linkUrl}
                        className="block"
                        onClick={() => {
                          if (isUnread) {
                            markRead([notification.id]).catch?.(() => undefined);
                          }
                          setOpen(false);
                          setSettingsOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                      <button
                        type="button"
                        className="absolute right-3 top-3 rounded-md border border-[var(--hairline)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                        onClick={() => deleteNotifications([notification.id]).catch?.(() => undefined)}
                      >
                        Borrar
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={notification.id} className="relative">
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => {
                        if (isUnread) {
                          markRead([notification.id]).catch?.(() => undefined);
                        }
                      }}
                    >
                      {content}
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-3 rounded-md border border-[var(--hairline)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                      onClick={() => deleteNotifications([notification.id]).catch?.(() => undefined)}
                    >
                      Borrar
                    </button>
                  </div>
                );
              })}
            </div>

            {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
