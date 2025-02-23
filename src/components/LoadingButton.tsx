import { Loader2 } from 'lucide-react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function LoadingButton({ isLoading, children, className = '', ...props }: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`relative ${className} disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        <>
          <span className="opacity-0">{children}</span>
          <Loader2 className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin" />
        </>
      ) : (
        children
      )}
    </button>
  );
}