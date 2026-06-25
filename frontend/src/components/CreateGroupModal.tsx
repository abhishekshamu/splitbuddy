import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuthStore, useGroupStore } from "../store";
import { 
  X, Plus, Shield, ShieldAlert, Sparkles, Copy, Check, Users, 
  Info, Settings, Eye, EyeOff, Smile, Palette, LayoutGrid, CheckCircle2 
} from "lucide-react";

interface Member {
  user?: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  type: 'guest' | 'registered';
  role: 'admin' | 'member';
}

interface Template {
  name: string;
  emoji: string;
  type: string;
  color: string;
  placeholder: string;
}

const TEMPLATES: Template[] = [
  { name: "Flatmates", emoji: "🏠", type: "flatmates", color: "#9b6dff", placeholder: "Flat 302 Bros" },
  { name: "Trip/Travel", emoji: "✈️", type: "trip", color: "#3de8d0", placeholder: "EuroTrip 2026" },
  { name: "Hostel/Room", emoji: "🎓", type: "hostel", color: "#ffb830", placeholder: "Room 104 Squad" },
  { name: "Office", emoji: "💼", type: "office", color: "#ff8c42", placeholder: "Marketing Lunch group" },
  { name: "Friends", emoji: "🎉", type: "friends", color: "#ff5fcb", placeholder: "Weekend Chillers" },
  { name: "Family", emoji: "🍱", type: "family", color: "#b5ff4d", placeholder: "Sharma Household" },
];

const DEFAULT_EMOJIS = ["🏠", "✈️", "🍱", "🎉", "💼", "🏖️", "🎓", "🏋️", "🎮", "🛒", "🍿", "🍕", "🚗", "🏂", "🏕️", "💡"];
const COLORS = ["#9b6dff", "#3de8d0", "#ff5fcb", "#ffb830", "#b5ff4d", "#ff8c42", "#ff4d4d", "#4da6ff"];

interface Props {
  onClose: () => void;
}

export default function CreateGroupModal({ onClose }: Props) {
  const { addGroup, fetchGroups } = useGroupStore();
  const { user, searchUsers } = useAuthStore();

  // 1. Basic Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [type, setType] = useState("flatmates");
  const [color, setColor] = useState(COLORS[0]);
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  // 2. Members Management States
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<Member[]>([
    { user: user?._id, full_name: user?.full_name || "You", avatar_url: user?.avatar_url, type: 'registered', role: 'admin' }
  ]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // 3. UI states
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // 4. Custom features
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [customEmojiInput, setCustomEmojiInput] = useState("");

  // Refs for accessibility / Esc close / Focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Load recent emojis on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("splitbuddy-recent-emojis");
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync recent emojis to localstorage
  const saveRecentEmoji = (emo: string) => {
    let list = [emo, ...recentEmojis.filter(e => e !== emo)].slice(0, 5);
    setRecentEmojis(list);
    try {
      localStorage.setItem("splitbuddy-recent-emojis", JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard navigation & Focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    firstInputRef.current?.focus();
    document.body.style.overflow = "hidden"; // Scroll Lock

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = ""; // Scroll Unlock
    };
  }, [onClose]);

  // Debounced search suggestions
  useEffect(() => {
    const delay = setTimeout(async () => {
      const trimmed = memberInput.trim();
      if (trimmed.length >= 2) {
        setSearching(true);
        try {
          const results = await searchUsers(trimmed);
          setSuggestions(results || []);
        } catch (err) {
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(delay);
  }, [memberInput, searchUsers]);

  // Apply template
  const applyTemplate = (tpl: Template) => {
    setEmoji(tpl.emoji);
    setType(tpl.type);
    setColor(tpl.color);
    if (!name) {
      toast.success(`Applied template: ${tpl.name}!`, { id: "tpl-toast" });
    }
  };

  // Autocomplete / manual member add
  const handleAddMember = (m: any) => {
    if (typeof m === 'string') {
      const val = m.trim();
      if (!val) return;

      // Email validation if they typed email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

      // Prevent duplicate
      const exists = members.some(x => x.full_name.toLowerCase() === val.toLowerCase() || x.email?.toLowerCase() === val.toLowerCase());
      if (exists) {
        toast.error("Member already added!");
        return;
      }

      setMembers([...members, {
        full_name: val,
        type: 'guest',
        role: 'member',
        ...(isEmail && { email: val })
      }]);
    } else {
      // User object from autocomplete
      const exists = members.some(x => x.user === m._id);
      if (exists) {
        toast.error("Member already added!");
        return;
      }
      setMembers([...members, {
        user: m._id,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        type: 'registered',
        role: 'member'
      }]);
    }
    setMemberInput("");
    setSuggestions([]);
  };

  const removeMember = (index: number) => {
    if (index === 0) return; // Cannot remove self
    setMembers(members.filter((_, i) => i !== index));
  };

  const toggleRole = (index: number) => {
    if (index === 0) return; // Creator is always admin
    const updated = [...members];
    updated[index].role = updated[index].role === 'admin' ? 'member' : 'admin';
    setMembers(updated);
  };

  // Submit Handler
  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Create Group Clicked");

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      toast.error("Group name is required!");
      return;
    }
    if (nameTrimmed.length < 3 || nameTrimmed.length > 50) {
      toast.error("Group name must be between 3 and 50 characters!");
      return;
    }

    // Map members payload, excluding 'You' (which is the first index with user ID)
    // The backend adds the logged in user as admin automatically
    const memberPayload = members.slice(1).map(m => {
      if (m.type === 'registered') {
        return { user: m.user, full_name: m.full_name, role: m.role };
      } else {
        return m.email ? `${m.full_name} (${m.email})` : m.full_name;
      }
    });

    const formData = {
      name: nameTrimmed,
      description: description.trim(),
      emoji,
      type,
      color,
      visibility,
      members: memberPayload
    };

    console.log("Form Data:", formData);
    console.log("Validation Result:", { nameValid: nameTrimmed.length >= 3, typeValid: !!type, colorValid: !!color, emojiValid: !!emoji, memberCount: memberPayload.length });

    setLoading(true);
    try {
      const response = await addGroup(formData);
      console.log("API Response:", response);

      saveRecentEmoji(emoji);
      setCreatedGroup(response);

      // Refresh the groups list so new group appears immediately
      await fetchGroups();

      toast.success("Group created successfully! 🎉");
    } catch (err: any) {
      console.error("Create Group Error:", err);
      const message = err.message || "Failed to create group.";
      if (message.includes('already have an active group')) {
        toast.error("A group with this name already exists!");
      } else if (message.includes('Unable to connect') || message.includes('NetworkError') || message.includes('Failed to fetch')) {
        toast.error("Network error – please check if the backend server is running.");
      } else if (message.includes('Validation')) {
        toast.error("Validation failed: " + message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdGroup) return;
    const link = `${window.location.origin}/join/${createdGroup.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay-v2" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="create-group-title">
      <div 
        className="modal-v2" 
        onClick={e => e.stopPropagation()} 
        ref={modalRef}
        style={{ '--accent-color': color } as React.CSSProperties}
      >
        {/* Success Screen */}
        {createdGroup ? (
          <div className="success-screen animate-fade-in">
            <div className="success-icon-wrap" style={{ background: `rgba(var(--lime-rgb), 0.1)`, borderColor: color }}>
              <CheckCircle2 size={56} color="var(--lime)" />
            </div>
            <h2 className="success-title">Group Created!</h2>
            <p className="success-subtitle">
              Your group <strong style={{ color: color }}>{emoji} {createdGroup.name}</strong> is ready to split expenses!
            </p>

            <div className="success-card">
              <div className="invite-label">SHARE INVITE LINK</div>
              <p className="invite-desc">Roommates can use this link to instantly join this group.</p>
              <div className="invite-input-row">
                <input 
                  type="text" 
                  className="invite-input" 
                  readOnly 
                  value={`${window.location.origin}/join/${createdGroup.invite_code}`} 
                />
                <button className="copy-btn" onClick={handleCopyLink} aria-label="Copy invite link">
                  {copied ? <Check size={18} color="var(--lime)" /> : <Copy size={18} />}
                </button>
              </div>
              <div className="invite-code-pill">
                Invite Code: <code>{createdGroup.invite_code}</code>
              </div>
            </div>

            <button 
              className="btn btn-primary w-full py-3 mt-6" 
              onClick={onClose}
              ref={closeButtonRef}
            >
              Done & Open Dashboard
            </button>
          </div>
        ) : (
          /* Create Form */
          <form onSubmit={handleCreateGroupSubmit} className="modal-form">
            <div className="modal-header-v2">
              <div>
                <h2 id="create-group-title" className="modal-title-v2">Create Group</h2>
                <p className="modal-subtitle-v2">Split bills, track groceries & manage chores with roommates.</p>
              </div>
              <button type="button" className="modal-close-v2" onClick={onClose} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="modal-body-v2">
              {/* Template Row */}
              <div className="form-section">
                <label className="section-label"><LayoutGrid size={14} /> Quick Templates</label>
                <div className="template-grid">
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.name} 
                      type="button" 
                      className="template-pill"
                      onClick={() => applyTemplate(t)}
                    >
                      <span>{t.emoji}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Name & Emoji Input */}
              <div className="form-row-grid">
                <div className="form-group flex-2">
                  <label htmlFor="group-name" className="form-label-v2">Group Name *</label>
                  <input 
                    id="group-name"
                    ref={firstInputRef}
                    type="text" 
                    className="form-input-v2" 
                    placeholder="e.g. Flat 302 Bros" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    required
                    maxLength={50}
                  />
                  <div className="form-helper">3-50 characters. Will be trimmed.</div>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="custom-emoji" className="form-label-v2">Group Emoji</label>
                  <div className="emoji-input-wrapper">
                    <span className="current-emoji">{emoji}</span>
                    <input 
                      id="custom-emoji"
                      type="text" 
                      className="form-input-v2 emoji-text-input" 
                      placeholder="Custom" 
                      value={customEmojiInput}
                      maxLength={2}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomEmojiInput(val);
                        if (val) setEmoji(val);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Emoji Grid Selection */}
              <div className="form-section">
                <div className="emoji-grid-section">
                  <div className="emoji-grid-header">
                    <span className="inner-label"><Smile size={13} /> Select Emoji</span>
                    {recentEmojis.length > 0 && <span className="recent-label">Recents:</span>}
                    {recentEmojis.map(re => (
                      <button 
                        key={re} 
                        type="button" 
                        className={`emoji-btn ${emoji === re ? "active" : ""}`}
                        onClick={() => setEmoji(re)}
                      >
                        {re}
                      </button>
                    ))}
                  </div>
                  <div className="emoji-grid">
                    {DEFAULT_EMOJIS.map(e => (
                      <button 
                        key={e} 
                        type="button" 
                        className={`emoji-btn ${emoji === e ? "active" : ""}`}
                        onClick={() => setEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Type, Color & Visibility */}
              <div className="form-row-grid">
                <div className="form-group flex-1">
                  <label htmlFor="group-type" className="form-label-v2">Group Type *</label>
                  <select 
                    id="group-type"
                    className="form-select-v2" 
                    value={type} 
                    onChange={e => setType(e.target.value)}
                  >
                    <option value="flatmates">Flatmates</option>
                    <option value="trip">Trip / Travel</option>
                    <option value="hostel">Hostel</option>
                    <option value="office">Office / Work</option>
                    <option value="friends">Friends</option>
                    <option value="family">Family</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label-v2"><Palette size={14} /> Theme Color</label>
                  <div className="color-palette-grid">
                    {COLORS.map(c => (
                      <button 
                        key={c} 
                        type="button" 
                        className={`color-dot ${color === c ? "active" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Visibility and Description */}
              <div className="form-row-grid">
                <div className="form-group flex-1">
                  <label className="form-label-v2">Group Visibility</label>
                  <div className="visibility-toggle-group">
                    <button 
                      type="button" 
                      className={`toggle-btn ${visibility === "private" ? "active" : ""}`}
                      onClick={() => setVisibility("private")}
                    >
                      <EyeOff size={14} /> Private
                    </button>
                    <button 
                      type="button" 
                      className={`toggle-btn ${visibility === "public" ? "active" : ""}`}
                      onClick={() => setVisibility("public")}
                    >
                      <Eye size={14} /> Public
                    </button>
                  </div>
                  <div className="form-helper">
                    {visibility === "private" ? "Private group. Visible to members only." : "Public group. Anyone can find with invite link."}
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label htmlFor="group-desc" className="form-label-v2">Description</label>
                  <textarea 
                    id="group-desc"
                    className="form-textarea-v2" 
                    placeholder="Short description of the group..." 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {/* Add Roommates */}
              <div className="form-section">
                <div className="section-label-row">
                  <label htmlFor="member-input" className="section-label"><Users size={14} /> Invite Roommates ({members.length - 1} invited)</label>
                  <span className="creator-badge">You ({user?.full_name}) is Admin</span>
                </div>

                {/* Member Chips */}
                <div className="member-chips-container">
                  {members.map((m, index) => {
                    const isYou = index === 0;
                    return (
                      <div 
                        key={index} 
                        className={`member-chip ${m.type === 'registered' ? 'registered' : 'guest'} ${isYou ? 'creator' : ''}`}
                      >
                        <div className="chip-avatar" style={{ backgroundColor: isYou ? color : undefined }}>
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="avatar-img" />
                          ) : (
                            m.full_name[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="chip-details">
                          <span className="chip-name">{isYou ? "You" : m.full_name}</span>
                          {!isYou && (
                            <button 
                              type="button" 
                              className="role-badge" 
                              onClick={() => toggleRole(index)}
                              title="Click to toggle Admin / Member role"
                            >
                              {m.role === 'admin' ? <Shield size={10} /> : <Users size={10} />}
                              <span>{m.role}</span>
                            </button>
                          )}
                        </div>
                        {!isYou && (
                          <button 
                            type="button" 
                            className="chip-remove" 
                            onClick={() => removeMember(index)}
                            aria-label={`Remove ${m.full_name}`}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Input */}
                <div className="add-member-wrapper">
                  <div className="add-member-input-row">
                    <input 
                      id="member-input"
                      type="text" 
                      className="form-input-v2" 
                      placeholder="Search roommates by name or type email..." 
                      value={memberInput} 
                      onChange={e => setMemberInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember(memberInput);
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="btn-add-member"
                      onClick={() => handleAddMember(memberInput)}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="suggestions-dropdown animate-slide-down">
                      {suggestions.map(u => (
                        <button 
                          key={u._id} 
                          type="button" 
                          className="suggestion-row"
                          onClick={() => handleAddMember(u)}
                        >
                          <div className="s-avatar">
                            {u.avatar_url ? <img src={u.avatar_url} alt="" /> : u.full_name[0]?.toUpperCase()}
                          </div>
                          <div className="s-info">
                            <div className="s-name">{u.full_name}</div>
                            <div className="s-email">{u.email}</div>
                          </div>
                          <span className="s-badge">Registered ✓</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searching && <div className="searching-indicator">Searching roommates...</div>}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer-v2">
              <button 
                type="button" 
                className="btn btn-ghost py-3" 
                onClick={onClose} 
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary py-3 flex-1 gap-2" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Creating Group...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Create Group
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Dynamic Modal CSS Styling for Visual WOW and Responsiveness */}
        <style dangerouslySetInnerHTML={{ __html: `
          .modal-overlay-v2 {
            position: fixed;
            inset: 0;
            background: rgba(4, 4, 8, 0.85);
            backdrop-filter: blur(14px);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            animation: overlay-fadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          .modal-v2 {
            background: #111118;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            width: 100%;
            max-width: 580px;
            max-height: 92vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8), 0 0 100px rgba(var(--accent-color), 0.03);
            animation: modal-slideUp 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            transition: border-color 0.3s ease;
          }

          .modal-form {
            display: flex;
            flex-direction: column;
            height: 100%;
            max-height: 92vh;
          }

          .modal-header-v2 {
            padding: 24px 28px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }

          .modal-title-v2 {
            font-family: var(--fd, 'Syne', sans-serif);
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 4px;
          }

          .modal-subtitle-v2 {
            font-size: 13px;
            color: var(--tx2, #8888a0);
            line-height: 1.4;
          }

          .modal-close-v2 {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            color: var(--tx2, #8888a0);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .modal-close-v2:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            transform: rotate(90deg);
          }

          .modal-body-v2 {
            padding: 20px 28px;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .modal-body-v2::-webkit-scrollbar {
            width: 6px;
          }
          .modal-body-v2::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }

          .form-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .section-label {
            font-size: 12.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--tx2, #8888a0);
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .section-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
          }

          .creator-badge {
            font-size: 11px;
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 10px;
            border-radius: 99px;
            color: var(--tx2, #8888a0);
            font-weight: 600;
          }

          .template-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }

          @media (max-width: 480px) {
            .template-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .template-pill {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 12.5px;
            font-weight: 600;
            color: var(--tx, #f0f0f8);
          }

          .template-pill:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: var(--accent-color);
            transform: scale(1.02);
          }

          .form-row-grid {
            display: flex;
            gap: 16px;
            align-items: flex-start;
          }

          @media (max-width: 520px) {
            .form-row-grid {
              flex-direction: column;
              gap: 16px;
            }
            .form-row-grid > div {
              width: 100%;
            }
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .flex-1 { flex: 1; }
          .flex-2 { flex: 2; }

          .form-label-v2 {
            font-size: 13.5px;
            font-weight: 600;
            color: var(--tx, #f0f0f8);
          }

          .form-input-v2, .form-select-v2, .form-textarea-v2 {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 11px 14px;
            color: #ffffff;
            font-size: 14px;
            outline: none;
            transition: all 0.2s ease;
            width: 100%;
          }

          .form-input-v2:focus, .form-select-v2:focus, .form-textarea-v2:focus {
            border-color: var(--accent-color);
            box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);
            background: rgba(255, 255, 255, 0.05);
          }

          .form-helper {
            font-size: 11px;
            color: var(--tx3, #55556a);
            margin-top: 2px;
          }

          .emoji-input-wrapper {
            display: flex;
            align-items: center;
            position: relative;
          }

          .current-emoji {
            font-size: 20px;
            position: absolute;
            left: 12px;
          }

          .emoji-text-input {
            padding-left: 42px !important;
            text-align: center;
            font-weight: 700;
          }

          .emoji-grid-section {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 12px;
          }

          .emoji-grid-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }

          .inner-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--tx3, #55556a);
            margin-right: auto;
          }

          .recent-label {
            font-size: 11px;
            color: var(--tx3, #55556a);
            font-weight: 600;
          }

          .emoji-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 6px;
          }

          @media (max-width: 480px) {
            .emoji-grid {
              grid-template-columns: repeat(6, 1fr);
            }
          }

          .emoji-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 20px;
            aspect-ratio: 1;
            border-radius: 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .emoji-btn:hover {
            background: rgba(255, 255, 255, 0.09);
            transform: scale(1.08);
          }

          .emoji-btn.active {
            background: rgba(var(--accent-rgb), 0.15);
            border-color: var(--accent-color);
            box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.3);
          }

          .color-palette-grid {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            padding: 8px 0;
          }

          .color-dot {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s ease;
          }

          .color-dot:hover {
            transform: scale(1.15);
          }

          .color-dot.active {
            border-color: #ffffff;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
            transform: scale(1.1);
          }

          .visibility-toggle-group {
            display: flex;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 4px;
            width: 100%;
          }

          .toggle-btn {
            flex: 1;
            padding: 8px 12px;
            background: transparent;
            border: none;
            color: var(--tx2, #8888a0);
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
          }

          .toggle-btn.active {
            background: rgba(255, 255, 255, 0.07);
            color: #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          }

          .member-chips-container {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-bottom: 8px;
            max-height: 120px;
            overflow-y: auto;
            padding-right: 4px;
          }

          .member-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 10px 5px 6px;
            border-radius: 99px;
            font-size: 12.5px;
            font-weight: 600;
          }

          .member-chip.guest {
            background: rgba(181, 255, 77, 0.07);
            border: 1px solid rgba(181, 255, 77, 0.18);
            color: var(--lime, #b5ff4d);
          }

          .member-chip.registered {
            background: rgba(61, 232, 208, 0.08);
            border: 1px solid rgba(61, 232, 208, 0.2);
            color: var(--cyan, #3de8d0);
          }

          .member-chip.creator {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ffffff;
          }

          .chip-avatar {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 800;
            color: #ffffff;
            overflow: hidden;
          }

          .avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .chip-details {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .role-badge {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 1.5px 6px;
            border-radius: 99px;
            font-size: 9.5px;
            color: inherit;
            display: flex;
            align-items: center;
            gap: 3px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .role-badge:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .chip-remove {
            background: transparent;
            border: none;
            color: inherit;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.6;
            margin-left: 2px;
          }

          .chip-remove:hover {
            opacity: 1;
          }

          .add-member-wrapper {
            position: relative;
            width: 100%;
          }

          .add-member-input-row {
            display: flex;
            gap: 8px;
          }

          .btn-add-member {
            background: var(--accent-color);
            border: none;
            color: #000000;
            font-weight: 700;
            border-radius: 12px;
            padding: 0 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13.5px;
            transition: all 0.2s ease;
          }

          .btn-add-member:hover {
            filter: brightness(1.15);
            transform: scale(1.02);
          }

          .suggestions-dropdown {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            background: #151520;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 10;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          }

          .suggestion-row {
            width: 100%;
            padding: 10px 14px;
            background: transparent;
            border: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
          }

          .suggestion-row:last-child {
            border-bottom: none;
          }

          .suggestion-row:hover {
            background: rgba(255, 255, 255, 0.04);
          }

          .s-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--accent-color);
            color: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            overflow: hidden;
          }

          .s-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .s-info {
            flex: 1;
          }

          .s-name {
            font-size: 13px;
            font-weight: 600;
            color: #ffffff;
          }

          .s-email {
            font-size: 11px;
            color: var(--tx2, #8888a0);
          }

          .s-badge {
            font-size: 10.5px;
            background: rgba(61, 232, 208, 0.1);
            color: var(--cyan, #3de8d0);
            padding: 3px 8px;
            border-radius: 20px;
            font-weight: 600;
          }

          .searching-indicator {
            font-size: 11.5px;
            color: var(--tx3, #55556a);
            margin-top: 5px;
            margin-left: 4px;
          }

          .modal-footer-v2 {
            padding: 16px 28px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.04);
            display: flex;
            gap: 12px;
          }

          .success-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 28px;
            text-align: center;
          }

          .success-icon-wrap {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            border: 2px dashed rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
            animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }

          .success-title {
            font-family: var(--fd, 'Syne', sans-serif);
            font-size: 28px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
          }

          .success-subtitle {
            font-size: 15px;
            color: var(--tx2, #8888a0);
            max-width: 380px;
            line-height: 1.5;
            margin-bottom: 30px;
          }

          .success-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 24px;
            width: 100%;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
          }

          .invite-label {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: var(--tx3, #55556a);
            margin-bottom: 6px;
          }

          .invite-desc {
            font-size: 12px;
            color: var(--tx2, #8888a0);
            margin-bottom: 16px;
          }

          .invite-input-row {
            display: flex;
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            overflow: hidden;
            align-items: center;
            margin-bottom: 16px;
          }

          .invite-input {
            background: transparent;
            border: none;
            padding: 12px 14px;
            color: var(--lime, #b5ff4d);
            font-size: 13.5px;
            font-family: monospace;
            flex: 1;
            outline: none;
          }

          .copy-btn {
            background: rgba(255, 255, 255, 0.03);
            border: none;
            border-left: 1px solid rgba(255, 255, 255, 0.05);
            width: 46px;
            align-self: stretch;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--tx, #f0f0f8);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .copy-btn:hover {
            background: rgba(255, 255, 255, 0.07);
            color: #ffffff;
          }

          .invite-code-pill {
            display: inline-block;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 6px 16px;
            border-radius: 99px;
            font-size: 12.5px;
            color: var(--tx, #f0f0f8);
          }

          .invite-code-pill code {
            font-family: monospace;
            font-weight: 700;
            color: var(--lime, #b5ff4d);
            margin-left: 4px;
          }

          /* General buttons, spinners, animations */
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-top-color: #ffffff;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            display: inline-block;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @keyframes overlay-fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes modal-slideUp {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.96);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); opacity: 0.8; }
            70% { transform: scale(0.9); opacity: 0.9; }
            100% { transform: scale(1); opacity: 1; }
          }

          .animate-fade-in {
            animation: fadeIn 0.4s ease forwards;
          }

          .animate-slide-down {
            animation: slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* RGB helper variables based on theme color */
          .modal-v2 {
            --accent-rgb: 155, 109, 255;
            --lime-rgb: 181, 255, 77;
          }
        `}} />
      </div>
    </div>
  );
}
