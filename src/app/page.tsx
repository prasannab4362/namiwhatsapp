/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import Link from "next/link";
import Script from "next/script";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MessageSquare, Workflow, Users, LayoutDashboard, ArrowRight, Bot, Zap } from "lucide-react";

const TiltCard = ({ title, description, icon: Icon }: { title: string, description: string, icon: React.ElementType }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateY, rotateX, transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6 }}
      className="relative flex flex-col h-full rounded-2xl bg-white border border-slate-200 p-8 shadow-sm transition-shadow hover:shadow-2xl"
    >
      <div
        style={{ transform: "translateZ(50px)" }}
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6 shadow-sm"
      >
        <Icon className="h-7 w-7" />
      </div>
      <div style={{ transform: "translateZ(40px)" }}>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function RootPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-x-hidden selection:bg-primary/20">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 lg:px-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <img src="/logo.png" alt="Nami CRM Logo" className="h-10 w-10 rounded-xl object-cover shadow-sm" />
          <span className="text-2xl font-black tracking-tight text-slate-900">Nami CRM</span>
        </motion.div>
        <motion.nav 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block">
            Sign In
          </Link>
          <Link href="/dashboard" className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all">
            Get Started
          </Link>
        </motion.nav>
      </header>
      
      {/* HERO SECTION */}
      <section className="relative pt-40 pb-20 lg:pt-56 lg:pb-32 px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-5xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Next-Gen WhatsApp Automation
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
            Turn your WhatsApp into a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Sales Machine.</span>
          </h1>
          <p className="text-lg lg:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Nami CRM gives you the superpower to automate replies, manage a shared team inbox, and track deals seamlessly—all from one beautiful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-primary px-10 py-4 text-lg font-bold text-slate-900 shadow-xl shadow-primary/30 hover:bg-primary-hover hover:-translate-y-1 transition-all">
              Launch Dashboard <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#features" className="w-full sm:w-auto flex items-center justify-center rounded-full bg-white border border-slate-200 px-10 py-4 text-lg font-bold text-slate-700 hover:bg-slate-50 transition-all">
              See How It Works
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Everything you need to scale</h2>
            <p className="text-xl text-slate-600">Built specifically for modern WhatsApp-driven businesses.</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ perspective: "1000px" }}>
            <TiltCard 
              icon={Bot} 
              title="No-Code Automations" 
              description="Visually build chat flows, auto-replies, and routing rules without writing a single line of code."
            />
            <TiltCard 
              icon={MessageSquare} 
              title="Shared Team Inbox" 
              description="Stop sharing phones. Let your entire team collaborate, assign chats, and respond from one central hub."
            />
            <TiltCard 
              icon={Workflow} 
              title="Sales Pipelines" 
              description="Track leads visually with Kanban boards. Never lose track of a prospect's status again."
            />
            <TiltCard 
              icon={Users} 
              title="Contact Management" 
              description="Rich customer profiles with custom fields, tags, and full conversation history at a glance."
            />
            <TiltCard 
              icon={Zap} 
              title="Bulk Broadcasts" 
              description="Send approved template messages to thousands of customers securely with real-time delivery tracking."
            />
            <TiltCard 
              icon={LayoutDashboard} 
              title="Real-time Analytics" 
              description="Measure team performance, response times, and automation success rates with beautiful charts."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 px-6 bg-slate-50 text-slate-900 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/30 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">How it works</h2>
            <p className="text-xl text-slate-600">Get up and running in minutes, not months.</p>
          </motion.div>

          <div className="space-y-12">
            {[
              { title: "Connect WhatsApp API", desc: "Link your official WhatsApp Business API account securely in just a few clicks." },
              { title: "Design your Automations", desc: "Use our visual canvas to map out greetings, FAQ bots, and lead qualification flows." },
              { title: "Invite your Team", desc: "Bring your sales and support agents on board with role-based access controls." },
              { title: "Start Closing Deals", desc: "Manage inbound chats, track them through pipelines, and boost your conversion rates." }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="flex items-start gap-6 bg-slate-900/50 p-8 rounded-3xl border border-slate-200 backdrop-blur-sm"
              >
                <div className="flex-shrink-0 h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-2xl font-black text-slate-900 shadow-lg shadow-primary/20">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-emerald-500 rounded-3xl p-12 lg:p-20 shadow-2xl text-slate-900"
        >
          <h2 className="text-4xl lg:text-6xl font-extrabold mb-8">Ready to revolutionize your workflow?</h2>
          <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
            Join modern teams using Nami CRM to automate their WhatsApp communications and drive exponential growth.
          </p>
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-lg font-bold text-primary shadow-lg hover:scale-105 active:scale-95 transition-all">
            Get Started for Free <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </section>

      {/* ABOUT THE AUTHOR */}
      <section className="py-24 px-6 bg-slate-50 border-t border-slate-200">
        <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="lazyOnload" />
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center"
          >
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">About the Author</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl">
              Hi, I&apos;m Prasanna B, the creator of Nami CRM. I build intelligent AI products and innovative web solutions. Connect with me or check out my portfolio!
            </p>
            
            {/* LinkedIn Badge */}
            <div className="flex justify-center mb-8">
              <div className="badge-base LI-profile-badge" data-locale="en_US" data-size="medium" data-theme="light" data-type="VERTICAL" data-vanity="prasannabalaji18" data-version="v1">
                <a className="badge-base__link LI-simple-link" href="https://in.linkedin.com/in/prasannabalaji18?trk=profile-badge">Prasanna B</a>
              </div>
            </div>

            <Link href="https://portfolio-up-six.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 transition-all">
              View My Portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.png" alt="Nami CRM Logo" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-xl font-bold text-slate-900">Nami CRM</span>
            </div>
            <p className="text-slate-500 max-w-sm">
              The premium, self-hostable CRM template for the WhatsApp Business API.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Product</h4>
            <ul className="space-y-3 text-slate-600">
              <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Integrations</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
            <ul className="space-y-3 text-slate-600">
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center border-t border-slate-100 pt-8 text-sm text-slate-600">
          © {new Date().getFullYear()} Nami CRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
