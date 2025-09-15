# Navigation Updates TODO for Subdirectory Deployment

## Files with router.push/replace (7 files)
- [x] ~~components/mobile-nav.tsx~~ (completed)
- [x] ~~pages/[...param].tsx~~ (completed)
- [ ] components/comment-select-filter.tsx
- [ ] components/communities-select.tsx
- [ ] components/post-form.tsx
- [ ] pages/interaction/[uid].tsx
- [ ] pages/[param]/my.tsx
- [ ] pages/[param]/[p2]/[permlink]/index.tsx
- [ ] pages/[param]/posts.tsx

## Components with Link href (High Priority - 28 files)

### User Profile Navigation
- [ ] components/profile-dropdown-menu.tsx (9 links)
- [ ] components/user-menu.tsx
- [ ] components/user-info.tsx
- [ ] components/user-popover-card.tsx

### Post/Comment Components
- [ ] components/post-list-item.tsx (multiple links)
- [ ] components/comment-list-item.tsx
- [ ] components/replies-list-item.tsx
- [ ] components/reply-textbox.tsx
- [ ] components/post-img.tsx
- [ ] components/post-card-comment-tooltip.tsx
- [ ] components/post-card-hidden.tsx
- [ ] components/votes-details-data.tsx
- [ ] components/payout-hover-content.tsx
- [ ] components/popover-card-data.tsx

### Community Components
- [ ] components/communities-list-item.tsx
- [ ] components/communities-mybar.tsx
- [ ] components/communities-sidebar.tsx
- [ ] components/subscription-list-item.tsx
- [ ] components/subscription-list-dialog.tsx

### Settings/Forms
- [ ] components/advanced-settings-post-form.tsx
- [ ] components/new-post-button.tsx

### Feature Components
- [ ] feature/community-layout/community-description.tsx
- [ ] feature/community-layout/community-simple-description.tsx
- [ ] feature/community-roles/table-item.tsx
- [ ] feature/account-lists/list-item.tsx
- [ ] feature/account-lists/list-area.tsx
- [ ] feature/search/account-topic-result.tsx
- [ ] feature/suggestions-posts/card.tsx

### Page Components
- [ ] pages/[param]/feed.tsx
- [ ] pages/[param]/followed.tsx
- [ ] pages/[param]/followers.tsx
- [ ] pages/[param]/communities.tsx

### Other Components
- [ ] components/notification-list-item.tsx
- [ ] components/search-card.tsx
- [ ] components/share-post-dialog.tsx
- [ ] components/rocket-chat-widget.tsx
- [ ] components/custom-error.tsx
- [ ] components/no-data-error.tsx
- [ ] components/explore-hive.tsx
- [ ] components/common/profile-layout.tsx

## Image Sources (if any use local images)
- [ ] Check components using <img> or Next/Image with local sources

## Testing Checklist
- [ ] Home redirect to /blog/trending
- [ ] Profile navigation (@username links)
- [ ] Post permalinks
- [ ] Community pages
- [ ] Settings pages
- [ ] Search functionality
- [ ] Notification links
- [ ] Comment thread navigation
- [ ] Tag/category navigation

## Update Pattern

### For Link components:
```tsx
// Before
<Link href="/trending">
<Link href={`/@${username}`}>

// After
import { withBasePath } from '@/blog/utils/PathUtils';
<Link href={withBasePath('/trending')}>
<Link href={withBasePath(`/@${username}`)}>
```

### For router.push/replace:
```tsx
// Before
router.push('/trending');
router.push(`/@${username}/posts`);

// After
import { withBasePath } from '@/blog/utils/PathUtils';
router.push(withBasePath('/trending'));
router.push(withBasePath(`/@${username}/posts`));
```

### Note: DO NOT wrap external URLs
- URLs starting with http://, https://, mailto:
- Links with target="_blank"
- External service links