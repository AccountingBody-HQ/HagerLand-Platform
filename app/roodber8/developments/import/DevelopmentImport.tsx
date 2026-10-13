'use client'

import { CsvImport } from '@/components/admin/CsvImport'
import { importDevelopmentsCsvAction, previewDevelopmentsCsvAction } from '../../actions/developments'

export function DevelopmentImport({ columns }: { columns: readonly string[] }) {
  return (
    <CsvImport
      preview={previewDevelopmentsCsvAction}
      run={importDevelopmentsCsvAction}
      columns={columns}
      publishLabel="Publish imported rows straight away (otherwise they are saved as drafts)"
      renderRow={(r) => (
        <span>
          <strong>{r.name || '(no name)'}</strong> · {r.kind} · {r.locationLabel}
          {r.developerName && <> · {r.developerOrgId ? r.developerName : `${r.developerName} (not found, left blank)`}</>}
        </span>
      )}
    />
  )
}
