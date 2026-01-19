import sys
import os
import argparse
import json
import shutil
from diffusers import AutoPipelineForText2Image
import torch

def download_model(model_path):
    try:
        # SDXL Turbo (Fast 1-step, ~7GB)
        model_id = "stabilityai/sdxl-turbo"
        
        # CLEAR EXISTING MODEL if conflicting
        # Instead of nuking the whole folder (which might fail on root volumes with .Trashes),
        # we delete contents safely.
        if os.path.exists(model_path):
            print(json.dumps({"status": "cleaning", "message": f"Clearing previous model files in {model_path}..."}))
            for filename in os.listdir(model_path):
                file_path = os.path.join(model_path, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    # Ignore permission errors for system files like .Trashes
                    print(json.dumps({"status": "warning", "message": f"Skipped deleting {filename}: {e}"}))

        print(json.dumps({"status": "starting", "message": f"Downloading {model_id} to {model_path} (this is ~7GB)..."}))

        # Download and save
        pipeline = AutoPipelineForText2Image.from_pretrained(
            model_id, 
            torch_dtype=torch.float16
        )
        pipeline.save_pretrained(model_path)
        
        return {"success": True, "message": "SDXL Turbo downloaded successfully!", "path": model_path}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model_path", type=str, required=True, help="Path to save the model")
    args = parser.parse_args()

    # Ensure stdout is unbuffered for real-time updates if we add them later
    # But for now we just return final result
    result = download_model(args.model_path)
    print(json.dumps(result))
