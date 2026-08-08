from faster_whisper import WhisperModel
import os

# ======= CHANGE THIS ONLY =======
audio_file = r"C:\Users\AvishekMukherjee\Downloads\Retail UW - existing field validations-20260623_123330-Meeting Recording.mp3"
# ================================

print("Loading AI model... (first time may take a few minutes)")
model = WhisperModel(
    "large-v3",
    device="cpu",
    compute_type="int8"
)

print("Transcribing...")

segments, info = model.transcribe(
    audio_file,
    beam_size=5
)

output_file = os.path.splitext(audio_file)[0] + "_Transcript.txt"

with open(output_file, "w", encoding="utf-8") as f:
    for s in segments:
        f.write(f"[{s.start:8.1f} - {s.end:8.1f}] {s.text}\n")

print("\nDone!")
print(output_file)