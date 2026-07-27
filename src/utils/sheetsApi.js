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

  // Encode sheet name for the range — wrap in single quotes if it contains spaces
  const sheetLabel = firstSheetTitle.includes(' ') ? `'${firstSheetTitle}'` : firstSheetTitle
  const range = encodeURIComponent(`${sheetLabel}!1:101`)

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

  const dataRows = rows.slice(1, 101) // top 100 data rows
  const qualifying = []

  for (const row of dataRows) {
    const calVal = (row[calInviteIdx] || '').toString().trim().toUpperCase()
    if (calVal === 'Y' || calVal === 'Y-A') {
      qualifying.push({
        firstName: (row[firstNameIdx] || '').toString().trim(),
        lastName: (row[lastNameIdx] || '').toString().trim(),
        company: (row[companyIdx] || '').toString().trim(),
        title: (row[titleIdx] || '').toString().trim(),
        calInvite: calVal,
      })
    }
  }

  return qualifying
}
