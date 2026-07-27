const HISTORY_KEY = 'ede_history'
const SCANS_KEY = 'ede_scans'

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToHistory(sheetUrl, spreadsheetId) {
  const history = getHistory()
  if (!history.find(h => h.spreadsheetId === spreadsheetId)) {
    history.unshift({ sheetUrl, spreadsheetId, title: null, addedAt: Date.now() })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }
  return getHistory()
}

export function updateHistoryTitle(spreadsheetId, title) {
  const history = getHistory()
  const item = history.find(h => h.spreadsheetId === spreadsheetId)
  if (item && item.title !== title) {
    item.title = title
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    return true
  }
  return false
}

export function removeFromHistory(spreadsheetId) {
  const history = getHistory().filter(h => h.spreadsheetId !== spreadsheetId)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  const scans = getAllScans()
  delete scans[spreadsheetId]
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans))
}

function getAllScans() {
  try {
    return JSON.parse(localStorage.getItem(SCANS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getPreviousScan(spreadsheetId) {
  return getAllScans()[spreadsheetId] || null
}

export function storeScan(spreadsheetId, rows) {
  const scans = getAllScans()
  scans[spreadsheetId] = { rows, scannedAt: Date.now() }
  localStorage.setItem(SCANS_KEY, JSON.stringify(scans))
}

export function rowKey(row) {
  return `${row.firstName}|${row.lastName}|${row.company}`.toLowerCase().trim()
}

export function compareScans(previous, current) {
  const prevKeys = new Set(previous.rows.map(rowKey))
  const currKeys = new Set(current.map(rowKey))
  return {
    newAdditions: current.filter(r => !prevKeys.has(rowKey(r))),
    missing: previous.rows.filter(r => !currKeys.has(rowKey(r))),
  }
}
