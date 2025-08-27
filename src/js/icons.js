/**
 * Icon Pack - Centralized SVG icon management
 * Usage: Icons.get('iconName') or Icons.render('iconName', { class: 'custom-class' })
 */

const Icons = {
  // Icon definitions - only path data, not full path elements
  icons: {
    bell: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2Z',
    bellOff: 'M18.7 16.9 21 19.2V20H3v-.8l2.3-2.3V11a7 7 0 0 1 9.4-6.6l1.5 1.5A5.5 5.5 0 0 0 6.8 11v6l-.9.9h11.8l.9-.9ZM12 22c.9 0 1.6-.7 1.9-1.5H10c.3.8 1 1.5 2 1.5Zm8.6-15.2-1.4-1.4-3.3 3.3 1.4 1.4 3.3-3.3Z',
    history: 'M13 3a9 9 0 0 0-9 9H1l3.9 3.9L9 12H6a7 7 0 1 1 2.1 5l1.4-1.4A5 5 0 1 0 7 12h3l-4 4H4a9 9 0 1 0 9-13ZM11 8h2v6h-2z',
    warning: 'M12 2 1 21h22L12 2Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v4Z',
    tip: 'M13 3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM9 7h6l1.5 7.5c.2 1.1-.7 2.1-1.8 2.1H9.3c-1.1 0-2-1-1.8-2.1L9 7z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    success: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    danger: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z'
  },

  /**
   * Get raw SVG path data for an icon
   * @param {string} name - Icon name
   * @returns {string} SVG path data
   */
  get(name) {
    return this.icons[name] || this.icons.warning;
  },

  /**
   * Render complete SVG element
   * @param {string} name - Icon name
   * @param {Object} options - SVG attributes
   * @returns {string} Complete SVG HTML
   */
  render(name, options = {}) {
    const pathData = this.get(name);
    const attrs = Object.entries({
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      ...options
    }).map(([key, value]) => `${key}="${value}"`).join(' ');
    
    return `<svg ${attrs}><path d="${pathData}"/></svg>`;
  },

  /**
   * Create and return SVG DOM element
   * @param {string} name - Icon name
   * @param {Object} options - SVG attributes
   * @returns {SVGElement} SVG DOM element
   */
  create(name, options = {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Set default attributes
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    
    // Apply custom attributes
    Object.entries(options).forEach(([key, value]) => {
      svg.setAttribute(key, value);
    });
    
    // Set path data - this was the bug, we were using get() which returned full HTML
    const pathData = this.get(name);
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    
    return svg;
  },

  /**
   * Replace element's innerHTML with icon
   * @param {Element} element - Target element
   * @param {string} name - Icon name
   * @param {Object} options - SVG attributes
   */
  inject(element, name, options = {}) {
    element.innerHTML = this.render(name, options);
  },

  /**
   * Initialize icons in the document
   * Replaces data-icon attributes with actual icons
   */
  init() {
    document.querySelectorAll('[data-icon]').forEach(element => {
      const iconName = element.getAttribute('data-icon');
      const classes = element.getAttribute('data-icon-class') || '';
      
      // Create SVG with proper sizing based on parent context
      const svg = this.create(iconName);
      
      // Apply custom classes if specified
      if (classes) {
        svg.setAttribute('class', classes);
      }
      
      // Clear element and append SVG
      element.innerHTML = '';
      element.appendChild(svg);
    });
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Icons.init());
} else {
  Icons.init();
}

// Export for use in other modules
window.Icons = Icons;
