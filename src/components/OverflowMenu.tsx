import { useEffect, useId, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './ui'
import { createPortal } from 'react-dom'

export default function OverflowMenu({
  label,
  disabled,
  items,
}: {
  label: string
  disabled?: boolean
  items: { label: string; name?: string; action: () => void | Promise<void>; danger?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const id = useId()
  function close(restore = true) {
    setOpen(false)
    if (restore)
      requestAnimationFrame(() => {
        const target = trigger.current?.isConnected
          ? trigger.current
          : document.getElementById('workspace-results')
        target?.focus()
      })
  }
  useEffect(() => {
    if (!open) return
    const element = menu.current!
    const rect = trigger.current!.getBoundingClientRect()
    element.style.left = `${Math.max(8, Math.min(rect.right - element.offsetWidth, innerWidth - element.offsetWidth - 8))}px`
    element.style.top = `${Math.max(8, Math.min(rect.bottom + 4, innerHeight - element.offsetHeight - 8))}px`
    element.querySelector('button')?.focus()
    function outside(event: PointerEvent) {
      if (
        !element.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    const hide = () => setOpen(false)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', hide)
    }
  }, [open])
  return (
    <div className="overflow-actions">
      <button
        ref={trigger}
        type="button"
        className="button button-ghost"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={20} />
      </button>
      {open &&
        createPortal(
          <div
            className="overflow-menu"
            id={id}
            ref={menu}
            role="menu"
            aria-label={label}
            onKeyDown={(event) => {
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
              )
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                close()
              }
              if (event.key === 'Tab') {
                event.preventDefault()
                // The menu is portalled; keep Tab in the file card's document order.
                const candidates = Array.from(
                  document.querySelectorAll<HTMLElement>(
                    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
                  ),
                ).filter(
                  (element) =>
                    element.getClientRects().length && !event.currentTarget.contains(element),
                )
                const index = candidates.indexOf(trigger.current!)
                const next = candidates[index + (event.shiftKey ? -1 : 1)] ?? trigger.current
                close(false)
                requestAnimationFrame(() => next?.focus())
              }
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault()
                buttons[
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? buttons.length - 1
                      : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                        buttons.length
                ]?.focus()
              }
            }}
          >
            {items.map((item) => (
              <Button
                role="menuitem"
                aria-label={item.name ?? item.label}
                tabIndex={-1}
                key={item.label}
                disabled={busy}
                variant={item.danger ? 'danger' : 'ghost'}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await item.action()
                  } finally {
                    setBusy(false)
                    close()
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
