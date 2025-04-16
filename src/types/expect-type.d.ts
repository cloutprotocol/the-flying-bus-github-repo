
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

interface CustomMatchers<R = unknown> {
  toBeInTheDocument(): R;
  toBeDisabled(): R;
  toBeEnabled(): R;
  toBeEmpty(): R;
  toBeInvalid(): R;
  toBeRequired(): R;
  toBeValid(): R;
  toBeVisible(): R;
  toContainElement(element: HTMLElement | null): R;
  toContainHTML(htmlText: string): R;
  toHaveAttribute(attr: string, value?: string): R;
  toHaveClass(...classNames: string[]): R;
  toHaveFocus(): R;
  toHaveFormValues(expectedValues: Record<string, any>): R;
  toHaveStyle(css: string): R;
  toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
  toHaveValue(value?: string | string[] | number): R;
  toBeChecked(): R;
  toBePartiallyChecked(): R;
  toHaveDescription(text?: string | RegExp): R;
}

declare global {
  namespace Vi {
    interface Assertion extends CustomMatchers {}
    interface AsymmetricMatchersContaining extends CustomMatchers {}
  }
}
