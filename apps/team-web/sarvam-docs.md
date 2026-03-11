---

title: Speech-to-Text APIs
description: >-
Complete overview of Sarvam AI Speech-to-Text APIs including real-time, batch,
and streaming options. Process audio with Saarika and Saaras models for
high-accuracy transcription.
icon: code
canonical-url: '[https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/overview](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/overview)'
'og:title': Speech-to-Text APIs Overview - Real-time & Batch Processing by Sarvam AI
'og:description': >-
Comprehensive guide to Sarvam AI speech-to-text APIs. Includes real-time,
batch, and streaming options with Saarika and Saaras models for Indian
language transcription.
'og:type': article
'og:site_name': Sarvam AI Developer Documentation
'og:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:title': Speech-to-Text APIs Overview - Real-time & Batch Processing by Sarvam AI
'twitter:description': >-
Comprehensive guide to Sarvam AI speech-to-text APIs. Includes real-time,
batch, and streaming options with Saarika and Saaras models for Indian
language transcription.
'twitter:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'twitter:site': '@SarvamAI'

---

<p>
  Sarvam AI offers powerful speech recognition models:
</p>

<CardGroup cols={2}>
  <Card title="Saaras v3 (Recommended)" icon="bolt" href="/api-reference-docs/getting-started/models/saaras">
    State-of-the-art ASR model with flexible output modes: transcribe, translate, verbatim, transliterate, and codemix. Best choice for new integrations.
  </Card>

  <Card title="Saarika v2.5" icon="microphone" href="/api-reference-docs/getting-started/models/saarika">
    ASR model that transcribes Indian language speech into the same spoken language. Will be deprecated soon - migrate to Saaras v3.
  </Card>
</CardGroup>

## API Types

<CardGroup cols={3}>
  <Card title="REST API" icon="bolt" href="/api-reference-docs/api-guides-tutorials/speech-to-text/rest-api">
    Synchronous processing for files under 30 seconds.
  </Card>

  <Card title="Batch API" icon="inbox" href="/api-reference-docs/api-guides-tutorials/speech-to-text/batch-api">
    Asynchronous processing for files up to 1 hour.
  </Card>

  <Card title="Streaming API" icon="wave-square" href="/api-reference-docs/api-guides-tutorials/speech-to-text/streaming-api">
    Real-time audio streaming with instant results.
  </Card>
</CardGroup>

## Supported Audio Formats & MIME Types

The STT and STTT REST and Batch APIs support over 10 major audio formats and MIME type variants.
Supported formats and MIME types are listed below:

| Format Group                  | Supported MIME Types                        |
| ----------------------------- | ------------------------------------------- |
| **MP3 Variants**              | `mpeg`, `mp3`, `mpeg3`, `x-mpeg-3`, `x-mp3` |
| **WAV Variants**              | `wav`, `x-wav`, `wave`                      |
| **AAC Variants**              | `aac`, `x-aac`                              |
| **AIFF Variants**             | `aiff`, `x-aiff`                            |
| **OGG / Opus Formats**        | `ogg`, `opus`                               |
| **FLAC Variants (Lossless)**  | `flac`, `x-flac`                            |
| **MP4 / M4A Audio**           | `mp4`, `x-m4a`                              |
| **AMR (Narrowband)**          | `amr`                                       |
| **WMA (Windows Media Audio)** | `x-ms-wma`                                  |
| **WEBM (Audio & Video)**      | `webm`, `webm`                              |
| **PCM Formats**               | `pcm_s16le`, `pcm_l16`, `pcm_raw`           |

<Note>
  For most audio formats, our API automatically detects the codec. However, when
  using PCM formats (`pcm_s16le`, `pcm_l16`, `pcm_raw`), you must explicitly
  specify the `input_audio_codec` parameter. PCM files are only supported at
  16kHz sample rate.
</Note>

<Warning>
  **WebSocket/Streaming APIs:** The STT and STTT WebSocket streaming APIs only support **WAV** and **raw PCM** formats (`wav`, `pcm_s16le`, `pcm_l16`, `pcm_raw`). Other audio formats are not supported for real-time streaming.
</Warning>

---

## Technical Capabilities

<CardGroup cols={2}>
  <Card title="Language Support" icon="language">
    * 22 Indian languages (Saaras v3)
    * Automatic language detection
    * Code-mixing support
    * Multi-speaker handling
  </Card>

  <Card title="Advanced Processing" icon="wand-magic-sparkles">
    * Speaker diarization (Batch API)
    * Timestamp generation
    * Entity preservation
    * Telephony optimization
  </Card>
</CardGroup>

## Next Steps

<Steps>
  <Step title="Choose Your API">
    Select the appropriate API type based on your use case.
  </Step>

  <Step title="Get API Key">
    Sign up and get your API key from the
    [dashboard](https://dashboard.sarvam.ai).
  </Step>

  <Step title="Go Live">
    Deploy your integration and monitor usage in the dashboard.
  </Step>
</Steps>

<Note>
  Need help choosing the right API? Contact us on
  [discord](https://discord.com/invite/5rAsykttcs) for guidance.
</Note>

---

title: Speech-to-Text Rest API
description: >-
Process short audio files synchronously with immediate response. Instant
transcription and translation for quick audio processing with multiple format
support.
icon: bolt
canonical-url: '[https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/rest-api](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/rest-api)'
'og:title': Speech-to-Text REST API - Instant Audio Transcription by Sarvam AI
'og:description': >-
Process short audio files synchronously with Sarvam AI's REST API. Instant
transcription results with simple integration and multiple audio format
support.
'og:type': article
'og:site_name': Sarvam AI Developer Documentation
'og:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:title': Speech-to-Text REST API - Instant Audio Transcription by Sarvam AI
'twitter:description': >-
Process short audio files synchronously with Sarvam AI's REST API. Instant
transcription results with simple integration and multiple audio format
support.
'twitter:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'twitter:site': '@SarvamAI'

---

<h3>
  Synchronous Processing
</h3>

<p>
  Process short audio files with immediate response. Best for quick
  transcriptions and testing with a maximum duration of 30 seconds.
</p>

## Saaras v3: State-of-the-Art Speech Recognition (Recommended)

Saaras v3 is our latest state-of-the-art speech recognition model with flexible output formats. It supports multiple modes for different use cases: transcribe, translate, verbatim, transliterate, and codemix.

<Note>
  **Recommended for new integrations.** Saaras v3 offers improved accuracy and flexible output modes. [Learn more about Saaras v3](/api-reference-docs/getting-started/models/saaras).
</Note>

### Output Modes

| Mode                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `transcribe` (default) | Standard transcription in the original language |
| `translate`            | Translates speech to English                    |
| `verbatim`             | Exact word-for-word transcription               |
| `translit`             | Romanization to Latin script                    |
| `codemix`              | Code-mixed text output                          |

### Code Examples for Saaras v3

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    from sarvamai import SarvamAI

    client = SarvamAI(
        api_subscription_key="YOUR_SARVAM_API_KEY",
    )

    # Transcribe mode (default)
    response = client.speech_to_text.transcribe(
        file=open("audio.wav", "rb"),
        model="saaras:v3",
        mode="transcribe"  # or "translate", "verbatim", "translit", "codemix"
    )

    print(response)
    ```

  </CodeBlock>

  <CodeBlock title="JavaScript">
    ```javascript
    import {SarvamAIClient} from "sarvamai";
    import fs from 'fs';

    const client = new SarvamAIClient({
        apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
    });

    const audioFile = fs.createReadStream("recording.wav");

    const response = await client.speechToText.transcribe({
        file: audioFile,
        model: "saaras:v3",
        mode: "transcribe"  // or "translate", "verbatim", "translit", "codemix"
    });

    console.log(response);
    ```

  </CodeBlock>

  <CodeBlock title="cURL">
    ```bash
    curl -X POST https://api.sarvam.ai/speech-to-text \
      -H "api-subscription-key: YOUR_SARVAM_API_KEY" \
      -H "Content-Type: multipart/form-data" \
      -F model="saaras:v3" \
      -F mode="transcribe" \
      -F file=@"file.wav;type=audio/wav"
    ```
  </CodeBlock>
</CodeGroup>

<Note>
  Check out our detailed [API Reference](/api-reference-docs/speech-to-text/transcribe)
  to explore all available options.
</Note>

---

## Legacy Models (Deprecated Soon)

<Warning>
  The following models will be deprecated soon. We recommend migrating to **Saaras v3** for new integrations.
</Warning>

### Saarika v2.5: Speech to Text Transcription

Saarika is a speech-to-text transcription model that excels in handling multi-speaker content, mixed language content, and conference recordings.

<Note>
  **Deprecation Notice:** Saarika v2.5 will be deprecated soon. Use [Saaras v3](/api-reference-docs/getting-started/models/saaras) with `mode="transcribe"` instead.
</Note>

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    from sarvamai import SarvamAI

    client = SarvamAI(
        api_subscription_key="YOUR_SARVAM_API_KEY",
    )

    response = client.speech_to_text.transcribe(
        file=open("audio.wav", "rb"),
        model="saaras:v3",
        mode="transcribe",
        language_code="hi-IN"
    )

    print(response)
    ```

  </CodeBlock>

  <CodeBlock title="cURL">
    ```bash
    curl -X POST https://api.sarvam.ai/speech-to-text \
      -H "api-subscription-key: YOUR_SARVAM_API_KEY" \
      -H "Content-Type: multipart/form-data" \
      -F model="saaras:v3" \
      -F mode="transcribe" \
      -F language_code="hi-IN" \
      -F file=@"file.wav;type=audio/wav"
    ```
  </CodeBlock>
</CodeGroup>

### Saaras v2.5: Speech to Text Translation

Saaras v2.5 is available in the Speech-to-Text Translate endpoint for translating speech directly to English.

<Note>
  **Deprecation Notice:** Saaras v2.5 will be deprecated soon. Use [Saaras v3](/api-reference-docs/getting-started/models/saaras) with `mode="translate"` instead.
</Note>

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    from sarvamai import SarvamAI

    client = SarvamAI(
        api_subscription_key="YOUR_SARVAM_API_KEY",
    )

    response = client.speech_to_text.translate(
        file=open("audio.wav", "rb"),
        model="saaras:v3",
        mode="translate"
    )

    print(response)
    ```

  </CodeBlock>

  <CodeBlock title="cURL">
    ```bash
    curl -X POST https://api.sarvam.ai/speech-to-text-translate \
      -H "api-subscription-key: YOUR_SARVAM_API_KEY" \
      -H "Content-Type: multipart/form-data" \
      -F file=@audio.wav \
      -F model="saaras:v3" \
      -F mode="translate"
    ```
  </CodeBlock>
</CodeGroup>

## API Response Format

### Speech to Text Transcription Response

| Field           | Type   | Description                                                                                       |
| --------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `request_id`    | string | Unique identifier for the request                                                                 |
| `transcript`    | string | The transcribed text from the audio file                                                          |
| `language_code` | string | BCP-47 language code of detected language (e.g., `hi-IN`). Returns `null` if no language detected |

```json
{
  "request_id": "20241115_12345678-1234-5678-1234-567812345678",
  "transcript": "नमस्ते, आप कैसे हैं?",
  "language_code": "hi-IN"
}
```

### Speech to Text Translation Response

| Field           | Type   | Description                                 |
| --------------- | ------ | ------------------------------------------- |
| `request_id`    | string | Unique identifier for the request           |
| `transcript`    | string | Translated text in English                  |
| `language_code` | string | BCP-47 code of the detected source language |

**Supported source languages:** `hi-IN`, `bn-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`, `gu-IN`, `en-IN`

```json
{
  "request_id": "20241115_12345678-1234-5678-1234-567812345678",
  "transcript": "Hello, how are you?",
  "language_code": "hi-IN"
}
```

## Error Responses

All errors return a JSON object with an `error` field containing details about what went wrong.

### Error Response Structure

```json
{
  "error": {
    "message": "Human-readable error description",
    "code": "error_code_for_programmatic_handling",
    "request_id": "unique_request_identifier"
  }
}
```

### Error Codes Reference

| HTTP Status | Error Code                   | When This Happens                                | What To Do                                       |
| ----------- | ---------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| `400`       | `invalid_request_error`      | Missing required parameters or malformed request | Check request format and required fields         |
| `403`       | `invalid_api_key_error`      | API key is invalid, missing, or expired          | Verify your API key in the dashboard             |
| `422`       | `unprocessable_entity_error` | Invalid audio format or file too large           | Use supported formats: WAV, MP3, AAC, FLAC, OGG  |
| `429`       | `insufficient_quota_error`   | API quota or rate limit exceeded                 | Wait for reset or upgrade your plan              |
| `500`       | `internal_server_error`      | Unexpected server error                          | Retry the request; contact support if persistent |
| `503`       | `rate_limit_exceeded_error`  | Service temporarily overloaded                   | Retry with exponential backoff                   |

### Example Error Response

```json
{
  "error": {
    "message": "Unsupported audio format. Supported formats: WAV, MP3, AAC, FLAC, OGG",
    "code": "unprocessable_entity_error",
    "request_id": "20241115_abc12345"
  }
}
```

<Accordion title="Error Handling Code Example">
  ```python
  from sarvamai import SarvamAI
  from sarvamai.core.api_error import ApiError

client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

try:
response = client.speech_to_text.transcribe(
file=open("audio.wav", "rb"),
model="saaras:v3",
mode="transcribe"
)
print(response.transcript)
except ApiError as e:
if e.status_code == 400:
print(f"Bad request: {e.body}")
elif e.status_code == 403:
print("Invalid API key. Check your credentials.")
elif e.status_code == 429:
print("Rate limit exceeded. Wait and retry.")
elif e.status_code == 503:
print("Service overloaded. Retry with backoff.")
else:
print(f"Error {e.status_code}: {e.body}")

````
</Accordion>

## Next Steps

<Steps>
<Step title="Get API Key">
  Sign up and get your API key from the
  [dashboard](https://dashboard.sarvam.ai).
</Step>

<Step title="Test Integration">
  Try the API with sample audio files.
</Step>

<Step title="Go Live">
  Deploy your integration and monitor usage.
</Step>
</Steps>

<Note>
Need help? Contact us on [discord](https://discord.com/invite/5rAsykttcs) for
guidance.
</Note>

***

title: Batch Speech-to-Text API
description: >-
Process large audio files using synchronous or asynchronous methods. Handle up
to 1-hour recordings with speaker diarization, timestamps, and advanced
transcription features.
icon: inbox
canonical-url: '[https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/batch](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/batch)'
'og:title': Batch Speech-to-Text API
'og:description': >-
Process large audio files using synchronous or asynchronous methods with
Sarvam AI's batch speech-to-text API.
'og:type': article
'og:site\_name': Sarvam AI Developer Documentation
'og:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image\_3\_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary\_large\_image
'twitter:title': Batch Speech-to-Text API
'twitter:description': >-
Process large audio files using synchronous or asynchronous methods with
Sarvam AI's batch speech-to-text API.
'twitter:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image\_3\_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'twitter:site': '@SarvamAI'
---------------------------

<p>
Process long audio files (up to 1 hour) using synchronous or asynchronous
methods. Ideal for meetings, interviews, call center recordings, and
large-scale content processing pipelines.
</p>

<ul>
<li>
  Supports files up to 1 hour long
</li>

<li>
  Advanced transcription and translation
</li>

<li>
  Speaker diarization and timestamp support
</li>
</ul>

<p>
<strong>Note:</strong> You can upload up to <code>20</code> audio files per
job.
</p>

<Note>
**Model Availability:** The Batch API supports **Saaras v3** (recommended) with multiple output modes via the `mode` parameter. Legacy models **Saarika v2.5** and **Saaras v2.5** are also available but we recommend switching to **Saaras v3** for the best accuracy and features.
</Note>

### Supported Modes (Saaras v3)

| Mode         | Description                                                        | Output                           |
| ------------ | ------------------------------------------------------------------ | -------------------------------- |
| `transcribe` | Standard transcription in the original language                    | Text in source language          |
| `translate`  | Transcribe and translate to English                                | English text                     |
| `verbatim`   | Word-for-word transcription including filler words and repetitions | Verbatim text in source language |
| `translit`   | Transcribe and transliterate to Roman script                       | Romanized text                   |
| `codemix`    | Transcribe code-mixed speech (e.g., Hindi-English) naturally       | Code-mixed text                  |

## Features

<CardGroup cols={2}>
<Card title="Processing" icon="inbox">
  * Supports up to 1 hour audio
  * Synchronous and asynchronous job-based API
  * Upload multiple files per job
</Card>

{" "}

<Card title="Audio & Language Support" icon="language">
  * Indian languages and English
  * Automatic language detection
  * Diarization and timestamp support
</Card>

<Card title="Timestamps" icon="clock">
  * Chunk-level timestamp support
  * Useful for subtitle alignment and audio navigation
  * Provides start and end times for each segment of text
</Card>

<Card title="Speaker Diarization" icon="users">
  * Identify multiple speakers
  * Output includes speaker labels (SPEAKER\_00, etc.)
  * Ideal for meetings and interviews
</Card>
</CardGroup>

## Code Examples

### Choosing a Mode

To switch between modes, simply change the `mode` parameter in your job creation call. The rest of the workflow (upload, start, wait, download) remains the same.

<Tabs>
<Tab title="Transcribe">
  Transcribe audio in the original language.

  <CodeGroup>
    <CodeBlock title="Python" active>
      ```python
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="transcribe",         # Standard transcription
          language_code="hi-IN",
          with_diarization=True,
          num_speakers=2,
      )
      ```
    </CodeBlock>

    <CodeBlock title="JavaScript">
      ```javascript
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "transcribe",         // Standard transcription
          languageCode: "hi-IN",
          withDiarization: true,
          numSpeakers: 2,
      });
      ```
    </CodeBlock>
  </CodeGroup>
</Tab>

<Tab title="Translate">
  Transcribe and translate audio to English.

  <CodeGroup>
    <CodeBlock title="Python" active>
      ```python
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="translate",          # Translate to English
          language_code="hi-IN",
          with_diarization=True,
          num_speakers=2,
      )
      ```
    </CodeBlock>

    <CodeBlock title="JavaScript">
      ```javascript
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "translate",          // Translate to English
          languageCode: "hi-IN",
          withDiarization: true,
          numSpeakers: 2,
      });
      ```
    </CodeBlock>
  </CodeGroup>
</Tab>

<Tab title="Verbatim">
  Word-for-word transcription including filler words and repetitions.

  <CodeGroup>
    <CodeBlock title="Python" active>
      ```python
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="verbatim",           # Include fillers & repetitions
          language_code="hi-IN",
          with_diarization=True,
          num_speakers=2,
      )
      ```
    </CodeBlock>

    <CodeBlock title="JavaScript">
      ```javascript
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "verbatim",           // Include fillers & repetitions
          languageCode: "hi-IN",
          withDiarization: true,
          numSpeakers: 2,
      });
      ```
    </CodeBlock>
  </CodeGroup>
</Tab>

<Tab title="Translit">
  Transcribe and transliterate to Roman script.

  <CodeGroup>
    <CodeBlock title="Python" active>
      ```python
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="translit",           # Romanized output
          language_code="hi-IN",
          with_diarization=True,
          num_speakers=2,
      )
      ```
    </CodeBlock>

    <CodeBlock title="JavaScript">
      ```javascript
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "translit",           // Romanized output
          languageCode: "hi-IN",
          withDiarization: true,
          numSpeakers: 2,
      });
      ```
    </CodeBlock>
  </CodeGroup>
</Tab>

<Tab title="Codemix">
  Transcribe code-mixed speech (e.g., Hindi-English) naturally.

  <CodeGroup>
    <CodeBlock title="Python" active>
      ```python
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="codemix",            # Handle mixed-language speech
          language_code="hi-IN",
          with_diarization=True,
          num_speakers=2,
      )
      ```
    </CodeBlock>

    <CodeBlock title="JavaScript">
      ```javascript
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "codemix",            // Handle mixed-language speech
          languageCode: "hi-IN",
          withDiarization: true,
          numSpeakers: 2,
      });
      ```
    </CodeBlock>
  </CodeGroup>
</Tab>
</Tabs>

### Full Example

Once you've created a job with your chosen mode, the upload, processing, and download workflow is the same for all modes:

<CodeGroup>
<CodeBlock title="Python (Sync)" active>
  ```python
  from sarvamai import SarvamAI

  def main():
      client = SarvamAI(api_subscription_key="YOUR_API_KEY")

      # Create batch job — change mode as needed
      job = client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="transcribe",
          language_code="en-IN",
          with_diarization=True,
          num_speakers=2
      )

      # Upload and process files
      audio_paths = ["path/to/audio1.mp3", "path/to/audio2.mp3"]
      job.upload_files(file_paths=audio_paths)
      job.start()

      # Wait for completion
      job.wait_until_complete()

      # Check file-level results
      file_results = job.get_file_results()

      print(f"\nSuccessful: {len(file_results['successful'])}")
      for f in file_results['successful']:
          print(f"  ✓ {f['file_name']}")

      print(f"\nFailed: {len(file_results['failed'])}")
      for f in file_results['failed']:
          print(f"  ✗ {f['file_name']}: {f['error_message']}")

      # Download outputs for successful files
      if file_results['successful']:
          job.download_outputs(output_dir="./output")
          print(f"\nDownloaded {len(file_results['successful'])} file(s) to: ./output")

  if __name__ == "__main__":
      main()
  ```
</CodeBlock>

<CodeBlock title="Python (Async)">
  ```python
  import asyncio
  from sarvamai import AsyncSarvamAI

  async def main():
      client = AsyncSarvamAI(api_subscription_key="YOUR_API_KEY")

      # Create batch job — change mode as needed
      job = await client.speech_to_text_job.create_job(
          model="saaras:v3",
          mode="transcribe",
          language_code="en-IN",
          with_diarization=True,
          num_speakers=2
      )

      # Upload and process files
      audio_paths = ["path/to/audio1.mp3", "path/to/audio2.mp3"]
      await job.upload_files(file_paths=audio_paths)
      await job.start()

      # Wait for completion
      await job.wait_until_complete()

      # Check file-level results
      file_results = await job.get_file_results()

      print(f"\nSuccessful: {len(file_results['successful'])}")
      for f in file_results['successful']:
          print(f"  ✓ {f['file_name']}")

      print(f"\nFailed: {len(file_results['failed'])}")
      for f in file_results['failed']:
          print(f"  ✗ {f['file_name']}: {f['error_message']}")

      # Download outputs for successful files
      if file_results['successful']:
          await job.download_outputs(output_dir="./output")
          print(f"\nDownloaded {len(file_results['successful'])} file(s) to: ./output")

  if __name__ == "__main__":
      asyncio.run(main())
  ```
</CodeBlock>

<CodeBlock title="JavaScript">
  ```javascript
  import { SarvamAIClient } from "sarvamai";

  async function main() {
      const client = new SarvamAIClient({
          apiSubscriptionKey: "YOUR_API_KEY"
      });

      // Create batch job — change mode as needed
      const job = await client.speechToTextJob.createJob({
          model: "saaras:v3",
          mode: "transcribe",
          languageCode: "en-IN",
          withDiarization: true,
          numSpeakers: 2
      });

      // Upload and process files
      const audioPaths = ["path/to/audio1.mp3", "path/to/audio2.mp3"];
      await job.uploadFiles(audioPaths);
      await job.start();

      // Wait for completion
      await job.waitUntilComplete();

      // Check file-level results
      const fileResults = await job.getFileResults();

      console.log(`\nSuccessful: ${fileResults.successful.length}`);
      for (const f of fileResults.successful) {
          console.log(`  ✓ ${f.file_name}`);
      }

      console.log(`\nFailed: ${fileResults.failed.length}`);
      for (const f of fileResults.failed) {
          console.log(`  ✗ ${f.file_name}: ${f.error_message}`);
      }

      // Download outputs for successful files
      if (fileResults.successful.length > 0) {
          await job.downloadOutputs("./output");
          console.log(`\nDownloaded ${fileResults.successful.length} file(s) to: ./output`);
      }
  }

  main().catch(console.error);
  ```
</CodeBlock>
</CodeGroup>

## Speaker Diarization

Speaker diarization automatically identifies and separates different speakers in an audio recording. This feature is ideal for meetings, interviews, and multi-speaker conversations where you need to know who said what.

### Capabilities

* Identify multiple speakers in a single audio file
* Assign unique speaker IDs (speaker 1, speaker 2, etc.)
* Provide timestamps for each speaker segment
* Works with up to 8 speakers per audio file

### Output Format

When `with_diarization=True` is passed in the request, the response includes a `diarized_transcript` field with detailed speaker information:

```json
{
"request_id": "20260130_d8d2c0e6-1eb6-4982-8045-b267d5165c44",
"transcript": "Full transcript text...",
"timestamps": {
  "words": ["Hello, how can I help you today?", "I have a question."],
  "start_time_seconds": [0.01, 2.8],
  "end_time_seconds": [2.5, 4.2]
},
"diarized_transcript": {
  "entries": [
    {
      "transcript": "Hello, how can I help you today?",
      "start_time_seconds": 0.01,
      "end_time_seconds": 2.5,
      "speaker_id": "0"
    },
    {
      "transcript": "I have a question.",
      "start_time_seconds": 2.8,
      "end_time_seconds": 4.2,
      "speaker_id": "1"
    }
  ]
},
"language_code": "en-IN"
}
````

Each entry contains:

- `transcript`: The text spoken by the speaker
- `start_time_seconds`: When the speaker started speaking (float)
- `end_time_seconds`: When the speaker stopped speaking (float)
- `speaker_id`: Unique identifier for the speaker (e.g., "0", "1")

<Note>
  The SarvamAI SDK supports both synchronous and asynchronous programming in
  Python. This refers to how your code interacts with the SDK, not how the
  server handles the processing of requests.
</Note>

## Webhook Support

For long-running batch jobs, you can use webhooks to receive notifications when jobs complete instead of polling for status updates.

### Setting Up Webhooks

When creating a job, include a `callback` parameter with your webhook URL and authentication token:

<CodeGroup>
  <CodeBlock title="Python (Async)" active>
    ```python
    from sarvamai import AsyncSarvamAI, BulkJobCallbackParams

    client = AsyncSarvamAI(api_subscription_key="YOUR_API_KEY")

    job = await client.speech_to_text_job.create_job(
        model="saaras:v3",
        mode="transcribe",
        with_diarization=True,
        callback=BulkJobCallbackParams(
            url="https://your-server.com/webhook-endpoint",
            auth_token="your-secret-token"
        )
    )
    ```

  </CodeBlock>

  <CodeBlock title="Python (Sync)">
    ```python
    from sarvamai import SarvamAI, BulkJobCallbackParams

    client = SarvamAI(api_subscription_key="YOUR_API_KEY")

    job = client.speech_to_text_job.create_job(
        model="saaras:v3",
        mode="transcribe",
        with_diarization=True,
        callback=BulkJobCallbackParams(
            url="https://your-server.com/webhook-endpoint",
            auth_token="your-secret-token"
        )
    )
    ```

  </CodeBlock>
</CodeGroup>

### Webhook Payload

When a job completes, Sarvam AI will send a POST request to your webhook URL with the following payload:

```json
{
  "job_id": "job_12345",
  "job_state": "COMPLETED",
  "results": {
    "transcripts": [...],
    "metadata": {...}
  },
  "error_message": null
}
```

### Webhook Server Example

Here's a simple FastAPI server to handle webhook callbacks:

```python
from fastapi import FastAPI, Request, HTTPException
import uvicorn

app = FastAPI()
VALID_TOKEN = "your-secret-token"

@app.post("/webhook-endpoint")
async def handle_webhook(request: Request):
    # Validate authentication
    token = request.headers.get("X-SARVAM-JOB-CALLBACK-TOKEN")
    if token != VALID_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")

    # Process the webhook data
    data = await request.json()
    job_id = data.get("job_id")
    job_state = data.get("job_state")

    if job_state == "COMPLETED":
        print(f"Job {job_id} completed successfully!")
        # Handle successful completion
    elif job_state == "FAILED":
        print(f"Job {job_id} failed!")
        # Handle failure

    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

<Note>
  Your webhook server must respond with a 200 status code within 30 seconds.
  Make sure your webhook URL is publicly accessible and uses HTTPS in production.
</Note>

## Next Steps

<Steps>
  <Step title="Choose Your API">
    Select the appropriate API type based on your use case.
  </Step>

  <Step title="Get API Key">
    Sign up and get your API key from the
    [dashboard](https://dashboard.sarvam.ai).
  </Step>

  <Step title="Go Live">
    Deploy your integration and monitor usage in the dashboard.
  </Step>
</Steps>

<Note>
  Need help choosing the right API? Contact us on
  [discord](https://discord.com/invite/5rAsykttcs) for guidance.
</Note>
***

title: Streaming Speech-to-Text API
description: >-
Real-time audio transcription and translation with WebSocket connections.
Low-latency streaming for live applications with instant results and
interactive features.
icon: wave-pulse
canonical-url: '[https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/streaming](https://docs.sarvam.ai/api-reference-docs/speech-to-text/apis/streaming)'
'og:title': Streaming Speech-to-Text API - Real-time WebSocket Transcription by Sarvam AI
'og:description': >-
Real-time audio transcription with Sarvam AI's streaming speech-to-text API.
WebSocket connections for live transcription, translation, and interactive
applications.
'og:type': article
'og:site_name': Sarvam AI Developer Documentation
'og:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'og:image:width': 1200
'og:image:height': 630
'twitter:card': summary_large_image
'twitter:title': Streaming Speech-to-Text API - Real-time WebSocket Transcription by Sarvam AI
'twitter:description': >-
Real-time audio transcription with Sarvam AI's streaming speech-to-text API.
WebSocket connections for live transcription, translation, and interactive
applications.
'twitter:image':
type: url
value: >-
[https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png](https://res.cloudinary.com/dvcb20x9a/image/upload/v1743510800/image_3_rpnrug.png)
'twitter:site': '@SarvamAI'

---

## Overview

Transform audio into text in real-time with our WebSocket-based streaming API. Built for applications requiring immediate speech processing with minimal delay.

<Note>
  **Model Availability:** The Streaming API supports **Saaras v3** (recommended) with multiple output modes via the `mode` parameter. Legacy models **Saarika v2.5** and **Saaras v2.5** are also available but we recommend switching to **Saaras v3** for the best accuracy and features.
</Note>

### Supported Modes (Saaras v3)

| Mode         | Description                                                        | Output                           |
| ------------ | ------------------------------------------------------------------ | -------------------------------- |
| `transcribe` | Standard transcription in the original language                    | Text in source language          |
| `translate`  | Transcribe and translate to English                                | English text                     |
| `verbatim`   | Word-for-word transcription including filler words and repetitions | Verbatim text in source language |
| `translit`   | Transcribe and transliterate to Roman script                       | Romanized text                   |
| `codemix`    | Transcribe code-mixed speech (e.g., Hindi-English) naturally       | Code-mixed text                  |

### Key Benefits

<CardGroup cols={3}>
  <Card title="Ultra-Low Latency" icon="zap">
    Get transcription results in milliseconds, not seconds. Process speech as it happens with near-instantaneous responses.
  </Card>

  <Card title="Multi-Language Support" icon="language">
    Support for 10+ Indian languages plus English with high accuracy transcription and translation capabilities.
  </Card>

  <Card title="Advanced Voice Detection" icon="microphone">
    Smart Voice Activity Detection (VAD) with customizable sensitivity for optimal speech boundary detection.
  </Card>
</CardGroup>

### Common Use Cases

- **Live Transcription**: Real-time captions for meetings, webinars, and broadcasts
- **Voice Assistants**: Interactive voice applications with immediate responses
- **Call Centers**: Live call transcription and analysis
- **Accessibility**: Real-time captioning for hearing-impaired users

<Note>
  **Audio Format Support**: Streaming APIs only support **two audio formats**:

- **WAV** (`wav`)
- **Raw PCM** (`pcm_s16le`, `pcm_l16`, `pcm_raw`)

Other formats like MP3, AAC, OGG, etc. are not supported for WebSocket streaming. Find sample audio files in our [GitHub cookbook](https://github.com/sarvamai/sarvam-ai-cookbook/tree/main/sample_data/stt).
</Note>

## Getting Started

Get up and running with streaming in minutes. Simply change the `mode` parameter to switch between transcription, translation, and other output formats.

### Choosing a Mode

<Tabs>
  <Tab title="Transcribe">
    Transcribe audio in the original language.

    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",              # Standard transcription
            language_code="en-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Transcription: {response}")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        const socket = await client.speechToTextStreaming.connect({
            model: "saaras:v3",
            mode: "transcribe",              // Standard transcription
            "language-code": "en-IN",
            high_vad_sensitivity: "true"
        });
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Translate">
    Transcribe and translate audio to English.

    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="translate",               # Translate to English
            language_code="hi-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Translation: {response}")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        const socket = await client.speechToTextStreaming.connect({
            model: "saaras:v3",
            mode: "translate",               // Translate to English
            "language-code": "hi-IN",
            high_vad_sensitivity: "true"
        });
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Verbatim">
    Word-for-word transcription including filler words and repetitions.

    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="verbatim",                # Include fillers & repetitions
            language_code="hi-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Verbatim: {response}")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        const socket = await client.speechToTextStreaming.connect({
            model: "saaras:v3",
            mode: "verbatim",                // Include fillers & repetitions
            "language-code": "hi-IN",
            high_vad_sensitivity: "true"
        });
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Translit">
    Transcribe and transliterate to Roman script.

    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="translit",                # Romanized output
            language_code="hi-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Transliteration: {response}")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        const socket = await client.speechToTextStreaming.connect({
            model: "saaras:v3",
            mode: "translit",                // Romanized output
            "language-code": "hi-IN",
            high_vad_sensitivity: "true"
        });
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Codemix">
    Transcribe code-mixed speech (e.g., Hindi-English) naturally.

    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="codemix",                 # Handle mixed-language speech
            language_code="hi-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Codemix: {response}")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        const socket = await client.speechToTextStreaming.connect({
            model: "saaras:v3",
            mode: "codemix",                 // Handle mixed-language speech
            "language-code": "hi-IN",
            high_vad_sensitivity: "true"
        });
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>
</Tabs>

### Full Example

Here's a complete working example. Change the `mode` parameter to switch between any of the supported modes:

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    import asyncio
    import base64
    from sarvamai import AsyncSarvamAI

    # Load your audio file
    with open("path/to/your/audio.wav", "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    async def basic_transcription():
        # Initialize client with your API key
        client = AsyncSarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Connect and transcribe — change mode as needed
        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",
            language_code="en-IN",
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(audio=audio_data)
            response = await ws.recv()
            print(f"Result: {response}")

    asyncio.run(basic_transcription())
    ```

  </CodeBlock>

  <CodeBlock title="JavaScript">
    ```javascript
    import { SarvamAIClient } from "sarvamai";
    import * as fs from "fs";

    function audioFileToBase64(filePath) {
      return fs.readFileSync(filePath).toString("base64");
    }

    async function basicTranscription() {
      const audioData = audioFileToBase64("path/to/your/audio.wav");

      const client = new SarvamAIClient({
        apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
      });

      // Connect — change mode as needed
      const socket = await client.speechToTextStreaming.connect({
        model: "saaras:v3",
        mode: "transcribe",
        "language-code": "en-IN",
        high_vad_sensitivity: "true"
      });

      socket.on("open", () => {
        socket.transcribe({
          audio: audioData,
          sample_rate: 16000,
          encoding: "audio/wav",
        });
      });

      socket.on("message", (response) => {
        console.log("Result:", response);
      });

      await socket.waitForOpen();
      await new Promise(resolve => setTimeout(resolve, 5000));
      socket.close();
    }

    basicTranscription();
    ```

  </CodeBlock>
</CodeGroup>

### Enhanced Processing with Voice Detection

Add smart voice activity detection for better accuracy and control:

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    import asyncio
    import base64
    from sarvamai import AsyncSarvamAI

    with open("path/to/your/audio.wav", "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    async def enhanced_transcription():
        client = AsyncSarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",              # Change mode as needed
            language_code="hi-IN",
            high_vad_sensitivity=True,       # Better voice detection
            vad_signals=True                # Get speech start/end signals
        ) as ws:
            await ws.transcribe(
                audio=audio_data,
                encoding="audio/wav",
                sample_rate=16000
            )

            async for message in ws:
                if message.get("type") == "speech_start":
                    print("Speech detected")
                elif message.get("type") == "speech_end":
                    print("Speech ended")
                elif message.get("type") == "transcript":
                    print(f"Result: {message.get('text')}")
                    break

    asyncio.run(enhanced_transcription())
    ```

  </CodeBlock>

  <CodeBlock title="JavaScript">
    ```javascript
    import { SarvamAIClient } from "sarvamai";
    import * as fs from "fs";

    function audioFileToBase64(filePath) {
      return fs.readFileSync(filePath).toString("base64");
    }

    async function enhancedTranscription() {
      const audioData = audioFileToBase64("path/to/your/audio.wav");

      const client = new SarvamAIClient({
        apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
      });

      const socket = await client.speechToTextStreaming.connect({
        model: "saaras:v3",
        mode: "transcribe",              // Change mode as needed
        "language-code": "hi-IN",
        high_vad_sensitivity: "true",
        vad_signals: "true"
      });

      socket.on("open", () => {
        socket.transcribe({
          audio: audioData,
          sample_rate: 16000,
          encoding: "audio/wav",
        });
      });

      socket.on("message", (message) => {
        if (message.type === "speech_start") {
          console.log("Speech detected");
        } else if (message.type === "speech_end") {
          console.log("Speech ended");
        } else if (message.type === "transcript") {
          console.log(`Result: ${message.text}`);
        }
      });

      await socket.waitForOpen();
      await new Promise(resolve => setTimeout(resolve, 10000));
      socket.close();
    }

    enhancedTranscription();
    ```

  </CodeBlock>
</CodeGroup>

### Instant Processing with Flush Signals

Force immediate processing without waiting for silence detection:

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    import asyncio
    import base64
    from sarvamai import AsyncSarvamAI

    with open("path/to/your/audio.wav", "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    async def instant_processing():
        client = AsyncSarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",              # Change mode as needed
            language_code="en-IN",
            flush_signal=True               # Enable manual control
        ) as ws:
            await ws.transcribe(
                audio=audio_data,
                encoding="audio/wav",
                sample_rate=16000
            )

            # Force immediate processing
            await ws.flush()

            async for message in ws:
                print(f"Result: {message}")
                break

    asyncio.run(instant_processing())
    ```

  </CodeBlock>

  <CodeBlock title="JavaScript">
    ```javascript
    import { SarvamAIClient } from "sarvamai";
    import * as fs from "fs";

    function audioFileToBase64(filePath) {
      return fs.readFileSync(filePath).toString("base64");
    }

    async function instantProcessing() {
      const audioData = audioFileToBase64("path/to/your/audio.wav");

      const client = new SarvamAIClient({
        apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
      });

      const socket = await client.speechToTextStreaming.connect({
        model: "saaras:v3",
        mode: "transcribe",              // Change mode as needed
        "language-code": "en-IN",
        flush_signal: "true"             // Enable manual control
      });

      socket.on("open", () => {
        socket.transcribe({
          audio: audioData,
          sample_rate: 16000,
          encoding: "audio/wav",
        });

        // Force processing after 2 seconds
        setTimeout(() => socket.flush(), 2000);
      });

      socket.on("message", (message) => {
        console.log(`Result: ${JSON.stringify(message)}`);
      });

      await socket.waitForOpen();
      await new Promise(resolve => setTimeout(resolve, 10000));
      socket.close();
    }

    instantProcessing();
    ```

  </CodeBlock>
</CodeGroup>

### Custom Audio Configuration

Optimize for your specific audio setup (e.g., 8kHz telephony audio):

<CodeGroup>
  <CodeBlock title="Python" active>
    ```python
    import asyncio
    import base64
    from sarvamai import AsyncSarvamAI

    with open("path/to/your/audio.wav", "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")

    async def custom_audio_config():
        client = AsyncSarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        async with client.speech_to_text_streaming.connect(
            model="saaras:v3",
            mode="transcribe",              # Change mode as needed
            language_code="kn-IN",
            sample_rate=8000,               # Match your audio
            input_audio_codec="pcm_s16le",  # Specify codec
            high_vad_sensitivity=True
        ) as ws:
            await ws.transcribe(
                audio=audio_data,
                encoding="audio/wav",
                sample_rate=8000             # Must match connection setting
            )

            response = await ws.recv()
            print(f"Result: {response}")

    asyncio.run(custom_audio_config())
    ```

  </CodeBlock>

  <CodeBlock title="JavaScript">
    ```javascript
    import { SarvamAIClient } from "sarvamai";
    import * as fs from "fs";

    function audioFileToBase64(filePath) {
      return fs.readFileSync(filePath).toString("base64");
    }

    async function customAudioConfig() {
      const audioData = audioFileToBase64("path/to/your/audio.wav");

      const client = new SarvamAIClient({
        apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
      });

      const socket = await client.speechToTextStreaming.connect({
        model: "saaras:v3",
        mode: "transcribe",                  // Change mode as needed
        "language-code": "kn-IN",
        sample_rate: 8000,                  // Match your audio
        input_audio_codec: "pcm_s16le",     // Specify codec
        high_vad_sensitivity: "true"
      });

      socket.on("open", () => {
        socket.transcribe({
          audio: audioData,
          sample_rate: 8000,                // Must match connection setting
          encoding: "audio/wav",
        });
      });

      socket.on("message", (message) => {
        console.log(`Result: ${JSON.stringify(message)}`);
      });

      await socket.waitForOpen();
      await new Promise(resolve => setTimeout(resolve, 10000));
      socket.close();
    }

    customAudioConfig();
    ```

  </CodeBlock>
</CodeGroup>

<Warning>
  **Important: Sample Rate Configuration for 8kHz Audio**

When working with 8kHz audio, you **must** set the `sample_rate` parameter in **both** places:

1. **When connecting to the WebSocket** (connection parameter)
2. **When sending audio data** (transcribe parameter)

Both values must match your audio's actual sample rate. Mismatched sample rates will result in poor transcription quality or errors.

```python
async with client.speech_to_text_streaming.connect(
    model="saaras:v3",
    mode="transcribe",
    language_code="en-IN",
    sample_rate=8000        # Must match your audio
) as ws:
    await ws.transcribe(
        audio=audio_data,
        sample_rate=8000    # Must match connection setting
    )
```

</Warning>

<Note>
  For detailed endpoint documentation, see:
  [Speech-to-Text WebSocket](/api-reference-docs/speech-to-text/transcribe/ws) |
  [Speech-to-Text Translate WebSocket](/api-reference-docs/speech-to-text-translate/ws)
</Note>

## API Reference

### Connection Parameters

Configure your WebSocket connection with these parameters:

| Parameter              | Type    | Description                                                                                          | Example                                                                          |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `language_code`        | string  | Language for speech recognition (STT only)                                                           | `"en-IN"`, `"hi-IN"`, `"kn-IN"`                                                  |
| `model`                | string  | Model version to use                                                                                 | `"saaras:v3"` (recommended), `"saarika:v2.5"` (legacy), `"saaras:v2.5"` (legacy) |
| `mode`                 | string  | Output mode (**saaras:v3 only**): transcribe, translate, verbatim, translit, codemix                 | `"transcribe"`                                                                   |
| `sample_rate`          | integer | Audio sample rate in Hz                                                                              | `8000`, `16000`                                                                  |
| `input_audio_codec`    | string  | Audio codec format. Only `wav` and raw PCM formats (`pcm_s16le`, `pcm_l16`, `pcm_raw`) are supported | `"wav"`, `"pcm_s16le"`                                                           |
| `high_vad_sensitivity` | boolean | Enhanced voice activity detection                                                                    | `true`, `false`                                                                  |
| `vad_signals`          | boolean | Receive speech start/end events                                                                      | `true`, `false`                                                                  |
| `flush_signal`         | boolean | Enable manual buffer flushing                                                                        | `true`, `false`                                                                  |

### Audio Data Parameters

When sending audio data to the streaming endpoint:

| Parameter     | Type    | Description                                                                   | Required |
| ------------- | ------- | ----------------------------------------------------------------------------- | -------- |
| `audio`       | string  | Base64-encoded audio data                                                     | ✅       |
| `encoding`    | string  | Audio format                                                                  | ✅       |
| `sample_rate` | integer | Audio sample rate (16000 Hz recommended). Must match the connection parameter | ✅       |

### Response Types

When `vad_signals=true`, you'll receive different message types:

**For STT:**

- **`speech_start`**: Voice activity detected
- **`speech_end`**: Voice activity stopped
- **`transcript`**: Final transcription result

**For STTT:**

- **`speech_start`**: Voice activity detected
- **`speech_end`**: Voice activity stopped
- **`translation`**: Final translation result

### Key Differences: STT vs STTT

| Aspect          | STT                                                              | STTT                                              |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| Model           | `saaras:v3` (recommended), `saarika:v2.5` (legacy)               | `saaras:v3` (recommended), `saaras:v2.5` (legacy) |
| Method          | `transcribe()`                                                   | `translate()`                                     |
| Mode            | `transcribe`, `verbatim`, `translit`, `codemix` (saaras:v3 only) | `translate` (saaras:v3 only)                      |
| Language Code   | Required                                                         | Not required (auto-detected)                      |
| Output Language | Same as input                                                    | English only                                      |

### Best Practices

- **Audio Quality & Sample Rate**:
  - Use 16kHz sample rate for best results
  - For 8kHz audio, **always set `sample_rate=8000` in both connection and transcribe/translate calls**
  - Ensure both sample rate parameters match your actual audio sample rate
- **Silence Handling**:
  - Use 1 second silence when `high_vad_sensitivity=false`
  - Use 0.5 seconds silence when `high_vad_sensitivity=true`
- **Continuous Streaming**: Send audio data continuously for real-time results
- **Error Handling**: Always implement proper WebSocket error handling
- **Model Selection**:
  - Use Saaras (`saaras:v3`) with `mode` parameter for the best transcription quality and flexible output modes
  - Use Saarika (`saarika:v2.5`) for transcription in the original language (legacy)
  - Use Saaras (`saaras:v2.5`) for direct translation to English (legacy)

---

title: How to select output mode
description: Choose the right output mode for your speech-to-text use case with Saaras v3.

---

Saaras v3 supports multiple output modes to handle different transcription and translation needs. Use the `mode` parameter to specify how you want the audio processed.

<Note>
  The `mode` parameter is only available for Saaras v3. For legacy Saarika v2.5, only basic transcription is supported.
</Note>

### Output Mode Comparison

For the same input audio saying: **"मेरा फोन नंबर है 9840950950"** (My phone number is 9840950950)

| Mode         | Description                                            | Example Output                                              |
| ------------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| `transcribe` | Standard transcription with number normalization       | `मेरा फोन नंबर है 9840950950`                               |
| `translate`  | Translate to English                                   | `My phone number is 9840950950`                             |
| `verbatim`   | Exact word-for-word, preserves spoken numbers          | `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero` |
| `translit`   | Romanized/Latin script                                 | `mera phone number hai 9840950950`                          |
| `codemix`    | English words in English, Indic words in native script | `मेरा phone number है 9840950950`                           |

### When to Use Each Mode

| Mode         | Best For                                                          |
| ------------ | ----------------------------------------------------------------- |
| `transcribe` | Call recordings, meetings, voice notes, general transcription     |
| `translate`  | Analytics dashboards, English-only systems, international teams   |
| `verbatim`   | Legal transcriptions, compliance, preserving exact spoken content |
| `translit`   | Systems that only support Latin characters, search indexing       |
| `codemix`    | Hinglish conversations, mixed-language customer support           |

### Example Code

<Tabs>
  <Tab title="Transcribe">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Standard transcription in original language
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="hi-IN",
            mode="transcribe"  # Default mode
        )

        print(response.transcript)
        # Output: मेरा फोन नंबर है 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "transcribe"  // Default mode
        });

        console.log(response.transcript);
        // Output: मेरा फोन नंबर है 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="hi-IN" \
          -F mode="transcribe" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Translate">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Translate Indian language speech to English
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="hi-IN",
            mode="translate"
        )

        print(response.transcript)
        # Output: My phone number is 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "translate"
        });

        console.log(response.transcript);
        // Output: My phone number is 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="hi-IN" \
          -F mode="translate" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Verbatim">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Exact word-for-word transcription without normalization
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="hi-IN",
            mode="verbatim"
        )

        print(response.transcript)
        # Output: मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "verbatim"
        });

        console.log(response.transcript);
        // Output: मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="hi-IN" \
          -F mode="verbatim" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Translit">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Romanization - output in Latin/Roman script
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="hi-IN",
            mode="translit"
        )

        print(response.transcript)
        # Output: mera phone number hai 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "translit"
        });

        console.log(response.transcript);
        // Output: mera phone number hai 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="hi-IN" \
          -F mode="translit" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Codemix">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Code-mixed: English words in English, Indic words in native script
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="hi-IN",
            mode="codemix"
        )

        print(response.transcript)
        # Output: मेरा phone number है 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "codemix"
        });

        console.log(response.transcript);
        // Output: मेरा phone number है 9840950950
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="hi-IN" \
          -F mode="codemix" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>
</Tabs>

---

title: How to specify language codes
description: >-
Use BCP-47 language codes for accurate speech-to-text transcription with
Saaras v3.

---

The `language_code` parameter tells the STT model which language to expect in the audio. Using the correct language code improves transcription accuracy.

### Supported Languages (Saaras v3)

Saaras v3 supports 22 Indian languages with BCP-47 format codes:

| Language  | Code    |     | Language | Code     |
| --------- | ------- | --- | -------- | -------- |
| Hindi     | `hi-IN` |     | Assamese | `as-IN`  |
| Bengali   | `bn-IN` |     | Urdu     | `ur-IN`  |
| Kannada   | `kn-IN` |     | Nepali   | `ne-IN`  |
| Malayalam | `ml-IN` |     | Konkani  | `kok-IN` |
| Marathi   | `mr-IN` |     | Kashmiri | `ks-IN`  |
| Odia      | `od-IN` |     | Sindhi   | `sd-IN`  |
| Punjabi   | `pa-IN` |     | Sanskrit | `sa-IN`  |
| Tamil     | `ta-IN` |     | Santali  | `sat-IN` |
| Telugu    | `te-IN` |     | Manipuri | `mni-IN` |
| English   | `en-IN` |     | Bodo     | `brx-IN` |
| Gujarati  | `gu-IN` |     | Maithili | `mai-IN` |
|           |         |     | Dogri    | `doi-IN` |

### Automatic Language Detection

To enable automatic language detection, pass `unknown` as the `language_code` parameter. The model will detect the language from the audio.

<Note>
  **Best Practice:** Always specify the language code when you know the language of the audio. This improves accuracy and reduces processing time. Use `unknown` only when the language is truly unknown.
</Note>

### Example Code

<Tabs>
  <Tab title="With Language Code">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Specify language for better accuracy
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="ta-IN",  # Tamil
            mode="transcribe"
        )

        print(response.transcript)
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "ta-IN",  // Tamil
            mode: "transcribe"
        });

        console.log(response.transcript);
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="ta-IN" \
          -F mode="transcribe" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="Auto Detection">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Use 'unknown' for automatic language detection
        response = client.speech_to_text.transcribe(
            file=open("audio.wav", "rb"),
            model="saaras:v3",
            language_code="unknown",  # Auto-detect language
            mode="transcribe"
        )

        print(response.transcript)
        print(response.language_code)  # Detected language
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";
        import fs from 'fs';

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        const audioFile = fs.createReadStream("audio.wav");

        // Use 'unknown' for automatic language detection
        const response = await client.speechToText.transcribe({
            file: audioFile,
            model: "saaras:v3",
            language_code: "unknown",  // Auto-detect language
            mode: "transcribe"
        });

        console.log(response.transcript);
        console.log(response.language_code);  // Detected language
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: multipart/form-data" \
          -F model="saaras:v3" \
          -F language_code="unknown" \
          -F mode="transcribe" \
          -F file=@"audio.wav;type=audio/wav"
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>
</Tabs>
***

title: How to enable speaker diarization
description: >-
Identify and distinguish between multiple speakers in audio using the Batch
API.

---

<Note>
  **Batch API only:** Speaker diarization is only available through the Batch API, not the REST or Streaming APIs.
</Note>

Speaker diarization identifies and labels different speakers in your audio, making it easy to know "who said what." This is ideal for meetings, interviews, podcasts, and call center recordings.

### Key Features

- Automatic speaker detection
- Support for up to 10 speakers
- Speaker-wise transcription with timestamps

### Parameters

| Parameter          | Type    | Description                                   |
| ------------------ | ------- | --------------------------------------------- |
| `with_diarization` | boolean | Enable speaker diarization (default: `false`) |
| `num_speakers`     | integer | Expected number of speakers (optional, 1-10)  |

<Note>
  If you don't specify `num_speakers`, the model will automatically detect the number of speakers.
</Note>

### Example Code

<Tabs>
  <Tab title="Basic Diarization">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Create batch job with diarization
        job = client.speech_to_text_job.create_job(
            model="saaras:v3",
            language_code="hi-IN",
            mode="transcribe",
            with_diarization=True
        )

        # Upload audio files
        job.upload_files(file_paths=["meeting_recording.mp3"])

        # Start processing
        job.start()

        # Wait for completion
        job.wait_until_complete()

        # Download results
        job.download_outputs(output_dir="./output")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        // Create batch job with diarization
        const job = await client.speechToTextJob.createJob({
            model: "saaras:v3",
            language_code: "hi-IN",
            mode: "transcribe",
            with_diarization: true
        });

        // Upload audio files
        await job.uploadFiles({ filePaths: ["meeting_recording.mp3"] });

        // Start processing
        await job.start();

        // Wait for completion
        await job.waitUntilComplete();

        // Download results
        await job.downloadOutputs({ outputDir: "./output" });
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        # Step 1: Create job
        curl -X POST https://api.sarvam.ai/speech-to-text/job \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: application/json" \
          -d '{
            "model": "saaras:v3",
            "language_code": "hi-IN",
            "mode": "transcribe",
            "with_diarization": true
          }'

        # Step 2: Upload files using job_id from response
        # Step 3: Start job and poll for completion
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>

  <Tab title="With Speaker Count">
    <CodeGroup>
      <CodeBlock title="Python" active>
        ```python
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

        # Create batch job with known speaker count
        job = client.speech_to_text_job.create_job(
            model="saaras:v3",
            language_code="en-IN",
            mode="transcribe",
            with_diarization=True,
            num_speakers=3  # Interview with 3 participants
        )

        job.upload_files(file_paths=["interview.mp3"])
        job.start()
        job.wait_until_complete()
        job.download_outputs(output_dir="./output")
        ```
      </CodeBlock>

      <CodeBlock title="JavaScript">
        ```javascript
        import { SarvamAIClient } from "sarvamai";

        const client = new SarvamAIClient({
            apiSubscriptionKey: "YOUR_SARVAM_API_KEY"
        });

        // Create batch job with known speaker count
        const job = await client.speechToTextJob.createJob({
            model: "saaras:v3",
            language_code: "en-IN",
            mode: "transcribe",
            with_diarization: true,
            num_speakers: 3  // Interview with 3 participants
        });

        await job.uploadFiles({ filePaths: ["interview.mp3"] });
        await job.start();
        await job.waitUntilComplete();
        await job.downloadOutputs({ outputDir: "./output" });
        ```
      </CodeBlock>

      <CodeBlock title="cURL">
        ```bash
        curl -X POST https://api.sarvam.ai/speech-to-text/job \
          -H "api-subscription-key: <YOUR_SARVAM_API_KEY>" \
          -H "Content-Type: application/json" \
          -d '{
            "model": "saaras:v3",
            "language_code": "en-IN",
            "mode": "transcribe",
            "with_diarization": true,
            "num_speakers": 3
          }'
        ```
      </CodeBlock>
    </CodeGroup>

  </Tab>
</Tabs>

### Output Format

When `with_diarization=True` is passed, the response includes a `diarized_transcript` field with speaker information:

```json
{
  "request_id": "20260130_d8d2c0e6-1eb6-4982-8045-b267d5165c44",
  "transcript": "Full transcript text...",
  "timestamps": {
    "words": [
      "Hello, how can I help you today?",
      "I have a question about my order."
    ],
    "start_time_seconds": [0.01, 2.8],
    "end_time_seconds": [2.5, 5.2]
  },
  "diarized_transcript": {
    "entries": [
      {
        "transcript": "Hello, how can I help you today?",
        "start_time_seconds": 0.01,
        "end_time_seconds": 2.5,
        "speaker_id": "0"
      },
      {
        "transcript": "I have a question about my order.",
        "start_time_seconds": 2.8,
        "end_time_seconds": 5.2,
        "speaker_id": "1"
      }
    ]
  },
  "language_code": "en-IN"
}
```

Each entry contains:

- `transcript`: The text spoken by the speaker
- `start_time_seconds`: When the speaker started speaking (float)
- `end_time_seconds`: When the speaker stopped speaking (float)
- `speaker_id`: Unique identifier for the speaker (e.g., "0", "1")

### Use Cases

| Use Case               | Recommended Settings  |
| ---------------------- | --------------------- |
| Call center recordings | `num_speakers=2`      |
| Meetings               | Let model auto-detect |
| Interviews             | Specify exact count   |
| Podcasts               | `num_speakers=2-4`    |

<Warning>
  Speaker diarization is available via the Batch API and has separate pricing. For detailed pricing information, visit [dashboard.sarvam.ai](https://dashboard.sarvam.ai).
</Warning>

→ [Full Batch API Documentation](/api-reference-docs/api-guides-tutorials/speech-to-text/batch-api)

# REST

POST https://api.sarvam.ai/speech-to-text
Content-Type: multipart/form-data

## Speech to Text API

This API transcribes speech to text in multiple Indian languages and English. Supports transcription for interactive applications.

### Available Options:

- **REST API** (Current Endpoint): For quick responses under 30 seconds with immediate results
- **Batch API**: For longer audio files, [Follow This Documentation](https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/speech-to-text/batch-api)
  - Supports diarization (speaker identification)

### Note:

- Pricing differs for REST and Batch APIs
- Diarization is only available in Batch API with separate pricing
- Please refer to [here](https://docs.sarvam.ai/api-reference-docs/getting-started/pricing) for detailed pricing information

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text:
    post:
      operationId: transcribe
      summary: Speech to Text
      description: >-
        ## Speech to Text API


        This API transcribes speech to text in multiple Indian languages and
        English. Supports transcription for interactive applications.


        ### Available Options:

        - **REST API** (Current Endpoint): For quick responses under 30 seconds
        with immediate results

        - **Batch API**: For longer audio files, [Follow This
        Documentation](https://docs.sarvam.ai/api-reference-docs/api-guides-tutorials/speech-to-text/batch-api)
          - Supports diarization (speaker identification)

        ### Note:

        - Pricing differs for REST and Batch APIs

        - Diarization is only available in Batch API with separate pricing

        - Please refer to
        [here](https://docs.sarvam.ai/api-reference-docs/getting-started/pricing)
        for detailed pricing information
      tags:
        - subpackage_speechToText
      parameters:
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_SpeechToTextResponse"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Sarvam_Model_API_ErrorMessage"
      requestBody:
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: >-
                    The audio file to transcribe. Supported formats include WAV,
                    MP3, AAC, AIFF, OGG, OPUS, FLAC, MP4/M4A, AMR, WMA, WebM,
                    and PCM formats. The API automatically detects most codec
                    formats, but for PCM files (pcm_s16le, pcm_l16, pcm_raw),
                    you must specify the input_audio_codec parameter. PCM files
                    are supported only at 16kHz sample rate.

                    The API works best with audio files sampled at 16kHz. If the
                    audio contains multiple channels, they will be merged into a
                    single channel.
                model:
                  $ref: "#/components/schemas/Sarvam_Model_API_SpeechToTextModel"
                  description: >-
                    Specifies the model to use for speech-to-text conversion.


                    - **saarika:v2.5** (default): Transcribes audio in the
                    spoken language.


                    - **saaras:v3**: State-of-the-art model with flexible output
                    formats. Supports multiple modes via the `mode` parameter:
                    transcribe, translate, verbatim, translit, codemix.
                mode:
                  oneOf:
                    - $ref: "#/components/schemas/Sarvam_Model_API_Mode"
                    - type: "null"
                  description: >-
                    Mode of operation. **Only applicable when using saaras:v3
                    model.**


                    Example audio: 'मेरा फोन नंबर है 9840950950'


                    - **transcribe** (default): Standard transcription in the
                    original language with proper formatting and number
                    normalization.
                      - Output: `मेरा फोन नंबर है 9840950950`

                    - **translate**: Translates speech from any supported Indic
                    language to English.
                      - Output: `My phone number is 9840950950`

                    - **verbatim**: Exact word-for-word transcription without
                    normalization, preserving filler words and spoken numbers
                    as-is.
                      - Output: `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero`

                    - **translit**: Romanization - Transliterates speech to
                    Latin/Roman script only.
                      - Output: `mera phone number hai 9840950950`

                    - **codemix**: Code-mixed text with English words in English
                    and Indic words in native script.
                      - Output: `मेरा phone number है 9840950950`
                language_code:
                  $ref: "#/components/schemas/Sarvam_Model_API_SpeechToTextLanguage"
                  description: >-
                    Specifies the language of the input audio in BCP-47 format.


                    **Note:** This parameter is optional for `saarika:v2.5`
                    model.


                    **Available Options:**

                    - `unknown`: Use when the language is not known; the API
                    will auto-detect.

                    - `hi-IN`: Hindi

                    - `bn-IN`: Bengali

                    - `kn-IN`: Kannada

                    - `ml-IN`: Malayalam

                    - `mr-IN`: Marathi

                    - `od-IN`: Odia

                    - `pa-IN`: Punjabi

                    - `ta-IN`: Tamil

                    - `te-IN`: Telugu

                    - `en-IN`: English

                    - `gu-IN`: Gujarati


                    **Additional Options (saaras:v3 only):**

                    - `as-IN`: Assamese

                    - `ur-IN`: Urdu

                    - `ne-IN`: Nepali

                    - `kok-IN`: Konkani

                    - `ks-IN`: Kashmiri

                    - `sd-IN`: Sindhi

                    - `sa-IN`: Sanskrit

                    - `sat-IN`: Santali

                    - `mni-IN`: Manipuri

                    - `brx-IN`: Bodo

                    - `mai-IN`: Maithili

                    - `doi-IN`: Dogri
                input_audio_codec:
                  $ref: "#/components/schemas/Sarvam_Model_API_InputAudioCodec"
                  description: >-
                    Input Audio codec/format of the input file. PCM files are
                    supported only at 16kHz sample rate.
              required:
                - file
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    Sarvam_Model_API_SpeechToTextModel:
      type: string
      enum:
        - saarika:v2.5
        - saaras:v3
      description: >-
        Model to be used for speech to text.


        - **saarika:v2.5** (default): Transcribes audio in the spoken language.


        - **saaras:v3**: State-of-the-art model with flexible output formats.
        Supports multiple modes via the `mode` parameter: transcribe, translate,
        verbatim, translit, codemix.
      title: Sarvam_Model_API_SpeechToTextModel
    Sarvam_Model_API_Mode:
      type: string
      enum:
        - transcribe
        - translate
        - verbatim
        - translit
        - codemix
      description: >-
        Mode of operation for saaras:v3 model.


        Example audio: 'मेरा फोन नंबर है 9840950950'


        - **transcribe** (default): Standard transcription in the original
        language with proper formatting and number normalization.
          - Output: `मेरा फोन नंबर है 9840950950`

        - **translate**: Translates speech from any supported Indic language to
        English.
          - Output: `My phone number is 9840950950`

        - **verbatim**: Exact word-for-word transcription without normalization,
        preserving filler words and spoken numbers as-is.
          - Output: `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero`

        - **translit**: Romanization - Transliterates speech to Latin/Roman
        script only.
          - Output: `mera phone number hai 9840950950`

        - **codemix**: Code-mixed text with English words in English and Indic
        words in native script.
          - Output: `मेरा phone number है 9840950950`
      title: Sarvam_Model_API_Mode
    Sarvam_Model_API_SpeechToTextLanguage:
      type: string
      enum:
        - unknown
        - hi-IN
        - bn-IN
        - kn-IN
        - ml-IN
        - mr-IN
        - od-IN
        - pa-IN
        - ta-IN
        - te-IN
        - en-IN
        - gu-IN
        - as-IN
        - ur-IN
        - ne-IN
        - kok-IN
        - ks-IN
        - sd-IN
        - sa-IN
        - sat-IN
        - mni-IN
        - brx-IN
        - mai-IN
        - doi-IN
      description: >-
        Languages supported for Speech-to-Text.


        **saarika:v2.5 supports (12 languages):** unknown, hi-IN, bn-IN, kn-IN,
        ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN, en-IN, gu-IN


        **saaras:v3 supports all 23 languages** including: as-IN, ur-IN, ne-IN,
        kok-IN, ks-IN, sd-IN, sa-IN, sat-IN, mni-IN, brx-IN, mai-IN, doi-IN
      title: Sarvam_Model_API_SpeechToTextLanguage
    Sarvam_Model_API_InputAudioCodec:
      type: string
      enum:
        - wav
        - x-wav
        - wave
        - mp3
        - mpeg
        - mpeg3
        - x-mp3
        - x-mpeg-3
        - aac
        - x-aac
        - aiff
        - x-aiff
        - ogg
        - opus
        - flac
        - x-flac
        - mp4
        - x-m4a
        - amr
        - x-ms-wma
        - webm
        - pcm_s16le
        - pcm_l16
        - pcm_raw
      description: >-
        Audio codec/format of the input file. Our API automatically detects all
        codec formats, but for PCM files specifically (pcm_s16le, pcm_l16,
        pcm_raw), you must pass this parameter. PCM files are supported only at
        16kHz sample rate.
      title: Sarvam_Model_API_InputAudioCodec
    Sarvam_Model_API_TimestampsModel:
      type: object
      properties:
        words:
          type: array
          items:
            type: string
          description: List of words in the transcript.
        start_time_seconds:
          type: array
          items:
            type: number
            format: double
          description: List of start times of words in seconds.
        end_time_seconds:
          type: array
          items:
            type: number
            format: double
          description: List of end times of words in seconds.
      required:
        - words
        - start_time_seconds
        - end_time_seconds
      title: Sarvam_Model_API_TimestampsModel
    Sarvam_Model_API_DiarizedEntry:
      type: object
      properties:
        transcript:
          type: string
          description: transcript of the segment of that audio
        start_time_seconds:
          type: number
          format: double
          description: Start time of the word in seconds.
        end_time_seconds:
          type: number
          format: double
          description: End time of the word in seconds.
        speaker_id:
          type: string
          description: Speaker ID for the word.
      required:
        - transcript
        - start_time_seconds
        - end_time_seconds
        - speaker_id
      title: Sarvam_Model_API_DiarizedEntry
    Sarvam_Model_API_DiarizedTranscript:
      type: object
      properties:
        entries:
          type: array
          items:
            $ref: "#/components/schemas/Sarvam_Model_API_DiarizedEntry"
          description: List of diarized transcript entries.
      required:
        - entries
      title: Sarvam_Model_API_DiarizedTranscript
    Sarvam_Model_API_SpeechToTextResponse:
      type: object
      properties:
        request_id:
          type:
            - string
            - "null"
        transcript:
          type: string
          description: The transcribed text from the provided audio file.
        timestamps:
          oneOf:
            - $ref: "#/components/schemas/Sarvam_Model_API_TimestampsModel"
            - type: "null"
          description: >-
            Contains timestamps for the transcribed text. This field is included
            only if with_timestamps is set to true
        diarized_transcript:
          oneOf:
            - $ref: "#/components/schemas/Sarvam_Model_API_DiarizedTranscript"
            - type: "null"
          description: Diarized transcript of the provided speech
        language_code:
          type:
            - string
            - "null"
          description: >-
            This will return the BCP-47 code of language spoken in the input. If
            multiple languages are detected, this will return language code of
            most predominant spoken language. If no language is detected, this
            will be null
        language_probability:
          type:
            - number
            - "null"
          format: double
          description: >-
            Float value (0.0 to 1.0) indicating the probability of the detected
            language being correct. Higher values indicate higher confidence.


            **When it returns a value:**

            - When `language_code` is not provided in the request

            - When `language_code` is set to `unknown`


            **When it returns null:**

            - When a specific `language_code` is provided (language detection is
            skipped)


            The parameter is always present in the response.
      required:
        - request_id
        - transcript
        - language_code
      title: Sarvam_Model_API_SpeechToTextResponse
    Sarvam_Model_API_ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - not_found_error
        - rate_limit_exceeded_error
      title: Sarvam_Model_API_ErrorCode
    Sarvam_Model_API_ErrorDetails:
      type: object
      properties:
        request_id:
          type:
            - string
            - "null"
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/Sarvam_Model_API_ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
      required:
        - request_id
        - message
        - code
      title: Sarvam_Model_API_ErrorDetails
    Sarvam_Model_API_ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/Sarvam_Model_API_ErrorDetails"
          description: Error details
      required:
        - error
      title: Sarvam_Model_API_ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text.transcribe()

```

```typescript
import { createReadStream } from "fs";
import { SarvamAIClient } from "sarvamai";
import * as fs from "fs";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToText.transcribe({
  file: fs.createReadStream("/path/to/your/file"),
});
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text"

	payload := strings.NewReader("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"input_audio_codec\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("api-subscription-key", "<apiKey>")
	req.Header.Add("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["api-subscription-key"] = '<apiKey>'
request["Content-Type"] = 'multipart/form-data; boundary=---011000010111000001101001'
request.body = "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"input_audio_codec\"\r\n\r\n\r\n-----011000010111000001101001--\r\n"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.sarvam.ai/speech-to-text")
  .header("api-subscription-key", "<apiKey>")
  .header("Content-Type", "multipart/form-data; boundary=---011000010111000001101001")
  .body("-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"input_audio_codec\"\r\n\r\n\r\n-----011000010111000001101001--\r\n")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.sarvam.ai/speech-to-text', [
  'multipart' => [
    [
        'name' => 'file',
        'filename' => 'string',
        'contents' => null
    ]
  ]
  'headers' => [
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text");
var request = new RestRequest(Method.POST);
request.AddHeader("api-subscription-key", "<apiKey>");
request.AddParameter("multipart/form-data; boundary=---011000010111000001101001", "-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"file\"; filename=\"string\"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"mode\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n\r\n-----011000010111000001101001\r\nContent-Disposition: form-data; name=\"input_audio_codec\"\r\n\r\n\r\n-----011000010111000001101001--\r\n", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "api-subscription-key": "<apiKey>",
  "Content-Type": "multipart/form-data; boundary=---011000010111000001101001"
]
let parameters = [
  [
    "name": "file",
    "fileName": "string"
  ],
  [
    "name": "model",
    "value":
  ],
  [
    "name": "mode",
    "value":
  ],
  [
    "name": "language_code",
    "value":
  ],
  [
    "name": "input_audio_codec",
    "value":
  ]
]

let boundary = "---011000010111000001101001"

var body = ""
var error: NSError? = nil
for param in parameters {
  let paramName = param["name"]!
  body += "--\(boundary)\r\n"
  body += "Content-Disposition:form-data; name=\"\(paramName)\""
  if let filename = param["fileName"] {
    let contentType = param["content-type"]!
    let fileContent = String(contentsOfFile: filename, encoding: String.Encoding.utf8)
    if (error != nil) {
      print(error as Any)
    }
    body += "; filename=\"\(filename)\"\r\n"
    body += "Content-Type: \(contentType)\r\n\r\n"
    body += fileContent
  } else if let paramValue = param["value"] {
    body += "\r\n\r\n\(paramValue)"
  }
}

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# WebSocket

GET /speech-to-text/ws

WebSocket channel for real-time speech to text streaming.

**Note:** This API Reference page is provided for informational purposes only.
The Try It playground may not provide the best experience for streaming audio.
For optimal streaming performance, please use the SDK or implement your own WebSocket client.

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe/ws

## AsyncAPI Specification

```yaml
asyncapi: 2.6.0
info:
  title: speechToTextStreaming
  version: subpackage_speechToTextStreaming.speechToTextStreaming
  description: >
    WebSocket channel for real-time speech to text streaming.


    **Note:** This API Reference page is provided for informational purposes
    only. 

    The Try It playground may not provide the best experience for streaming
    audio. 

    For optimal streaming performance, please use the SDK or implement your own
    WebSocket client.
channels:
  /speech-to-text/ws:
    description: >
      WebSocket channel for real-time speech to text streaming.


      **Note:** This API Reference page is provided for informational purposes
      only. 

      The Try It playground may not provide the best experience for streaming
      audio. 

      For optimal streaming performance, please use the SDK or implement your
      own WebSocket client.
    bindings:
      ws:
        query:
          type: object
          properties:
            language-code:
              $ref: "#/components/schemas/speechToTextStreaming_language-code"
            model:
              $ref: "#/components/schemas/speechToTextStreaming_model"
            mode:
              $ref: "#/components/schemas/speechToTextStreaming_mode"
            sample_rate:
              $ref: "#/components/schemas/speechToTextStreaming_sample_rate"
            high_vad_sensitivity:
              $ref: "#/components/schemas/speechToTextStreaming_high_vad_sensitivity"
            vad_signals:
              $ref: "#/components/schemas/speechToTextStreaming_vad_signals"
            flush_signal:
              $ref: "#/components/schemas/speechToTextStreaming_flush_signal"
            input_audio_codec:
              $ref: "#/components/schemas/speechToTextStreaming_input_audio_codec"
        headers:
          type: object
          properties:
            Api-Subscription-Key:
              type: string
    publish:
      operationId: speech-to-text-streaming-publish
      summary: Transcription
      description: Receive real-time transcription results from the WebSocket
      message:
        name: Transcription
        title: Transcription
        description: Receive real-time transcription results from the WebSocket
        payload:
          $ref: >-
            #/components/schemas/speechToTextStreaming_speechToTextStreamingResponse
    subscribe:
      operationId: speech-to-text-streaming-subscribe
      summary: Client messages
      message:
        oneOf:
          - $ref: >-
              #/components/messages/subpackage_speechToTextStreaming.speechToTextStreaming-client-0-Audio
              Transcription Message
          - $ref: >-
              #/components/messages/subpackage_speechToTextStreaming.speechToTextStreaming-client-1-Speech
              Flush Signal
servers:
  Production:
    url: wss://api.sarvam.ai/
    protocol: wss
    x-default: true
components:
  messages:
    subpackage_speechToTextStreaming.speechToTextStreaming-client-0-Audio Transcription Message:
      name: Audio Transcription Message
      title: Audio Transcription Message
      description: Send audio data for real-time speech to text streaming
      payload:
        $ref: "#/components/schemas/speechToTextStreaming_audioMessage"
    subpackage_speechToTextStreaming.speechToTextStreaming-client-1-Speech Flush Signal:
      name: Speech Flush Signal
      title: Speech Flush Signal
      description: Send signal to flush audio buffer and finalize transcription
      payload:
        $ref: "#/components/schemas/speechToTextStreaming_flushSignal"
  schemas:
    speechToTextStreaming_language-code:
      type: string
      enum:
        - unknown
        - en-IN
        - hi-IN
        - bn-IN
        - gu-IN
        - kn-IN
        - ml-IN
        - mr-IN
        - od-IN
        - pa-IN
        - ta-IN
        - te-IN
        - as-IN
        - ur-IN
        - ne-IN
        - kok-IN
        - ks-IN
        - sd-IN
        - sa-IN
        - sat-IN
        - mni-IN
        - brx-IN
        - mai-IN
        - doi-IN
      description: >
        Specifies the language of the input audio in BCP-47 format.


        **Available Options (saarika:v2.5, legacy):**

        - `unknown` (default): Use when the language is not known; the API will
        auto-detect.

        - `hi-IN`: Hindi

        - `bn-IN`: Bengali

        - `gu-IN`: Gujarati

        - `kn-IN`: Kannada

        - `ml-IN`: Malayalam

        - `mr-IN`: Marathi

        - `od-IN`: Odia

        - `pa-IN`: Punjabi

        - `ta-IN`: Tamil

        - `te-IN`: Telugu

        - `en-IN`: English


        **Additional Options (saaras:v3, recommended):**

        - `as-IN`: Assamese

        - `ur-IN`: Urdu

        - `ne-IN`: Nepali

        - `kok-IN`: Konkani

        - `ks-IN`: Kashmiri

        - `sd-IN`: Sindhi

        - `sa-IN`: Sanskrit

        - `sat-IN`: Santali

        - `mni-IN`: Manipuri

        - `brx-IN`: Bodo

        - `mai-IN`: Maithili

        - `doi-IN`: Dogri
      title: speechToTextStreaming_language-code
    speechToTextStreaming_model:
      type: string
      enum:
        - saaras:v3
        - saarika:v2.5
      default: saaras:v3
      description: >
        Specifies the model to use for speech-to-text conversion.


        - **saaras:v3** (default, recommended): State-of-the-art model with
        flexible output formats. Supports multiple modes via the `mode`
        parameter: transcribe, translate, verbatim, translit, codemix.


        - **saarika:v2.5** (legacy): Transcribes audio in the spoken language.
        Kept for backward compatibility.
      title: speechToTextStreaming_model
    speechToTextStreaming_mode:
      type: string
      enum:
        - transcribe
        - translate
        - verbatim
        - translit
        - codemix
      default: transcribe
      description: >
        Mode of operation. **Only applicable when using saaras:v3 model.**


        Example audio: 'मेरा फोन नंबर है 9840950950'


        - **transcribe** (default): Standard transcription in the original
        language with proper formatting and number normalization.
          - Output: `मेरा फोन नंबर है 9840950950`

        - **translate**: Translates speech from any supported Indic language to
        English.
          - Output: `My phone number is 9840950950`

        - **verbatim**: Exact word-for-word transcription without normalization,
        preserving filler words and spoken numbers as-is.
          - Output: `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero`

        - **translit**: Romanization - Transliterates speech to Latin/Roman
        script only.
          - Output: `mera phone number hai 9840950950`

        - **codemix**: Code-mixed text with English words in English and Indic
        words in native script.
          - Output: `मेरा phone number है 9840950950`
      title: speechToTextStreaming_mode
    speechToTextStreaming_sample_rate:
      type: string
      enum:
        - "16000"
        - "8000"
      description: >-
        Audio sample rate for the WebSocket connection. When specified as a
        connection parameter, only 16kHz and 8kHz are supported. 8kHz is only
        available via this connection parameter. If not specified, defaults to
        16kHz.
      title: speechToTextStreaming_sample_rate
    speechToTextStreaming_high_vad_sensitivity:
      type: string
      enum:
        - "true"
        - "false"
      description: Enable high VAD (Voice Activity Detection) sensitivity
      title: speechToTextStreaming_high_vad_sensitivity
    speechToTextStreaming_vad_signals:
      type: string
      enum:
        - "true"
        - "false"
      description: Enable VAD signals in response
      title: speechToTextStreaming_vad_signals
    speechToTextStreaming_flush_signal:
      type: string
      enum:
        - "true"
        - "false"
      description: Signal to flush the audio buffer and finalize transcription
      title: speechToTextStreaming_flush_signal
    speechToTextStreaming_input_audio_codec:
      type: string
      enum:
        - wav
        - pcm_s16le
        - pcm_l16
        - pcm_raw
      description: >
        Audio codec/format of the input stream. Use this when sending raw PCM
        audio.

        Supported values: wav, pcm_s16le, pcm_l16, pcm_raw.
      title: speechToTextStreaming_input_audio_codec
    ResponseType:
      type: string
      enum:
        - data
        - error
        - events
      description: Type of WebSocket response
      title: ResponseType
    SpeechToTextTranscriptionDataTimestamps:
      type: object
      properties: {}
      description: Timestamp information (if available)
      title: SpeechToTextTranscriptionDataTimestamps
    SpeechToTextTranscriptionDataDiarizedTranscript:
      type: object
      properties: {}
      description: Diarized transcript of the provided speech
      title: SpeechToTextTranscriptionDataDiarizedTranscript
    TranscriptionMetrics:
      type: object
      properties:
        audio_duration:
          type: number
          format: double
          description: Duration of processed audio in seconds
        processing_latency:
          type: number
          format: double
          description: Processing latency in seconds
      required:
        - audio_duration
        - processing_latency
      title: TranscriptionMetrics
    SpeechToTextTranscriptionData:
      type: object
      properties:
        request_id:
          type: string
          description: Unique identifier for the request
        transcript:
          type: string
          description: Transcript of the provided speech in original language
        timestamps:
          oneOf:
            - $ref: "#/components/schemas/SpeechToTextTranscriptionDataTimestamps"
            - type: "null"
          description: Timestamp information (if available)
        diarized_transcript:
          oneOf:
            - $ref: >-
                #/components/schemas/SpeechToTextTranscriptionDataDiarizedTranscript
            - type: "null"
          description: Diarized transcript of the provided speech
        language_code:
          type:
            - string
            - "null"
          description: BCP-47 code of detected language
        language_probability:
          type:
            - number
            - "null"
          format: double
          description: >
            Float value (0.0 to 1.0) indicating the probability of the detected
            language being correct. Higher values indicate higher confidence.


            **When it returns a value:**

            - When `language_code` is not provided in the request

            - When `language_code` is set to `unknown`


            **When it returns null:**

            - When a specific `language_code` is provided (language detection is
            skipped)


            The parameter is always present in the response.
        metrics:
          $ref: "#/components/schemas/TranscriptionMetrics"
      required:
        - request_id
        - transcript
        - metrics
      title: SpeechToTextTranscriptionData
    ErrorData:
      type: object
      properties:
        error:
          type: string
          description: Error message
        code:
          type: string
          description: Error code
      required:
        - error
        - code
      title: ErrorData
    EventsDataSignalType:
      type: string
      enum:
        - START_SPEECH
        - END_SPEECH
      description: VAD signal type
      title: EventsDataSignalType
    EventsData:
      type: object
      properties:
        event_type:
          type: string
          description: Type of event
        timestamp:
          type: string
          format: date-time
          description: Event timestamp
        signal_type:
          $ref: "#/components/schemas/EventsDataSignalType"
          description: VAD signal type
        occured_at:
          type: number
          format: double
          description: Epoch timestamp when the event occurred
      description: >
        VAD events are sent when vad_signals=true. Fields may vary by event
        type.
      title: EventsData
    SpeechToTextResponseData:
      oneOf:
        - $ref: "#/components/schemas/SpeechToTextTranscriptionData"
        - $ref: "#/components/schemas/ErrorData"
        - $ref: "#/components/schemas/EventsData"
      title: SpeechToTextResponseData
    speechToTextStreaming_speechToTextStreamingResponse:
      type: object
      properties:
        type:
          $ref: "#/components/schemas/ResponseType"
        data:
          $ref: "#/components/schemas/SpeechToTextResponseData"
      required:
        - type
        - data
      title: speechToTextStreaming_speechToTextStreamingResponse
    AudioDataSampleRate:
      type: string
      enum:
        - "16000"
        - "22050"
        - "24000"
      description: >
        Audio sample rate in Hz for individual audio messages. 


        **Backward Compatibility**: This property is maintained for legacy
        support.

        **Recommended**: Use the connection-level sample_rate parameter instead.

        **Note**: 8kHz is only supported via connection parameter, not in
        AudioData messages.


        Supported values: 16kHz (preferred), 22.05kHz, 24kHz
      title: AudioDataSampleRate
    AudioDataEncoding:
      type: string
      enum:
        - audio/wav
      default: audio/wav
      description: Audio encoding format
      title: AudioDataEncoding
    AudioData:
      type: object
      properties:
        data:
          type: string
          format: base64
          description: Base64 encoded audio data
        sample_rate:
          $ref: "#/components/schemas/AudioDataSampleRate"
          description: >
            Audio sample rate in Hz for individual audio messages. 


            **Backward Compatibility**: This property is maintained for legacy
            support.

            **Recommended**: Use the connection-level sample_rate parameter
            instead.

            **Note**: 8kHz is only supported via connection parameter, not in
            AudioData messages.


            Supported values: 16kHz (preferred), 22.05kHz, 24kHz
        encoding:
          $ref: "#/components/schemas/AudioDataEncoding"
          description: Audio encoding format
      required:
        - data
        - sample_rate
        - encoding
      title: AudioData
    speechToTextStreaming_audioMessage:
      type: object
      properties:
        audio:
          $ref: "#/components/schemas/AudioData"
      required:
        - audio
      title: speechToTextStreaming_audioMessage
    ChannelsSpeechToTextStreamingMessagesFlushSignalType:
      type: string
      enum:
        - flush
      default: flush
      description: Type identifier for flush signal
      title: ChannelsSpeechToTextStreamingMessagesFlushSignalType
    speechToTextStreaming_flushSignal:
      type: object
      properties:
        type:
          $ref: >-
            #/components/schemas/ChannelsSpeechToTextStreamingMessagesFlushSignalType
          description: Type identifier for flush signal
      required:
        - type
      description: >-
        Signal to flush the audio buffer and force finalize partial
        transcriptions/translations
      title: speechToTextStreaming_flushSignal
```

# Batch - Initiate Job

POST https://api.sarvam.ai/speech-to-text/job/v1
Content-Type: application/json

Create a new speech to text bulk job and receive a job UUID and storage folder details for processing multiple audio files

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/initiate

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text/job/v1:
    post:
      operationId: initialise
      summary: Initiate Speech to Text Bulk Job V1
      description: >-
        Create a new speech to text bulk job and receive a job UUID and storage
        folder details for processing multiple audio files
      tags:
        - subpackage_speechToTextJob
      parameters:
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
      responses:
        "202":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/BulkJobInitResponseV1"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
      requestBody:
        content:
          application/json:
            schema:
              $ref: >-
                #/components/schemas/BulkJobInitRequestV1_SpeechToTextJobParameters_
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    Sarvam_Model_API_SpeechToTextLanguage:
      type: string
      enum:
        - unknown
        - hi-IN
        - bn-IN
        - kn-IN
        - ml-IN
        - mr-IN
        - od-IN
        - pa-IN
        - ta-IN
        - te-IN
        - en-IN
        - gu-IN
        - as-IN
        - ur-IN
        - ne-IN
        - kok-IN
        - ks-IN
        - sd-IN
        - sa-IN
        - sat-IN
        - mni-IN
        - brx-IN
        - mai-IN
        - doi-IN
      description: >-
        Languages supported for Speech-to-Text.


        **saarika:v2.5 supports (12 languages):** unknown, hi-IN, bn-IN, kn-IN,
        ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN, en-IN, gu-IN


        **saaras:v3 supports all 23 languages** including: as-IN, ur-IN, ne-IN,
        kok-IN, ks-IN, sd-IN, sa-IN, sat-IN, mni-IN, brx-IN, mai-IN, doi-IN
      title: Sarvam_Model_API_SpeechToTextLanguage
    Sarvam_Model_API_SpeechToTextModel:
      type: string
      enum:
        - saarika:v2.5
        - saaras:v3
      description: >-
        Model to be used for speech to text.


        - **saarika:v2.5** (default): Transcribes audio in the spoken language.


        - **saaras:v3**: State-of-the-art model with flexible output formats.
        Supports multiple modes via the `mode` parameter: transcribe, translate,
        verbatim, translit, codemix.
      title: Sarvam_Model_API_SpeechToTextModel
    Sarvam_Model_API_Mode:
      type: string
      enum:
        - transcribe
        - translate
        - verbatim
        - translit
        - codemix
      description: >-
        Mode of operation for saaras:v3 model.


        Example audio: 'मेरा फोन नंबर है 9840950950'


        - **transcribe** (default): Standard transcription in the original
        language with proper formatting and number normalization.
          - Output: `मेरा फोन नंबर है 9840950950`

        - **translate**: Translates speech from any supported Indic language to
        English.
          - Output: `My phone number is 9840950950`

        - **verbatim**: Exact word-for-word transcription without normalization,
        preserving filler words and spoken numbers as-is.
          - Output: `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero`

        - **translit**: Romanization - Transliterates speech to Latin/Roman
        script only.
          - Output: `mera phone number hai 9840950950`

        - **codemix**: Code-mixed text with English words in English and Indic
        words in native script.
          - Output: `मेरा phone number है 9840950950`
      title: Sarvam_Model_API_Mode
    SpeechToTextJobParameters:
      type: object
      properties:
        language_code:
          oneOf:
            - $ref: "#/components/schemas/Sarvam_Model_API_SpeechToTextLanguage"
            - type: "null"
          description: >-
            Specifies the language of the input audio in BCP-47 format.


            **Available Options:**

            - `unknown` (default): Use when the language is not known; the API
            will auto-detect.

            - `hi-IN`: Hindi

            - `bn-IN`: Bengali

            - `kn-IN`: Kannada

            - `ml-IN`: Malayalam

            - `mr-IN`: Marathi

            - `od-IN`: Odia

            - `pa-IN`: Punjabi

            - `ta-IN`: Tamil

            - `te-IN`: Telugu

            - `en-IN`: English

            - `gu-IN`: Gujarati


            **Additional Options (saaras:v3 only):**

            - `as-IN`: Assamese

            - `ur-IN`: Urdu

            - `ne-IN`: Nepali

            - `kok-IN`: Konkani

            - `ks-IN`: Kashmiri

            - `sd-IN`: Sindhi

            - `sa-IN`: Sanskrit

            - `sat-IN`: Santali

            - `mni-IN`: Manipuri

            - `brx-IN`: Bodo

            - `mai-IN`: Maithili

            - `doi-IN`: Dogri
        model:
          $ref: "#/components/schemas/Sarvam_Model_API_SpeechToTextModel"
          description: >-
            Model to be used for speech to text.


            - **saarika:v2.5** (default): Transcribes audio in the spoken
            language.


            - **saaras:v3**: State-of-the-art model with flexible output
            formats. Supports multiple modes via the `mode` parameter:
            transcribe, translate, verbatim, translit, codemix.
        mode:
          oneOf:
            - $ref: "#/components/schemas/Sarvam_Model_API_Mode"
            - type: "null"
          description: >-
            Mode of operation. **Only applicable when using saaras:v3 model.**


            Example audio: 'मेरा फोन नंबर है 9840950950'


            - **transcribe** (default): Standard transcription in the original
            language with proper formatting and number normalization.
              - Output: `मेरा फोन नंबर है 9840950950`

            - **translate**: Translates speech from any supported Indic language
            to English.
              - Output: `My phone number is 9840950950`

            - **verbatim**: Exact word-for-word transcription without
            normalization, preserving filler words and spoken numbers as-is.
              - Output: `मेरा फोन नंबर है नौ आठ चार zero नौ पांच zero नौ पांच zero`

            - **translit**: Romanization - Transliterates speech to Latin/Roman
            script only.
              - Output: `mera phone number hai 9840950950`

            - **codemix**: Code-mixed text with English words in English and
            Indic words in native script.
              - Output: `मेरा phone number है 9840950950`
        with_timestamps:
          type: boolean
          default: false
          description: Whether to include timestamps in the response
        with_diarization:
          type: boolean
          default: false
          description: >-
            Enables speaker diarization, which identifies and separates
            different speakers in the audio. In beta mode
        num_speakers:
          type:
            - integer
            - "null"
          description: >-
            Number of speakers to be detected in the audio. This is used when
            with_diarization is true.
      title: SpeechToTextJobParameters
    BulkJobCallback:
      type: object
      properties:
        url:
          type: string
          description: Webhook url to call upon job completion
        auth_token:
          type: string
          default: ""
          description: Authorization token required for the callback Url
      required:
        - url
      title: BulkJobCallback
    BulkJobInitRequestV1_SpeechToTextJobParameters_:
      type: object
      properties:
        job_parameters:
          $ref: "#/components/schemas/SpeechToTextJobParameters"
          description: Job Parameters for the bulk job
        callback:
          oneOf:
            - $ref: "#/components/schemas/BulkJobCallback"
            - type: "null"
          description: Parameters for callback URL
      required:
        - job_parameters
      title: BulkJobInitRequestV1_SpeechToTextJobParameters_
    StorageContainerType:
      type: string
      enum:
        - Azure
        - Local
        - Google
        - Azure_V1
      title: StorageContainerType
    BaseJobParameters:
      type: object
      properties: {}
      title: BaseJobParameters
    JobState:
      type: string
      enum:
        - Accepted
        - Pending
        - Running
        - Completed
        - Failed
      title: JobState
    BulkJobInitResponseV1:
      type: object
      properties:
        job_id:
          type: string
          description: Job UUID.
        storage_container_type:
          $ref: "#/components/schemas/StorageContainerType"
          description: Storage Container Type
        job_parameters:
          $ref: "#/components/schemas/BaseJobParameters"
        job_state:
          $ref: "#/components/schemas/JobState"
      required:
        - job_id
        - storage_container_type
        - job_parameters
        - job_state
      title: BulkJobInitResponseV1
    ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - rate_limit_exceeded_error
        - not_found_error
      title: ErrorCode
    ErrorDetails:
      type: object
      properties:
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
        request_id:
          type: string
          default: ""
          description: "Unique identifier for the request. Format: date_UUID4"
      required:
        - message
        - code
      title: ErrorDetails
    ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetails"
          description: Error details
      required:
        - error
      title: ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text_job.initialise(
    job_parameters={},
)

```

```typescript
import { SarvamAIClient } from "sarvamai";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToTextJob.initialise({
  job_parameters: {},
});
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text/job/v1"

	payload := strings.NewReader("{}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("api-subscription-key", "<apiKey>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text/job/v1")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["api-subscription-key"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.sarvam.ai/speech-to-text/job/v1")
  .header("api-subscription-key", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.sarvam.ai/speech-to-text/job/v1', [
  'body' => '{}',
  'headers' => [
    'Content-Type' => 'application/json',
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text/job/v1");
var request = new RestRequest(Method.POST);
request.AddHeader("api-subscription-key", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "api-subscription-key": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text/job/v1")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# Batch - Upload Files

POST https://api.sarvam.ai/speech-to-text/job/v1/upload-files
Content-Type: application/json

Generate presigned upload URLs for audio files that will be processed in a speech to text bulk job

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/upload

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text/job/v1/upload-files:
    post:
      operationId: get-upload-links
      summary: Upload Files for Speech to Text Bulk Job V1
      description: >-
        Generate presigned upload URLs for audio files that will be processed in
        a speech to text bulk job
      tags:
        - subpackage_speechToTextJob
      parameters:
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FilesUploadResponse"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/FilesRequest"
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    FilesRequest:
      type: object
      properties:
        job_id:
          type: string
        files:
          type: array
          items:
            type: string
      required:
        - job_id
        - files
      title: FilesRequest
    JobState:
      type: string
      enum:
        - Accepted
        - Pending
        - Running
        - Completed
        - Failed
      title: JobState
    FileSignedURLDetails:
      type: object
      properties:
        file_url:
          type: string
        file_metadata:
          type:
            - object
            - "null"
          additionalProperties:
            description: Any type
      required:
        - file_url
      title: FileSignedURLDetails
    StorageContainerType:
      type: string
      enum:
        - Azure
        - Local
        - Google
        - Azure_V1
      title: StorageContainerType
    FilesUploadResponse:
      type: object
      properties:
        job_id:
          type: string
        job_state:
          $ref: "#/components/schemas/JobState"
        upload_urls:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/FileSignedURLDetails"
        storage_container_type:
          $ref: "#/components/schemas/StorageContainerType"
      required:
        - job_id
        - job_state
        - upload_urls
        - storage_container_type
      title: FilesUploadResponse
    ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - rate_limit_exceeded_error
        - not_found_error
      title: ErrorCode
    ErrorDetails:
      type: object
      properties:
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
        request_id:
          type: string
          default: ""
          description: "Unique identifier for the request. Format: date_UUID4"
      required:
        - message
        - code
      title: ErrorDetails
    ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetails"
          description: Error details
      required:
        - error
      title: ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text_job.get_upload_links(
    job_id="job_id",
    files=["files"],
)

```

```typescript
import { SarvamAIClient } from "sarvamai";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToTextJob.getUploadLinks({
  job_id: "job_id",
  files: ["files"],
});
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text/job/v1/upload-files"

	payload := strings.NewReader("{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("api-subscription-key", "<apiKey>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text/job/v1/upload-files")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["api-subscription-key"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.sarvam.ai/speech-to-text/job/v1/upload-files")
  .header("api-subscription-key", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.sarvam.ai/speech-to-text/job/v1/upload-files', [
  'body' => '{
  "job_id": "string",
  "files": [
    "string"
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text/job/v1/upload-files");
var request = new RestRequest(Method.POST);
request.AddHeader("api-subscription-key", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "api-subscription-key": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "job_id": "string",
  "files": ["string"]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text/job/v1/upload-files")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# Batch - Start Job

POST https://api.sarvam.ai/speech-to-text/job/v1/{job_id}/start

Start processing a speech to text bulk job after all audio files have been uploaded

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/start

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text/job/v1/{job_id}/start:
    post:
      operationId: start
      summary: Start Speech to Text Bulk Job V1
      description: >-
        Start processing a speech to text bulk job after all audio files have
        been uploaded
      tags:
        - subpackage_speechToTextJob
      parameters:
        - name: job_id
          in: path
          description: The unique identifier of the job
          required: true
          schema:
            type: string
        - name: ptu_id
          in: query
          required: false
          schema:
            type:
              - integer
              - "null"
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
        - name: api-subscription-key
          in: header
          description: >-
            Your unique subscription key for authenticating requests to the
            Sarvam AI Speech-to-Text API.

            [Here are the steps to get your api
            key](https://docs.sarvam.ai/api-reference-docs/authentication#obtaining-your-api-subscription-key)
          required: false
          schema:
            type: string
            default: ""
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/JobStatusV1Response"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    JobState:
      type: string
      enum:
        - Accepted
        - Pending
        - Running
        - Completed
        - Failed
      title: JobState
    StorageContainerType:
      type: string
      enum:
        - Azure
        - Local
        - Google
        - Azure_V1
      title: StorageContainerType
    TaskFileDetails:
      type: object
      properties:
        file_name:
          type: string
        file_id:
          type: string
      required:
        - file_name
        - file_id
      title: TaskFileDetails
    TaskState:
      type: string
      enum:
        - Success
        - API Error
        - Internal Server Error
      title: TaskState
    TaskDetailV1:
      type: object
      properties:
        inputs:
          type: array
          items:
            $ref: "#/components/schemas/TaskFileDetails"
        outputs:
          type: array
          items:
            $ref: "#/components/schemas/TaskFileDetails"
        state:
          $ref: "#/components/schemas/TaskState"
        error_message:
          type:
            - string
            - "null"
        exception_name:
          type:
            - string
            - "null"
      title: TaskDetailV1
    JobStatusV1Response:
      type: object
      properties:
        job_state:
          $ref: "#/components/schemas/JobState"
          description: Job State
        created_at:
          type: string
          description: Created At
        updated_at:
          type: string
          description: Updated At
        job_id:
          type: string
          description: Job Id
        total_files:
          type: integer
          default: 0
          description: Total Files
        successful_files_count:
          type: integer
          default: 0
          description: Success Count
        failed_files_count:
          type: integer
          default: 0
          description: Failed Count
        storage_container_type:
          $ref: "#/components/schemas/StorageContainerType"
          description: Storage Container Type
        error_message:
          type: string
          default: ""
          description: Error Message
        job_details:
          type: array
          items:
            $ref: "#/components/schemas/TaskDetailV1"
          description: Job details at file level.
      required:
        - job_state
        - created_at
        - updated_at
        - job_id
        - storage_container_type
      title: JobStatusV1Response
    ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - rate_limit_exceeded_error
        - not_found_error
      title: ErrorCode
    ErrorDetails:
      type: object
      properties:
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
        request_id:
          type: string
          default: ""
          description: "Unique identifier for the request. Format: date_UUID4"
      required:
        - message
        - code
      title: ErrorDetails
    ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetails"
          description: Error details
      required:
        - error
      title: ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text_job.start(
    job_id="job_id",
    ptu_id=1,
)

```

```typescript
import { SarvamAIClient } from "sarvamai";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToTextJob.start("job_id", {
  ptu_id: 1,
});
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text/job/v1/job_id/start"

	req, _ := http.NewRequest("POST", url, nil)

	req.Header.Add("api-subscription-key", "<apiKey>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text/job/v1/job_id/start")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["api-subscription-key"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.sarvam.ai/speech-to-text/job/v1/job_id/start")
  .header("api-subscription-key", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.sarvam.ai/speech-to-text/job/v1/job_id/start', [
  'headers' => [
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text/job/v1/job_id/start");
var request = new RestRequest(Method.POST);
request.AddHeader("api-subscription-key", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["api-subscription-key": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text/job/v1/job_id/start")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# Batch - Get Status

GET https://api.sarvam.ai/speech-to-text/job/v1/{job_id}/status

Retrieve the current status and details of a speech to text bulk job, including progress and file-level information.

**Rate Limiting Best Practice:** To prevent rate limit errors and ensure optimal server performance, we recommend implementing a minimum 5-millisecond delay between consecutive status polling requests. This helps maintain system stability while still providing timely status updates.

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/status

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text/job/v1/{job_id}/status:
    get:
      operationId: get-status
      summary: Get Speech to Text Bulk Job V1 Status
      description: >-
        Retrieve the current status and details of a speech to text bulk job,
        including progress and file-level information.


        **Rate Limiting Best Practice:** To prevent rate limit errors and ensure
        optimal server performance, we recommend implementing a minimum
        5-millisecond delay between consecutive status polling requests. This
        helps maintain system stability while still providing timely status
        updates.
      tags:
        - subpackage_speechToTextJob
      parameters:
        - name: job_id
          in: path
          description: The unique identifier of the job
          required: true
          schema:
            type: string
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
        - name: api-subscription-key
          in: header
          description: >-
            Your unique subscription key for authenticating requests to the
            Sarvam AI Speech-to-Text API.

            [Here are the steps to get your api
            key](https://docs.sarvam.ai/api-reference-docs/authentication#obtaining-your-api-subscription-key)
          required: false
          schema:
            type: string
            default: ""
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/JobStatusV1Response"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    JobState:
      type: string
      enum:
        - Accepted
        - Pending
        - Running
        - Completed
        - Failed
      title: JobState
    StorageContainerType:
      type: string
      enum:
        - Azure
        - Local
        - Google
        - Azure_V1
      title: StorageContainerType
    TaskFileDetails:
      type: object
      properties:
        file_name:
          type: string
        file_id:
          type: string
      required:
        - file_name
        - file_id
      title: TaskFileDetails
    TaskState:
      type: string
      enum:
        - Success
        - API Error
        - Internal Server Error
      title: TaskState
    TaskDetailV1:
      type: object
      properties:
        inputs:
          type: array
          items:
            $ref: "#/components/schemas/TaskFileDetails"
        outputs:
          type: array
          items:
            $ref: "#/components/schemas/TaskFileDetails"
        state:
          $ref: "#/components/schemas/TaskState"
        error_message:
          type:
            - string
            - "null"
        exception_name:
          type:
            - string
            - "null"
      title: TaskDetailV1
    JobStatusV1Response:
      type: object
      properties:
        job_state:
          $ref: "#/components/schemas/JobState"
          description: Job State
        created_at:
          type: string
          description: Created At
        updated_at:
          type: string
          description: Updated At
        job_id:
          type: string
          description: Job Id
        total_files:
          type: integer
          default: 0
          description: Total Files
        successful_files_count:
          type: integer
          default: 0
          description: Success Count
        failed_files_count:
          type: integer
          default: 0
          description: Failed Count
        storage_container_type:
          $ref: "#/components/schemas/StorageContainerType"
          description: Storage Container Type
        error_message:
          type: string
          default: ""
          description: Error Message
        job_details:
          type: array
          items:
            $ref: "#/components/schemas/TaskDetailV1"
          description: Job details at file level.
      required:
        - job_state
        - created_at
        - updated_at
        - job_id
        - storage_container_type
      title: JobStatusV1Response
    ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - rate_limit_exceeded_error
        - not_found_error
      title: ErrorCode
    ErrorDetails:
      type: object
      properties:
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
        request_id:
          type: string
          default: ""
          description: "Unique identifier for the request. Format: date_UUID4"
      required:
        - message
        - code
      title: ErrorDetails
    ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetails"
          description: Error details
      required:
        - error
      title: ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text_job.get_status(
    job_id="job_id",
)

```

```typescript
import { SarvamAIClient } from "sarvamai";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToTextJob.getStatus("job_id");
```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text/job/v1/job_id/status"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("api-subscription-key", "<apiKey>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text/job/v1/job_id/status")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["api-subscription-key"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.get("https://api.sarvam.ai/speech-to-text/job/v1/job_id/status")
  .header("api-subscription-key", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.sarvam.ai/speech-to-text/job/v1/job_id/status', [
  'headers' => [
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text/job/v1/job_id/status");
var request = new RestRequest(Method.GET);
request.AddHeader("api-subscription-key", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["api-subscription-key": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text/job/v1/job_id/status")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

# Batch - Download Results

POST https://api.sarvam.ai/speech-to-text/job/v1/download-files
Content-Type: application/json

Generate presigned download URLs for the transcription output files of a completed speech to text bulk job

Reference: https://docs.sarvam.ai/api-reference-docs/speech-to-text/stt/job/download

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: API
  version: 1.0.0
paths:
  /speech-to-text/job/v1/download-files:
    post:
      operationId: get-download-links
      summary: Download Files for Speech to Text Bulk Job V1
      description: >-
        Generate presigned download URLs for the transcription output files of a
        completed speech to text bulk job
      tags:
        - subpackage_speechToTextJob
      parameters:
        - name: api-subscription-key
          in: header
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FilesDownloadResponse"
        "400":
          description: Bad Request
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "403":
          description: Forbidden
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "422":
          description: Unprocessable Entity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "429":
          description: Quota Exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "500":
          description: Internal Server Error
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
        "503":
          description: Service Overloaded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/FilesRequest"
servers:
  - url: https://api.sarvam.ai
components:
  schemas:
    FilesRequest:
      type: object
      properties:
        job_id:
          type: string
        files:
          type: array
          items:
            type: string
      required:
        - job_id
        - files
      title: FilesRequest
    JobState:
      type: string
      enum:
        - Accepted
        - Pending
        - Running
        - Completed
        - Failed
      title: JobState
    FileSignedURLDetails:
      type: object
      properties:
        file_url:
          type: string
        file_metadata:
          type:
            - object
            - "null"
          additionalProperties:
            description: Any type
      required:
        - file_url
      title: FileSignedURLDetails
    StorageContainerType:
      type: string
      enum:
        - Azure
        - Local
        - Google
        - Azure_V1
      title: StorageContainerType
    FilesDownloadResponse:
      type: object
      properties:
        job_id:
          type: string
        job_state:
          $ref: "#/components/schemas/JobState"
        download_urls:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/FileSignedURLDetails"
        storage_container_type:
          $ref: "#/components/schemas/StorageContainerType"
      required:
        - job_id
        - job_state
        - download_urls
        - storage_container_type
      title: FilesDownloadResponse
    ErrorCode:
      type: string
      enum:
        - invalid_request_error
        - internal_server_error
        - unprocessable_entity_error
        - insufficient_quota_error
        - invalid_api_key_error
        - authentication_error
        - rate_limit_exceeded_error
        - not_found_error
      title: ErrorCode
    ErrorDetails:
      type: object
      properties:
        message:
          type: string
          description: Message describing the error
        code:
          $ref: "#/components/schemas/ErrorCode"
          description: >-
            Error code for the specific error that has occured. Refer to the
            error code documentation for more details.
        request_id:
          type: string
          default: ""
          description: "Unique identifier for the request. Format: date_UUID4"
      required:
        - message
        - code
      title: ErrorDetails
    ErrorMessage:
      type: object
      properties:
        error:
          $ref: "#/components/schemas/ErrorDetails"
          description: Error details
      required:
        - error
      title: ErrorMessage
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: api-subscription-key
```

## SDK Code Examples

```python
from sarvamai import SarvamAI

client = SarvamAI(
    api_subscription_key="YOUR_API_SUBSCRIPTION_KEY",
)
client.speech_to_text_job.get_download_links(
    job_id="job_id",
    files=["files"],
)

```

```typescript
import { SarvamAIClient } from "sarvamai";

const client = new SarvamAIClient({
  apiSubscriptionKey: "YOUR_API_SUBSCRIPTION_KEY",
});
await client.speechToTextJob.getDownloadLinks({
  job_id: "job_id",
  files: ["files"],
});
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.sarvam.ai/speech-to-text/job/v1/download-files"

	payload := strings.NewReader("{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("api-subscription-key", "<apiKey>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.sarvam.ai/speech-to-text/job/v1/download-files")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["api-subscription-key"] = '<apiKey>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}"

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.post("https://api.sarvam.ai/speech-to-text/job/v1/download-files")
  .header("api-subscription-key", "<apiKey>")
  .header("Content-Type", "application/json")
  .body("{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.sarvam.ai/speech-to-text/job/v1/download-files', [
  'body' => '{
  "job_id": "string",
  "files": [
    "string"
  ]
}',
  'headers' => [
    'Content-Type' => 'application/json',
    'api-subscription-key' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.sarvam.ai/speech-to-text/job/v1/download-files");
var request = new RestRequest(Method.POST);
request.AddHeader("api-subscription-key", "<apiKey>");
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"job_id\": \"string\",\n  \"files\": [\n    \"string\"\n  ]\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = [
  "api-subscription-key": "<apiKey>",
  "Content-Type": "application/json"
]
let parameters = [
  "job_id": "string",
  "files": ["string"]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.sarvam.ai/speech-to-text/job/v1/download-files")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```
