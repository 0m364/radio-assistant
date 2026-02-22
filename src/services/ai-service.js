class AIService {
    constructor() {
        this.config = {
            apiKey: '',
            baseUrl: '',
            model: 'gpt-3.5-turbo'
        };
    }

    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log("AI Service configured:", this.config.baseUrl, this.config.model);
    }

    async sendPrompt(messages) {
        if (!this.config.baseUrl) {
            throw new Error("AI API Base URL not configured. Please set it in Settings.");
        }

        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            } else {
                throw new Error("No choices in AI response");
            }
        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }

    async analyzeTraffic(text) {
        const systemPrompt = `You are a Military SIGINT Analyst. Analyze the intercepted radio transmission.

        Return a JSON object with these EXACT keys:
        - type: (e.g., "Military Air", "HFGCS", "Numbers Station", "Maritime", "Civilian", "Unknown")
        - urgency: (FLASH, IMMEDIATE, PRIORITY, ROUTINE)
        - cipher_status: (CLEAR, ENCRYPTED, CODED)
        - callsign_source: (The sender's callsign, or null)
        - callsign_dest: (The recipient's callsign, or null)
        - summary: (Tactical summary, max 15 words)
        - keywords: (Array of critical keywords found, e.g., "SKYKING", "MAYDAY", "VAMPIRE")

        If the message contains random numbers or letters (like "Z4X" or "481"), mark as CODED or ENCRYPTED.
        If it mentions "SKYKING", urgency is FLASH.
        If it mentions "MAYDAY" or "PAN PAN", urgency is IMMEDIATE.

        Only return the JSON.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ];

        try {
            const content = await this.sendPrompt(messages);
            // Attempt to parse JSON
            try {
                // Find JSON block if wrapped in markdown
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return JSON.parse(content);
            } catch (e) {
                // Fallback if AI didn't return valid JSON
                console.warn("AI returned invalid JSON, falling back.", content);
                return {
                    type: 'Unknown',
                    urgency: 'ROUTINE',
                    cipher_status: 'CLEAR',
                    callsign_source: 'UNKNOWN',
                    callsign_dest: 'UNKNOWN',
                    summary: content.substring(0, 50) + "...",
                    keywords: []
                };
            }
        } catch (error) {
            console.error("AI Analysis Error:", error);
            // Fallback for network error
            return {
                type: 'Error',
                urgency: 'ROUTINE',
                cipher_status: 'UNKNOWN',
                callsign_source: 'N/A',
                callsign_dest: 'N/A',
                summary: "Analysis Failed: " + error.message,
                keywords: []
            };
        }
    }
}

module.exports = new AIService();
