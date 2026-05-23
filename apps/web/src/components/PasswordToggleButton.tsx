import { Eye, EyeOff } from "lucide-react";

interface PasswordToggleButtonProps {
  readonly show: boolean;
  readonly onToggle: () => void;
}

const btnStyle: React.CSSProperties = {
  position: 'absolute',
  right: '0',
  top: '12px',
  background: 'transparent',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.6)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  zIndex: 10,
  outline: 'none',
};

export default function PasswordToggleButton({ show, onToggle }: PasswordToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={btnStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      aria-label={show ? "Скрыть пароль" : "Показать пароль"}
    >
      {show ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  );
}
