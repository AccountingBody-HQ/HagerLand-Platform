'use client'

import { useState } from 'react'
import { FileDrop } from './FileDrop'
import { MediaImage } from './MediaImage'

/** One image (logo or cover) with replace. */
export function SingleImageUpload({ entityType, entityId, kind, currentPath, label, aspect }: { entityType: 'organisation'; entityId: string; kind: 'logo' | 'cover'; currentPath: string | null; label: string; aspect: string }) {
  const [path, setPath] = useState(currentPath)
  return (
    <div className="space-y-3">
      {path && (
        <div className={`relative overflow-hidden rounded-lg border border-border bg-stone-100 ${aspect}`}>
          <MediaImage path={path} alt={label} fill sizes="320px" className="object-cover" />
        </div>
      )}
      <FileDrop
        target={{ purpose: 'media', entity_type: entityType, entity_id: entityId, kind }}
        accept="image/jpeg,image/png,image/webp"
        multiple={false}
        label={path ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        hint="JPEG, PNG or WebP"
        onMediaUploaded={(m) => setPath(kind === 'logo' ? m.thumb_path ?? m.storage_path : m.storage_path)}
      />
    </div>
  )
}
