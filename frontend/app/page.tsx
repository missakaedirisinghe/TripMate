"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MapPin, Users, Wallet, ArrowRight, Compass } from "lucide-react";
import Image from "next/image";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navbar (Simplified for Landing) */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <Compass className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">TripMate</span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-white hover:text-white/80">Log in</Button>
          <Button variant="primary">Get Started</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/20 to-background" />

        {/* Background Image (Sri Lanka Landscape Placeholder) */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/hero-bg.png')" }}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20"
        >
          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6"
          >
            Plan Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Sri Lankan</span><br />Adventure Together
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg md:text-2xl text-white/90 font-medium mb-10 max-w-2xl mx-auto"
          >
            Collaborative planning, smart budgeting, and AI-driven itinerary building tailored just for you.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto text-lg gap-2">
              Start Planning <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="lg" className="w-full sm:w-auto text-lg bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
              Explore Destinations
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Destination Showcase */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trending in Serendib</h2>
          <p className="text-foreground/60 max-w-2xl mx-auto">Discover the most inspiring locations expertly curated for your next journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Ella", tags: "Nature • Hiking", budget: "LKR 45,000", image: "https://images.unsplash.com/photo-1620619767323-b95a89183081?q=80&w=800&auto=format&fit=crop" },
            { name: "Mirissa", tags: "Beach • Surfing", budget: "LKR 60,000", image: "https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?q=80&w=800&auto=format&fit=crop" },
            { name: "Yala", tags: "Wildlife • Safari", budget: "LKR 85,000", image: "https://images.unsplash.com/photo-1544654803-b6d2a45d0af9?q=80&w=800&auto=format&fit=crop" }
          ].map((dest, i) => (
            <motion.div
              key={dest.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              <Card variant="interactive" className="group relative h-[400px] flex flex-col justify-end overflow-hidden border-none rounded-3xl">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url('${dest.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />

                <div className="relative z-10 p-6">
                  <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold bg-primary/90 text-white rounded-full backdrop-blur-md">
                    {dest.tags}
                  </span>
                  <h3 className="text-2xl font-bold text-white mb-1">{dest.name}</h3>
                  <div className="flex items-center text-white/80 text-sm gap-2">
                    <Wallet className="w-4 h-4" /> Avg. Group Budget: {dest.budget}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-surface text-center">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">How TripMate Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: MapPin, title: "1. Pick Destinations", desc: "Use our NLP model to find places matching your vibe or choose from trending spots." },
              { icon: Users, title: "2. Invite the Crew", desc: "Send simple links. Vote on plans, suggest activities, and collaborate in real-time." },
              { icon: Wallet, title: "3. Split the Budget", desc: "Our regression model predicts expenses and divides everything seamlessly." }
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-primary">
                  <step.icon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-foreground/70 max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
