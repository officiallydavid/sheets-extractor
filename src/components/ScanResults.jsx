import { rowKey } from '../utils/storage.js'

export default function ScanResults({ results, comparison, isFirstScan }) {
  const newKeySet = new Set((comparison?.newAdditions || []).map(rowKey))
  const isNew = r => newKeySet.has(rowKey(r))

  const totalShown = results.length + (comparison?.missing?.length || 0)

  return (
    <div className="results-container">
      <div className="results-summary">
        <div className="summary-stat">
          <span className="stat-num">{results.length}</span>
          <span className="stat-label">Qualifying</span>
        </div>
        {comparison ? (
          <>
            <div className="summary-stat stat-new">
              <span className="stat-num">{comparison.newAdditions.length}</span>
              <span className="stat-label">New</span>
            </div>
            <div className="summary-stat stat-missing">
              <span className="stat-num">{comparison.missing.length}</span>
              <span className="stat-label">Missing</span>
            </div>
            <div className="summary-stat">
              <span className="stat-num">{results.length - comparison.newAdditions.length}</span>
              <span className="stat-label">Unchanged</span>
            </div>
          </>
        ) : isFirstScan ? (
          <div className="first-scan-badge">First scan — no previous data to compare</div>
        ) : null}
      </div>

      {results.length === 0 && (!comparison || comparison.missing.length === 0) ? (
        <div className="empty-results">
          <span className="empty-icon">🔎</span>
          <p>No rows found with Cal Invite = "Y" or "Y-A" in the first 100 rows.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Company</th>
                <th>Title</th>
                <th>Cal Invite</th>
                {comparison && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => {
                const rowIsNew = comparison ? isNew(row) : false
                return (
                  <tr key={i} className={rowIsNew ? 'row-new' : ''}>
                    <td className="col-num">{i + 1}</td>
                    <td>{row.firstName || <span className="empty-cell">—</span>}</td>
                    <td>{row.lastName || <span className="empty-cell">—</span>}</td>
                    <td>{row.company || <span className="empty-cell">—</span>}</td>
                    <td>{row.title || <span className="empty-cell">—</span>}</td>
                    <td>
                      <span className={`cal-badge ${row.calInvite === 'Y-A' ? 'cal-ya' : 'cal-y'}`}>
                        {row.calInvite}
                      </span>
                    </td>
                    {comparison && (
                      <td>
                        {rowIsNew
                          ? <span className="badge badge-new">New</span>
                          : <span className="badge badge-existing">Existing</span>}
                      </td>
                    )}
                  </tr>
                )
              })}

              {comparison && comparison.missing.length > 0 && (
                <>
                  <tr className="missing-divider">
                    <td colSpan={comparison ? 7 : 6}>
                      <span className="missing-divider-label">
                        ↓ {comparison.missing.length} row{comparison.missing.length !== 1 ? 's' : ''} present in previous scan but missing now
                      </span>
                    </td>
                  </tr>
                  {comparison.missing.map((row, i) => (
                    <tr key={`m-${i}`} className="row-missing">
                      <td className="col-num">—</td>
                      <td>{row.firstName || <span className="empty-cell">—</span>}</td>
                      <td>{row.lastName || <span className="empty-cell">—</span>}</td>
                      <td>{row.company || <span className="empty-cell">—</span>}</td>
                      <td>{row.title || <span className="empty-cell">—</span>}</td>
                      <td>
                        <span className={`cal-badge ${row.calInvite === 'Y-A' ? 'cal-ya' : 'cal-y'}`}>
                          {row.calInvite}
                        </span>
                      </td>
                      <td><span className="badge badge-missing">Missing</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
