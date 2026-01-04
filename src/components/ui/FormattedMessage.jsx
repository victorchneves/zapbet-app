import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const processBold = (text) => {
    // Basic bold processing if needed, but react-markdown handles it.
    // Kept for backward compatibility if I switch manual parsing back.
    // For now, let's trust react-markdown + custom components.
    return text;
};

export default function FormattedMessage({ content }) {
    if (!content) return null;

    return (
        <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mt-4 mb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-base font-bold text-white mt-3 mb-1" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-sm font-bold text-white mt-3 mb-1 uppercase tracking-wider" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-2 text-gray-200" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 mb-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 mb-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                    code: ({ node, inline, className, children, ...props }) => {
                        return inline ? (
                            <code className="bg-secondary/50 px-1 py-0.5 rounded text-xs font-mono text-primary" {...props}>
                                {children}
                            </code>
                        ) : (
                            <pre className="bg-secondary/50 p-2 rounded-lg overflow-x-auto text-xs font-mono text-gray-300 my-2">
                                <code {...props}>{children}</code>
                            </pre>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
