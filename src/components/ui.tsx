import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { Check, Copy, Download, Info, X, CircleAlert } from 'lucide-react'
import { downloadFile } from '../workspace/workspaceUtils'

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  return (
    <button type="button" className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
const ToastContext = createContext<(message: string) => void>(() => undefined)
export const useToast = () => useContext(ToastContext)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  function notify(value: string) {
    if (timer.current) clearTimeout(timer.current)
    setMessage(value)
    timer.current = setTimeout(() => setMessage(''), 2800)
  }
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className={`toast ${message ? 'visible' : ''}`} role="status" aria-live="polite">
        {message && (
          <>
            <Check size={16} />
            {message}
          </>
        )}
      </div>
    </ToastContext.Provider>
  )
}
export async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
}
export function CopyButton({
  text,
  label = 'Copy',
  visibleLabel,
  disabled = false,
  iconOnly = false,
}: {
  text: string
  label?: string
  visibleLabel?: string
  disabled?: boolean
  iconOnly?: boolean
}) {
  const toast = useToast()
  return (
    <Button
      disabled={disabled || !text}
      aria-label={label}
      onClick={() => {
        void copyText(text)
          .then(() => toast('Copied to clipboard'))
          .catch(() => toast('Clipboard unavailable. Select and copy the output manually.'))
      }}
    >
      <Copy size={15} />
      {!iconOnly && (visibleLabel ?? label)}
    </Button>
  )
}
export function DownloadButton({
  text,
  filename,
  mimeType = 'application/json;charset=utf-8',
}: {
  text: string
  filename: string
  mimeType?: string
}) {
  const toast = useToast()
  return (
    <Button
      disabled={!text}
      onClick={() => {
        try {
          downloadFile({ name: filename, blob: new Blob([text], { type: mimeType }) })
          toast('Download started')
        } catch {
          toast('The download could not start. Please retry.')
        }
      }}
    >
      <Download size={15} />
      Download
    </Button>
  )
}
export function Message({
  children,
  kind = 'info',
}: {
  children: ReactNode
  kind?: 'info' | 'error' | 'success' | 'warning'
}) {
  return (
    <div className={`message message-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'error' ? <CircleAlert size={17} /> : <Info size={17} />}
      <div>{children}</div>
    </div>
  )
}
export function Editor({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  actions,
  minHeight = 270,
}: {
  label: string
  value: string
  onChange?: (text: string) => void
  placeholder?: string
  readOnly?: boolean
  actions?: ReactNode
  minHeight?: number
}) {
  return (
    <section className="editor">
      <div className="editor-heading">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {actions}
          {readOnly && <span className="tiny-label">READ ONLY</span>}
        </div>
      </div>
      <textarea
        aria-label={label}
        style={{ minHeight }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
      <div className="editor-footer">
        <span>{value.length.toLocaleString()} characters</span>
        <span>{value ? value.split('\n').length : 0} lines</span>
      </div>
    </section>
  )
}
let modalScrollLocks = 0
let overflowBeforeModals = ''

export function Modal({
  open,
  onClose,
  title,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && dialog && !dialog.open) dialog.showModal()
    if (!open && dialog?.open) dialog.close()
    if (!open) return
    // Overlapping dialogs may close or unmount in either order during navigation.
    if (modalScrollLocks === 0) overflowBeforeModals = document.body.style.overflow
    modalScrollLocks++
    document.body.style.overflow = 'hidden'
    return () => {
      modalScrollLocks--
      if (modalScrollLocks === 0) document.body.style.overflow = overflowBeforeModals
    }
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = focusable[0]
        const last = focusable.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <X size={19} />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
