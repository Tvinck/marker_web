import React from "react";
import { NavLink } from "react-router-dom";
import { MapPin, Crown, Trophy, User2, BadgePercent, PlusCircle } from "lucide-react";
import { cn } from "../lib/utils";

const Item = ({ to, label, Icon }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center px-3 py-2 text-xs",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )
      }
    >
      <Icon size={22} />
      <span className="mt-1">{label}</span>
    </NavLink>
  );
};

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto grid max-w-screen-sm grid-cols-5">
        <Item to="/" label="Карта" Icon={MapPin} />
        <Item to="/leaderboard" label="Топ" Icon={Trophy} />
        <Item to="/pro" label="PRO" Icon={Crown} />
        <Item to="/advertise" label="Реклама" Icon={BadgePercent} />
        <Item to="/profile" label="Профиль" Icon={User2} />
      </div>
    </nav>
  );
}