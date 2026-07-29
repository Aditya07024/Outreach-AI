/**
 * AutoScrollController.ts
 * 
 * Robust, modular Auto-Scrolling System for LinkedIn (Manifest V3 compatible).
 * Handles infinite scrolling, lazy loading, DOM updates, duplicate post prevention,
 * and memory cleanup.
 */

declare global {
  function scrapeVisiblePosts(): Promise<void>;
}

export interface AutoScrollOptions {
  /** Maximum number of posts to process before stopping automatically */
  maxPosts?: number;
  /** Maximum runtime in milliseconds before stopping automatically */
  maxRuntimeMs?: number;
  /** Maximum consecutive scrolls with no new content before stopping (default: 5) */
  maxConsecutiveNoNewContent?: number;
  /** Timeout in milliseconds to wait for new posts after scrolling (default: 3500) */
  scrollWaitTimeoutMs?: number;
  /** Custom scraper function (defaults to calling global scrapeVisiblePosts) */
  scrapeVisiblePostsFn?: () => Promise<void>;
}

export type AutoScrollState = 'idle' | 'running' | 'paused' | 'stopped';

export class AutoScrollController {
  private state: AutoScrollState = 'idle';
  private processedPostIds: Set<string> = new Set();
  private noNewContentCount: number = 0;
  private totalPostsProcessed: number = 0;
  private startTime: number = 0;

  private activeObserver: MutationObserver | null = null;
  private activeTimeout: number | ReturnType<typeof setTimeout> | null = null;
  private activePolling: number | ReturnType<typeof setInterval> | null = null;
  private resumeResolver: (() => void) | null = null;

  private options: Required<AutoScrollOptions>;

  constructor(options?: AutoScrollOptions) {
    this.options = {
      maxPosts: options?.maxPosts ?? Infinity,
      maxRuntimeMs: options?.maxRuntimeMs ?? Infinity,
      maxConsecutiveNoNewContent: options?.maxConsecutiveNoNewContent ?? 5,
      scrollWaitTimeoutMs: options?.scrollWaitTimeoutMs ?? 3500,
      scrapeVisiblePostsFn: options?.scrapeVisiblePostsFn ?? (async () => {
        if (typeof scrapeVisiblePosts === 'function') {
          await scrapeVisiblePosts();
        } else if (typeof (window as any).scrapeVisiblePosts === 'function') {
          await (window as any).scrapeVisiblePosts();
        } else {
          console.warn('[AutoScroll] scrapeVisiblePosts function not found in scope.');
        }
      }),
    };
  }

  /**
   * Start auto-scrolling execution loop.
   */
  public async startAutoScroll(overrideOptions?: AutoScrollOptions): Promise<void> {
    if (this.state === 'running') {
      console.log('[AutoScroll] Already running');
      return;
    }

    if (this.state === 'paused') {
      this.resumeAutoScroll();
      return;
    }

    if (overrideOptions) {
      this.options = {
        ...this.options,
        ...overrideOptions,
      };
    }

    this.state = 'running';
    this.noNewContentCount = 0;
    this.totalPostsProcessed = 0;
    this.startTime = Date.now();
    this.processedPostIds.clear();

    console.log('[AutoScroll] Started');

    try {
      await this.runLoop();
    } catch (error) {
      console.error('[AutoScroll] Error during execution loop:', error);
    } finally {
      const currentState: AutoScrollState = this.state;
      if (currentState !== 'stopped' && currentState !== 'idle') {
        this.stopAutoScroll();
      }
    }
  }

  /**
   * Pause auto-scrolling execution loop.
   */
  public pauseAutoScroll(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      console.log('[AutoScroll] Paused');
    }
  }

  /**
   * Resume auto-scrolling execution loop.
   */
  public resumeAutoScroll(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      console.log('[AutoScroll] Resumed');
      if (this.resumeResolver) {
        const resolve = this.resumeResolver;
        this.resumeResolver = null;
        resolve();
      }
    }
  }

  /**
   * Stop auto-scrolling execution loop and clean up resources.
   */
  public stopAutoScroll(): void {
    if (this.state === 'stopped' || this.state === 'idle') {
      return;
    }

    this.state = 'stopped';

    // Unblock any paused loop wait
    if (this.resumeResolver) {
      const resolve = this.resumeResolver;
      this.resumeResolver = null;
      resolve();
    }

    // Disconnect observers and clear timers
    this.cleanup();

    console.log('[AutoScroll] Finished');
  }

  /**
   * Check if auto-scrolling is currently running or active.
   */
  public isRunning(): boolean {
    return this.state === 'running' || this.state === 'paused';
  }

  /**
   * Core async loop. (Does NOT use setInterval)
   */
  private async runLoop(): Promise<void> {
    while ((this.state as AutoScrollState) === 'running' || (this.state as AutoScrollState) === 'paused') {
      // 1. Handle pause state
      if ((this.state as AutoScrollState) === 'paused') {
        await this.waitForResume();
        if ((this.state as AutoScrollState) !== 'running') break;
      }

      // Check max runtime limit
      if (this.isMaxRuntimeReached()) {
        console.log('[AutoScroll] Maximum runtime reached');
        break;
      }

      // 2. Process currently visible posts
      await this.processVisiblePosts();
      if (this.state !== 'running') break;

      // Check max posts limit
      if (this.isMaxPostsReached()) {
        console.log('[AutoScroll] Maximum posts limit reached');
        break;
      }

      // 3. Scroll exactly one viewport height
      console.log('[AutoScroll] Scrolling...');
      await this.scrollOneStep();
      if (this.state !== 'running') break;

      // 4. Wait for LinkedIn to load additional posts
      console.log('[AutoScroll] Waiting for new posts...');
      const newPostsFound = await this.waitForNewPosts();
      if (this.state !== 'running') break;

      // 5. Progress check & consecutive no new content end condition
      if (!newPostsFound) {
        this.noNewContentCount++;
        console.log(`[AutoScroll] No new content (${this.noNewContentCount}/${this.options.maxConsecutiveNoNewContent})`);

        if (this.noNewContentCount >= this.options.maxConsecutiveNoNewContent) {
          break;
        }
      } else {
        this.noNewContentCount = 0;
      }
    }
  }

  /**
   * Wait until resumeAutoScroll() or stopAutoScroll() is invoked.
   */
  private waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      this.resumeResolver = resolve;
    });
  }

  /**
   * Process currently visible posts and avoid duplicate work.
   */
  private async processVisiblePosts(): Promise<void> {
    const postElements = this.getLinkedInPostElements();
    let newlyDiscoveredCount = 0;

    for (const postEl of postElements) {
      const postId = this.getPostId(postEl);
      if (!this.processedPostIds.has(postId)) {
        this.processedPostIds.add(postId);
        newlyDiscoveredCount++;
        this.totalPostsProcessed++;
      }
    }

    // Call scrapeVisiblePosts only when processing visible posts
    await this.options.scrapeVisiblePostsFn();

    // Prevent memory leaks by capping set size if scrolling extended feeds
    if (this.processedPostIds.size > 10000) {
      const idsArray = Array.from(this.processedPostIds);
      this.processedPostIds = new Set(idsArray.slice(5000));
    }
  }

  /**
   * Find visible LinkedIn post containers in the DOM.
   */
  private getLinkedInPostElements(): Element[] {
    const selectors = [
      '.feed-shared-update-v2',
      'div[data-urn*="activity"]',
      'div[data-activity-id]',
      '.occluded-update',
      'div.relative[data-id]',
      'article',
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    return Array.from(elements).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  /**
   * Extract or generate a unique identifier for a post element.
   */
  private getPostId(element: Element): string {
    const urn = element.getAttribute('data-urn') || element.getAttribute('data-id') || element.id;
    if (urn) return urn;

    const activityId = element.getAttribute('data-activity-id');
    if (activityId) return activityId;

    const innerUrn = element.querySelector('[data-urn]')?.getAttribute('data-urn');
    if (innerUrn) return innerUrn;

    const innerActivity = element.querySelector('[data-activity-id]')?.getAttribute('data-activity-id');
    if (innerActivity) return innerActivity;

    const textSnippet = (element.textContent || '').trim().slice(0, 100).replace(/\s+/g, '_');
    if (textSnippet.length > 0) {
      return `post_text_${textSnippet}`;
    }

    return `post_elem_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Determine the active scroll container or fallback to window.
   */
  private getScrollContainer(): Element | Window {
    const candidates = [
      document.querySelector('.scaffold-finite-scroll'),
      document.querySelector('.scaffold-layout__main'),
      document.querySelector('main'),
      document.scrollingElement,
      document.documentElement,
      document.body,
    ];

    for (const container of candidates) {
      if (
        container &&
        container.scrollHeight > container.clientHeight &&
        container.clientHeight > 0
      ) {
        return container;
      }
    }

    return window;
  }

  /**
   * Get current scroll Y position from container or window.
   */
  private getCurrentScrollY(): number {
    const container = this.getScrollContainer();
    if (container && container !== window && container instanceof Element) {
      return container.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  /**
   * Scroll down by exactly one viewport height with smooth behavior.
   */
  private scrollOneStep(): Promise<void> {
    return new Promise((resolve) => {
      const scrollDistance = window.innerHeight;

      // 1. Mandatory window scrollBy call
      window.scrollBy({
        top: scrollDistance,
        behavior: 'smooth',
      });

      // 2. Fallback scrolling for LinkedIn container layouts & document root
      const container = this.getScrollContainer();
      if (container && container !== window && container instanceof Element) {
        container.scrollBy({
          top: scrollDistance,
          behavior: 'smooth',
        });
      }

      document.documentElement.scrollBy({
        top: scrollDistance,
        behavior: 'smooth',
      });

      document.body.scrollBy({
        top: scrollDistance,
        behavior: 'smooth',
      });

      // Poll scroll position to detect completion of smooth scroll animation
      let lastY = this.getCurrentScrollY();
      let sameCount = 0;

      const checkScroll = setInterval(() => {
        if ((this.state as AutoScrollState) !== 'running') {
          clearInterval(checkScroll);
          resolve();
          return;
        }

        const currentY = this.getCurrentScrollY();
        if (Math.abs(currentY - lastY) < 5) {
          sameCount++;
          if (sameCount >= 2) {
            clearInterval(checkScroll);
            resolve();
          }
        } else {
          sameCount = 0;
          lastY = currentY;
        }
      }, 100);

      // Safety timeout for scroll animation
      setTimeout(() => {
        clearInterval(checkScroll);
        resolve();
      }, 1000);
    });
  }

  /**
   * Wait for new posts, page height increase, or timeout.
   */
  private waitForNewPosts(): Promise<boolean> {
    return new Promise((resolve) => {
      const initialHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const initialPostCount = this.getLinkedInPostElements().length;
      const initialProcessedCount = this.processedPostIds.size;

      let resolved = false;

      const finishWait = (hasNewContent: boolean) => {
        if (resolved) return;
        resolved = true;

        this.cleanupWait();

        if (hasNewContent) {
          console.log('[AutoScroll] New posts detected');
        }

        resolve(hasNewContent);
      };

      // 1. Observe DOM changes via MutationObserver
      try {
        const targetNode = document.querySelector('.scaffold-finite-scroll') || document.body;
        this.activeObserver = new MutationObserver(() => {
          if (this.hasNewContent(initialHeight, initialPostCount, initialProcessedCount)) {
            finishWait(true);
          }
        });

        this.activeObserver.observe(targetNode, {
          childList: true,
          subtree: true,
        });
      } catch (e) {
        console.warn('[AutoScroll] MutationObserver setup warning:', e);
      }

      // 2. Polling check for height / post count changes (every 200ms)
      this.activePolling = setInterval(() => {
        if (this.state !== 'running') {
          finishWait(false);
          return;
        }

        if (this.hasNewContent(initialHeight, initialPostCount, initialProcessedCount)) {
          finishWait(true);
        }
      }, 200);

      // 3. Timeout fallback
      this.activeTimeout = setTimeout(() => {
        const finalHasNew = this.hasNewContent(initialHeight, initialPostCount, initialProcessedCount);
        finishWait(finalHasNew);
      }, this.options.scrollWaitTimeoutMs);
    });
  }

  /**
   * Check if page height increased or new posts appeared.
   */
  private hasNewContent(
    initialHeight: number,
    initialPostCount: number,
    initialProcessedCount: number
  ): boolean {
    const container = this.getScrollContainer();
    const containerHeight = container instanceof Element ? container.scrollHeight : 0;
    const currentHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      containerHeight
    );
    if (currentHeight > initialHeight + 20) {
      return true;
    }

    const currentPosts = this.getLinkedInPostElements();
    if (currentPosts.length > initialPostCount) {
      return true;
    }

    for (const post of currentPosts) {
      const id = this.getPostId(post);
      if (!this.processedPostIds.has(id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if max posts limit was reached.
   */
  private isMaxPostsReached(): boolean {
    return this.totalPostsProcessed >= this.options.maxPosts;
  }

  /**
   * Check if max runtime limit was reached.
   */
  private isMaxRuntimeReached(): boolean {
    if (this.options.maxRuntimeMs === Infinity) return false;
    return Date.now() - this.startTime >= this.options.maxRuntimeMs;
  }

  /**
   * Clean up observers and timers from wait cycle.
   */
  private cleanupWait(): void {
    if (this.activeObserver) {
      this.activeObserver.disconnect();
      this.activeObserver = null;
    }
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    if (this.activePolling) {
      clearInterval(this.activePolling);
      this.activePolling = null;
    }
  }

  /**
   * Full cleanup on stop.
   */
  private cleanup(): void {
    this.cleanupWait();
    this.resumeResolver = null;
  }
}

// Export singleton instance and top-level helper functions as required
export const defaultAutoScrollController = new AutoScrollController();

export function startAutoScroll(options?: AutoScrollOptions): Promise<void> {
  return defaultAutoScrollController.startAutoScroll(options);
}

export function pauseAutoScroll(): void {
  defaultAutoScrollController.pauseAutoScroll();
}

export function resumeAutoScroll(): void {
  defaultAutoScrollController.resumeAutoScroll();
}

export function stopAutoScroll(): void {
  defaultAutoScrollController.stopAutoScroll();
}

export function isRunning(): boolean {
  return defaultAutoScrollController.isRunning();
}
