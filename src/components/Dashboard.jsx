import { useState, useEffect, useCallback } from 'react'
import { getHistory, addToHistory, removeFromHistory } from '../utils/storage.js'
import { extractSheetId } from '../utils/sheetsApi.js'
import SheetTab from './SheetTab.jsx'

export default function Dashboard({ user, accessToken, onLogout, onSessionExpired }) {
  const [history, setHistory] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState('')

  useEffect(() => {
    const h = getHistory()
    setHistory(h)
    if (h.length > 0) setActiveId(h[0].spreadsheetId)
  }, [])

  const refreshHistory = useCallback(() => {
    setHistory(getHistory())
  }, [])

  const handleAdd = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) { setUrlError('Please enter a Google Sheets URL.'); return }

    const id = extractSheetId(trimmed)
    if (!id) { setUrlError('That doesn\'t look like a valid Google Sheets URL.'); return }

    if (history.find(h => h.spreadsheetId === id)) {
      setActiveId(id)
      setUrlInput('')
      setUrlError('')
      return
    }

    const updated = addToHistory(trimmed, id)
    setHistory(updated)
    setActiveId(id)
    setUrlInput('')
    setUrlError('')
  }, [urlInput, history])

  const handleRemove = useCallback((spreadsheetId) => {
    removeFromHistory(spreadsheetId)
    const updated = getHistory()
    setHistory(updated)
    if (activeId === spreadsheetId) {
      setActiveId(updated.length > 0 ? updated[0].spreadsheetId : null)
    }
  }, [activeId])

  const activeSheet = history.find(h => h.spreadsheetId === activeId)

  return (
    <div className="dashboard">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-icon">📊</span>
          <span className="brand-name">Executive Data Extractor</span>
        </div>
        <div className="user-area">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="avatar" referrerPolicy="no-referrer" />
          )}
          <span className="user-name">{user.given_name || user.name}</span>
          <button className="btn-signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="url-bar">
        <div className="url-input-group">
          <input
            type="url"
            className={`url-input ${urlError ? 'url-input--error' : ''}`}
            placeholder="Paste a Google Sheets URL and press Enter or click Add…"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setUrlError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            autoComplete="off"
          />
          <button className="btn-add" onClick={handleAdd}>Add Sheet</button>
        </div>
        {urlError && <p className="url-error">{urlError}</p>}
      </div>

      {history.length === 0 ? (
        <div className="welcome-state">
          <div className="welcome-icon">📋</div>
          <h2>No sheets added yet</h2>
          <p>Paste a Google Sheets URL above to start extracting executive data.</p>
        </div>
      ) : (
        <div className="workspace">
          <div className="tab-rail" role="tablist">
            {history.map(sheet => (
              <button
                key={sheet.spreadsheetId}
                role="tab"
                aria-selected={sheet.spreadsheetId === activeId}
                className={`sheet-tab ${sheet.spreadsheetId === activeId ? 'sheet-tab--active' : ''}`}
                onClick={() => setActiveId(sheet.spreadsheetId)}
                title={sheet.sheetUrl}
              >
                <span className="tab-icon">📄</span>
                <span className="tab-label">
                  {sheet.title || `Sheet …${sheet.spreadsheetId.slice(-6)}`}
                </span>
                <span
                  className="tab-close"
                  role="button"
                  aria-label="Remove sheet"
                  onClick={e => { e.stopPropagation(); handleRemove(sheet.spreadsheetId) }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>

          <div className="tab-panel" role="tabpanel">
            {activeSheet ? (
              <SheetTab
                key={activeSheet.spreadsheetId}
                sheet={activeSheet}
                accessToken={accessToken}
                onTitleUpdate={refreshHistory}
                onSessionExpired={onSessionExpired}
              />
            ) : (
              <div className="welcome-state">
                <p>Select a sheet tab above.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
