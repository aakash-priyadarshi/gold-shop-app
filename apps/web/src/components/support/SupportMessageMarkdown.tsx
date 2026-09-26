"use client";

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "@/providers/translation-provider";

// Keep the renderer's protocol protection, with tel: for support contacts.
// Reject control characters and backslashes before treating a URL as relative.
function safeUrl(url: string) {
  if (/[\u0000-\u0020\u007f\\]/.test(url)) return "";
  if (/^(?:https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return "";
  return defaultUrlTransform(url);
}

/** Untrusted assistant text: no HTML, translation markup, or image requests. */
export function SupportMessageMarkdown({ text }: { text: string }) {
  const t = useT();

  return (
    <div className="min-w-0 max-w-full space-y-2 [overflow-wrap:anywhere] [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h4]:text-sm [&_h5]:text-sm [&_h6]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1 [&_p]:my-2 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs dark:[&_code]:bg-gray-900 [&_pre_code]:bg-transparent [&_pre_code]:p-0 dark:[&_pre_code]:bg-transparent [&_blockquote]:border-s [&_blockquote]:border-amber-300 [&_blockquote]:ps-3 [&_blockquote]:text-gray-600 dark:[&_blockquote]:border-amber-700 dark:[&_blockquote]:text-gray-300 [&_hr]:border-amber-100 dark:[&_hr]:border-amber-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeUrl}
        components={{
          a: ({ href, children, title }) => {
            if (!href) return <span>{children}</span>;
            const external = /^(?:https?:)?\/\//i.test(href);
            return (
              <a
                href={href}
                title={title}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
              >
                {children}
              </a>
            );
          },
          img: ({ alt }) => <span>{alt}</span>,
          pre: ({ children }) => (
            <pre
              tabIndex={0}
              aria-label={t("Code block")}
              className="max-w-full overflow-x-auto whitespace-pre rounded-lg bg-gray-100 p-3 dark:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div
              role="region"
              aria-label={t("Scrollable response table")}
              tabIndex={0}
              className="max-w-full overflow-x-auto rounded-lg border border-amber-100 dark:border-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500"
            >
              <table className="w-full border-collapse text-sm [overflow-wrap:normal]">
                {children}
              </table>
            </div>
          ),
          th: ({ children, style }) => (
            <th
              scope="col"
              style={style}
              className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-start font-semibold dark:border-amber-900 dark:bg-gray-900"
            >
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td
              style={style}
              className="border-b border-amber-100 px-3 py-2 align-top dark:border-amber-900"
            >
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
