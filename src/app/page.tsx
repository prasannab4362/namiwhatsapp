"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Zap, Users, BarChart } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex justify-between items-center bg-card/80 backdrop-blur-md fixed top-0 z-50 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Nami CRM Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-xl tracking-tight">Nami CRM</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors shadow-sm">
            Sign up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary mb-8 text-sm font-medium"
        >
          <span className="flex h-2 w-2 rounded-full bg-secondary"></span>
          The new standard for WhatsApp CRM
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-foreground"
        >
          Connect with customers, <span className="text-primary">effortlessly.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
        >
          Nami CRM is your all-in-one platform for shared WhatsApp inboxes, smart automations, and targeted broadcasts.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/signup" className="px-8 py-4 text-base font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2">
            Get Started for Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="#features" className="px-8 py-4 text-base font-semibold bg-card text-foreground border border-border rounded-full hover:bg-muted transition-colors flex items-center justify-center">
            See Features
          </Link>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to scale</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Designed to help your team collaborate and automate conversations like never before.</p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-background border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Shared Inbox</h3>
              <p className="text-muted-foreground">Collaborate seamlessly with your team. Assign conversations, leave internal notes, and never miss a message.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-background border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No-code Automations</h3>
              <p className="text-muted-foreground">Build powerful conversational flows, trigger webhooks, and automate your sales pipeline effortlessly.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="p-8 rounded-3xl bg-background border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <BarChart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Targeted Broadcasts</h3>
              <p className="text-muted-foreground">Send personalized mass messages using Meta-approved templates with built-in read receipt tracking.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto bg-primary text-primary-foreground rounded-[3rem] p-12 md:p-20 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to transform your workflow?</h2>
            <p className="text-primary-foreground/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
              Join Nami CRM today and unlock the true potential of WhatsApp Business for your team.
            </p>
            <Link href="/signup" className="px-10 py-5 text-lg font-bold bg-card text-primary rounded-full hover:bg-background transition-all shadow-lg hover:shadow-xl inline-block hover:scale-105">
              Create your account
            </Link>
          </div>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 text-center text-muted-foreground border-t border-border bg-card">
        <p>&copy; {new Date().getFullYear()} Nami CRM. All rights reserved.</p>
      </footer>
    </div>
  );
}
