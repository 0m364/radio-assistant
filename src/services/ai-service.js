class AIService {
    constructor() {
        this.config = {
            apiKey: '',
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-3.5-turbo'
        };
    }

    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log("AI Service configured:", this.config.baseUrl, this.config.model);
    }

    async sendPrompt(messages) {
        // Simple check: if not localhost and no key, warn. But some local servers might use https/remote without auth if configured so.
        // For now, let's just try.

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
        const systemPrompt = `Analyze the following radio transmission.
        Return a JSON object with these keys:
        - type: (Civilian, Emergency, Military, Unknown)
        - priority: (Low, Medium, High, CRITICAL)
        - summary: (Short summary of content, max 10 words)
        - entities: (Array of callsigns, locations, or names mentioned)

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
                return {
                    type: 'Unknown',
                    priority: 'Low',
                    summary: content.substring(0, 50) + "...",
                    entities: []
                };
            }
        } catch (error) {
            console.error("AI Analysis Error:", error);
            return {
                type: 'Error',
                priority: 'Low',
                summary: "Analysis Failed",
                entities: []
            };
        }
    }
}

module.exports = new AIService();
