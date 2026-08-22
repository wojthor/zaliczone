import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-2xl font-extrabold tracking-tight text-depths sm:text-3xl">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 scroll-mt-24 border-t border-mist pt-8 text-lg font-extrabold tracking-tight text-depths first:mt-0 first:border-t-0 first:pt-0">
        {children}
      </h2>
    ),
    p: ({ children }) => <p className="mt-4 text-sm leading-relaxed text-depths/90">{children}</p>,
    ul: ({ children }) => (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-depths/90">
        {children}
      </ul>
    ),
    li: ({ children }) => <li>{children}</li>,
    a: ({ href, children }) => {
      const isExternal = href?.startsWith("http");
      const className = "font-semibold text-depths underline decoration-lime/80 underline-offset-2 hover:decoration-lime";
      if (isExternal) {
        return (
          <a href={href} className={className} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      return (
        <Link href={href ?? "#"} className={className}>
          {children}
        </Link>
      );
    },
    strong: ({ children }) => <strong className="font-bold text-depths">{children}</strong>,
    ...components,
  };
}
