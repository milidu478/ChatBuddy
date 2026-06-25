'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Folder, 
  Briefcase, 
  UserCheck, 
  Target, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  PlusCircle, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  FolderOpen
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type EntityType = 'domain' | 'profession' | 'role' | 'specialization' | 'template';

interface Template {
  id: string;
  name: string;
  promptText: string;
  specializationId: string;
}

interface Specialization {
  id: string;
  name: string;
  roleId: string;
  templates: Template[];
}

interface Role {
  id: string;
  name: string;
  professionId: string;
  specializations: Specialization[];
}

interface Profession {
  id: string;
  name: string;
  domainId: string;
  roles: Role[];
}

interface Domain {
  id: string;
  name: string;
  professions: Profession[];
}

interface SelectedItem {
  id: string;
  name: string;
  type: EntityType;
  promptText?: string; // For templates
  parentId?: string;
}

export default function PromptManagerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = (session as any)?.accessToken;

  // Tree and UI States
  const [tree, setTree] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Expanded Nodes Trackers (maps node unique keys to boolean)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Unified Form States
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  // Form Field States - Target Creation Type
  const [createType, setCreateType] = useState<EntityType>('domain');

  // Form Field States - Names & Content
  const [nameInput, setNameInput] = useState('');
  const [promptTextInput, setPromptTextInput] = useState('');

  // Form Field States - Parent Selection
  const [formDomainId, setFormDomainId] = useState('');
  const [formProfessionId, setFormProfessionId] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formSpecializationId, setFormSpecializationId] = useState('');

  // Submitting States
  const [submitting, setSubmitting] = useState(false);

  // ============================================================================
  // FETCH HIERARCHY TREE
  // ============================================================================
  const fetchTree = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/prompt-hierarchy/tree', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTree(data.data);
      } else {
        setError(data.message || 'Failed to fetch the prompt hierarchy.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (token) {
      fetchTree();
    }
  }, [token, status, router]);

  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  const toggleNode = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const clearNotifications = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleSelectItem = (item: SelectedItem) => {
    clearNotifications();
    setSelectedItem(item);
    setFormMode('edit');
    setNameInput(item.name);
    setPromptTextInput(item.promptText || '');
  };

  const handleSwitchToCreate = () => {
    clearNotifications();
    setFormMode('create');
    setSelectedItem(null);
    setNameInput('');
    setPromptTextInput('');
    // Attempt to pre-fill parent selectors based on currently selected item if applicable
    if (selectedItem) {
      // If we had a selected item, we can pre-select its path in the creation dropdowns
      // to make the UX extremely smooth!
    }
  };

  // ============================================================================
  // FORM SUBMISSION (CREATE & EDIT)
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    clearNotifications();
    setSubmitting(true);

    try {
      let url = 'http://localhost:5000/api/v1';
      let method = 'POST';
      let body: Record<string, any> = { name: nameInput.trim() };

      if (formMode === 'create') {
        // Build payload based on creation type
        switch (createType) {
          case 'domain':
            url += '/domains';
            break;
          case 'profession':
            url += '/professions';
            if (!formDomainId) throw new Error('Domain parent is required.');
            body.domainId = formDomainId;
            break;
          case 'role':
            url += '/roles';
            if (!formProfessionId) throw new Error('Profession parent is required.');
            body.professionId = formProfessionId;
            break;
          case 'specialization':
            url += '/specializations';
            if (!formRoleId) throw new Error('Role parent is required.');
            body.roleId = formRoleId;
            break;
          case 'template':
            url += '/templates';
            if (!formSpecializationId) throw new Error('Specialization parent is required.');
            body.specializationId = formSpecializationId;
            body.promptText = promptTextInput.trim();
            if (!body.promptText) throw new Error('Prompt text is required for templates.');
            break;
        }
      } else {
        // EDIT MODE
        if (!selectedItem) return;
        method = 'PUT';
        
        switch (selectedItem.type) {
          case 'domain':
            url += `/domains/${selectedItem.id}`;
            break;
          case 'profession':
            url += `/professions/${selectedItem.id}`;
            break;
          case 'role':
            url += `/roles/${selectedItem.id}`;
            break;
          case 'specialization':
            url += `/specializations/${selectedItem.id}`;
            break;
          case 'template':
            url += `/templates/${selectedItem.id}`;
            body.promptText = promptTextInput.trim();
            if (!body.promptText) throw new Error('Prompt text is required.');
            break;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setSuccessMsg(
          formMode === 'create' 
            ? `Successfully created new ${createType}!` 
            : `Successfully updated ${selectedItem?.name}!`
        );
        
        // Reset inputs
        if (formMode === 'create') {
          setNameInput('');
          setPromptTextInput('');
        }
        
        // Refresh tree view
        await fetchTree();
      } else {
        setError(data.message || 'An error occurred during save.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================================
  // DELETE OPERATION
  // ============================================================================
  const handleDelete = async (id: string, type: EntityType, name: string) => {
    if (!token) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete the ${type} "${name}"?\nWARNING: This will cascade and permanently delete all nested children!`);
    if (!confirmDelete) return;

    clearNotifications();
    try {
      const res = await fetch(`http://localhost:5000/api/v1/${type}s/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSuccessMsg(`Deleted ${type} "${name}" successfully.`);
        if (selectedItem?.id === id) {
          setSelectedItem(null);
          setFormMode('create');
          setNameInput('');
          setPromptTextInput('');
        }
        await fetchTree();
      } else {
        setError(data.message || `Failed to delete ${type}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Network error while deleting.');
    }
  };

  // ============================================================================
  // CASCADE FILTERING FOR CREATE DROPDOWNS
  // ============================================================================
  // Filter professions based on selected Domain in form
  const activeDomain = tree.find(d => d.id === formDomainId);
  const formProfessions = activeDomain ? activeDomain.professions : [];

  // Filter roles based on selected Profession in form
  const activeProfession = formProfessions.find(p => p.id === formProfessionId);
  const formRoles = activeProfession ? activeProfession.roles : [];

  // Filter specializations based on selected Role in form
  const activeRole = formRoles.find(r => r.id === formRoleId);
  const formSpecializations = activeRole ? activeRole.specializations : [];

  // Reset dependent dropdowns when parent selections change in creation form
  const handleFormDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormDomainId(e.target.value);
    setFormProfessionId('');
    setFormRoleId('');
    setFormSpecializationId('');
  };

  const handleFormProfessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormProfessionId(e.target.value);
    setFormRoleId('');
    setFormSpecializationId('');
  };

  const handleFormRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormRoleId(e.target.value);
    setFormSpecializationId('');
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/75 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/')}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition"
            title="Go to Chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2">
              <span>Promptcraft Administrator</span>
              <span className="text-xs bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 font-mono font-normal">v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">Manage the 5-level prompt hierarchy database</p>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: INTERACTIVE TREE VIEW */}
        <section className="w-1/2 border-r border-slate-800 p-6 overflow-y-auto bg-slate-950/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-cyan-400" />
              <span>Prompt Hierarchy Tree</span>
            </h2>
            <button
              onClick={fetchTree}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition font-semibold"
            >
              Refresh Tree
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Loading hierarchy...</span>
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-2xl p-8">
              <Folder className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
              <p className="text-sm">Database hierarchy is empty.</p>
              <p className="text-xs text-slate-600 mt-1">Use the form on the right to create your first Domain!</p>
            </div>
          ) : (
            <div className="space-y-3 font-medium text-sm text-slate-300">
              {/* DOMAINS (Level 1) */}
              {tree.map((domain) => {
                const domainKey = `domain-${domain.id}`;
                const isExpanded = !!expandedNodes[domainKey];
                const isSelected = selectedItem?.id === domain.id && selectedItem.type === 'domain';

                return (
                  <div key={domain.id} className="space-y-1">
                    <div 
                      className={`group flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected 
                          ? 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200' 
                          : 'bg-slate-900/40 border-slate-800/40 hover:border-slate-700/50 text-slate-300'
                      }`}
                      onClick={() => handleSelectItem({ id: domain.id, name: domain.name, type: 'domain' })}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNode(domainKey);
                          }}
                          className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="font-semibold truncate">{domain.name}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800/50 px-1.5 py-0.25 rounded uppercase">Domain</span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectItem({ id: domain.id, name: domain.name, type: 'domain' });
                          }}
                          className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                          title="Edit Domain"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(domain.id, 'domain', domain.name);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                          title="Delete Domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* PROFESSIONS (Level 2) */}
                    {isExpanded && (
                      <div className="pl-6 space-y-1 border-l border-slate-800/60 ml-3.5">
                        {domain.professions.length === 0 ? (
                          <span className="text-xs text-slate-600 block py-1 pl-4 italic">No professions.</span>
                        ) : (
                          domain.professions.map((prof) => {
                            const profKey = `prof-${prof.id}`;
                            const isProfExpanded = !!expandedNodes[profKey];
                            const isProfSelected = selectedItem?.id === prof.id && selectedItem.type === 'profession';

                            return (
                              <div key={prof.id} className="space-y-1">
                                <div 
                                  className={`group flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                                    isProfSelected 
                                      ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' 
                                      : 'bg-slate-900/20 border-slate-800/30 hover:border-slate-800 text-slate-300'
                                  }`}
                                  onClick={() => handleSelectItem({ id: prof.id, name: prof.name, type: 'profession', parentId: domain.id })}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleNode(profKey);
                                      }}
                                      className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                                    >
                                      {isProfExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                    <Briefcase className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span className="truncate font-medium">{prof.name}</span>
                                    <span className="text-[9px] text-slate-500 bg-slate-800/30 px-1 py-0.25 rounded uppercase">Profession</span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectItem({ id: prof.id, name: prof.name, type: 'profession', parentId: domain.id });
                                      }}
                                      className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                                      title="Edit Profession"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(prof.id, 'profession', prof.name);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                                      title="Delete Profession"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* ROLES (Level 3) */}
                                {isProfExpanded && (
                                  <div className="pl-6 space-y-1 border-l border-slate-800/60 ml-3">
                                    {prof.roles.length === 0 ? (
                                      <span className="text-xs text-slate-600 block py-1 pl-4 italic">No roles.</span>
                                    ) : (
                                      prof.roles.map((role) => {
                                        const roleKey = `role-${role.id}`;
                                        const isRoleExpanded = !!expandedNodes[roleKey];
                                        const isRoleSelected = selectedItem?.id === role.id && selectedItem.type === 'role';

                                        return (
                                          <div key={role.id} className="space-y-1">
                                            <div 
                                              className={`group flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer ${
                                                isRoleSelected 
                                                  ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' 
                                                  : 'bg-slate-900/10 border-transparent hover:border-slate-850 text-slate-300'
                                              }`}
                                              onClick={() => handleSelectItem({ id: role.id, name: role.name, type: 'role', parentId: prof.id })}
                                            >
                                              <div className="flex items-center gap-2 overflow-hidden">
                                                <button 
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleNode(roleKey);
                                                  }}
                                                  className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                                                >
                                                  {isRoleExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                </button>
                                                <UserCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                <span className="truncate">{role.name}</span>
                                                <span className="text-[8px] text-slate-600 bg-slate-800/20 px-1 rounded uppercase">Role</span>
                                              </div>

                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectItem({ id: role.id, name: role.name, type: 'role', parentId: prof.id });
                                                  }}
                                                  className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                                                  title="Edit Role"
                                                >
                                                  <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(role.id, 'role', role.name);
                                                  }}
                                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                                                  title="Delete Role"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* SPECIALIZATIONS (Level 4) */}
                                            {isRoleExpanded && (
                                              <div className="pl-6 space-y-1 border-l border-slate-800/60 ml-3">
                                                {role.specializations.length === 0 ? (
                                                  <span className="text-xs text-slate-600 block py-1 pl-4 italic">No specs.</span>
                                                ) : (
                                                  role.specializations.map((spec) => {
                                                    const specKey = `spec-${spec.id}`;
                                                    const isSpecExpanded = !!expandedNodes[specKey];
                                                    const isSpecSelected = selectedItem?.id === spec.id && selectedItem.type === 'specialization';

                                                    return (
                                                      <div key={spec.id} className="space-y-1">
                                                        <div 
                                                          className={`group flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer ${
                                                            isSpecSelected 
                                                              ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200' 
                                                              : 'bg-slate-900/10 border-transparent hover:border-slate-850 text-slate-300'
                                                          }`}
                                                          onClick={() => handleSelectItem({ id: spec.id, name: spec.name, type: 'specialization', parentId: role.id })}
                                                        >
                                                          <div className="flex items-center gap-2 overflow-hidden">
                                                            <button 
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleNode(specKey);
                                                              }}
                                                              className="p-0.5 hover:bg-slate-800 rounded text-slate-500"
                                                            >
                                                              {isSpecExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                            </button>
                                                            <Target className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                                            <span className="truncate">{spec.name}</span>
                                                            <span className="text-[8px] text-slate-600 bg-slate-800/20 px-1 rounded uppercase">Spec</span>
                                                          </div>

                                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSelectItem({ id: spec.id, name: spec.name, type: 'specialization', parentId: role.id });
                                                              }}
                                                              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                                                              title="Edit Spec"
                                                            >
                                                              <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete(spec.id, 'specialization', spec.name);
                                                              }}
                                                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                                                              title="Delete Spec"
                                                            >
                                                              <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {/* TEMPLATES (Level 5) */}
                                                        {isSpecExpanded && (
                                                          <div className="pl-6 space-y-1 border-l border-slate-800/60 ml-3">
                                                            {spec.templates.length === 0 ? (
                                                              <span className="text-xs text-slate-600 block py-1 pl-4 italic">No templates.</span>
                                                            ) : (
                                                              spec.templates.map((temp) => {
                                                                const isTempSelected = selectedItem?.id === temp.id && selectedItem.type === 'template';

                                                                return (
                                                                  <div 
                                                                    key={temp.id}
                                                                    className={`group flex items-center justify-between p-1.5 rounded-lg border transition cursor-pointer ${
                                                                      isTempSelected 
                                                                        ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-100' 
                                                                        : 'bg-slate-900/5 border-transparent hover:border-slate-850 text-slate-400 hover:text-slate-200'
                                                                    }`}
                                                                    onClick={() => handleSelectItem({ 
                                                                      id: temp.id, 
                                                                      name: temp.name, 
                                                                      type: 'template', 
                                                                      promptText: temp.promptText,
                                                                      parentId: spec.id 
                                                                    })}
                                                                  >
                                                                    <div className="flex items-center gap-2 overflow-hidden pl-3">
                                                                      <FileText className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                                                                      <span className="truncate">{temp.name}</span>
                                                                      <span className="text-[8px] text-cyan-400/80 bg-cyan-950/20 px-1 rounded uppercase">Template</span>
                                                                    </div>

                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                      <button
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          handleSelectItem({ 
                                                                            id: temp.id, 
                                                                            name: temp.name, 
                                                                            type: 'template', 
                                                                            promptText: temp.promptText,
                                                                            parentId: spec.id 
                                                                          });
                                                                        }}
                                                                        className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
                                                                        title="Edit Template"
                                                                      >
                                                                        <Edit2 className="w-3 h-3" />
                                                                      </button>
                                                                      <button
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          handleDelete(temp.id, 'template', temp.name);
                                                                        }}
                                                                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                                                                        title="Delete Template"
                                                                      >
                                                                        <Trash2 className="w-3 h-3" />
                                                                      </button>
                                                                    </div>
                                                                  </div>
                                                                );
                                                              })
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: DYNAMIC UNIFIED FORM */}
        <section className="w-1/2 p-6 overflow-y-auto bg-slate-900">
          <div className="max-w-xl mx-auto space-y-6">
            {/* Status Notifications */}
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-sm text-red-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-300">Operation Error</div>
                  <p className="mt-0.5 text-xs text-red-200/90 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-4 text-sm text-emerald-200 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-300">Success</div>
                  <p className="mt-0.5 text-xs text-emerald-200/90 leading-relaxed">{successMsg}</p>
                </div>
              </div>
            )}

            {/* Form Mode Selector Tabs */}
            <div className="bg-slate-950 p-1 rounded-xl flex border border-slate-800">
              <button
                type="button"
                onClick={handleSwitchToCreate}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  formMode === 'create' 
                    ? 'bg-slate-850 text-cyan-400 shadow-sm border border-slate-800' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create New Element
              </button>
              <button
                type="button"
                disabled={!selectedItem}
                onClick={() => selectedItem && handleSelectItem(selectedItem)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  formMode === 'edit'
                    ? 'bg-slate-850 text-cyan-400 shadow-sm border border-slate-800' 
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
                title={!selectedItem ? 'Select an item in the tree to edit' : ''}
              >
                Edit {selectedItem ? `Selected (${selectedItem.type})` : 'Element'}
              </button>
            </div>

            {/* Unified Adaptive Form Container */}
            <form onSubmit={handleSubmit} className="bg-slate-950/40 border border-slate-850 rounded-2xl p-6 space-y-5 shadow-xl backdrop-blur-sm">
              
              {/* Form Title */}
              <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-cyan-400" />
                  <span>
                    {formMode === 'create' 
                      ? `Add New ${createType.toUpperCase()}` 
                      : `Edit ${selectedItem?.type.toUpperCase()}: "${selectedItem?.name}"`
                    }
                  </span>
                </h3>
                {formMode === 'edit' && (
                  <button 
                    type="button" 
                    onClick={handleSwitchToCreate} 
                    className="text-[10px] text-slate-400 hover:text-cyan-400 transition uppercase font-semibold"
                  >
                    Switch to Add
                  </button>
                )}
              </div>

              {/* CREATE MODE: Element Type Selector */}
              {formMode === 'create' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Target Level</label>
                  <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-850">
                    {(['domain', 'profession', 'role', 'specialization', 'template'] as EntityType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          clearNotifications();
                          setCreateType(type);
                        }}
                        className={`py-1 text-[10px] font-bold rounded capitalize transition ${
                          createType === type 
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-900/55' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {type === 'specialization' ? 'Spec' : type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC PARENT CASCADE SELECTORS (Only visible in CREATE MODE based on creation target) */}
              {formMode === 'create' && (
                <div className="space-y-4 pt-1 bg-slate-900/20 rounded-xl border border-transparent">
                  
                  {/* Need Domain Selector if target is Profession, Role, Spec, or Template */}
                  {['profession', 'role', 'specialization', 'template'].includes(createType) && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Select Parent Domain</label>
                      <select
                        value={formDomainId}
                        onChange={handleFormDomainChange}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none transition cursor-pointer"
                      >
                        <option value="">-- Select Domain --</option>
                        {tree.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Need Profession Selector if target is Role, Spec, or Template */}
                  {['role', 'specialization', 'template'].includes(createType) && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Select Parent Profession</label>
                      <select
                        value={formProfessionId}
                        onChange={handleFormProfessionChange}
                        required
                        disabled={!formDomainId}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Select Profession --</option>
                        {formProfessions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Need Role Selector if target is Spec or Template */}
                  {['specialization', 'template'].includes(createType) && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Select Parent Role</label>
                      <select
                        value={formRoleId}
                        onChange={handleFormRoleChange}
                        required
                        disabled={!formProfessionId}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Select Role --</option>
                        {formRoles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Need Specialization Selector if target is Template */}
                  {createType === 'template' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Select Parent Specialization</label>
                      <select
                        value={formSpecializationId}
                        onChange={(e) => setFormSpecializationId(e.target.value)}
                        required
                        disabled={!formRoleId}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-750 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="">-- Select Specialization --</option>
                        {formSpecializations.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* INPUT: NAME FIELD */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase">
                  {formMode === 'create' ? `${createType} Name` : `Update Name`}
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-100 focus:outline-none transition"
                  placeholder={
                    formMode === 'create' 
                      ? `Enter name for the new ${createType}...` 
                      : `Enter new name...`
                  }
                />
              </div>

              {/* INPUT: PROMPT TEXT AREA (Only for TEMPLATES) */}
              {((formMode === 'create' && createType === 'template') || (formMode === 'edit' && selectedItem?.type === 'template')) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase">
                    Prompt Text Content
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={promptTextInput}
                    onChange={(e) => setPromptTextInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none font-mono leading-relaxed resize-none"
                    placeholder="Act as a {{role}}. Write an email targeting {{audience}} about {{topic}}..."
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal">
                    Note: To set variable inputs in the chat UI, encapsulate them in double curly braces, e.g., <code>{"{{variable_name}}"}</code>.
                  </span>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition flex items-center justify-center gap-2 mt-4 shadow-lg shadow-cyan-950/30 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>
                    {formMode === 'create' ? `Create ${createType}` : 'Save Changes'}
                  </span>
                )}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
