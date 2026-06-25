'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Layers, Settings, Sparkles, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { API_V1 } from '../lib/apiConfig';

interface Template {
  id: string;
  name: string;
  promptText: string;
}

interface Specialization {
  id: string;
  name: string;
  templates: Template[];
}

interface Role {
  id: string;
  name: string;
  specializations: Specialization[];
}

interface Profession {
  id: string;
  name: string;
  roles: Role[];
}

interface Domain {
  id: string;
  name: string;
  professions: Profession[];
}

interface CascadingPromptSidebarProps {
  onSelectTemplate: (promptText: string) => void;
  resetTrigger?: number;
}

export default function CascadingPromptSidebar({ onSelectTemplate, resetTrigger }: CascadingPromptSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [tree, setTree] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cascading Dropdown States
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedProfessionId, setSelectedProfessionId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Reset dropdown selections when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setSelectedDomainId('');
      setSelectedProfessionId('');
      setSelectedRoleId('');
      setSelectedSpecializationId('');
      setSelectedTemplateId('');
    }
  }, [resetTrigger]);

  // 1. Fetch entire nested hierarchy tree from the backend
  const fetchTree = async () => {
    const token = (session as any)?.accessToken;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_V1}/prompt-hierarchy/tree`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTree(data.data);
      } else {
        setError(data.message || 'Failed to load prompt hierarchy.');
      }
    } catch (err) {
      console.error('Failed to fetch prompt tree', err);
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTree();
    }
  }, [session]);

  // 2. Derive options based on selections
  const selectedDomain = tree.find((d) => d.id === selectedDomainId);
  const professions = selectedDomain ? selectedDomain.professions : [];

  const selectedProfession = professions.find((p) => p.id === selectedProfessionId);
  const roles = selectedProfession ? selectedProfession.roles : [];

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const specializations = selectedRole ? selectedRole.specializations : [];

  const selectedSpecialization = specializations.find((s) => s.id === selectedSpecializationId);
  const templates = selectedSpecialization ? selectedSpecialization.templates : [];

  // Reset dependent dropdowns when parent selections change
  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDomainId(e.target.value);
    setSelectedProfessionId('');
    setSelectedRoleId('');
    setSelectedSpecializationId('');
    setSelectedTemplateId('');
  };

  const handleProfessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfessionId(e.target.value);
    setSelectedRoleId('');
    setSelectedSpecializationId('');
    setSelectedTemplateId('');
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRoleId(e.target.value);
    setSelectedSpecializationId('');
    setSelectedTemplateId('');
  };

  const handleSpecializationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSpecializationId(e.target.value);
    setSelectedTemplateId('');
  };

  // 3. Handle final template selection (load prompt text, no auto-send)
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        onSelectTemplate(template.promptText);
      }
    }
  };

  return (
    <aside className="w-80 bg-slate-900/60 backdrop-blur-md border-r border-slate-800/80 p-6 flex flex-col gap-5 h-full overflow-y-auto flex-shrink-0">
      
      {/* Top Branding Section */}
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
        <h1 className="text-xl font-bold tracking-wider text-slate-100">PromptCraft</h1>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/80 my-1" />

      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-xs tracking-wider text-slate-300 uppercase">Prompt Selector</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Loading prompt tree...</span>
          </div>
        ) : error ? (
          <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3 text-red-400 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Connection Issue</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">{error}</p>
            <button 
              onClick={fetchTree} 
              className="mt-1 py-1 px-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800 rounded text-[10px] font-semibold text-red-300 transition w-max"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 font-medium">Cascade through the levels to load a prompt:</p>

            {/* Level 1: Domain Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">1. Domain</label>
              <select
                value={selectedDomainId}
                onChange={handleDomainChange}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800/80 hover:border-slate-700 focus:border-cyan-500 rounded-xl text-base text-slate-200 focus:outline-none transition cursor-pointer"
              >
                <option value="">-- Select Domain --</option>
                {tree.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level 2: Profession Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">2. Profession</label>
              <select
                value={selectedProfessionId}
                onChange={handleProfessionChange}
                disabled={!selectedDomainId}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800/80 hover:border-slate-700 focus:border-cyan-500 rounded-xl text-base text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">-- Select Profession --</option>
                {professions.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level 3: Role Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">3. Role</label>
              <select
                value={selectedRoleId}
                onChange={handleRoleChange}
                disabled={!selectedProfessionId}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800/80 hover:border-slate-700 focus:border-cyan-500 rounded-xl text-base text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">-- Select Role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level 4: Specialization Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">4. Specialization</label>
              <select
                value={selectedSpecializationId}
                onChange={handleSpecializationChange}
                disabled={!selectedRoleId}
                className="w-full py-3.5 px-4 bg-slate-950 border border-slate-800/80 hover:border-slate-700 focus:border-cyan-500 rounded-xl text-base text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">-- Select Specialization --</option>
                {specializations.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level 5: Template Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>5. Template</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                disabled={!selectedSpecializationId}
                className="w-full py-3.5 px-4 bg-slate-950 border border-cyan-955 hover:border-cyan-900 focus:border-cyan-500 rounded-xl text-base text-cyan-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <option value="">-- Select Template --</option>
                {templates.map((temp) => (
                  <option key={temp.id} value={temp.id}>
                    {temp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer Settings and SignOut */}
      <div className="mt-auto pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
        <button
          onClick={() => router.push('/prompt-manager')}
          className="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl text-base font-semibold text-slate-300 transition flex items-center justify-center gap-2 group cursor-pointer"
        >
          <Settings className="w-5 h-5 text-slate-400 group-hover:rotate-45 transition-transform duration-300" />
          <span>Prompt Dashboard</span>
        </button>

        <button 
          onClick={() => signOut()} 
          className="w-full flex items-center justify-center gap-2 text-base text-slate-400 hover:text-red-400 transition py-3.5 px-6 rounded-2xl bg-slate-950 hover:bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out ({session?.user?.name || 'User'})</span>
        </button>
      </div>
    </aside>
  );
}
