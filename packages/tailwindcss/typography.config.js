/**
 * Element styles of @tailwindcss/typography's `prose`, loaded by globals.css's `@config`:
 * the plugin reads its customisations only from a JavaScript theme. The rest of the
 * Tailwind configuration is in globals.css.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'hsl(var(--primary))',
            'h1, h2, h3, h4, h5, h6': {
              color: 'hsl(var(--primary))',
              fontWeight: '600',
              marginBottom: '0.25rem',
              marginTop: '2.5rem'
            },
            p: {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              '&::before': {
                content: 'none !important'
              },
              '&::after': {
                content: 'none !important'
              }
            },
            a: {
              color: 'hsl(var(--link))',
              textDecoration: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            },
            blockquote: {
              color: 'hsl(var(--primary), 0.7)',
              fontWeight: '400',
              margin: '0',
              marginBottom: '1rem',
              paddingInlineStart: '1.25rem',
              paddingTop: '0.5rem',
              textIndent: '-3px'
            },
            strong: {
              color: 'hsl(var(--primary))'
            },
            code: {
              backgroundColor: 'hsl(var(--background-secondary))',
              color: 'hsl(var(--primary), 0.7)',
              fontFamily: 'Consolas, monospace',
              fontWeight: '400',
              padding: '5px',
              textIndent: '-3px',
              wordBreak: 'break-word',
              fontSize: '14.4px',
              lineHeight: '19px'
            },
            pre: {
              color: 'hsl(var(--primary), 0.7)',
              backgroundColor: 'hsl(var(--background-secondary))',
              margin: '0',
              padding: '7px'
            },
            table: {
              marginBottom: '16px',
              borderCollapse: 'collapse',
              width: '100%',
              overflowX: 'auto',
              border: '1px solid hsl(var(--secondary))'
            },
            th: {
              color: 'hsl(var(--primary))'
            },
            tr: {
              backgroundColor: 'hsl(var(--background-secondary))',
              '&:nth-child(even)': {
                backgroundColor: 'hsl(var(--background))'
              }
            },
            td: {
              border: '1px solid hsl(var(--secondary))',
              verticalAlign: 'middle',
              padding: '4px 6.4px',
              fontSize: '16.3px'
            },
            ol: {
              marginBottom: '1rem',
              marginInlineStart: '0.75rem',
              marginTop: '0'
            },
            ul: {
              marginBottom: '1rem',
              marginInlineStart: '0.75rem',
              marginTop: '0'
            },
            li: {
              margin: '0',
              padding: '0'
            },
            img: {
              marginBottom: '10px',
              marginTop: '0'
            },
            hr: {
              margin: '20px 0'
            }
          }
        }
      }
    }
  }
};
