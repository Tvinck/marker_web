import React from "react";

export default function Gallery({ items = [] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((m, idx) => (
        <div key={idx} className="overflow-hidden rounded-md border">
          {m.type.startsWith("video") ? (
            <video className="h-28 w-full object-cover" src={m.url} controls />
          ) : (
            <img className="h-28 w-full object-cover" src={m.url} alt="media" />
          )}
        </div>
      ))}
    </div>
  );
}