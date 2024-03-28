import '@intuned/playwright-core';

declare module '@intuned/playwright-core' {
  interface BrowserContext {
    /**
     * async method to inspect a single selector on the screen
     */
    intunedDisableRecorder(): Promise<{
      actions: Array<string>;
    }>;

    /**
     * async method to inspect a single selector on the screen
     * @param params
     */
    intunedEnableRecorder(params: {
      language: string;
    }): Promise<void>;

    /**
     * async method to inspect a single selector on the screen
     * @param params
     */
    intunedInspectSingleSelector(params: {
      language: string;
    }): Promise<{
      selector: string;
    }>;
  }
}