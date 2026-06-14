import { Benefits } from "@/components/marketing/Benefits";
import { Features } from "@/components/marketing/Features";
import { Footer } from "@/components/marketing/Footer";
import { Hero } from "@/components/marketing/Hero";
import { Navbar } from "@/components/marketing/Navbar";
import { Pricing } from "@/components/marketing/Pricing";
import { Testimonials } from "@/components/marketing/Testimonials";

export default function MarketingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Benefits />
        <Testimonials />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
