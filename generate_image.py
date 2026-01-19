import sys
import os
import argparse
import time
import json
import torch
from diffusers import AutoPipelineForText2Image

def generate_image(prompt, model_path):
    try:
        # Check if model exists
        if not os.path.exists(model_path):
            return {"error": f"Model not found at {model_path}. Please download it first."}

        # Device selection: MPS for Mac, CUDA for NVIDIA, or CPU
        if torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float16
        elif torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        else:
            device = "cpu"
            dtype = torch.float32

        # Load SDXL Turbo Pipeline
        pipe = AutoPipelineForText2Image.from_pretrained(
            model_path, 
            torch_dtype=dtype,
            use_safetensors=True
        )
        pipe = pipe.to(device)

        # Enable memory optimizations for Mac
        # pipe.enable_model_cpu_offload() # Uncomment if low memory errors

        # Generate (SDXL Turbo is optimized for 1 step!)
        image = pipe(
            prompt,
            num_inference_steps=1, 
            guidance_scale=0.0
        ).images[0]

        # Save Image
        timestamp = int(time.time())
        filename = f"gen_{timestamp}.png"
        
        # Ensure directory exists
        output_dir = os.path.join(os.getcwd(), 'public', 'generated')
        os.makedirs(output_dir, exist_ok=True)
        
        file_path = os.path.join(output_dir, filename)
        image.save(file_path)

        return {
            "success": True, 
            "filename": filename, 
            "url": f"/generated/{filename}",
            "prompt": prompt
        }

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", type=str, help="Text prompt for image generation")
    parser.add_argument("--model_path", type=str, required=True, help="Path to the local model directory")
    args = parser.parse_args()

    result = generate_image(args.prompt, args.model_path)
    print(json.dumps(result))
