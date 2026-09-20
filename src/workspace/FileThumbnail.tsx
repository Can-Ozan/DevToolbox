import { useEffect, useRef, useState } from 'react'
import { File, Image } from 'lucide-react'
import { imageDimensions, processImage } from '../lib/imageFiles'
import { workspace } from './workspaceStore'
import { IMAGE_TYPES } from './workspaceUtils'
import { useObjectURL } from './FileControls'
import type { WorkspaceFileInfo } from './workspaceTypes'

export default function FileThumbnail({ file }: { file: WorkspaceFileInfo }) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [thumbnail, setThumbnail] = useState<Blob>()
  const url = useObjectURL(thumbnail)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    if (host.current) observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    setThumbnail(undefined)
    if (!visible || !IMAGE_TYPES.includes(file.mimeType)) return
    const controller = new AbortController()
    void workspace
      .get(file.id)
      .then(async ({ blob }) => {
        const dimensions = await imageDimensions(blob)
        controller.signal.throwIfAborted()
        const scale = Math.min(1, 320 / Math.max(dimensions.width, dimensions.height))
        const small = await processImage(
          blob,
          {
            width: Math.max(1, Math.round(dimensions.width * scale)),
            height: Math.max(1, Math.round(dimensions.height * scale)),
            format: 'image/png',
            quality: 0.8,
            background: '#ffffff',
            rotation: 0,
            flipX: false,
            flipY: false,
          },
          controller.signal,
        )
        if (!controller.signal.aborted) setThumbnail(small)
      })
      .catch(() => {
        /* Metadata and explicit preview remain available for damaged files. */
      })
    return () => controller.abort()
  }, [file.id, file.mimeType, visible])
  return (
    <div ref={host} className="file-thumbnail" aria-hidden="true">
      {url ? (
        <img src={url} alt="" />
      ) : IMAGE_TYPES.includes(file.mimeType) ? (
        <Image size={30} />
      ) : (
        <File size={30} />
      )}
    </div>
  )
}
