import { Locator, Page, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly profileNickName: any;
  readonly profileInfo: any;
  readonly profileName: Locator;
  readonly profileAbout: Locator;
  readonly profileLastTimeActive: Locator;
  readonly profileJoined: Locator;
  readonly profileLocation: Locator;
  readonly profileStats: Locator;
  readonly followButton: Locator;
  readonly userLinks: Locator;
  readonly profileBlogPostsList: Locator;

  readonly profileNav: Locator;
  readonly profileBlogLink: Locator;
  readonly profilePostsLink: Locator;
  readonly profileRepliesLink: Locator;
  readonly profileSocialLink: Locator;
  readonly profileNotificationsLink: Locator;
  readonly profileWalletLink: Locator;
  readonly profileSettingsLink: Locator;

  readonly postBlogItem: any;
  readonly postsMenu: Locator;
  readonly postsPostAuthor: Locator;
  readonly postsMenuPostsButton: Locator;
  readonly postsMenuCommentsButton: Locator;
  readonly postsMenuPayoutsButton: Locator;
  readonly postRebloggedLabel: Locator;
  readonly firstPostRebloggedLabel: Locator;
  readonly postRebloggedAuthorLink: Locator;
  readonly postTitle: Locator;
  readonly postDescription: Locator;
  readonly postCommunityLink: Locator;
  readonly postCategoryLink: Locator;
  readonly postTimestamp: Locator;
  readonly postUpvoteButton: Locator;
  readonly postDownvoteButton: Locator;
  readonly postUpvoteTooltip: Locator;
  readonly postDownvoteTooltip: Locator;
  readonly postPayout: Locator;
  readonly postPayoutTooltip: Locator;
  readonly postVotes: Locator;
  readonly postVotesTooltip: Locator;
  readonly postResponse: Locator;
  readonly postResponseTooltip: Locator;
  readonly postReblog: Locator;
  readonly postReblogTooltip: Locator;
  readonly postAvatar: Locator;
  readonly postReputation: Locator;
  readonly postReputationTooltip: Locator;
  readonly postsPostListLocator: Locator;
  readonly postsCommentsListLocator: Locator;
  readonly postsPayoutsListLocator: Locator;

  readonly repliesCommentListItem: any;
  readonly repliesCommentListItemLoadNewer: Locator;
  readonly repliesCommentListItemTitle: Locator;
  readonly repliesCommentListItemDescription: Locator;
  readonly repliesCommentListItemAvatar: Locator;
  readonly repliesCommentListItemAvatarLink: Locator;
  readonly repliesCommentListItemCommunityLink: Locator;
  readonly repliesCommentListItemTimestamp: Locator;
  readonly repliesCommentListItemUpvote: Locator;
  readonly repliesCommentListItemDownvote: Locator;
  readonly repliesCommentListItemUpvoteTooltip: Locator;
  readonly repliesCommentListItemDownvoteTooltip: Locator;
  readonly repliesCommentListItemPayout: Locator;
  readonly repliesCommentListItemPayoutTooltip: Locator;
  readonly repliesCommentListItemVotes: Locator;
  readonly repliesCommentListItemVotesTooltip: Locator;
  readonly repliesCommentListItemRespond: Locator;
  readonly repliesCommentListItemRespondFirst: Locator;
  readonly repliesCommentListItemRespondTooltip: Locator;
  readonly repliesCommentListItemArticleTitle: Locator;

  readonly notificationsMenu: any;
  readonly notificationsMenuAllButton: Locator;
  readonly notificationsMenuRepliesButton: Locator;
  readonly notificationsMenuMentionsButton: Locator;
  readonly notificationsMenuFollowsButton: Locator;
  readonly notificationsMenuUpvotesButton: Locator;
  readonly notificationsMenuReblogsButton: Locator;
  readonly notificationsMenuAllContent: Locator;
  readonly notificationsMenuRepliesContent: Locator;
  readonly notificationListItemInReplies: Locator;
  readonly notificationsMenuMentionsContent: Locator;
  readonly notificationListItemInMentions: Locator;
  readonly notificationsMenuFollowsContent: Locator;
  readonly notificationListItemInFollows: Locator;
  readonly notificationsMenuUpvotesContent: Locator;
  readonly notificationListItemInUpvotes: Locator;
  readonly notificationsMenuReblogsContent: Locator;
  readonly notificationListItemInReblogs: Locator;
  readonly notificationNickName: Locator;
  readonly notificationAccountIconLink: Locator;
  readonly notificationAccountAndMessage: Locator;
  readonly notificationTimestamp: Locator;
  readonly notificationListItemInAll: Locator;
  readonly notificationListItemEvenInAll: Locator;
  readonly notificationListItemOddInAll: Locator;
  readonly notificationProgressBar: Locator;
  readonly notificationLoadMoreButtonInAll: Locator;
  readonly notificationLoadMoreButtonInReblogs: Locator;

  readonly publicProfileSettings: any;
  readonly publicProfileSettingsHeader: Locator;
  readonly apiEndpointCard: Locator;
  readonly apiSelectedNodeText: Locator;
  readonly apiEndpointButton: Locator;
  readonly firstSetMainButton: Locator;
  readonly apiEndpointAISearchButton: Locator;
  readonly apiAddressInput: Locator;
  readonly apiFilterInput: Locator;
  readonly apiAddButton: Locator;
  readonly apiRestoreDefaultServerSetButton: Locator;
  readonly preferencesProfileSettingsHeader: Locator;
  readonly advancedProfileSettingsHeader: Locator;
  readonly ppsProfilePictureUrlLabel: Locator;
  readonly ppsProfilePictureUrlInput: Locator;
  readonly ppsCoverImageUrlLabel: Locator;
  readonly ppsCoverImageUrlInput: Locator;
  readonly ppsDisplayNameLabel: Locator;
  readonly ppsDisplayNameInput: Locator;
  readonly ppsAboutLabel: Locator;
  readonly ppsAboutInput: Locator;
  readonly ppsLocationLabel: Locator;
  readonly ppsLocationInput: Locator;
  readonly ppsWebsiteLabel: Locator;
  readonly ppsWebsiteInput: Locator;
  readonly ppsBlacklistDescriptionLabel: Locator;
  readonly ppsBlacklistDescriptionInput: Locator;
  readonly ppsMuteListDescriptionLabel: Locator;
  readonly ppsMuteListDescriptionInput: Locator;
  readonly ppsButtonUpdate: Locator;

  readonly preferencesSettings: Locator;
  readonly preferencesSettingsChooseLanguage: Locator;
  readonly preferencesSettingsNoSafeForWorkContent: Locator;
  readonly preferencesSettingsBlogPostRewards: Locator;
  readonly preferencesSettingsCommentsPostRewards: Locator;
  readonly preferencesSettingsReferralSystem: Locator;

  readonly advancedSettingsApiEndpointRadioGroup: Locator
  readonly advancedSettingsApiEndpointList: Locator
  readonly advancedSettingsApiEndpointButton: Locator
  readonly advancedSettingsApiEndpointAdd: Locator
  readonly advancedSettingsApiEndpointAddInput: Locator
  readonly advancedSettingsApiEndpointAddButton: Locator
  readonly advancedSettingsApiResetEndpointsButton: Locator

  readonly thirdPartyAppPeakdLink: Locator;
  readonly thirdPartyAppHivebuzzLink: Locator;

  readonly communitySubscriptionHeader: any;

  readonly profileNumberOfPosts: Locator;
  readonly profileHP: Locator;
  readonly profileFollowing: Locator;
  readonly profileFollowers: Locator;

  readonly followedBlacklists: Locator;
  readonly followedBlacklistsHeader: Locator;
  readonly followedMutedLists: Locator;
  readonly followedMutedListsHeader: Locator;

  readonly socialBadgesAchievemntsMenuBar: Locator;
  readonly socialMenuBarBadges: Locator;
  readonly socialMenuBarActivity: Locator;
  readonly socialMenuBarPersonal: Locator;
  readonly socialMenuBarMeetups: Locator;
  readonly socialMenuBarChallenges: Locator;
  readonly socialCommunitySubscriptionsLabel: Locator;
  readonly socialCommunitySubscriptionsDescription: Locator;
  readonly socialAuthorSubscribedCommunitiesList: Locator;
  readonly socialAuthorSubscribedCommunitiesListItem: Locator;
  readonly socialAuthorSubscribedCommunitiesLink: Locator;
  readonly socialAuthorSubscribedCommunitiesRoleTag: Locator;
  readonly socialAuthorSubscribedCommunitiesAffiliationTag: Locator;
  readonly socialBadgesAchivementsLabel: Locator;
  readonly socialBadgesAchivementsDescription: Locator;
  readonly socialBadgeAchivement: Locator;
  readonly blogTabPostsContainer: Locator;
  readonly firstCommunityLinkPostsComments: Locator;
  readonly communityName: Locator;
  readonly communityTimeStamp: Locator;

  readonly userHasNotStartedBloggingYetMsg: Locator;
  readonly userHasNotMadeAnyPostsYetMsg: Locator;
  readonly userNoPendingPayoutsMsg: Locator;
  readonly userHasNotHadAnyRepliesYetMsg: Locator;
  readonly userDoesNotHaveAnySubscriptionsYetMsg: Locator;
  readonly userHasNotHadAnyNotificationsYetMsg: Locator;
  readonly userBannerBadgeLink: Locator;
  readonly userBannerBadgeImg: Locator;
  readonly userBannerTwitterBadgeLink: Locator;
  readonly profileNameString: string;
  readonly followBtn: string;
  readonly profileStatsString: string;

  constructor(page: Page) {
    this.page = page;
    this.followBtn = '[data-testid="profile-follow-button"]'
    this.profileInfo = page.locator('[data-testid="profile-info"]');
    this.profileName = page.locator('[data-testid="profile-name"]');
    this.profileNameString = '[data-testid="profile-name"]';
    this.profileNickName = page.locator('[data-testid="profile-nickname"]');
    this.profileAbout = page.locator('[data-testid="profile-about"]');
    this.profileLastTimeActive = page.locator('[data-testid="user-last-time-active"]');
    this.profileJoined = page.locator('[data-testid="user-joined"]');
    this.profileLocation = page.locator('[data-testid="user-location"]');
    this.profileStats = page.locator('[data-testid="profile-stats"]');
    this.profileStatsString = '[data-testid="profile-stats"]'
    this.profileNumberOfPosts = this.profileStats.locator('li').nth(1);
    this.profileHP = this.profileStats.locator('li').nth(3);
    this.profileFollowing = this.profileStats.locator('li').nth(2);
    this.profileFollowers = this.profileStats.locator('li').nth(0);
    this.followButton = page.locator('[data-testid="profile-follow-button"]');
    this.userLinks = page.locator('[data-testid="user-links"]');
    this.profileBlogPostsList = page.getByTestId('post-list-profile-blog-list');

    this.profileNav = page.locator('[data-testid="profile-navigation"]');
    this.profileBlogLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child li a')
      .getByText('Blog');
    this.profilePostsLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Posts');
    this.profileRepliesLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Replies');
    this.profileSocialLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Social');
    this.profileNotificationsLink = page
      .locator('[data-testid="profile-navigation"] ul:first-child')
      .getByText('Notifications');
    this.profileWalletLink = page
      .locator('[data-testid="profile-navigation"] ul:last-child')
      .getByText('Wallet');
    this.profileSettingsLink = page
      .locator('[data-testid="profile-navigation"] ul:last-child')
      .getByText('Settings');

    this.postBlogItem = page.locator('[data-testid="post-list-item"]');
    this.postsMenu = page.locator('[data-testid="user-post-menu"]');
    this.postsPostAuthor = page.locator('[data-testid="post-author"]');
    this.postsMenuPostsButton = page.locator('[data-testid="user-post-menu"]').getByText('Posts');
    this.postsMenuCommentsButton = page.locator('[data-testid="user-post-menu"]').getByText('Comments');
    this.postsMenuPayoutsButton = page.locator('[data-testid="user-post-menu"]').getByText('Payouts');
    this.postRebloggedLabel = page.locator('[data-testid="reblogged-label"]');
    this.firstPostRebloggedLabel = this.postBlogItem.first().locator(this.postRebloggedLabel);
    this.postRebloggedAuthorLink = page.locator('[data-testid="reblogged-author-link"]');
    this.postTitle = this.postBlogItem.locator('[data-testid="post-title"] > a');
    this.postDescription = this.postBlogItem.locator('[data-testid="post-description"]');
    this.postCommunityLink = page.locator('[data-testid="post-card-community"]');
    this.postCategoryLink = page.locator('[data-testid="post-card-category"]');
    this.postTimestamp = page.locator('[data-testid="post-card-timestamp"]');
    this.postUpvoteButton = page.locator('[data-testid="upvote-button"]');
    this.postDownvoteButton = page.locator('[data-testid="downvote-button"]');
    this.postUpvoteTooltip = page.locator('[data-testid="upvote-button-tooltip"]');
    this.postDownvoteTooltip = page.locator('[data-testid="downvote-button-tooltip"]');
    this.postPayout = page.locator('[data-testid="post-payout"]');
    this.postPayoutTooltip = page.locator('[data-testid="payout-post-card-tooltip"]');
    this.postVotes = page.locator('[data-testid="post-total-votes"]');
    this.postVotesTooltip = page.locator('[data-testid="post-card-votes-tooltip"]');
    this.postResponse = page.locator('[data-testid="post-card-response-link"]');
    this.postResponseTooltip = page.locator('[data-testid="post-card-responses"]');
    this.postReblog = page.locator('[data-testid="post-card-reblog"]');
    this.postReblogTooltip = page.locator('[data-testid="post-card-reblog-tooltip"]');
    this.postAvatar = page.locator('[data-testid="post-card-avatar"]');
    this.postReputation = page.locator('[data-testid="post-author-reputation"]');
    this.postReputationTooltip = page.locator('[data-testid="post-reputation-tooltip"]');
    this.postsPostListLocator = page.getByTestId('post-list-user-posts');
    this.postsCommentsListLocator = page.getByTestId('comment-list-replies');
    this.postsPayoutsListLocator = page.getByTestId('post-list-user-payouts');

    this.repliesCommentListItem = page.locator('[data-testid="comment-list-item"]');
    this.repliesCommentListItemLoadNewer = page.locator('[div > button]').getByText('Load Newer');
    this.repliesCommentListItemTitle = page.locator('[data-testid="comment-card-title"]');
    this.repliesCommentListItemDescription = page.locator('[data-testid="comment-card-description"]');
    this.repliesCommentListItemAvatar = page.locator('[data-testid="comment-author-avatar"]');
    this.repliesCommentListItemAvatarLink = page.locator('[data-testid="comment-author-avatar-link"]');
    this.repliesCommentListItemCommunityLink = page.locator('[data-testid="comment-community-category-link"]');
    this.repliesCommentListItemTimestamp = page.locator('[data-testid="comment-timestamp"]');
    this.repliesCommentListItemUpvote = page.locator('[data-testid="comment-card-footer"] [data-testid="upvote-button"]');
    this.repliesCommentListItemDownvote = page.locator('[data-testid="comment-card-footer"] [data-testid="downvote-button"]');
    this.repliesCommentListItemUpvoteTooltip = page.locator('[data-testid="upvote-button-tooltip"]');
    this.repliesCommentListItemDownvoteTooltip = page.locator('[data-testid="downvote-button-tooltip"]');
    this.repliesCommentListItemPayout = page.locator('[data-testid="post-payout"]');
    this.repliesCommentListItemPayoutTooltip = page.locator('[data-testid="payout-post-card-tooltip"]');
    this.repliesCommentListItemVotes = page.locator('[data-testid="comment-vote"]');
    this.repliesCommentListItemVotesTooltip = page.locator('[data-testid="comment-vote-tooltip"]');
    this.repliesCommentListItemRespond = page.locator('[data-testid="comment-respond-link"]');
    this.repliesCommentListItemRespondFirst = this.repliesCommentListItemRespond.first();
    this.repliesCommentListItemRespondTooltip = page.locator('[data-testid="comment-respond-tooltip"]');
    this.repliesCommentListItemArticleTitle = page.locator('[data-testid="article-title"]');

    this.notificationsMenu = page.locator('[data-testid="notifications-local-menu"]');
    this.notificationsMenuAllButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('All');
    this.notificationsMenuRepliesButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Replies');
    this.notificationsMenuMentionsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Mentions');
    this.notificationsMenuFollowsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Follows');
    this.notificationsMenuUpvotesButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Upvotes');
    this.notificationsMenuReblogsButton = page
      .locator('[data-testid="notifications-local-menu"]')
      .getByText('Reblogs');
    this.notificationsMenuAllContent = page.locator('[data-testid="notifications-content-all"]');
    this.notificationsMenuRepliesContent = page.locator('[data-testid="notifications-content-replies"]');
    this.notificationListItemInReplies = this.notificationsMenuRepliesContent.locator('[data-testid="notification-list-item"]');
    this.notificationsMenuMentionsContent = page.locator('[data-testid="notifications-content-mentions"]');
    this.notificationListItemInMentions = this.notificationsMenuMentionsContent.locator('[data-testid="notification-list-item"]');
    this.notificationsMenuFollowsContent = page.locator('[data-testid="notifications-content-follows"]');
    this.notificationListItemInFollows = this.notificationsMenuFollowsContent.locator('[data-testid="notification-list-item"]');
    this.notificationsMenuUpvotesContent = page.locator('[data-testid="notifications-content-upvotes"]');
    this.notificationListItemInUpvotes = this.notificationsMenuUpvotesContent.locator('[data-testid="notification-list-item"]');
    this.notificationsMenuReblogsContent = page.locator('[data-testid="notifications-content-reblogs"]');
    this.notificationListItemInReblogs = this.notificationsMenuReblogsContent.locator('[data-testid="notification-list-item"]');

    this.notificationNickName = page.locator('[data-testid="subscriber-name"]');
    this.notificationAccountIconLink = page.locator('[data-testid="notification-account-icon-link"]');
    this.notificationAccountAndMessage = page.locator('[data-testid="notification-account-and-message"]');
    this.notificationTimestamp = page.locator('[data-testid="notification-timestamp"]');
    this.notificationListItemInAll = this.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]');
    this.notificationListItemEvenInAll = this.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]:nth-of-type(even)');
    this.notificationListItemOddInAll =  this.notificationsMenuAllContent.locator('[data-testid="notification-list-item"]:nth-of-type(odd)');
    this.notificationProgressBar = page.locator('[data-testid="notification-progress-bar"]');
    this.notificationLoadMoreButtonInAll = this.notificationsMenuAllContent.getByText('Load more');
    this.notificationLoadMoreButtonInReblogs = this.notificationsMenuReblogsContent.getByText('Load more');
    // this.subscribersLoadMoreButton = this.subscribersNotificationContent.getByText('Load more');


    this.publicProfileSettings = page.locator('[data-testid="public-profile-settings"]');
    this.publicProfileSettingsHeader = this.publicProfileSettings.locator('h2').nth(0);
    this.apiEndpointCard = this.publicProfileSettings.locator('.rounded-lg');
    this.apiEndpointButton = this.publicProfileSettings.locator('[data-testid="comment-close-open"]').first();
    this.firstSetMainButton = this.publicProfileSettings.getByTestId('hc-set-api-button').first();
    this.apiSelectedNodeText = this.publicProfileSettings.getByTestId('hc-selected');
    this.apiEndpointAISearchButton = this.publicProfileSettings.locator('[data-testid="comment-close-open"]').last();
    this.apiAddressInput = this.publicProfileSettings.locator('[data-testid="api-address-input"]');
    this.apiFilterInput = this.publicProfileSettings.locator('[placeholder="Filter by URL…"]');
    this.apiAddButton = this.publicProfileSettings.locator('button').getByText('Add');
    this.apiRestoreDefaultServerSetButton = this.publicProfileSettings.getByText('Restore default API server set');
    this.preferencesProfileSettingsHeader = this.publicProfileSettings.locator('h2').nth(1);
    this.advancedProfileSettingsHeader = this.publicProfileSettings.locator('h2').nth(2);

    this.ppsProfilePictureUrlLabel = this.publicProfileSettings.locator('[for="profileImage"]');
    this.ppsProfilePictureUrlInput = this.publicProfileSettings.locator('#profileImage');
    this.ppsCoverImageUrlLabel = this.publicProfileSettings.locator('[for="coverImage"]');
    this.ppsCoverImageUrlInput = this.publicProfileSettings.locator('#coverImage');
    this.ppsDisplayNameLabel = this.publicProfileSettings.locator('[for="name"]');
    this.ppsDisplayNameInput = this.publicProfileSettings.locator('#name');
    this.ppsAboutLabel = this.publicProfileSettings.locator('[for="about"]');
    this.ppsAboutInput = this.publicProfileSettings.locator('#about');
    this.ppsLocationLabel = this.publicProfileSettings.locator('[for="location"]');
    this.ppsLocationInput = this.publicProfileSettings.locator('#location');
    this.ppsWebsiteLabel = this.publicProfileSettings.locator('[for="website"]');
    this.ppsWebsiteInput = this.publicProfileSettings.locator('#website');
    this.ppsBlacklistDescriptionLabel = this.publicProfileSettings.locator('[for="blacklistDescription"]');
    this.ppsBlacklistDescriptionInput = this.publicProfileSettings.locator('#blacklistDescription');
    this.ppsMuteListDescriptionLabel = this.publicProfileSettings.locator('[for="mutedListDescription"]');
    this.ppsMuteListDescriptionInput = this.publicProfileSettings.locator('#mutedListDescription');
    this.ppsButtonUpdate = this.publicProfileSettings.locator('[data-testid="pps-update-button"]');

    this.preferencesSettings = page.locator('[data-testid="settings-preferences"]');
    this.preferencesSettingsChooseLanguage = this.preferencesSettings.locator(
      '[data-testid="choose-language"]'
    );
    this.preferencesSettingsNoSafeForWorkContent = this.preferencesSettings.locator(
      '[data-testid="not-safe-for-work-content"]'
    );
    this.preferencesSettingsBlogPostRewards = this.preferencesSettings.locator(
      '[data-testid="blog-post-rewards"]'
    );
    this.preferencesSettingsCommentsPostRewards = this.preferencesSettings.locator(
      '[data-testid="comment-post-rewards"]'
    );
    this.preferencesSettingsReferralSystem = this.preferencesSettings.locator(
      '[data-testid="referral-system"]'
    );

    this.advancedSettingsApiEndpointRadioGroup = page.locator('[data-testid="api-endpoint-radiogroup"]')
    this.advancedSettingsApiEndpointList = this.advancedSettingsApiEndpointRadioGroup.locator('div label')
    this.advancedSettingsApiEndpointButton = this.advancedSettingsApiEndpointRadioGroup.locator('div button')
    this.advancedSettingsApiEndpointAdd = page.locator('[data-testid="add-api-endpoint"]')
    this.advancedSettingsApiEndpointAddInput = this.advancedSettingsApiEndpointAdd.locator('input')
    this.advancedSettingsApiEndpointAddButton = this.advancedSettingsApiEndpointAdd.locator('button')
    this.advancedSettingsApiResetEndpointsButton = page.getByText('Reset Endpoints')

    this.thirdPartyAppPeakdLink = page.locator('a[href="https://peakd.com/"]');
    this.thirdPartyAppHivebuzzLink = page.locator('a[href="https://hivebuzz.me/"]');
    this.communitySubscriptionHeader = page.getByText('Community Subscriptions');
    this.followedBlacklists = page.getByText('Followed Blacklists');
    this.followedBlacklistsHeader = page.locator('h1.text-xl.font-bold').first();
    this.followedMutedLists = page.getByText('Followed Muted Lists')
    this.followedMutedListsHeader = page.locator('h1.text-xl.font-bold').first();

    this.socialBadgesAchievemntsMenuBar = page.locator('[data-testid="badges-activity-menu"]');
    this.socialMenuBarBadges = this.socialBadgesAchievemntsMenuBar.getByText('Badges');
    this.socialMenuBarActivity  = this.socialBadgesAchievemntsMenuBar.getByText('Activity');
    this.socialMenuBarPersonal  = this.socialBadgesAchievemntsMenuBar.getByText('Personal');
    this.socialMenuBarMeetups  = this.socialBadgesAchievemntsMenuBar.getByText('Meetups');
    this.socialMenuBarChallenges  = this.socialBadgesAchievemntsMenuBar.getByText('Challenges');
    this.socialCommunitySubscriptionsLabel = page.locator('[data-testid="community-subscriptions-label"]');
    this.socialCommunitySubscriptionsDescription = page.locator('[data-testid="community-subscriptions-description"]');
    this.socialAuthorSubscribedCommunitiesList = page.locator('[data-testid="author-subscribed-communities-list"]');
    this.socialAuthorSubscribedCommunitiesListItem = page.locator('[data-testid="author-community-subscribed-list-item"]');
    this.socialAuthorSubscribedCommunitiesLink = page.locator('[data-testid="author-community-subscribed-link"]');
    this.socialAuthorSubscribedCommunitiesRoleTag = page.locator('[data-testid="author-role-community"]');
    this.socialAuthorSubscribedCommunitiesAffiliationTag = page.locator('[data-testid="author-affiliation-tag"]');
    this.socialBadgesAchivementsLabel = page.locator('[data-testid="badges-achievements-label"]');
    this.socialBadgesAchivementsDescription = page.locator('[data-testid="badges-achievements-description"]');
    this.socialBadgeAchivement = page.locator('[data-testid="badge-achievement"]');
    this.blogTabPostsContainer = page.locator('main.container');
    this.firstCommunityLinkPostsComments = page.locator('span.text-xs a').first();
    this.communityName = page.locator('[data-testid="community-name"]');
    this.communityTimeStamp = page.locator('span.text-xs a').nth(1);
    this.userHasNotStartedBloggingYetMsg = page.locator('[data-testid="user-has-not-started-blogging-yet"]');
    this.userHasNotMadeAnyPostsYetMsg = page.locator('[data-testid="user-has-not-made-any-post-yet"]');
    this.userNoPendingPayoutsMsg = page.locator('[data-testid="user-no-pending-payouts"]');
    this.userHasNotHadAnyRepliesYetMsg = page.locator('[data-testid="user-has-not-had-any-replies-yet"]');
    this.userDoesNotHaveAnySubscriptionsYetMsg = page.locator('[data-testid="user-does-not-have-any-subscriptions-yet"]');
    this.userHasNotHadAnyNotificationsYetMsg = page.locator('[data-testid="user-has-not-had-any-notifications-yet"]');
    this.userBannerBadgeLink = page.locator('[data-testid="profile-badge-link"]');
    this.userBannerBadgeImg = page.locator('[data-testid="profile-badge-image"]');
    this.userBannerTwitterBadgeLink = page.locator('[data-testid="profile-twitter-badge"]');
  }

  async gotoProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
  }

  async gotoPostsProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/posts`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.profileBlogPostsList['_selector']);
  }

  async gotoPostsCommentsProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/comments`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.profileBlogPostsList['_selector']);
  }

  async gotoPostsPayoutsProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/payout`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    if (!await this.userNoPendingPayoutsMsg.isVisible())
      await this.page.waitForSelector(this.profileBlogPostsList['_selector']);
  }

  async gotoRepliesProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/replies`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.repliesCommentListItem['_selector']);
  }

  async gotoNotificationsProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/notifications`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000);
    await this.page.waitForSelector(this.profileInfo['_selector']);
  }

  async gotoSocialProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/communities`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.socialBadgesAchievemntsMenuBar['_selector']);
  }

  async gotoApiEndpointHealthcheckerProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/settings`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.apiEndpointButton['_selector']);
    await this.page.waitForSelector(this.page.getByText('Condenser - Get accounts')['_selector']);
  }

  async gotoAISearchApiEndpointHealthcheckerProfilePage(nickName: string) {
    await this.page.goto(`/${nickName}/settings`);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await this.page.waitForSelector(this.apiEndpointAISearchButton['_selector']);
    // Click Endpoint for AI search
    await this.apiEndpointAISearchButton.click();
    await this.page.waitForSelector(this.page.getByText('AI search').first()['_selector']);
    await this.page.waitForTimeout(1000);
  }

  async profileNameIsEqual(authorName: string) {
    expect(await this.profileName.textContent()).toMatch(authorName);
  }

  async profileInfoIsVisible(
    nickName: string,
    profileName: string,
    profileAbout: string,
    userJoined: string
  ) {
    await this.page.waitForSelector(this.profileInfo['_selector']);
    await expect(this.profileInfo).toBeVisible();
    // expect(await this.profileNickName.textContent()).toMatch(nickName);
    expect(await this.profileName.textContent()).toMatch(profileName);
    // await this.profileNickNameIsEqual(nickName);
    expect(await this.profileAbout.textContent()).toMatch(profileAbout);
    await expect(this.profileLastTimeActive).toBeVisible();
    expect(await this.profileJoined.textContent()).toMatch(userJoined);
    await expect(this.profileLocation).toBeVisible();
    await expect(this.profileStats).toBeVisible();
    // await expect(this.followButton).toBeVisible();
    // await expect(this.userLinks).toBeVisible();
  }

  async profileNavigationIsVisible() {
    await expect(this.profileNav).toBeVisible();
  }

  async getElementCssPropertyValue(element: Locator, cssProperty: string) {
    const property = await element.evaluate((ele, css) => {
      return window.getComputedStyle(ele).getPropertyValue(css);
    }, cssProperty);
    // return value of element's css property
    return property;
  }

  async profileBlogTabIsSelected() {
    await this.page.waitForSelector(this.page.locator('main')['_selector']);
    expect(await this.getElementCssPropertyValue(this.profileBlogLink, 'color')).toBe('rgb(24, 30, 42)');
    // await expect(this.postBlogItem).toHaveCount(20);
  }

  async profilePostsTabIsSelected() {
    await this.page.waitForSelector(this.page.locator('main')['_selector']);
    // await expect(this.postBlogItem).toHaveCount(20);
    await expect(this.page).toHaveURL(/.*posts/)
    await expect(this.postsMenu).toBeVisible();
  }

  async profilePostsTabIsNotSelected() {
    await this.page.waitForSelector(this.postBlogItem['_selector']);
    await expect(this.page).not.toHaveURL(/.*posts/)
    await expect(this.postsMenu).not.toBeVisible();
  }

  async profileRepliesTabIsSelected() {
    const repliesPageListLocator = this.userHasNotHadAnyRepliesYetMsg.or(this.postsCommentsListLocator);
    await repliesPageListLocator.waitFor({state: 'visible'});
    await expect(this.page).toHaveURL(/.*replies/);
  }

  async profileRepliesTabIsNotSelected() {
    await expect(this.page).not.toHaveURL(/.*replies/)
  }

  async profileSocialTabIsSelected() {
    await this.page.waitForSelector(this.communitySubscriptionHeader['_selector']);
    await expect(this.page).toHaveURL(/.*communities/)
    await expect(this.page.getByText('Community Subscriptions')).toBeVisible();
    await expect(
      this.page.getByText('The author has subscribed to the following Hive Communities')
    ).toBeVisible();
    await expect(this.page.getByText('Badges and achievements')).toBeVisible();
    await expect(
      this.page.getByText(
        'These are badges received by the author via the third-party apps Peakd & Hivebuzz.'
      )
    ).toBeVisible();
  }

  async profileSocialTabIsNotSelected() {
    await expect(this.page).not.toHaveURL(/.*replies/)
  }

  async profileNotificationsTabIsSelected() {
    await this.page.waitForSelector(this.page.locator('main')['_selector']);
    await expect(await this.page).toHaveURL(/.*notifications/);
    // await expect(await this.notificationsMenu).toBeVisible();
    // await expect(await this.notificationsMenu.locator('button')).toHaveCount(6);
    // await expect(await this.notificationsMenuAllContent).toBeVisible();
  }

  async profileNotificationsTabIsNotSelected() {
    await expect(this.page).not.toHaveURL(/.*notifications/);
  }

  async profileSettingsTabIsSelected() {
    await this.page.waitForSelector(this.publicProfileSettings['_selector']);
    expect(await this.page.getByText('Public Profile Settings'));
    expect(await this.page.getByText('Preferences'));
    expect(await this.page.getByText('API Endpoint Options'));
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'color')).toBe('rgb(218, 43, 43)');
  }

  async profileSettingsTabIsNotSelected() {
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'color')).toBe('rgb(15, 23, 42)');
    expect(await this.getElementCssPropertyValue(this.profileSettingsLink, 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );
  }

  async moveToPostsTab() {
    await this.profilePostsLink.click();
    await this.profilePostsTabIsSelected();
  }

  async moveToRepliesTab() {
    await this.profileRepliesLink.click();
    await this.profileRepliesTabIsSelected();
  }

  async moveToSocialTab() {
    await this.page.waitForTimeout(3000);
    await this.profileSocialLink.click();
    await this.profileSocialTabIsSelected();
  }

  async moveToNotificationsTab() {
    await this.profileNotificationsLink.click();
    await this.profileNotificationsTabIsSelected();
  }

  async moveToWalletPage() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.profileWalletLink.click();
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL(/.*transfers/);

    await newPage.waitForTimeout(1000);
    await expect(newPage).toHaveTitle('Gandalf the Grey (@gtg) — Hive');
  }

  async moveToSettingsTab() {
    await this.profileSettingsLink.click();
    await this.profileSettingsTabIsSelected();
  }

  async moveToPeakdByLinkInSocialTab() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.thirdPartyAppPeakdLink.click();
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL('https://peakd.com/');
    await expect(newPage).toHaveTitle('PeakD');
  }

  async moveToHivebuzzByLinkInSocialTab() {
    const pagePromise = this.page.context().waitForEvent('page');
    await this.thirdPartyAppHivebuzzLink.click();
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL('https://hivebuzz.me/');
    await expect(newPage).toHaveTitle('HiveBuzz');
  }
}
