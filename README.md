An assistant ... For the radio

## Offline Assistance with Gemma 3
This project is configured out-of-the-box to work with Google's Gemma 3 model for offline AI assistance via [Ollama](https://ollama.com/). The 8B model is recommended (`gemma3:8b`) for its balance of performance and reasoning capabilities, although smaller variants can be used if finetuned for radio contexts.

### How to use offline:
1. Install [Ollama](https://ollama.com/).
2. Pull and run the model in your terminal:
   ```bash
   ollama run gemma3:8b
   ```
3. Open the application Settings and ensure the **API Base URL** is set to `http://localhost:11434/v1` and the **Model Name** is set to `gemma3:8b`.

### Credits and Licensing
All credit to Google for the Gemma 3 model.
* [Google Gemma 3 Documentation](https://ai.google.dev/gemma/docs)
* [Google Gemma 3 Terms/License](https://ai.google.dev/gemma/terms)

### Alternative: Qwen 3.5 9B
If you prefer, you can also use the Qwen 3.5 9B model as an alternative for offline assistance. Qwen models are highly capable and developed by Alibaba Cloud.

1. Install [Ollama](https://ollama.com/).
2. Pull and run the model:
   ```bash
   ollama run qwen3.5:9b
   ```
3. Update the **Model Name** in the Settings panel to `qwen3.5:9b`.

* [Qwen Documentation](https://qwenlm.github.io/)
* [Qwen Licensing Information](https://github.com/QwenLM/Qwen/blob/main/LICENSE)
