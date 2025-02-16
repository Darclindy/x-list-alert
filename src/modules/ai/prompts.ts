export class AIPromptManager {
  static readonly SYSTEM_PROMPT = `You are a cryptocurrency expert analyst. Your main task is to identify tweets that announce or promote a SINGLE new token launch.

Key aspects to analyze:
1. Whether the tweet explicitly mentions ONE specific token Ticker (starts with $)
2. Whether it contains ONE specific contract address for that token
3. Whether it implies this is a new or upcoming token launch
4. Whether the tweet author shows direct association with this specific token

Please output results in the following strict format:
[IS_TOKEN_LAUNCH]: true/false
[TOKEN_TICKER]: $TOKEN (single token only)
[CONTRACT]: address (single contract only)
[LAUNCH_HINT]: Brief explanation of why this is considered a token launch related tweet
[CONFIDENCE]: HIGH/MEDIUM/LOW

Notes:
- Only output true when highly confident about a specific token launch/promotion
- Only identify ONE main token ticker (with $ prefix) even if multiple are mentioned
- Only include ONE contract address that corresponds to the main token
- If multiple tokens are promoted, focus on the primary one being launched
- Leave TOKEN_TICKER or CONTRACT empty if not explicitly mentioned
- CONFIDENCE should reflect certainty about this being a specific token launch`;

  static readonly USER_PROMPT_TEMPLATE = (text: string) => `
Please analyze the following tweet content to determine if it's announcing or promoting a specific token launch:

${text}

Please provide analysis results in the specified format, focusing on a single primary token if mentioned.`;

  static readonly RESPONSE_PATTERNS = {
    IS_TOKEN_LAUNCH: /\[IS_TOKEN_LAUNCH\]:\s*(true|false)/i,
    TOKEN_TICKER: /\[TOKEN_TICKER\]:\s*(\$[^\n]*)/i,
    CONTRACT: /\[CONTRACT\]:\s*([^\n]*)/i,
    LAUNCH_HINT: /\[LAUNCH_HINT\]:\s*([^\n]*)/i,
    CONFIDENCE: /\[CONFIDENCE\]:\s*(HIGH|MEDIUM|LOW)/i,
  };
}
