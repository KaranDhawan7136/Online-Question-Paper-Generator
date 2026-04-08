import { useState, useEffect, useMemo, useRef } from 'react';
import { papersAPI } from '../utils/api';
import toast from 'react-hot-toast';

const STORAGE_KEY_NAMES = 'paperFolderNames';
const STORAGE_KEY_CUSTOM = 'paperCustomFolders';
const STORAGE_KEY_ASSIGNMENTS = 'paperFolderAssignments';

const Papers = () => {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedFolders, setExpandedFolders] = useState({});
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser?.role === 'admin';

    // Folder names (for renaming year folders)
    const [folderNames, setFolderNames] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_NAMES)) || {}; }
        catch { return {}; }
    });

    // Custom folders (user-created)
    const [customFolders, setCustomFolders] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM)) || []; }
        catch { return []; }
    });

    // Paper-to-folder assignments (paperId -> folderId)
    const [assignments, setAssignments] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY_ASSIGNMENTS)) || {}; }
        catch { return {}; }
    });

    const [editingFolder, setEditingFolder] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const editInputRef = useRef(null);
    const newFolderInputRef = useRef(null);

    useEffect(() => { fetchPapers(); }, []);

    useEffect(() => {
        if (showNewFolderInput) {
            setTimeout(() => newFolderInputRef.current?.focus(), 50);
        }
    }, [showNewFolderInput]);

    const fetchPapers = async () => {
        try {
            const res = await papersAPI.getAll();
            setPapers(res.data);
            // Expand all folders by default
            const expanded = {};
            res.data.forEach(paper => {
                const year = new Date(paper.createdAt).getFullYear();
                expanded[`year-${year}`] = true;
            });
            // Also expand custom folders
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM) || '[]');
            saved.forEach(f => { expanded[f.id] = true; });
            setExpandedFolders(expanded);
        } catch (error) {
            toast.error('Failed to fetch papers');
        } finally {
            setLoading(false);
        }
    };

    // Build folder structure
    const folders = useMemo(() => {
        const result = [];
        const assignedPaperIds = new Set(Object.keys(assignments));

        // Custom folders first
        customFolders.forEach(folder => {
            const folderPapers = papers.filter(p => assignments[p._id] === folder.id);
            result.push({
                id: folder.id,
                name: folder.name,
                isCustom: true,
                papers: folderPapers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            });
        });

        // Year-based folders for unassigned papers
        const unassigned = papers.filter(p => !assignedPaperIds.has(p._id) || !customFolders.find(f => f.id === assignments[p._id]));
        const yearGroups = {};
        unassigned.forEach(paper => {
            const year = new Date(paper.createdAt).getFullYear();
            if (!yearGroups[year]) yearGroups[year] = [];
            yearGroups[year].push(paper);
        });

        Object.keys(yearGroups).sort((a, b) => b - a).forEach(year => {
            result.push({
                id: `year-${year}`,
                name: folderNames[year] || year,
                yearKey: year,
                isCustom: false,
                papers: yearGroups[year].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            });
        });

        return result;
    }, [papers, customFolders, assignments, folderNames]);

    // All folder options for "Move to" dropdown
    const allFolderOptions = useMemo(() => {
        const options = [];
        customFolders.forEach(f => options.push({ id: f.id, name: f.name }));
        // Add year folders
        const years = new Set();
        papers.forEach(p => years.add(new Date(p.createdAt).getFullYear()));
        [...years].sort((a, b) => b - a).forEach(year => {
            options.push({ id: `year-${year}`, name: folderNames[year] || `${year}`, isYear: true, yearKey: year });
        });
        return options;
    }, [customFolders, papers, folderNames]);

    const toggleFolder = (folderId) => {
        if (editingFolder === folderId) return;
        setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    };

    // Create new custom folder
    const createFolder = () => {
        const name = newFolderName.trim();
        if (!name) {
            setShowNewFolderInput(false);
            return;
        }
        const id = `custom-${Date.now()}`;
        const updated = [...customFolders, { id, name }];
        setCustomFolders(updated);
        localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
        setExpandedFolders(prev => ({ ...prev, [id]: true }));
        setNewFolderName('');
        setShowNewFolderInput(false);
        toast.success(`Folder "${name}" created`);
    };

    // Delete custom folder (papers go back to year folders)
    const deleteFolder = (folderId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this folder? Papers will move back to their year folders.')) return;
        const updated = customFolders.filter(f => f.id !== folderId);
        setCustomFolders(updated);
        localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
        // Remove assignments for this folder
        const newAssignments = { ...assignments };
        Object.keys(newAssignments).forEach(paperId => {
            if (newAssignments[paperId] === folderId) delete newAssignments[paperId];
        });
        setAssignments(newAssignments);
        localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(newAssignments));
        toast.success('Folder deleted');
    };

    // Move paper to a folder
    const movePaper = (paperId, targetFolderId) => {
        const newAssignments = { ...assignments };
        if (targetFolderId.startsWith('year-')) {
            // Moving back to year folder = remove assignment
            delete newAssignments[paperId];
        } else {
            newAssignments[paperId] = targetFolderId;
        }
        setAssignments(newAssignments);
        localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(newAssignments));
        toast.success('Paper moved');
    };

    // Rename folder
    const startEditing = (folderId, currentName, e) => {
        e.stopPropagation();
        setEditingFolder(folderId);
        setEditValue(currentName);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const saveEdit = (folder) => {
        const trimmed = editValue.trim();
        if (!trimmed) {
            setEditingFolder(null);
            return;
        }
        if (folder.isCustom) {
            const updated = customFolders.map(f => f.id === folder.id ? { ...f, name: trimmed } : f);
            setCustomFolders(updated);
            localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(updated));
        } else {
            const newNames = { ...folderNames };
            if (trimmed !== folder.yearKey) {
                newNames[folder.yearKey] = trimmed;
            } else {
                delete newNames[folder.yearKey];
            }
            setFolderNames(newNames);
            localStorage.setItem(STORAGE_KEY_NAMES, JSON.stringify(newNames));
        }
        setEditingFolder(null);
    };

    const handleEditKeyDown = (e, folder) => {
        if (e.key === 'Enter') saveEdit(folder);
        if (e.key === 'Escape') setEditingFolder(null);
    };

    const handleDownload = async (paper, type) => {
        try {
            if (type === 'summary') {
                const response = await papersAPI.downloadSummaryExcel(paper._id);
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${paper.title.replace(/\s/g, '_')}_Summary_Sheet.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success('Summary Excel downloaded!');
            } else {
                const response = await papersAPI.downloadPDF(paper._id, type);
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${paper.title.replace(/\s/g, '_')}_${type}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success('PDF downloaded!');
            }
        } catch (error) {
            toast.error('Download failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this paper?')) return;
        try {
            await papersAPI.delete(id);
            toast.success('Paper deleted');
            // Clean up assignment
            const newAssignments = { ...assignments };
            delete newAssignments[id];
            setAssignments(newAssignments);
            localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(newAssignments));
            fetchPapers();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const getCurrentFolderId = (paperId) => {
        return assignments[paperId] || null;
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isAdmin ? '📋 All Papers' : 'My Papers'}</h1>
                    <p className="page-subtitle">
                        {isAdmin ? 'View and manage all papers generated by all faculty members' : 'View and download your generated papers'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowNewFolderInput(true)}>
                    📁 + New Folder
                </button>
            </div>

            {/* New Folder Input */}
            {showNewFolderInput && (
                <div className="new-folder-bar">
                    <span className="year-folder-icon">📁</span>
                    <input
                        ref={newFolderInputRef}
                        className="year-folder-edit-input"
                        placeholder="Enter folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') createFolder();
                            if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); }
                        }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={createFolder}>Create</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }}>Cancel</button>
                </div>
            )}

            {papers.length === 0 && customFolders.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <div className="empty-state-title">No papers yet</div>
                        <p>Generate your first question paper to see it here.</p>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '24px' }}>
                    {folders.map(folder => (
                        <div key={folder.id} className="year-folder">
                            <div
                                className="year-folder-header"
                                onClick={() => toggleFolder(folder.id)}
                            >
                                <div className="year-folder-left">
                                    <span className={`year-folder-arrow ${expandedFolders[folder.id] ? 'expanded' : ''}`}>
                                        ▶
                                    </span>
                                    <span className="year-folder-icon">📁</span>
                                    {editingFolder === folder.id ? (
                                        <input
                                            ref={editInputRef}
                                            className="year-folder-edit-input"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(folder)}
                                            onKeyDown={(e) => handleEditKeyDown(e, folder)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <>
                                            <span className="year-folder-title">{folder.name}</span>
                                            <button
                                                className="year-folder-edit-btn"
                                                onClick={(e) => startEditing(folder.id, folder.name, e)}
                                                title="Rename folder"
                                            >
                                                ✏️
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="year-folder-count">
                                        {folder.papers.length} {folder.papers.length === 1 ? 'paper' : 'papers'}
                                    </span>
                                    {folder.isCustom && (
                                        <button
                                            className="year-folder-delete-btn"
                                            onClick={(e) => deleteFolder(folder.id, e)}
                                            title="Delete folder"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>

                            {expandedFolders[folder.id] && (
                                <div className="year-folder-content">
                                    {folder.papers.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '14px' }}>
                                            No papers in this folder. Move papers here using the "Move to" option.
                                        </div>
                                    ) : (
                                        folder.papers.map(paper => (
                                            <div key={paper._id} className="card paper-card">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{paper.title}</h3>
                                                        <div style={{ display: 'flex', gap: '16px', color: 'var(--gray-500)', fontSize: '14px', flexWrap: 'wrap' }}>
                                                            <span>📚 {paper.subject}</span>
                                                            <span>📝 {paper.totalMarks} marks</span>
                                                            <span>⏱️ {paper.duration} min</span>
                                                            <span>❓ {paper.questions?.length || 0} questions</span>
                                                            {isAdmin && paper.createdBy && (
                                                                <span style={{
                                                                    background: 'rgba(99,102,241,0.1)',
                                                                    color: 'var(--primary)',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '6px',
                                                                    fontFamily: 'monospace',
                                                                    fontWeight: '600',
                                                                    fontSize: '12px'
                                                                }}>
                                                                    👤 {paper.createdBy.memberId}{paper.createdBy.name ? ` — ${paper.createdBy.name}` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ marginTop: '8px', color: 'var(--gray-400)', fontSize: '13px' }}>
                                                            Created: {new Date(paper.createdAt).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <select
                                                            className="move-to-select"
                                                            value={getCurrentFolderId(paper._id) || folder.id}
                                                            onChange={(e) => movePaper(paper._id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            title="Move to folder"
                                                        >
                                                            {allFolderOptions.map(opt => (
                                                                <option key={opt.id} value={opt.id}>
                                                                    📁 {opt.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleDownload(paper, 'question_paper')}>
                                                            📄 Paper PDF
                                                        </button>
                                                        <button className="btn btn-success btn-sm" onClick={() => handleDownload(paper, 'summary')}>
                                                            📊 Summary Excel
                                                        </button>
                                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(paper._id)}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Papers;
