import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Concept from "@/components/sections/Concept";
import PourQui from "@/components/sections/PourQui";
import Timeline from "@/components/sections/Timeline";
import Pilote6eme from "@/components/sections/Pilote6eme";
import Calendrier from "@/components/sections/Calendrier";
import PolesIgnis from "@/components/sections/PolesIgnis";
import FAQ from "@/components/sections/FAQ";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <Navbar />
      <Hero />
      <Concept />
      <PourQui />
      <Timeline />
      <Pilote6eme />
      <Calendrier />
      <PolesIgnis />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  );
}
