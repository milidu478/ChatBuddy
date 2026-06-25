'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sparkles, Layers, Plus, ArrowLeft } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  roleTag: string;
}

interface PromptBuilderProps {
  onPromptBuilt: (templateId: string, finalPrompt: string, displayContent: string) => void;
}

export default function PromptBuilder({ onPromptBuilt }: PromptBuilderProps) {
  const { data: session } = useSession();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<'LIST' | 'USE_TEMPLATE' | 'CREATE_TEMPLATE'>('LIST');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // Use Template States
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // Create Template States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState('DEVELOPMENT');
  const [isSaving, setIsSaving] = useState(false);

  // 1. Backend එකෙන් Templates Load කිරීම
  const fetchTemplates = async () => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/v1/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'success') setTemplates(data.data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [session]);

  // 2. Template එකක් Select කිරීම
  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const matches = template.content.match(/{{(.*?)}}/g) || [];
    const cleanedPlaceholders = matches.map((m) => m.replace(/{{|}}/g, ''));
    setPlaceholders(cleanedPlaceholders);
    
    const initialInputs: Record<string, string> = {};
    cleanedPlaceholders.forEach((p) => (initialInputs[p] = ''));
    setInputs(initialInputs);
    setView('USE_TEMPLATE');
  };

  // 3. Template එකක් පාවිච්චි කර Prompt එකක් සෑදීම
  const handleBuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setIsBuilding(true);

    const token = (session as any)?.accessToken;
    try {
      const res = await fetch('http://localhost:5000/api/v1/prompts/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: selectedTemplate.id, userInput: inputs }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        const displayMessage = `Used Template: ${selectedTemplate.title}\n\n` + 
          Object.entries(inputs).map(([k, v]) => `• ${k}: ${v}`).join('\n');
        onPromptBuilt(selectedTemplate.id, data.data.finalPrompt, displayMessage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBuilding(false);
    }
  };

  // 4. අලුත් Template එකක් UI එකෙන් සාදා Backend එකට යැවීම
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = (session as any)?.accessToken;

    console.log('=== SAVE TEMPLATE ===');
    console.log('Full Session:', JSON.stringify(session, null, 2));
    console.log('Token from session:', token);
    if (token) {
      console.log('Token preview (first 80 chars):', token.substring(0, 80) + '...');
      console.log('Token length:', token.length);
    }

    if (!token) {
      alert('No token found. Please log in again.');
      setIsSaving(false);
      return;
    }

    try {
      const authHeader = `Bearer ${token}`;
      console.log('Authorization header being sent:', authHeader.substring(0, 80) + '...');
      
      const res = await fetch('http://localhost:5000/api/v1/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          content: newContent,
          roleTag: newTag,
        }),
      });

      const data = await res.json();
      console.log('Response status:', res.status);
      console.log('Response data:', data);

      if (res.ok) {
        // Form එක clear කර ලැයිස්තුව Refresh කිරීම
        setNewTitle('');
        setNewDesc('');
        setNewContent('');
        setView('LIST');
        fetchTemplates();
      } else {
        alert(`Error: ${data.message || 'Failed to create template'}`);
      }
    } catch (err) {
      console.error('Error creating template:', err);
      alert('Failed to create template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-80 bg-slate-950 border-r border-slate-800 p-4 overflow-y-auto h-full flex flex-col gap-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-sm tracking-wide text-slate-300">PROMPT BUILDER</h2>
        </div>
        {view === 'LIST' && (
          <button 
            onClick={() => setView('CREATE_TEMPLATE')}
            className="p-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 rounded-lg transition"
            title="Create Custom Template"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* VIEW 1: TEMPLATE LIST */}
      {view === 'LIST' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium px-2">Select a template or create one:</p>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t)}
              className="w-full text-left p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-600 transition group"
            >
              <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition">{t.title}</div>
              <div className="text-xs text-slate-400 line-clamp-2 mt-1">{t.description}</div>
              <span className="inline-block text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mt-2 uppercase font-mono">
                {t.roleTag}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* VIEW 2: DYNAMIC INPUT FORM (USE TEMPLATE) */}
      {view === 'USE_TEMPLATE' && selectedTemplate && (
        <form onSubmit={handleBuildSubmit} className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
            <span className="text-xs font-bold text-cyan-400 truncate max-w-[150px]">{selectedTemplate.title}</span>
            <button type="button" onClick={() => setView('LIST')} className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {placeholders.length === 0 ? (
              <p className="text-xs text-slate-500">This template has no dynamic variables.</p>
            ) : (
              placeholders.map((p) => (
                <div key={p}>
                  <label className="block text-xs font-medium text-slate-400 mb-1 capitalize">{p}</label>
                  <input
                    type="text"
                    required
                    value={inputs[p] || ''}
                    onChange={(e) => setInputs({ ...inputs, [p]: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition"
                    placeholder={`Enter ${p}...`}
                  />
                </div>
              ))
            )}
          </div>

          <button
            type="submit"
            disabled={isBuilding}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            {isBuilding ? 'Assembling...' : 'Generate & Chat'}
          </button>
        </form>
      )}

      {/* VIEW 3: CREATE CUSTOM TEMPLATE FORM */}
      {view === 'CREATE_TEMPLATE' && (
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300">Create New Template</span>
            <button type="button" onClick={() => setView('LIST')} className="text-slate-400 hover:text-slate-200">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Template Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="e.g., Email Marketer"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Short Description</label>
              <input
                type="text"
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="Briefly explain what this does"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Role Tag</label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="DEVELOPMENT">Development</option>
                <option value="MARKETING">Marketing</option>
                <option value="PRODUCTIVITY">Productivity</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Prompt Content (Use <code className="text-cyan-400 font-bold">{"{{variable}}"}</code>)
              </label>
              <textarea
                required
                rows={5}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
                placeholder="Act as a expert. Write an email about {{topic}} for {{audience}}..."
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Note: Anything inside {"{{ }}"} will become a field automatically.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white transition mt-2"
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </form>
      )}

    </div>
  );
}