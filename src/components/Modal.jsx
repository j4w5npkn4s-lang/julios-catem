export default function Modal({ id, title, onClose, children, footer, lg }) {
  return (
    <div className="ov" onClick={e => e.target.classList.contains('ov') && onClose?.()}>
      <div className={`modal${lg ? ' modal-lg' : ''}`}>
        <div className="mh">
          <div className="mt2">{title}</div>
          <button className="mx" onClick={onClose}>×</button>
        </div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  )
}
