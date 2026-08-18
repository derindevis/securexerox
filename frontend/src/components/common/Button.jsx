export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'sx-button';
  const variants = {
    primary: '',
    ghost: 'sx-button--ghost',
    outline: 'sx-button--outline',
    danger: 'sx-button--danger',
    success: 'sx-button--success',
  };
  const sizes = {
    sm: 'sx-button--sm',
    md: '',
    lg: 'sx-button--lg',
  };
  return (
    <button className={`${base} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`} {...props}>
      {children}
    </button>
  );
}