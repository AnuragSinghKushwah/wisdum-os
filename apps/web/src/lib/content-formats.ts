/** The platforms a draft can be written for, in the order they are offered. `value` is the opportunity type the API expects. */
export const CONTENT_PLATFORMS = [
  { value: 'linkedin_post', label: 'LinkedIn post', hint: 'Hook, body and a carousel outline' },
  { value: 'x_thread', label: 'X thread', hint: 'Numbered posts, 280 characters each' },
  { value: 'newsletter', label: 'Newsletter', hint: 'Subject lines and an edition' },
  { value: 'blog_post', label: 'Blog post', hint: 'Long-form article' },
  { value: 'youtube_script', label: 'YouTube script', hint: 'Hook, scenes and description' },
  { value: 'podcast_outline', label: 'Podcast outline', hint: 'Segments and talking points' },
] as const;

export type ContentPlatformValue = (typeof CONTENT_PLATFORMS)[number]['value'];
