/**
 * Shared Tailwind CSS classes for post content layout.
 * Used in content.tsx and comments-section.tsx for consistent responsive widths.
 */

/** Base responsive width classes for post content containers */
export const postContentWidthClasses = 'w-full max-w-4xl';

/** Post content container with background and padding */
export const postContainerClasses = `relative mx-auto my-0 bg-background p-4 ${postContentWidthClasses}`;

/** Comments section container */
export const commentsSectionClasses = `mx-auto w-full max-w-4xl overflow-hidden`;
