/**
 * Shared Tailwind CSS classes for post content layout.
 * Used in content.tsx and comments-section.tsx for consistent responsive widths.
 */

/** Base responsive width classes for post content containers */
export const postContentWidthClasses = 'w-full max-w-4xl sm:w-[600px] md:w-[700px] lg:w-[800px] xl:w-[896px]';

/** Post content container with background and padding */
export const postContainerClasses = `relative mx-auto my-0 bg-background p-4 ${postContentWidthClasses}`;

/** Comments section container */
export const commentsSectionClasses = `pr-2 ${postContentWidthClasses}`;
