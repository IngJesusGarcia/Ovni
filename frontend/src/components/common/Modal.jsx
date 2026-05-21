export default function Modal({ isOpen, onClose, title, children, width }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={width ? { minWidth: width } : {}} onClick={e => e.stopPropagation()}>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}
