import { Quote } from "lucide-react";

import { TESTIMONIALS } from "@/lib/brand";

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Trusted by libraries everywhere
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            See how churches, schools, and community centers run smoother with
            LibraryInventory.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.author}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <Quote className="h-8 w-8 text-blue-200" />
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-slate-700">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 border-t border-slate-100 pt-6">
                <p className="font-semibold text-slate-900">
                  {testimonial.author}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {testimonial.role}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
