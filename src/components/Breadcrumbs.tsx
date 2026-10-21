import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** Trilha visível; os mesmos itens alimentam o BreadcrumbList do JSON-LD. */
const Breadcrumbs = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav aria-label="Trilha de navegação" className="mb-8">
    <ol className="flex flex-wrap items-center gap-2 text-sm text-secondary-foreground/70">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <li key={item.path} className="flex items-center gap-2">
            {isLast ? (
              <span aria-current="page" className="font-semibold text-secondary-foreground">
                {item.name}
              </span>
            ) : (
              <>
                <a href={item.path} className="transition-colors hover:text-primary">
                  {item.name}
                </a>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

export default Breadcrumbs;
