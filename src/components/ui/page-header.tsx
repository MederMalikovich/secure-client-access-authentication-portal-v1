import { Fragment, ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-8 animate-fade-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => (
              <span key={index} className="contents">
                <BreadcrumbItem>
                  {item.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={item.href}>{item.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="relative rounded-2xl gradient-mesh-bg px-4 py-5 md:px-6 md:py-6 border border-border/30 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between relative">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
            {description && (
              <p className="mt-1 text-sm md:text-base text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
