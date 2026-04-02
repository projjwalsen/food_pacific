export function ExportButton({ label = 'Export', variant = 'ghost', onClick }) {
  const className =
    variant === 'primary' ? 'button primary' : variant === 'outline' ? 'button ghost' : 'button ghost'
  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  )
}

