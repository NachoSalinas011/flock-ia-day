import { AlertTriangle, CheckCircle2, ClipboardPaste, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { ErrorBanner, Spinner } from '../../components/Feedback'
import { Modal } from '../../components/Modal'
import { useCreateTextSource, useDeleteSource, useSources, useSourceText, useUploadSources } from '../../hooks/useSources'
import type { Source } from '../../lib/types'

const ACCEPT = '.md,.markdown,.txt,.pdf,.docx'

export function SourcesPanel({ notebookId, readOnly }: { notebookId: string; readOnly?: boolean }) {
  const { data: sources, isLoading, error } = useSources(notebookId)
  const upload = useUploadSources(notebookId)
  const remove = useDeleteSource(notebookId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const onFiles = (files: FileList | null) => {
    if (files?.length) upload.mutate(Array.from(files))
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    onFiles(e.dataTransfer.files)
  }

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[14px] font-extrabold text-text">Fuentes</h2>
        <span className="pill text-mono">{sources?.length ?? 0}</span>
      </div>

      {!readOnly && (
        <div className="flex flex-col gap-2 p-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors"
            style={{
              borderColor: dragging ? 'var(--brand)' : 'var(--border-strong)',
              background: dragging ? 'var(--brand-soft)' : 'var(--surface)',
            }}
          >
            {upload.isPending ? <Loader2 size={20} className="animate-spin text-brand" /> : <Upload size={20} className="text-brand" />}
            <div className="text-[13px] font-semibold text-text">Arrastrá o hacé clic para subir</div>
            <div className="text-[11.5px] text-text-faint">PDF, DOCX, Markdown o TXT</div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                onFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          <button type="button" className="btn btn-small justify-center" onClick={() => setPasting(true)}>
            <ClipboardPaste size={14} /> Pegar texto
          </button>
          <ErrorBanner error={upload.error} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading && <Spinner label="Cargando fuentes…" />}
        <ErrorBanner error={error} />
        {sources?.length === 0 && (
          <p className="px-1 py-4 text-center text-[13px] text-text-faint">
            Subí el brief, minutas, transcripciones o cualquier documento del cliente.
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {sources?.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              readOnly={readOnly}
              onOpen={() => source.status === 'READY' && setViewing(source.id)}
              onDelete={() => remove.mutate(source.id)}
            />
          ))}
        </ul>
      </div>

      {pasting && <PasteTextModal notebookId={notebookId} onClose={() => setPasting(false)} />}
      {viewing && <SourceTextModal sourceId={viewing} onClose={() => setViewing(null)} />}
    </aside>
  )
}

function SourceItem({
  source,
  readOnly,
  onOpen,
  onDelete,
}: {
  source: Source
  readOnly?: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const processing = source.status === 'PENDING' || source.status === 'PROCESSING'
  return (
    <li className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface">
      <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" onClick={onOpen}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <FileText size={15} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-text" title={source.filename}>
            {source.filename}
          </span>
          <span className="flex items-center gap-1 text-[11.5px] text-text-faint">
            {processing && (
              <>
                <Loader2 size={11} className="animate-spin" /> Procesando…
              </>
            )}
            {source.status === 'READY' && (
              <>
                <CheckCircle2 size={11} style={{ color: 'var(--state-done-fg)' }} /> {source.chunksCount} fragmentos
              </>
            )}
            {source.status === 'ERROR' && (
              <span className="flex items-center gap-1" style={{ color: 'var(--state-blocked-fg)' }} title={source.errorMessage ?? ''}>
                <AlertTriangle size={11} /> Error
              </span>
            )}
          </span>
        </span>
      </button>
      {!readOnly && (
        <button type="button" className="btn btn-icon opacity-0 group-hover:opacity-100" onClick={onDelete} aria-label="Eliminar fuente">
          <Trash2 size={14} />
        </button>
      )}
    </li>
  )
}

function PasteTextModal({ notebookId, onClose }: { notebookId: string; onClose: () => void }) {
  const create = useCreateTextSource(notebookId)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  return (
    <Modal
      title="Pegar texto como fuente"
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!title.trim() || !content.trim() || create.isPending}
            onClick={() => create.mutate({ title: title.trim(), content }, { onSuccess: onClose })}
          >
            Agregar fuente
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Título</span>
        <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notas de la llamada" />
      </label>
      <label className="field">
        <span className="field-label">Contenido</span>
        <textarea className="input min-h-[260px]" value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <ErrorBanner error={create.error} />
    </Modal>
  )
}

function SourceTextModal({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const { data, isLoading } = useSourceText(sourceId)
  return (
    <Modal title={data?.filename ?? 'Fuente'} onClose={onClose} wide>
      {isLoading ? <Spinner label="Cargando…" /> : <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-text-soft">{data?.text}</pre>}
    </Modal>
  )
}
