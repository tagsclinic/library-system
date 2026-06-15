"use client";

import Link from "next/link";
import { BookOpen, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PublicLibraryHeaderProps {
  slug: string;
  name: string;
  logo?: string | null;
}

export function PublicLibraryHeader({ slug, name, logo }: PublicLibraryHeaderProps) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href={`/library/${slug}`} className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-10 w-10 rounded-lg object-contain" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-muted-foreground">Public catalog</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/library/${slug}/login`}>
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/library/${slug}/register`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create account
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
