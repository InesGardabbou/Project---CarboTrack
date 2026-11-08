import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'primary' | 'warning' | 'destructive' | 'success';
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined) return null;
    if (trend > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trend === undefined) return '';
    if (trend > 0) return 'text-success';
    if (trend < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary/30 bg-primary/5';
      case 'warning':
        return 'border-warning/30 bg-warning/5';
      case 'destructive':
        return 'border-destructive/30 bg-destructive/5';
      case 'success':
        return 'border-success/30 bg-success/5';
      default:
        return 'border-border bg-card';
    }
  };

  return (
    <div
      className={cn(
        'glass-card p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:border-primary/30',
        getVariantStyles(),
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold text-foreground tracking-tight">{value}</p>
          
          <div className="mt-2 flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
                {getTrendIcon()}
                {Math.abs(trend)}%
              </span>
            )}
            {(trendLabel || subtitle) && (
              <span className="text-xs text-muted-foreground">
                {trendLabel || subtitle}
              </span>
            )}
          </div>
        </div>
        
        {icon && (
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            variant === 'primary' ? 'bg-primary/10 text-primary' :
            variant === 'warning' ? 'bg-warning/10 text-warning' :
            variant === 'destructive' ? 'bg-destructive/10 text-destructive' :
            variant === 'success' ? 'bg-success/10 text-success' :
            'bg-muted text-muted-foreground'
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
