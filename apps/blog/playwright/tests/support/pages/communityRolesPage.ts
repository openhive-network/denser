import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object for the community roles page (`/roles/<tag>`), rendered by
 * `app/(main-and-community)/roles/[tag]/content.tsx` + `table-item.tsx`.
 *
 * Covers COM-13 (view roles) and COM-09 (set role via the AddRole panel,
 * which only renders for a viewer at member level or above).
 */
export class CommunityRolesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly table: Locator;
  readonly roleRows: Locator;
  readonly addRoleTrigger: Locator;
  readonly addRoleUsername: Locator;
  readonly addRoleSelectTrigger: Locator;
  readonly addRoleSave: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByTestId('community-roles-heading');
    this.table = page.getByTestId('community-roles-table');
    this.roleRows = page.getByTestId('community-role-row');
    this.addRoleTrigger = page.getByTestId('community-add-role-trigger');
    this.addRoleUsername = page.getByTestId('community-add-role-username');
    this.addRoleSelectTrigger = page.getByTestId('community-add-role-select');
    this.addRoleSave = page.getByTestId('community-add-role-save');
  }

  /** Expand the AddRole accordion and wait for its form to appear. */
  async openAddRole(): Promise<void> {
    await this.addRoleTrigger.click();
    await expect(this.addRoleUsername).toBeVisible();
  }

  /** Pick a role from the Radix dropdown by its raw role name (e.g. "mod"). */
  async selectRole(role: string): Promise<void> {
    await this.addRoleSelectTrigger.click();
    await this.page.getByTestId(`community-role-option-${role}`).click();
  }

  /** Full AddRole flow: expand, fill username, pick role, submit. */
  async addRole(username: string, role: string): Promise<void> {
    await this.openAddRole();
    await this.addRoleUsername.fill(username);
    await this.selectRole(role);
    await this.addRoleSave.click();
  }

  /** The role-table row for a given account (the `<tr>` carries `data-account`). */
  rowByAccount(account: string): Locator {
    return this.page.locator(
      `[data-testid="community-role-row"][data-account="${account}"]`
    );
  }

  /** Raw role string cell (e.g. "mod") within a given account's row. */
  roleNameInRow(account: string): Locator {
    return this.rowByAccount(account).getByTestId('community-role-name');
  }

  /** Per-user community title cell within a given account's row. */
  roleTitleInRow(account: string): Locator {
    return this.rowByAccount(account).getByTestId('community-role-title');
  }

  /**
   * Assert a single role row renders the expected account, raw role string,
   * and title. The role cell shows the RAW role (`item.role`), not the
   * translated label — see `table-item.tsx`.
   */
  async expectRoleRow({
    account,
    role,
    title
  }: {
    account: string;
    role: string;
    title: string;
  }): Promise<void> {
    await expect(this.rowByAccount(account)).toBeVisible();
    await expect(this.roleNameInRow(account)).toHaveText(role);
    await expect(this.roleTitleInRow(account)).toHaveText(title);
  }
}
