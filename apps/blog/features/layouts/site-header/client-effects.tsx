'use client';

import { useEffect } from 'react';
import { getCookie } from '@smart-signer/lib/utils';
import { getLanguage } from '@/blog/utils/language';
import { cleanupPostDraftsFromLocalStorage } from '@/blog/lib/localstorage-cleanup';

export default function ClientEffects() {
  useEffect(() => {
    // Handle locale cookie setting
    if (typeof window !== 'undefined' && !getCookie('NEXT_LOCALE')) {
      document.cookie = `NEXT_LOCALE=en; SameSite=Lax`;
    }

    // Handle language setting from localStorage/cookies
    const savedLang = getLanguage();
    if (savedLang) {
      document.documentElement.lang = savedLang;
    }
  }, []);

  // Cleanup old / stale post drafts from localStorage to avoid unbounded growth
  useEffect(() => {
    cleanupPostDraftsFromLocalStorage();
  }, []);

  // Global handler for browser back/forward navigation in subdirectory deployments
  // This fixes issues when navigating back between different route handlers
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    if (basePath) {
      const handlePopState = () => {
        // Get the current path without basePath
        const pathWithoutBase = window.location.pathname.replace(basePath, '');

        // Force reload when navigating to/from user profile pages
        // This ensures the correct route handler is used
        if (pathWithoutBase.startsWith('/@')) {
          // Small timeout to let browser complete navigation first
          setTimeout(() => {
            window.location.replace(window.location.href);
          }, 0);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  return null;
}
