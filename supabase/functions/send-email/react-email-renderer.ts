import { render } from "https://esm.sh/@react-email/render@0.0.7"

export class ReactEmailRenderer {
  static async renderToHtml(component: any): Promise<string> {
    try {
      return await render(component)
    } catch (error) {
      console.error('Error rendering React Email component:', error)
      throw new Error('Failed to render email template')
    }
  }

  static async renderToText(component: any): Promise<string> {
    try {
      return await render(component, { plainText: true })
    } catch (error) {
      console.error('Error rendering React Email component to text:', error)
      // Fallback to basic text extraction
      const html = await render(component)
      return this.htmlToText(html)
    }
  }

  private static htmlToText(html: string): string {
    // Basic HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }
}