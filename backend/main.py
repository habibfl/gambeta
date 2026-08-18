from fastapi import FastAPI

app = FastAPI(title="Gambeta API")

@app.get("/")
def read_root():
    return {"message": "Gambeta API is running"}