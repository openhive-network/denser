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
            maxWidth: '100%',
            color: 'hsl(var(--primary))',
            'h1, h2, h3, h4, h5, h6': {
              color: 'hsl(var(--primary))',
              fontWeight: '600',
              marginBottom: '0.25rem',
              marginTop: '2.5rem'
            },
            a: {
              color: 'hsl(var(--destructive))',
              textDecoration: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            },
            blockquote: {
              color: 'hsl(var(--primary), 0.7)',
              fontWeight: '400',
              margin: '0',
              marginBottom: '1rem',
              paddingLeft: '1.25rem',
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
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
};
