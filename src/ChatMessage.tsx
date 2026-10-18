import Markdown from "react-markdown";
import { Link } from "react-router-dom";

/** Render assistant formatting without accepting raw HTML or embedded media. */
export default function ChatMessage({
  text,
  allowedLinks,
  onNavigate,
}: {
  text: string;
  allowedLinks?: string[];
  onNavigate?: () => void;
}) {
  return (
    <div className="chat-message-body">
      <Markdown
        skipHtml
        allowedElements={[
          "p",
          "strong",
          "em",
          "ul",
          "ol",
          "li",
          "br",
          "a",
          "blockquote",
          "code",
          "pre",
          "h1",
          "h2",
          "h3",
          "h4",
        ]}
        unwrapDisallowed
        components={{
          a: ({ children, href }) => {
            if (allowedLinks) {
              return href && allowedLinks.includes(href) ? (
                <Link to={href} onClick={onNavigate}>
                  {children}
                </Link>
              ) : (
                <span>{children}</span>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
