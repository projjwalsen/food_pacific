import { Fragment } from 'react'

export function StatementTable({ sections }) {
  return (
    <div className="table-scroll">
      <table className="data-table statement-table">
        <tbody>
          {sections.map((section) => (
            <Fragment key={section.title}>
              <tr className="statement-section-header">
                <td colSpan={3}>{section.title}</td>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.label}>
                  <td className="statement-label">{row.label}</td>
                  <td className="statement-sublabel">{row.sublabel ?? ''}</td>
                  <td className="statement-value">{row.value}</td>
                </tr>
              ))}
              {section.total ? (
                <tr className="statement-section-total">
                  <td className="statement-label">{section.total.label}</td>
                  <td />
                  <td className="statement-value">{section.total.value}</td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
