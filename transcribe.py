
import sys
import json
import os
import subprocess
import warnings
import tempfile
import numpy as np
import ssl

# Bypass SSL verification for model download
ssl._create_default_https_context = ssl._create_unverified_context

# Suppress all warnings
warnings.filterwarnings("ignore")

def load_audio_mac(file_path):
    """
    Load audio using macOS native 'afconvert' to bypass ffmpeg dependency.
    Converts to 16kHz mono WAV, then reads into numpy array.
    """
    try:
        # Create temp file for the converted wav
        fd, temp_wav_path = tempfile.mkstemp(suffix='.wav')
        os.close(fd)
        
        # Use afconvert (native macOS tool) to convert to 16kHz LE I16 Linear PCM
        # -f WAVE: format
        # -d LEI16@16000: Little Endian 16-bit Integer at 16000Hz
        # -c 1: Mono
        subprocess.run([
            'afconvert', 
            '-f', 'WAVE', 
            '-d', 'LEI16@16000', 
            '-c', '1',
            file_path, 
            temp_wav_path
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Read the WAV file manually preventing scipy dependency if possible, 
        # but whisper uses torch/numpy anyway.
        # Let's use simple file reading or numpy
        
        import wave
        with wave.open(temp_wav_path, 'rb') as wf:
            frames = wf.readframes(wf.getnframes())
            # Convert to float32 in range [-1, 1]
            # 16-bit int is -32768 to 32767
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
            
        # Cleanup
        os.remove(temp_wav_path)
        return audio
        
    except Exception as e:
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)
        raise RuntimeError(f"Mac audio conversion failed: {str(e)}")

def transcribe(file_path):
    try:
        import whisper
        import torch
        
        # Load audio using robust method
        audio_data = load_audio_mac(file_path)
        
        # Pad or trim to 30 seconds (Whisper expects this internally usually, but 'transcribe' handles it)
        # Actually model.transcribe handles raw numpy arrays perfectly.
        
        # Load model (tiny is ~75MB)
        device = "cpu" 
        if torch.backends.mps.is_available():
            device = "mps" # Use Mac GPU if available!
            
        model = whisper.load_model("tiny", device=device)
        
        # Transcribe
        result = model.transcribe(audio_data)
        
        return {"text": result["text"].strip(), "backend": "whisper-local"}
        
    except ImportError as e:
        return {"error": f"Import failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Transcription error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file provided"}))
        sys.exit(1)
        
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({"error": "File not found"}))
        sys.exit(1)
        
    result = transcribe(file_path)
    print(json.dumps(result))
