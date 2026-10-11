import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from xml.sax.saxutils import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = "127.0.0.1"
PORT = 8765
VOICE_BY_LANGUAGE = {
    "kk": "kk-KZ-DauletNeural",
    "ru": "ru-RU-DmitryNeural",
}


class TtsHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/tts":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 100000:
                raise ValueError("Invalid request size")
            request = json.loads(self.rfile.read(length))
            text = str(request.get("text", "")).strip()
            language = request.get("language", "ru")
            if not text or len(text) > 5000:
                raise ValueError("Text must contain between 1 and 5000 characters")
            voice = VOICE_BY_LANGUAGE.get(language, VOICE_BY_LANGUAGE["ru"])
            audio = self._synthesize(text, voice)
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio)))
            self.end_headers()
            self.wfile.write(audio)
        except (ValueError, json.JSONDecodeError) as error:
            self._send_error(400, str(error))
        except Exception as error:
            print(f"TTS error: {error}")
            self._send_error(502, "Speech synthesis failed")

    def _synthesize(self, text, voice):
        azure_key = os.environ.get("AZURE_SPEECH_KEY", "").strip()
        azure_region = os.environ.get("AZURE_SPEECH_REGION", "").strip()
        if azure_key and azure_region:
            return self._synthesize_azure(text, voice, azure_key, azure_region)
        return self._synthesize_edge(text, voice)

    def _synthesize_azure(self, text, voice, key, region):
        ssml = (
            '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
            'xml:lang="{}"><voice name="{}"><prosody rate="-5%" pitch="+0Hz">'
            '{}</prosody></voice></speak>'
        ).format("kk-KZ" if voice.startswith("kk-") else "ru-RU", voice, escape(text))
        request = urllib.request.Request(
            f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
            data=ssml.encode("utf-8"),
            headers={
                "Ocp-Apim-Subscription-Key": key,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
                "User-Agent": "Azamat-AI",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                audio = response.read()
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Azure Speech returned {error.code}: {details}") from error
        if not audio:
            raise RuntimeError("Azure Speech returned an empty audio response")
        return audio

    def _synthesize_edge(self, text, voice):
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as output:
            output_path = output.name
        try:
            subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "edge_tts",
                    "--voice",
                    voice,
                    "--text",
                    text,
                    "--write-media",
                    output_path,
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=30,
            )
            with open(output_path, "rb") as audio_file:
                audio = audio_file.read()
            if not audio:
                raise RuntimeError("Edge TTS returned an empty audio file")
            return audio
        finally:
            try:
                import os
                os.remove(output_path)
            except OSError:
                pass

    def _send_error(self, status, message):
        payload = json.dumps({"error": message}).encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format_string, *args):
        print(format_string % args)


if __name__ == "__main__":
    print(f"Azamat Edge TTS listening on http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), TtsHandler).serve_forever()
