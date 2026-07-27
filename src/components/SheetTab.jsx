import { useState, useEffect, useCallback } from 'react'
import { fetchSheetData, extractQualifyingRows } from '../utils/sheetsApi.js'
import { getPreviousScan, storeScan, compareScans, updateHistoryTitle, rowKey } from '../utils/storage.js'
import ScanResults from './ScanResults.jsx'

export default function SheetTab({ sheet, accessToken, onTitleUpdate, onSessionExpired }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [isFirstScan, setIsFirstScan] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  // Load previous results on mount
  useEffect(() => {
    const prev = getPreviousScan(sheet.spreadsheetId)
    if (prev) {
      setResults(prev.rows)
      setLastScan(prev.scannedAt)
    }
  }, [sheet.spreadsheetId])

  const handleScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    setComparison(null)

    try {
      const previous = getPreviousScan(sheet.spreadsheetId)
      const { rows: rawRows, spreadsheetTitle } = await fetchSheetData(sheet.spreadsheetId, accessToken)
      const qualifying = extractQualifyingRows(rawRows)

      if (spreadsheetTitle && updateHistoryTitle(sheet.spreadsheetId, spreadsheetTitle)) {
        onTitleUpdate()
      }

      if (previous) {
        setIsFirstScan(false)
        setComparison(compareScans(previous, qualifying))
      } else {
        setIsFirstScan(true)
      }

      storeScan(sheet.spreadsheetId, qualifying)
      setResults(qualifying)
      setLastScan(Date.now())
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        onSessionExpired()
        return
      }
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }, [sheet.spreadsheetId, accessToken, onTitleUpdate, onSessionExpired])

  const handleDownload = useCallback(() => {
    if (!results) return

    const newKeySet = new Set((comparison?.newAdditions || []).map(rowKey))
    const withComparison = !!comparison

    const headerCols = ['First Name', 'Last Name', 'Company', 'Title', 'Cal Invite']
    if (withComparison) headerCols.push('Status')

    const escape = v => `"${(v || '').replace(/"/g, '""')}"`

    const dataRows = results.map(row => {
      const status = withComparison
        ? (newKeySet.has(rowKey(row)) ? 'New' : 'Existing')
        : undefined
      const cells = [row.firstName, row.lastName, row.company, row.title, row.calInvite]
      if (withComparison) cells.push(status)
      return cells.map(escape).join(',')
    })

    if (comparison?.missing?.length) {
      comparison.missing.forEach(row => {
        const cells = [row.firstName, row.lastName, row.company, row.title, row.calInvite, 'Missing']
        dataRows.push(cells.map(escape).join(','))
      })
    }

    const csv = [headerCols.join(','), ...dataRows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateStr = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `exec-scan-${sheet.spreadsheetId.slice(0, 8)}-${dateStr}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [results, comparison, sheet.spreadsheetId])

  const hasResults = results !== null
  const hasData = hasResults && results.length > 0

  return (
    <div className="sheet-content">
      <div className="sheet-header">
        <div className="sheet-url-row">
          <span className="sheet-url-label">Sheet URL</span>
          <a
            href={sheet.sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sheet-url-link"
            title={sheet.sheetUrl}
          >
            {sheet.sheetUrl.length > 72 ? sheet.sheetUrl.slice(0, 72) + '…' : sheet.sheetUrl}
          </a>
        </div>
        {lastScan && (
          <div className="last-scan-meta">
            Last scanned: <strong>{new Date(lastScan).toLocaleString()}</strong>
          </div>
        )}
      </div>

      <div className="action-bar">
        <button
          className={`btn-scan ${scanning ? 'btn-loading' : ''}`}
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <><span className="spinner" aria-hidden="true" /> Scanning…</>
          ) : (
            <><span className="btn-icon">🔍</span> Scan Sheet</>
          )}
        </button>

        <button
          className="btn-download"
          onClick={handleDownload}
          disabled={!hasData}
          title={!hasData ? 'Run a scan first' : 'Download results as CSV'}
        >
          <span className="btn-icon">⬇</span> Download CSV
        </button>
      </div>

      {error && (
        <div className="error-box" role="alert">
          <span className="error-icon">⚠️</span>
          <div>
            <strong>Scan failed:</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!scanning && hasResults && (
        <ScanResults
          results={results}
          comparison={comparison}
          isFirstScan={isFirstScan}
        />
      )}

      {!scanning && !hasResults && !error && (
        <div className="idle-state">
          <div className="idle-icon">📋</div>
          <p>Click <strong>Scan Sheet</strong> to extract executives with Cal Invite = Y or Y-A from the first 100 rows.</p>
        </div>
      )}
    </div>
  )
}
