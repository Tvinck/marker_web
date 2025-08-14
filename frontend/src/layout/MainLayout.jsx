import React from "react";
import BottomNav from "../components/BottomNav";
import { Button } from "../components/ui/button";
import { Crown } from "lucide-react";

export default function MainLayout({ title = "Маркер", subtitle, right, children }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow">
              <Crown size={18} />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-5">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {right}
            <Button asChild variant="secondary" size="sm">
              <a href="/pro">PRO</a>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-md px-3 pb-20 pt-3">{children}</main>
      <BottomNav />
    </div>
  );
}