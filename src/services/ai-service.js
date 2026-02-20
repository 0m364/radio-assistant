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
}

module.exports = new AIService();
