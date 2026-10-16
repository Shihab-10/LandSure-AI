import { useEffect, useState } from "react";
import {
  Activity, ArrowRight, Bot, Building2, CheckCircle2,
  ChevronRight, CircleHelp, ClipboardCheck, Database,
  FileCheck2, FileSearch, Fingerprint, Globe2, LayoutDashboard,
  LockKeyhole, LogOut, MapPinned, Menu, MessageSquareText,
  Search, Send, ShieldCheck, Sparkles, X
} from "lucide-react";
import {
  DEMO_MODE,
  apiRequest,
  fetchCurrentUser,
  loginUser,
  type AuthUser,
} from "./api";

type Evidence = {
  source_table: string;
  source_record_id: string | number;
  data: Record<string, unknown>;
};

type CopilotResult = {
  status: string;
  topic?: string | null;
  answer: string;
  evidence?: Evidence[];
  parcel_id?: string;
};

type ParcelDetails = {
  parcel_id: string;
  [key: string]: unknown;
};

const DEMO = DEMO_MODE;

const DEMO_EVIDENCE: Evidence[] = [
  {
    source_table: "mutations",
    source_record_id: "DEMO-MUT-01",
    data: {
      mutation_status: "Requires review",
      review_reason: "Sample record — not verified"
    }
  },
  {
    source_table: "survey_records",
    source_record_id: "DEMO-SURVEY-01",
    data: {
      survey_type: "RS",
      record_presence: "Sample only"
    }
  }
];

const navigation = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "explorer", label: "Parcel Explorer", icon: MapPinned },
  { id: "copilot", label: "AI Copilot", icon: Bot },
  { id: "evidence", label: "Evidence Center", icon: FileSearch }
] as const;

type Page = typeof navigation[number]["id"];

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginError, setLoginError] = useState("");
  const [parcelId, setParcelId] = useState("LS-PARCEL-000001");
  const [question, setQuestion] = useState("এই জমির নামজারি অবস্থা কী?");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [parcelDetails, setParcelDetails] = useState<ParcelDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let active = true;
    fetchCurrentUser(token)
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) {
          setToken("");
          setUser(null);
          setError("Your session expired. Please sign in again.");
        }
      });

    return () => { active = false; };
  }, [token]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    setBusy(true);

    try {
      const jwt = await loginUser(username.trim(), password);
      setToken(jwt);
      setUser(await fetchCurrentUser(jwt));
      setPassword("");
      setError("");
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
    setResult(null);
    setParcelDetails(null);
    setError("");
    setLoginError("");
  }

  async function loadParcelDetails() {
    if (DEMO || !token || !parcelId.trim()) return;

    try {
      const data = await apiRequest<{ parcel?: ParcelDetails }>(`/api/v1/parcels/${encodeURIComponent(parcelId.trim())}`, { token });
      setParcelDetails(data.parcel ?? (data as ParcelDetails));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load parcel details.");
    }
  }

  async function askCopilot(event?: React.FormEvent) {
    event?.preventDefault();
    if (!question.trim()) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      if (DEMO) {
        setResult({
          status: "DEMO_ONLY",
          topic: "mutation",
          parcel_id: parcelId,
          answer: "This is a sample interface response. Connect the authenticated backend to retrieve actual synthetic evidence.",
          evidence: DEMO_EVIDENCE
        });
      } else {
        if (!token) throw new Error("Authentication required. Please sign in.");

        const data = await apiRequest<CopilotResult>("/api/v1/copilot/evidence", {
          method: "POST",
          token,
          body: JSON.stringify({
            question: question.trim(),
            parcel_id: parcelId.trim() || null
          })
        });

        setResult(data);
        if (parcelId.trim()) {
          await loadParcelDetails();
        }
      }
      setPage("copilot");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const evidence = result?.evidence || (DEMO ? DEMO_EVIDENCE : []);
  const authenticated = !DEMO && Boolean(token && user);

  if (!authenticated) {
    return (
      <div className="login-screen">
        <div className="login-glow" />
        <form className="login-card" onSubmit={login}>
          <div className="brand large">
            <div className="brand-mark"><Fingerprint size={26}/></div>
            <div>LandSure <span>AI</span></div>
          </div>
          <div className="login-icon"><LockKeyhole size={25}/></div>
          <h1>Welcome back</h1>
          <p>Sign in to access your protected land intelligence workspace.</p>
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required placeholder="Enter username" />
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Enter password" />
          {loginError && <div className="error">{loginError}</div>}
          <button className="primary full" disabled={busy}>
            {busy ? "Signing in..." : "Sign in securely"}
            <ArrowRight size={17}/>
          </button>
          <div className="login-footer">
            <ShieldCheck size={15}/> JWT-protected API access
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Fingerprint size={24}/></div>
          <div>LandSure <span>AI</span><small>LAND INTELLIGENCE</small></div>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {navigation.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileMenu(false); }}>
                <Icon size={19}/>
                {item.label}
                {page === item.id && <ChevronRight size={15} className="nav-arrow"/>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <ShieldCheck size={22}/>
            <strong>Evidence first.</strong>
            <span>Understand land records with transparent sources.</span>
          </div>
          <div className="profile">
            <div className="avatar">{user?.username.slice(0, 2).toUpperCase() || "LS"}</div>
            <div className="profile-name">
              <strong>{user?.username || "Workspace User"}</strong>
              <span>{user?.role ? `${user.role} access` : "Authenticated session"}</span>
            </div>
            <button title="Log out" className="icon-button" onClick={logout}><LogOut size={17}/></button>
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />
      )}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open navigation"><Menu size={22}/></button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={15}/>
            <strong>{navigation.find(n => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className={`environment ${DEMO ? "demo" : ""}`}>
              <span className="status-dot"/>
              {DEMO ? "Demo Mode" : `API Connected · ${user?.role ?? "user"}`}
            </span>
            <div className="top-avatar">{user?.username.slice(0, 2).toUpperCase() || "LS"}</div>
          </div>
        </header>

        <div className="page-content">
          {page === "dashboard" && (
            <>
              <div className="eyebrow"><Sparkles size={15}/> SMART LAND INTELLIGENCE</div>
              <div className="page-heading">
                <div>
                  <h1>Land intelligence, <span>made clear.</span></h1>
                  <p>Explore parcel records, review evidence and ask better questions.</p>
                </div>
                <button className="primary" onClick={() => setPage("explorer")}>
                  Explore a parcel <ArrowRight size={17}/>
                </button>
              </div>

              <div className="hero">
                <div className="hero-content">
                  <div className="hero-label"><ShieldCheck size={15}/> EVIDENCE-DRIVEN VERIFICATION</div>
                  <h2>Know the records.<br/><span>Understand the risks.</span></h2>
                  <p>Bring survey, mutation and document evidence together in one transparent workspace.</p>
                  <button className="hero-button" onClick={() => setPage("copilot")}>
                    Ask LandSure Copilot <ArrowRight size={17}/>
                  </button>
                </div>
                <div className="hero-art">
                  <div className="orbit orbit-one"/>
                  <div className="orbit orbit-two"/>
                  <div className="hero-symbol"><Fingerprint size={88} strokeWidth={1.1}/></div>
                  <div className="floating-pill"><CheckCircle2 size={16}/> Evidence linked</div>
                </div>
              </div>

              <div className="stats-grid">
                {[
                  { label: "Data environment", value: "Synthetic", icon: Database, note: "Development dataset" },
                  { label: "Protected API", value: DEMO ? "Not connected" : "Connected", icon: LockKeyhole, note: "JWT-based access" },
                  { label: "Evidence sources", value: "SQLite", icon: FileCheck2, note: "Read-only retrieval" },
                  { label: "Verification status", value: "Prototype", icon: Activity, note: "Not legal certification" }
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div className="stat-card" key={stat.label}>
                      <div className="stat-top">
                        <span>{stat.label}</span>
                        <div className="stat-icon"><Icon size={19}/></div>
                      </div>
                      <strong>{stat.value}</strong>
                      <small>{stat.note}</small>
                    </div>
                  );
                })}
              </div>

              <div className="section-heading">
                <div>
                  <h2>Quick actions</h2>
                  <p>Start with the tools you need.</p>
                </div>
              </div>

              <div className="actions-grid">
                {[
                  { title: "Parcel Explorer", desc: "Search a parcel and examine its records.", icon: MapPinned, target: "explorer" as Page },
                  { title: "AI Copilot", desc: "Ask land questions and receive source-linked results.", icon: Bot, target: "copilot" as Page },
                  { title: "Evidence Center", desc: "Review the evidence returned by your latest query.", icon: ClipboardCheck, target: "evidence" as Page }
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <button className="action-card" key={action.title} onClick={() => setPage(action.target)}>
                      <div className="action-icon"><Icon size={22}/></div>
                      <strong>{action.title}</strong>
                      <p>{action.desc}</p>
                      <span>Open tool <ArrowRight size={15}/></span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {page === "explorer" && (
            <>
              <div className="eyebrow"><MapPinned size={15}/> PARCEL EXPLORER</div>
              <div className="page-heading">
                <div>
                  <h1>Explore a <span>parcel.</span></h1>
                  <p>Enter a synthetic parcel ID to retrieve evidence through the Copilot API.</p>
                </div>
              </div>

              <div className="panel">
                <div className="panel-title"><Search size={19}/> Parcel lookup</div>
                <label>Parcel ID</label>
                <div className="search-row">
                  <input value={parcelId} onChange={e => setParcelId(e.target.value)} placeholder="LS-PARCEL-000001" />
                  <button className="primary" disabled={busy} onClick={() => { void loadParcelDetails(); void askCopilot(); }}>
                    {busy ? "Searching..." : "Search records"} <ArrowRight size={17}/>
                  </button>
                </div>
                <p className="helper">{DEMO ? "Demo mode: results are illustrative, not fetched from the database." : "Requests use your authenticated backend session."}</p>
              </div>

              {parcelDetails && (
                <div className="panel evidence-detail">
                  <div className="evidence-detail-top">
                    <div className="action-icon"><Database size={20}/></div>
                    <span>PARCEL RECORD</span>
                  </div>
                  <h3>{String(parcelDetails.parcel_id)}</h3>
                  <div className="record-data">
                    {Object.entries(parcelDetails).map(([key, value]) => (
                      <div className="record-row" key={key}>
                        <span>{key.replaceAll("_", " ")}</span>
                        <strong>{value === null ? "Not available" : String(value)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="info-grid">
                <div className="mini-panel"><Globe2 size={25}/><h3>Cross-survey records</h3><p>Ask about khatian, dag and survey comparisons.</p></div>
                <div className="mini-panel"><Building2 size={25}/><h3>Mutation records</h3><p>Inspect mutation evidence and reported status.</p></div>
                <div className="mini-panel"><FileCheck2 size={25}/><h3>Document records</h3><p>Review document metadata with traceable sources.</p></div>
              </div>
            </>
          )}

          {page === "copilot" && (
            <>
              <div className="eyebrow"><Bot size={15}/> LAND INTELLIGENCE ASSISTANT</div>
              <div className="page-heading">
                <div>
                  <h1>Ask LandSure <span>Copilot.</span></h1>
                  <p>Ask in Bangla, English or Banglish. Answers are limited to available evidence.</p>
                </div>
              </div>

              <div className="chat-layout">
                <div className="panel chat-panel">
                  <div className="chat-heading">
                    <div className="assistant-avatar"><Bot size={23}/></div>
                    <div>
                      <strong>LandSure Copilot</strong>
                      <span>Evidence-linked assistant · Prototype</span>
                    </div>
                  </div>

                  <div className="chat-body">
                    <div className="chat-intro">
                      <div className="chat-intro-icon"><Sparkles size={27}/></div>
                      <h3>What would you like to know?</h3>
                      <p>Try asking about mutation, khatian, survey records or documents.</p>
                    </div>

                    {result && (
                      <div className="response-card">
                        <div className="response-heading">
                          <Bot size={18}/>
                          <strong>Copilot response</strong>
                          <span className="response-status">{result.status}</span>
                        </div>
                        <p>{result.answer}</p>
                        <div className="response-meta">
                          <span><Database size={14}/> {result.evidence?.length || 0} evidence records</span>
                          <span><ShieldCheck size={14}/> Not legal certification</span>
                        </div>
                      </div>
                    )}

                    {error && <div className="error">{error}</div>}
                  </div>

                  <form className="chat-form" onSubmit={askCopilot}>
                    <div className="chat-input-row">
                      <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question about your land..." maxLength={500} />
                      <button className="send-button" disabled={busy || !question.trim()} title="Send question"><Send size={19}/></button>
                    </div>
                    <div className="chat-form-footer">
                      <span>Parcel: {parcelId || "Not selected"}</span>
                      <span>Answers require source verification</span>
                    </div>
                  </form>
                </div>

                <div className="panel side-panel">
                  <div className="panel-title"><FileSearch size={19}/> Linked evidence</div>
                  {result?.evidence?.length ? (
                    result.evidence.map((item, index) => (
                      <div className="evidence-item" key={`${item.source_table}-${index}`}>
                        <div className="evidence-icon"><FileCheck2 size={18}/></div>
                        <div>
                          <strong>{item.source_table}</strong>
                          <span>Record: {String(item.source_record_id)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-evidence">
                      <CircleHelp size={32}/>
                      <strong>No query evidence yet</strong>
                      <p>Run a question to see the linked database records.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {page === "evidence" && (
            <>
              <div className="eyebrow"><FileSearch size={15}/> EVIDENCE CENTER</div>
              <div className="page-heading">
                <div>
                  <h1>Evidence <span>center.</span></h1>
                  <p>Inspect source records from your latest Copilot query.</p>
                </div>
              </div>

              {DEMO && <div className="demo-banner"><CircleHelp size={18}/> Showing sample records. No live database verification.</div>}

              {evidence.length === 0 ? (
                <div className="panel empty-state">
                  <FileSearch size={40}/>
                  <h3>No evidence loaded</h3>
                  <p>Ask Copilot about a parcel to retrieve evidence.</p>
                  <button className="primary" onClick={() => setPage("copilot")}>
                    Open Copilot <ArrowRight size={17}/>
                  </button>
                </div>
              ) : (
                <div className="evidence-grid">
                  {evidence.map((item, index) => (
                    <div className="panel evidence-detail" key={`${item.source_table}-${index}`}>
                      <div className="evidence-detail-top">
                        <div className="action-icon"><Database size={20}/></div>
                        <span>DATABASE EVIDENCE</span>
                      </div>
                      <h3>{item.source_table}</h3>
                      <p>Record ID: {String(item.source_record_id)}</p>
                      <div className="record-data">
                        {Object.entries(item.data).map(([key, value]) => (
                          <div className="record-row" key={key}>
                            <span>{key.replaceAll("_", " ")}</span>
                            <strong>{value === null ? "Not available" : String(value)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <footer className="footer">
            <span>© 2026 LandSure AI · Synthetic-data prototype</span>
            <span><ShieldCheck size={14}/> Not an official land record or legal opinion</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;

