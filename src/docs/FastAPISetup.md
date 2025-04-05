
# FastAPI Backend Setup Guide

## Prerequisites
- Python 3.7+
- pip (Python package installer)

## Setting Up Your FastAPI Backend

1. **Install required packages**
```bash
pip install fastapi uvicorn pydantic python-dotenv
```

2. **Create a basic FastAPI application**
Save this as `main.py` in your backend directory:

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os

app = FastAPI()

# Configure CORS - VERY IMPORTANT for connecting to your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://your-lovable-app-url.com"],  # Update with your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for the onboarding data
class OnboardingData(BaseModel):
    userId: str
    fullName: str
    age: int = None
    gender: str = None

@app.post("/process-onboarding")
async def process_onboarding(data: OnboardingData):
    try:
        # This is where you would implement your existing Python logic
        # For example, accessing the static JSON from Supabase bucket
        # processing it, and generating the files for the next onboarding step
        
        # Example placeholder logic:
        print(f"Processing data for user: {data.userId}")
        print(f"User name: {data.fullName}")
        
        # Placeholder for your actual logic
        # You would implement your file processing here
        
        # Return a success response
        return {"status": "success", "message": "User data processed successfully"}
    
    except Exception as e:
        print(f"Error processing user data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def read_root():
    return {"message": "FastAPI backend for CityScout is running!"}

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

3. **Run your FastAPI server**
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Connecting to Supabase Bucket

To access your static JSON file in your Supabase bucket, you can use the Supabase Python client:

```bash
pip install supabase
```

Then update your FastAPI application:

```python
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

@app.post("/process-onboarding")
async def process_onboarding(data: OnboardingData):
    try:
        # Access your static JSON file from the bucket
        bucket_name = "your-bucket-name"
        file_path = "path/to/your/static-file.json"
        
        # Get the file from the bucket
        response = supabase.storage.from_(bucket_name).download(file_path)
        
        # Parse the JSON file
        json_data = json.loads(response)
        
        # Process the data using your existing Python logic
        # ...
        
        # Return a success response
        return {"status": "success", "message": "User data processed successfully"}
    
    except Exception as e:
        print(f"Error processing user data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

## Testing Your API

You can test your API using the interactive documentation available at:
http://localhost:8000/docs

## Next Steps

1. Implement your specific Python logic in the `process-onboarding` endpoint
2. Secure your API with proper authentication if needed
3. Deploy your API to a production environment when ready
