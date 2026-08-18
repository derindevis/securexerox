export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'sx-badge',
    success: 'sx-badge sx-badge--success',
    danger: 'sx-badge sx-badge--danger',
    warning: 'sx-badge sx-badge--warning',
  };
  return <span className={`${variants[variant] || variants.default} ${className}`}>{children}</span>;
}