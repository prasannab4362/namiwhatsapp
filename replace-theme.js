const fs = require('fs');
const path = require('path');

const dir = 'd:/Projects/website/whatsapp_crm/src';

const replacements = {
  'bg-slate-950': 'bg-slate-50',
  'bg-slate-950/70': 'bg-slate-50/70',
  'bg-slate-950/50': 'bg-slate-50/50',
  'bg-slate-900/80': 'bg-white/80',
  'bg-slate-900': 'bg-white',
  'bg-slate-800': 'bg-slate-100',
  'border-slate-800': 'border-slate-200',
  'border-slate-700': 'border-slate-300',
  'text-white': 'text-slate-900',
  'text-slate-400': 'text-slate-600',
  'text-slate-300': 'text-slate-700',
  'text-slate-200': 'text-slate-800',
  'bg-[radial-gradient(circle,#1e293b_1px,transparent_1px)]': 'bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)]'
};

function walk(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const [key, value] of Object.entries(replacements)) {
        // Safely escape the key for regex
        let escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedKey + '(?![\\w\\-\\/])', 'g');
        content = content.replace(regex, value);
      }
      
      if (content !== original) {
        console.log(`Updated ${fullPath}`);
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

walk(dir);
