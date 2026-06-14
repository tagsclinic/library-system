"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import Link from "next/link";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface TopbarProps {
  userEmail?: string | null;
  userName?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  notificationCount?: number;
}

export function Topbar({
  userEmail,
  userName,
  pageTitle = "Dashboard",
  pageSubtitle,
  notificationCount = 0,
}: TopbarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const initials = (userName ?? userEmail ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
    if (res.ok) {
      const json = await res.json();
      setResults(json.data ?? []);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-16 items-center gap-4 px-6">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden min-w-0 md:block">
          <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
          {pageSubtitle ? (
            <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
          ) : null}
        </div>

        <div className="relative mx-auto w-full max-w-xl flex-1" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search books, borrowers, ISBN, barcodes..."
            className="h-10 rounded-full border-muted bg-muted/40 pl-10 pr-4"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && results.length > 0 ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg">
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.href}
                  className="flex flex-col px-4 py-2.5 hover:bg-accent"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium">{r.title}</span>
                  {r.subtitle ? (
                    <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/notifications">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#2563EB] text-xs text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
