/**
 * `phone` below `sm` and `desktop` from it, so a phone's line fits short forms while the desktop
 * keeps its wording. Only the desktop text carries `testId`, keeping that element's text one form.
 */
export const PhoneOrDesktopText = ({
  phone,
  desktop,
  testId
}: {
  phone: string;
  desktop: string;
  testId?: string;
}) => (
  <>
    <span className="whitespace-nowrap sm:hidden">{phone}</span>
    <span className="hidden whitespace-nowrap sm:inline" data-testid={testId}>
      {desktop}
    </span>
  </>
);
