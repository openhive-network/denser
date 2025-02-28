import { Locator, Page, expect } from '@playwright/test';

export class VotingSlider {
  readonly page: Page;
  readonly upvoteSliderModal: Locator;
  readonly upvoteSliderButton: Locator;
  readonly upvoteSliderButtonIcon: Locator;
  readonly upvoteSliderThumb: Locator;
  readonly upvoteSliderTrack: Locator;
  readonly upvoteSliderPercentageValue: Locator;

  readonly downvoteSliderModal: Locator;
  readonly downvoteSliderButton: Locator;
  readonly downvoteSliderThumb: Locator;
  readonly downvoteSliderTrack: Locator;
  readonly downvoteSliderPercentageValue: Locator;
  readonly downvoteSliderDescriptionContent: Locator;

  constructor(page: Page) {
    this.page = page;
    this.upvoteSliderModal = page.locator('[data-testid="upvote-slider-modal"]');
    this.upvoteSliderButton = page.locator('[data-testid="upvote-button-slider"]');
    this.upvoteSliderButtonIcon = page.locator('[data-testid="upvote-button-slider"] > svg');
    this.upvoteSliderThumb = page.locator('[data-testid="upvote-slider-thumb"]');
    this.upvoteSliderTrack = page.locator('[data-testid="upvote-slider-track"]');
    this.upvoteSliderPercentageValue = page.locator('[data-testid="upvote-slider-percentage-value"]');

    this.downvoteSliderModal = page.locator('[data-testid="downvote-slider-modal"]');
    this.downvoteSliderButton = page.locator('[data-testid="downvote-button-slider"]');
    this.downvoteSliderThumb = page.locator('[data-testid="downvote-slider-thumb"]');
    this.downvoteSliderTrack = page.locator('[data-testid="downvote-slider-track"]');
    this.downvoteSliderPercentageValue = page.locator('[data-testid="downvote-slider-percentage-value"]');
    this.downvoteSliderDescriptionContent = page.locator('[data-testid="downvote-description-content"]');
  }

  async moveCustomSlider(
    sliderTrackLocator: Locator,  // Locator for slider track
    sliderHandleLocator: Locator, // Locator for slider thumb/handle
    targetValue: number,
    min: number = 0,    // Default min value - for the Upvoting set to 1,
    max: number = 100   // Default max value - for the Upvoting the same,
  ) {
    // Get size and position of the slider track
    const boundingBox = await sliderTrackLocator.boundingBox();
    if (!boundingBox) throw new Error('Unable to download bounding box slider');

    const { x, y, width, height } = boundingBox;

    // Making sure the value is within
    if (targetValue < min || targetValue > max) {
      throw new Error(`The value ${targetValue} is out of scope (${min} - ${max})`);
    }

    // Calculating the position of a click based on the value
    const offsetX = ((targetValue - min) / (max - min)) * width;

    // Retrieving the current position of the slider handle
    const handleBox = await sliderHandleLocator.boundingBox();
    if (!handleBox) throw new Error('Unable to download handle bounding box');

    // Initial position of the slider handle
    const handleX = handleBox.x + handleBox.width / 2;
    const handleY = handleBox.y + handleBox.height / 2;

    // Dragging the slider to a new position
    await this.page.mouse.move(handleX, handleY);
    await this.page.mouse.down();
    await this.page.mouse.move(x + offsetX, y + height / 2, { steps: 5 });
    await this.page.mouse.up();
  }

  async validateUpvotePercentageValueOfSlider(expectedValue: string){
    expect(await this.upvoteSliderPercentageValue.textContent()).toBe(expectedValue);
  }

  async validateDownvotePercentageValueOfSlider(expectedValue: string){
    expect(await this.downvoteSliderPercentageValue.textContent()).toBe(expectedValue);
  }

}
