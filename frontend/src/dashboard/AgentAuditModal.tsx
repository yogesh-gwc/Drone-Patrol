import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'
import type { AuditEntry } from '../types/agents'

const AGENT_BADGE: Record<string, string> = {
  DRONE_ASSIGNMENT_AGENT: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  INCIDENT_AGENT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  OPERATOR: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  SYSTEM: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
}

export function AgentAuditModal() {
  const open = useAgentStore((state) => state.auditModalOpen)
  const setOpen = useAgentStore((state) => state.setAuditModalOpen)
  const auditLog = useAgentStore((state) => state.auditLog)
  const [filterText, setFilterText] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('ALL')

  if (!open) {
    return null
  }

  const filtered = auditLog.filter((entry: AuditEntry) => {
    const matchesAgent = selectedAgent === 'ALL' || entry.agent === selectedAgent
    const query = filterText.toLowerCase()
    const matchesText =
      !query ||
      entry.headline.toLowerCase().includes(query) ||
      (entry.details && entry.details.toLowerCase().includes(query)) ||
      (entry.relatedEntityId && entry.relatedEntityId.toLowerCase().includes(query)) ||
      entry.type.toLowerCase().includes(query)
    return matchesAgent && matchesText
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base">&#128220;</span>
            <h2 className="text-sm font-semibold tracking-widest text-slate-900 uppercase dark:text-slate-100">
              Agent Decision & Audit Journal
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            &#x2715;
          </button>
        </header>

        {/* Filter bar */}
        <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800/80 dark:bg-slate-900/40">
          <input
            type="text"
            placeholder="Search headline, drone, vehicle or type..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="ALL">All Agents</option>
            <option value="DRONE_ASSIGNMENT_AGENT">Drone Dispatcher</option>
            <option value="INCIDENT_AGENT">Incident Analyst</option>
            <option value="OPERATOR">Operator Actions</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>

        {/* Audit Timeline entries */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No audit events recorded yet.</p>
          ) : (
            filtered.map((entry) => {
              const time = new Date(entry.timestampIso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
              const badgeClass = AGENT_BADGE[entry.agent] || AGENT_BADGE.SYSTEM

              return (
                <div
                  key={entry.id}
                  className="relative flex gap-3 border-l-2 border-slate-200 pl-3 transition-colors dark:border-slate-800 hover:border-indigo-500"
                >
                  <div className="flex-1 rounded border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-sm border px-1.5 py-0.5 text-[8px] font-semibold uppercase ${badgeClass}`}>
                          {entry.agent.replace('_AGENT', '')}
                        </span>
                        <span className="font-mono text-[9px] tracking-wider text-slate-400 uppercase">
                          {entry.type}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{time}</span>
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                      {entry.headline}
                    </p>

                    {entry.details && (
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {entry.details}
                      </p>
                    )}

                    {entry.relatedEntityId && (
                      <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400">
                        <span>Target:</span>
                        <span className="font-mono font-medium text-indigo-600 dark:text-sky-400">
                          {entry.relatedEntityId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
          <span>{filtered.length} audit records</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
