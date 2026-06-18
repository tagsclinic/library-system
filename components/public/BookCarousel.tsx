"use client";

import Link from "next/link";
import { BookOpen, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BookStatus } from "@/types";

interface CarouselBook {
  id: string;
  title: string;
  author: string;
  category: string | null;
  status: BookStatus;
  coverImageUrl: string | null;
}

interface BookCarouselProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  slug: string;
  books: CarouselBook[];
}

export function BookCarousel({
  title,
  description,
  icon: Icon,
  slug,
  books,
}: BookCarouselProps) {
  if (books.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 text-[#2563EB]" /> : null}
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/library/${slug}/books/${book.id}`}
            className="group w-36 flex-none sm:w-40"
          >
            <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 shadow-sm transition-shadow group-hover:shadow-md sm:h-52">
              {book.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.coverImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">
                {book.title}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {book.author}
              </p>
              <Badge
                variant={book.status === "AVAILABLE" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {book.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
