"use client";
import useSWR from "swr";

export default function NoticesForMembers() {
  const { data } = useSWR("/api/members/summary", (u) => fetch(u).then((r) => r.json()));
  if (!data) return null;
  const { notification, membersCount } = data;

  return (
    <section className="grid md:grid-cols-[1fr_auto] gap-4 mt-6">
      {notification && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-1">{notification.title}</h3>
          <p className="text-sm opacity-80">{notification.content}</p>
        </div>
      )}
      <div className="card flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold">{membersCount}</div>
          <div className="text-sm opacity-80">socios</div>
        </div>
      </div>
    </section>
  );
}
