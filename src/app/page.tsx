import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Nami CRM Logo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-xl font-bold text-slate-900">Nami CRM</span>
        </div>
        <nav>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 mr-4">
            Sign In
          </Link>
          <Link href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
            Get Started
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6 animate-in zoom-in-95 duration-700">
          The ultimate WhatsApp CRM for your business.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
          Manage your shared inbox, contacts, sales pipelines, broadcasts, and no-code automations seamlessly with Nami CRM. Built for modern teams.
        </p>
        <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <Link href="/dashboard" className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-hover transition-all hover:scale-105 active:scale-95 duration-200">
            Open Dashboard
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Nami CRM. All rights reserved.
      </footer>
    </div>
  );
}
