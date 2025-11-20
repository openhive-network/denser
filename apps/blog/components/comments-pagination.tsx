import { useTranslation } from 'next-i18next';
import { ReactElement } from 'react';

export const CommentsPagination = ({
  nbComments,
  nbItemsPerPage = 50,
  currentPage,
  onClick
}: {
  nbComments: number;
  nbItemsPerPage: number;
  currentPage: number;
  onClick: (page: number) => void;
}) => {
  const { t } = useTranslation('common_blog');
  const nbPages = Math.ceil(nbComments / nbItemsPerPage);

  if (nbPages <= 1) return null;

  const handleClick = (page: number) => onClick(page);

  const pageLinks: ReactElement[] = [];
  let lastAddedPage = 0;

  for (let pi = 1; pi <= nbPages; pi++) {
    // Show first, last, and pages around current
    if (pi === 1 || pi === nbPages || (pi >= currentPage - 2 && pi <= currentPage + 2)) {
      pageLinks.push(
        <button
          key={`page-${pi}`}
          type="button"
          className={`mr-1 ${pi === currentPage ? 'font-bold' : ''}`}
          onClick={() => handleClick(pi)}
        >
          {pi}
        </button>
      );
      lastAddedPage = pi;
    } else if (lastAddedPage !== -1 && pageLinks[pageLinks.length - 1]?.key !== `separator-${pi}`) {
      // Add ellipsis if there’s a gap
      pageLinks.push(
        <span key={`separator-${pi}`} className="ml-1 mr-1">
          ...
        </span>
      );
      lastAddedPage = -1;
    }
  }

  return (
    <div className="mb-2 w-full text-center">
      <b>{t('pagination.numberOfPages', { count: nbPages })}</b>
      <div>
        <span className="mr-2">{t('pagination.pages')}</span>
        {pageLinks}
      </div>
    </div>
  );
};
