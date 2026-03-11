An assistant ... For the radio

## Offline Assistance with RFML and Local LLMs
This project is configured out-of-the-box to be a natural-language "Radio Worker" using Radio Frequency Machine Learning (RFML) concepts. 
The application defaults to looking for a model named `rfml` via a local API like [Ollama](https://ollama.com/) or LM Studio.

### How to use offline:
1. Install [Ollama](https://ollama.com/) (or another local provider like LM Studio).
2. Create or run your preferred RFML-capable model (or tag an existing one as `rfml`):
   ```bash
   ollama run rfml
   ```
   *(Alternatively, you can just change the model name in settings to `gemma3:8b` or `qwen3.5:9b` depending on what you have installed.)*
3. Open the application Settings and ensure the **API Base URL** is set to `http://localhost:11434/v1` and the **Model Name** is set to `rfml` (or your model of choice).

### Natural Language Operations
The AI acts as an RFML specialist and semi-chatbot. Tell the AI what you want to do (e.g., "Tune the radio to 14.074 MHz in USB mode"), and it will automatically control the dashboard using internal tags.

### Tested Models
02 MAR 2026 : tested with several offline available models Gemma 3 8B preforms the best for its size ..... smaller models can be used but must be fine tuned
08 MAR 2026 : testing with Qwen 3.5 9B  is looking promising 

### Credits and Licensing
* [Google Gemma 3 Documentation](https://ai.google.dev/gemma/docs)
* [Qwen Documentation](https://qwenlm.github.io/)
* [UCSB RFML Research](https://wcsl.ece.ucsb.edu/radio-frequency-machine-learning-rfml)

