export function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

function findColumnIndex(headers, candidates) {
  const lower = headers.map(h => (h || '').toString().toLowerCase().trim())
  for (const name of candidates) {
    const idx = lower.indexOf(name.toLowerCase())
    if (idx !== -1) return idx
  }
  // Partial match fallback
  for (const name of candidates) {
    const idx = lower.findIndex(h => h.includes(name.toLowerCase()))
    if (idx !== -1) return idx
  }
  return -1
}

export async function fetchSheetData(spreadsheetId, accessToken) {
  const infoRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!infoRes.ok) {
    if (infoRes.status === 401) {
      throw new Error('SESSION_EXPIRED')
    }
    if (infoRes.status === 403) {
      throw new Error('Access denied. Make sure this Google Sheet is shared with your Google account.')
    }
    if (infoRes.status === 404) {
      throw new Error('Spreadsheet not found. Please check the URL and try again.')
    }
    const body = await infoRes.json().catch(() => ({}))
    throw new Error(body.error?.message || `Failed to access spreadsheet (${infoRes.status})`)
  }

  const info = await infoRes.json()
  const spreadsheetTitle = info.properties?.title || 'Untitled Sheet'
  const firstSheetTitle = info.sheets?.[0]?.properties?.title || 'Sheet1'

  // Fetch a generous range so empty rows within the sheet don't cause us to
  // fall short of 100 real data rows. The extractor enforces the 100-row cap.
  const sheetLabel = firstSheetTitle.includes(' ') ? `'${firstSheetTitle}'` : firstSheetTitle
  const range = encodeURIComponent(`${sheetLabel}!1:300`)

  const dataRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!dataRes.ok) {
    if (dataRes.status === 401) throw new Error('SESSION_EXPIRED')
    const body = await dataRes.json().catch(() => ({}))
    throw new Error(body.error?.message || `Failed to fetch sheet data (${dataRes.status})`)
  }

  const data = await dataRes.json()
  return { rows: data.values || [], spreadsheetTitle }
}

export function extractQualifyingRows(rows) {
  if (!rows || rows.length < 2) {
    throw new Error('The sheet appears to be empty or contains no data rows.')
  }

  const headers = rows[0]

  const calInviteIdx = findColumnIndex(headers, ['cal invite', 'cal_invite', 'calinvite', 'calendar invite', 'calendar_invite'])
  if (calInviteIdx === -1) {
    throw new Error(
      `Could not find a "Cal Invite" column. Found headers: ${headers.slice(0, 10).join(', ')}`
    )
  }

  const firstNameIdx = findColumnIndex(headers, ['first name', 'firstname', 'first_name', 'given name', 'fname'])
  const lastNameIdx = findColumnIndex(headers, ['last name', 'lastname', 'last_name', 'family name', 'surname', 'lname'])
  const companyIdx = findColumnIndex(headers, ['company name', 'company', 'organization', 'org', 'account name', 'account'])
  const titleIdx = findColumnIndex(headers, ['title', 'job title', 'job_title', 'position', 'role', 'jobtitle'])

  const missing = []
  if (firstNameIdx === -1) missing.push('First Name')
  if (lastNameIdx === -1) missing.push('Last Name')
  if (companyIdx === -1) missing.push('Company')
  if (titleIdx === -1) missing.push('Title')

  if (missing.length > 0) {
    throw new Error(
      `Could not find column(s): ${missing.join(', ')}. Found headers: ${headers.slice(0, 15).join(', ')}`
    )
  }

  // Walk rows after the header, counting only non-empty rows toward the 100-row cap.
  // The Sheets API omits completely blank rows from the values array, so a simple
  // slice(1, 101) would silently under-count whenever gaps exist in the sheet.
  const qualifying = []
  let dataRowCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]

    // A row is "empty" if it has no cells or every cell is blank
    const isEmpty = !row || row.length === 0 || row.every(c => (c == null || c.toString().trim() === ''))
    if (isEmpty) continue

    dataRowCount++
    if (dataRowCount > 100) break

    // Normalise: remove ALL whitespace so "Y - A" (spaces around dash) becomes "Y-A"
    const rawCal = (row[calInviteIdx] == null ? '' : row[calInviteIdx]).toString().replace(/\s+/g, '').toUpperCase()
    if (rawCal === 'Y' || rawCal === 'Y-A') {
      qualifying.push({
        firstName: (row[firstNameIdx] == null ? '' : row[firstNameIdx]).toString().trim(),
        lastName:  (row[lastNameIdx]  == null ? '' : row[lastNameIdx]).toString().trim(),
        company:   (row[companyIdx]   == null ? '' : row[companyIdx]).toString().trim(),
        title:     (row[titleIdx]     == null ? '' : row[titleIdx]).toString().trim(),
        calInvite: rawCal,
      })
    }
  }

  return qualifying
}
