export default function Card({ children, className = '', ...props }) {
  return (
    <div className={`sx-card ${className}`} {...props}>
      {children}
    </div>
  );
}