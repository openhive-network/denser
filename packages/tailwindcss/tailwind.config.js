/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    // apps content
    `**/*.{jsx,tsx}`,
    // include packages if not transpiling
    '../../packages/**/*.{jsx,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        source: ['"Source Serif Pro"', 'serif'],
        sanspro: ['"Source Sans Pro"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        consolas: ['Consolas', '"Liberation Mono"', 'Courier', 'monospace']
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: {
          DEFAULT: 'hsl(var(--background))',
          secondary: 'hsl(var(--background-secondary))',
          tertiary: 'hsl(var(--background-tertiary))'
        },
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          noContent: 'hsl(var(--card-no-content))',
          emptyBorder: 'hsl(var(--card-empty-border))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--primary)',
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--primary)',
              marginBottom: '0.25rem',
              marginTop: '2.5rem',
              fontWeight: '600'
            },
            a: {
              color: 'var(--destructive)',
              textDecoration: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            },
            blockquote: {
              color: 'var(--primary-70)',
              margin: '0',
              marginBottom: '1rem',
              paddingLeft: '1.25rem',
              paddingTop: '0.5rem',
              fontWeight: '400',
              textIndent: '-0.1875rem'
            },
            strong: {
              color: 'var(--primary)'
            },
            code: {
              backgroundColor: 'var(--background-secondary)',
              color: 'var(--primary-70)',
              fontFamily: 'Consolas, monospace',
              fontSize: '14.4px',
              padding: '0.1875rem',
              wordBreak: 'break-word',
              textIndent: '-0.1875rem',
              lineHeight: '19px'
            },
            pre: {
              backgroundColor: 'var(--background-secondary)',
              margin: '0',
              padding: '0',
              textIndent: '-0.1875rem'
            },
            table: {
              borderColor: 'var(--secondary)',
              borderCollapse: 'collapse',
              marginBottom: '1rem',
              overflowX: 'auto',
              maxWidth: '100%'
            },
            tr: {
              backgroundColor: 'var(--background-secondary)',
              '&:nth-child(even)': {
                backgroundColor: 'var(--background)'
              }
            },
            th: {
              color: 'var(--primary)'
            },
            td: {
              borderColor: 'var(--secondary)',
              paddingLeft: '0.4rem',
              paddingRight: '0.4rem',
              paddingTop: '0.25rem',
              paddingBottom: '0.25rem',
              textAlign: 'middle',
              fontSize: '16.3px'
            },
            img: {
              marginBottom: '0.625rem',
              marginTop: '0'
            },
            hr: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem'
            },
            ol: {
              marginBottom: '1rem',
              marginLeft: '0.75rem',
              marginTop: '0'
            },
            ul: {
              marginBottom: '1rem',
              marginLeft: '0.75rem',
              marginTop: '0'
            },
            li: {
              margin: '0',
              padding: '0'
            }
          }
        }
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
};
