import { createArchive, extractArchive, listArchive, exportBackup, importBackup } from '../../lib/archive'
import type { ArchiveRequest } from '../../lib/archiveTypes'
self.onmessage = async (event: MessageEvent<ArchiveRequest>) => {
  const request = event.data
  try {
    const result = request.action === 'create' ? await createArchive(request.files, request.name)
      : request.action === 'list' ? await listArchive(request.file)
      : request.action === 'extract' ? await extractArchive(request.file, request.selected)
      : request.action === 'export' ? await exportBackup(request.files)
      : await importBackup(request.file)
    self.postMessage({result})
  } catch (error) { self.postMessage({error:error instanceof Error ? error.message : 'Archive processing failed.'}) }
}
